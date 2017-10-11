define(["p4/core/pipeline", "p4/core/datastruct", "p4/core/arrays"], function(pipeline, dataStruct, arrays){

    return function Dragonfly(model) {
        var dfly = {},
            ROUTER_TOTAL = model.numRouter || 264,
            GROUP_TOTAL = model.numGroup || 33,
            NODE_TOTAL = model.numNode || 1056,
            ROUTER_PER_GROUP = ROUTER_TOTAL / GROUP_TOTAL,
            TERMINAL_PER_ROUTER = NODE_TOTAL / ROUTER_TOTAL,
            TERMINAL_PER_GROUP = TERMINAL_PER_ROUTER * ROUTER_PER_GROUP,
            GLOBAL_LINK = TERMINAL_PER_ROUTER,
            ROUTER_PER_GROUP = ROUTER_TOTAL / GROUP_TOTAL;
            data = model.data || [],
            terminals = model.terminals,
            routers = model.routers || [],
            traffic = model.traffic,
            busytime = model.busytime,
            localConnections = model.localConnections,
            globalConnections = model.globalConnections,
            jobMapping = model.jobMapping;


        var globalLinks = [];

        for(var i = 0; i<ROUTER_TOTAL; i++){
            var router_id = i,
                group_id = Math.floor(router_id / ROUTER_PER_GROUP);

            router_id = i % ROUTER_PER_GROUP;
            var first = router_id % ROUTER_TOTAL;
            var dest = [];
            for (var j=0; j < GLOBAL_LINK; j++) {
                var target_grp = first;
                if(target_grp == group_id) {
                    target_grp = GROUP_TOTAL - 1;
                }
                var my_pos = group_id % ROUTER_PER_GROUP;
                if(group_id == GROUP_TOTAL - 1) {
                    my_pos = target_grp % ROUTER_PER_GROUP;
                }
                var target_pos =  target_grp * ROUTER_PER_GROUP + my_pos;
                first += ROUTER_PER_GROUP;
                dest.push(target_pos);
            }
            globalLinks[i] = dest;
        }

        function getGlobalLinkTargets(router_id) {
            return globalLinks[router_id];
        }

        function getLocalLinkTargets(routerID) {
            var groupID = Math.floor(routerID / ROUTER_PER_GROUP),
                dest = [];

            for(var i = groupID * ROUTER_PER_GROUP; i < (groupID+1) * ROUTER_PER_GROUP; i++) {
                dest.push(i);
            }

            return  dest;
        }

        if(!routers.length) {
            data = dataStruct.join(traffic, busytime);
        } else {
            data = dataStruct({data:routers}).objectArray();
        }

        pipeline().derive(function(d){
            d.router_id = Math.floor(d.terminal_id / TERMINAL_PER_ROUTER);
            d.router_port = d.terminal_id % TERMINAL_PER_ROUTER;
            d.router_rank = d.router_id % ROUTER_PER_GROUP;
        })(terminals);

        data.forEach(function(d){
            d.router_rank = d.router_id;
            d.router_id = d.group_id * ROUTER_PER_GROUP + d.router_id;
            d.globalTargets = getGlobalLinkTargets(d.router_id);
            d.localTargets = getLocalLinkTargets(d.router_id);
            d.group_id = Math.floor(d.router_id / ROUTER_PER_GROUP);
            d.total_local_traffic = d.local_traffic.reduce(function(a, b){return a+b;});
            d.total_local_busy_time = d.local_busy_time.reduce(function(a, b){return a+b;});
            d.total_global_busy_time = d.global_busy_time.reduce(function(a, b){return a+b;});
            d.total_global_traffic = d.global_traffic.reduce(function(a, b){return a+b;});
            d.local_links = [];
            d.global_links = [];
            d.local_traffic.forEach(function(l, li){
                var link = {};
                link.traffic = l;
                link.busy_time = d.local_busy_time[li];
                link.router_id = d.router_id;
                link.router_rank = d.router_rank;
                link.port = li;
                d.local_links.push(link);
            });
            d.global_traffic.forEach(function(l, li){
                var link = {};
                link.traffic = l;
                link.busy_time = d.global_busy_time[li];
                link.router_id = d.router_id;
                link.router_rank = d.router_rank;
                link.port = li;
                d.global_links.push(link);
            });
        });

        data.embed({$by: "router_id", terminals: terminals});

        dfly.data = data;

        dfly.interGroupConnection = function() {
            var trafficMatrix = [], busytimeMatrix = [];
            for(var i = 0; i<GROUP_TOTAL; i++) {
                trafficMatrix[i] = [];
                 busytimeMatrix [i] = [];
            }

            data.forEach(function(d, i){
                var source = Math.floor(d.router_id / ROUTER_PER_GROUP);
                d.globalTargets.forEach(function(t, ti){
                    var target = Math.floor(t / ROUTER_PER_GROUP);
                     busytimeMatrix [source][target] = d.global_busy_time[ti];
                     trafficMatrix [source][target] = d.global_traffic[ti];
                });
            })
            // for(var i = 0; i<GROUP_TOTAL; i++) {
            //     for(var j = 0; j<GROUP_TOTAL; j++) {
            //         // console.log(trafficMatrix[i][j],trafficMatrix[j][i] );
            //         console.log(busytimeMatrix[i][j],busytimeMatrix[j][i] );
            //     }
            // }

            return {
                traffic: trafficMatrix,
                busy_time: busytimeMatrix
            };
        }

        dfly.partition = function(partitionAttr, numPartition, filter) {
            var aggrNodeMap = [],
                sortKeys = {},
                numPartition = numPartition || 6;
                parts = [];

            if(Array.isArray(numPartition)) {
                parts = numPartition;
                numPartition = numPartition.length;
            }

            if(partitionAttr == 'router_rank') numPartition = ROUTER_PER_GROUP;
            sortKeys[partitionAttr] = 1;
            sortKeys.router_id = 1;

            var aggregate = pipeline()
                .sortBy(sortKeys);

            if(typeof filter !== "undefined")
                aggregate.match(filter);

            if(partitionAttr == "workload") {
                data.forEach(function(d){
                    console.log(d.terminals);
                    d.workload = d.terminals[0].workload;
                });
                aggregate.partitionBy({workload: parts});
            } else if(partitionAttr == "router_rank") {
                aggregate.partitionBy({router_rank: arrays.seq(0, ROUTER_PER_GROUP-1)});
            } else {
                aggregate.partition(numPartition);
            }

            aggregate.derive(function(d, i){
                d.src = d.data.map(function(a){return a.router_id;});
                d.globalDest = [];
                d.globalTraffic = [];
                d.globalBusyTime = [];
                d.localDest = [];
                d.localTraffic = [];
                d.localBusyTime = [];
                d.data.forEach(function(a){
                    d.globalDest = d.globalDest.concat(a.globalTargets);
                    d.localDest = d.localDest.concat(a.localTargets);
                    d.globalTraffic = d.globalTraffic.concat(a.global_traffic);
                    d.globalBusyTime = d.globalBusyTime.concat(a.global_busy_time);
                    d.localTraffic = d.localTraffic.concat(a.local_traffic);
                    d.localBusyTime = d.localBusyTime.concat(a.local_busy_time);
                });
                d.src.forEach(function(s){
                    aggrNodeMap[s] = i;
                });
            })
            .derive(function(d){
                d.local_links = [];
                d.global_links = [];
                for(var j = 0; j < numPartition; j++){
                    d.global_links[j] = { busy_time: 0, traffic: 0, count: 0 };
                    d.local_links[j] = { busy_time: 0, traffic: 0, count: 0 };
                }

                d.localDest.forEach(function(dest, di){
                    if(d.local_links.hasOwnProperty(aggrNodeMap[dest])){
                        d.local_links[aggrNodeMap[dest]].traffic += d.localTraffic[di];
                        d.local_links[aggrNodeMap[dest]].busy_time += d.localBusyTime[di];
                        d.local_links[aggrNodeMap[dest]].count++;
                    }
                });

                d.globalDest.forEach(function(dest, di){
                    if(d.local_links.hasOwnProperty(aggrNodeMap[dest])){
                        d.global_links[aggrNodeMap[dest]].traffic += d.globalTraffic[di];
                        d.global_links[aggrNodeMap[dest]].busy_time += d.globalBusyTime[di];
                        d.global_links[aggrNodeMap[dest]].count++;
                    }
                });

                d.global_count = d.global_links.map(function(a){return a.count});
                d.global_traffic = d.global_links.map(function(a){return a.traffic});
                d.global_busy_time = d.global_links.map(function(a){return a.busy_time});

                d.local_count = d.local_links.map(function(a){return a.count});
                d.local_traffic = d.local_links.map(function(a){return a.traffic});
                d.local_busy_time = d.local_links.map(function(a){return a.busy_time});

                d.terminals = [];
                d.local_links = [];
                d.global_links = [];
                d.data.forEach(function(a){
                    d.terminals = d.terminals.concat(a.terminals);
                    d.local_links = d.local_links.concat(a.local_links);
                    d.global_links = d.global_links.concat(a.global_links);
                });
                delete d.dest;
                delete d.src;
                delete d.traffic;
                // delete d.data;
            });
            return aggregate(data);
        }
        return dfly;
    }
});
