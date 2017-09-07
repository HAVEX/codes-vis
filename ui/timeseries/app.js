define(function(require) {

    // dependencies
    var ajax = require('p4/io/ajax'),
        dsv = require('p4/io/parser'),
        dataStruct = require('p4/core/datastruct'),
        arrays = require('p4/core/arrays'),
        pipeline =require('p4/core/pipeline'),
        stats = require('p4/dataopt/stats'),
        cstore = require('p4/cquery/cstore'),
        colors = require('i2v/colors'),
        lineChart = require('i2v/charts/lineChart'),
        format = require('i2v/format')('.2s');

    var network = {};
    network.transform = require('../network/transform');
    network.vis = require('../network/circularvis');


    var TERMINAL_PER_ROUTER,
        ROUTER_PER_GROUP,
        LOCAL_LINK_COUNT,
        GLOBAL_LINK_COUNT,
        GROUP_TOTAL,
        ROUTER_TOTAL;

    function calcTargetRouter(group_id, router_id, port) {
        var first = router_id % ROUTER_TOTAL;
        var target_grp = first + port * ROUTER_PER_GROUP;
        if(target_grp == group_id) {
            target_grp = GROUP_TOTAL - 1;
        }
        var my_pos = group_id % ROUTER_PER_GROUP;
        if(group_id == GROUP_TOTAL - 1) {
            my_pos = target_grp % ROUTER_PER_GROUP;
        }
        var target_pos =  target_grp * ROUTER_PER_GROUP + my_pos;
        return target_pos;
    }

    return function(arg) {
        var eva = {},
            options = arg || {},
            container = options.container;

        var Panel = require('davi/panel'),
            Button = require('davi/button'),
            Table = require('davi/table'),
            ProgressBar = require('davi/progress');

        var fileLoader = require('./fileloader'),
            adav = require('adav/adav');

        var ui = require('./views')(container),
            views = ui.views;

        var timelinePlots = {};
        var terminalMetrics;

        $("#control-timeline > .button").click(function(evt){
            $("#control-timeline > .button").each(function(b){
                $(this).removeClass('blue');
                $(this).addClass('grey');
            })
            $(this).addClass('blue');
            var choice = this.innerText;

            if(choice == 'Link Traffic') {
                timelinePlots.linkSaturation.hide();
                timelinePlots.terminalStat.hide();
                timelinePlots.linkTraffic.show();
            } else if(choice == 'Link Saturation') {
                timelinePlots.linkTraffic.hide();
                timelinePlots.terminalStat.hide();
                timelinePlots.linkSaturation.show();
            } else if(choice == 'Terminal Metrics') {
                timelinePlots.linkTraffic.hide();
                timelinePlots.linkSaturation.hide();
                timelinePlots.terminalStat.show();
            }
        })


        network.visSetting = {
            container: '#panel-projection-body',
            width: views.projection.innerWidth,
            height:  views.projection.innerHeight,
            padding: 0,
        };

        network.visSpec = {};
        network.data = null;
        network.updateVis = function() {
            views.projection.body.innerHTML = '';
            if(network.data !== null)
                network.vis(network.visSetting, network.visSpec, network.data);
        }
        // ui.style.visibility = 'hidden';
        // dataPanel.style.margin = '50px auto';
        var fileList;
        var dataSet = {},
            gpuMemCache = {},
            networkData = {};
        var progressBars = [],
            startButton;




        var jobMapping = {};

        fileList = new Table({
            container: views.dataPanel.body,
            // width: dataPanel.body * 0.8,
            columns: ['File Name', 'Data Size', 'Number of Records', 'Progress / Status']
        });

        fileList.style.display = 'none';

        eva.update = function(visSpec, input, metadata) {
            if(typeof metadata != 'undefined'){
                TERMINAL_PER_ROUTER = metadata.terminals / metadata.routers;
                ROUTER_PER_GROUP = metadata.routers / metadata.groups;
                LOCAL_LINK_COUNT = metadata.localLinkPerRouter || ROUTER_PER_GROUP;
                GLOBAL_LINK_COUNT = metadata.globalLinkPerRouter || TERMINAL_PER_ROUTER;
                GROUP_TOTAL = TERMINAL_PER_ROUTER * ROUTER_PER_GROUP + 1;
                ROUTER_TOTAL = ROUTER_PER_GROUP * GROUP_TOTAL;
            }

            if(network.data === null)
                network.data = network.transform(input);

            // views.dataPanel.style.display = 'block';
            fileList.tbody.innerHTML = '';
            network.visSpec = visSpec;
            network.updateVis();
        }

        var fileUploadButton = new Button({
            label: ' Open Files ',
            types: ['primary', 'center'],
            icon: 'folder open',
            fileInput: {id: 'testFileUpload', onchange: function(evt) {
                var files = evt.target.files;
                fileList.style.display = 'table';
                Object.keys(files).forEach(function(f, fi){
                    var fileName = files[f].name;
                    var tr = fileList.addRow([fileName, format(files[f].size)+'B', '--', '']);

                    progressBars[f] = new ProgressBar({
                        percentage: 0,
                        container: tr.childNodes[3],
                        types: ['green']
                    });
                    progressBars[f].style.margin = '0';
                    loadDataFromFile(files[f], fi);

                    if(fileName.match('terminal')) dataSet.terminal = files[f];
                    if(fileName.match('router')) dataSet.router = files[f];
                    if(fileName.match('mpi')) dataSet.mpi = files[f];
                    if(fileName.match('.jobs')) {
                        progressBars[fi].percent = 50;
                        dataSet.jobs = files[f];
                        var reader = new FileReader();
                        reader.onloadend = function(evt) {
                            if (evt.target.readyState == FileReader.DONE) {
                                jobs = evt.target.result.split('\n');
                                jobs.forEach(function(nodes, jobID){
                                    nodes.split(' ').forEach(function(node){
                                        jobMapping[parseInt(node)] = jobID;
                                    })
                                })
                            }
                            progressBars[fi].percent = 100;
                        }
                        reader.readAsText(files[f]);
                    }
                })

                // startButton = new Button({
                //     label: ' Start Explore and Analyze ',
                //     types: ['positive', 'right'],
                //     icon: 'chevron right',
                //     container: views.dataPanel.body,
                //     onclick: function() {
                //         views.dataPanel.style.display = 'none';
                //     }
                // });
                // startButton.style.margin = '5px';
                // startButton.showLoading();
            }},
        });
        fileUploadButton.style.margin = '5px';
        views.dataPanel.append(fileUploadButton);

        var terminal = {
            struct: {
                terminal_id         : "int",
                packets_finished    : "float",
                data_size           : "int",
                avg_hops            : "float",
                avg_packet_latency  : "float",
                busy_time           : "float",
                timestamp           : "time",
                job_id              : "int"
            },

            preprocess: function(text) {
                return text.map(function(d){
                    var row =  d.split(',');
                    // row[3] = row[3] / row[1];
                    row.push(-1); //default job_id
                    if(dataSet.hasOwnProperty('jobs')){
                        var terminalID = row[0];
                        if(jobMapping.hasOwnProperty(terminalID))
                            row[row.length-1] = jobMapping[terminalID];
                    }
                    return row;
                });
            },

            visualize: function(data) {
                console.log(data);
                gpuMemCache.terminals = adav({
                    data: data,
                    container: 'detail-terminal',
                    config: {
                        padding: {left: 50, right: 50, top: 30, bottom: 20},
                        viewport: [views.detail.cell('detail-terminal').clientWidth - 50, views.detail.cell('detail-terminal').clientHeight - 20]
                    }
                    // indexes: ["timestamp" , "terminal_id"]
                });

                var start = new Date();
                var result = gpuMemCache.terminals
                // .derive({
                //     group_id: "floor(terminal_id/50.0)",
                //     // avg_hop: "total_hops/packets_finished"
                // })
                // .register('selectTimeRange')
                .aggregate({
                    $group: ["terminal_id"],
                    totalHopCount: {$sum: "avg_hop"},
                    avgPacketLatency: {$sum: "avg_packet_latency"},
                    totalDataSize: {$sum: "data_size"},
                    saturation: {$sum: "busy_time"}
                })
                .visualize({
                    id: 'stat-plot',
                    mark: "line",
                    y: ["totalDataSize", "avgPacketLatency", "saturation", "terminal_id"],
                    // x: "timestamp",
                    // perceptual: true,
                    color: 'teal',
                    alpha: 0.1
                })
                .result();

                result.group_id = result.terminal_id.map(function(d) { return Math.floor(d / TERMINAL_PER_ROUTER / ROUTER_PER_GROUP)});

                var features = ['group_id', 'avgPacketLatency', 'saturation', 'totalDataSize', 'terminal_id'];

                var result = gpuMemCache.terminals
                .head()
                // .filter({
                //     timestamp: [0, 1600000]
                // })
                .aggregate({
                    $group: ["timestamp"],
                    // hops: {$sum: "avg_hop"},
                    packet_latency: {$sum: "avg_packet_latency"},
                    data_size: {$sum: "data_size"},
                    saturation: {$sum: "busy_time"}
                })
                .result();

                // var tsCount = result.timestamp.length;
                // features.forEach(function(f, i){
                //     if( f in ['avg_hop', 'avg_packet_latency'] )
                //         result[f] = result[f].map(function(d){ return d / tsCount;});
                // });

                var timeStats =  [];
                var features = ['packet_latency', 'saturation', 'data_size'];
                features.forEach(function(f, i){
                    if(f == 'group_id' || f=='terminal_id') return;
                    var r = result[f];
                    var min = r.reduce(function(a, b) {return ( a < b ? a : b );}),
                        max = r.reduce(function(a, b) {return ( a > b ? a : b );});
                    // console.log(f, max, min);
                    // var max = data.stats[dataMetrics[i]].max,
                    //     min = data.stats[dataMetrics[i]].min;
                    r.forEach(function(v, j){
                        var value = (v - min) / (max - min);
                        timeStats.push({
                            normalized_mean: value,
                            feature: f,
                            timestamp: result.timestamp[j]
                        })
                    })
                })

                var terminalData = new Array(features.length);
                features.forEach(function(f, i){
                    terminalData[i] = timeStats.filter(function(d) { return d.feature == f;})
                });

                timelinePlots.terminalStat = new lineChart({
                    container: views.timeline.body,
                    padding: {left: 100, right: 40, top: 20, bottom: 40},
                    data: terminalData,
                    formatX: function(d) { return format(d/1e9) + 's';},
                    series: features,
                    zero: true,
                    // color: ['red', 'orange'],
                    vmap: {
                        x: 'timestamp',
                        y: 'normalized_mean',
                        color: 'feature',
                    }
                })
                timelinePlots.terminalStat.hide();
                console.log("Time spent: ", new Date() - start);
                // console.log(result);
            },

            allocMem: function(metadata) {
                return metadata.line;
            },

        };

        var linkTypes = ['local', 'local', 'global', 'terminal'],
            routerTotal,
            portTotal;

        var networkLinks = {
            struct: {
                router_id   : "int",
                timestamp   : "time",
                port        : "int",
                type        : "string",
                saturation  : "float",
                traffic     : "int",
                link_id     : "int",
            },

            allocMem: function(metadata) {
                portTotal = (metadata.header.split(',').length - 2) / 2;
                routerTotal = metadata.line;
                return portTotal * routerTotal;
            },

            preprocess: function(lines) {
                if(!lines.length) return;
                var portTotal = (lines[0].split(',').length - 2) / 2,
                    localPortCount = portTotal / 2,
                    globalPortCount = localPortCount / 2,
                    terminalCount = localPortCount / 2,
                    dataItems = [];

                lines.forEach(function(line, li){
                    var row = line.split(','),
                        routerId = row[0],
                        ts = row.pop(),
                        saturations = row.slice(1, portTotal+1),
                        traffics = row.slice(portTotal+1, portTotal*2+1);

                    saturations.forEach(function(item, port){
                        var ltype = linkTypes[Math.floor(port/terminalCount)];
                        var linkId = li * portTotal + port;
                        dataItems.push([routerId, ts, port, ltype, item, traffics[port], linkId]);
                    });
                })

                return dataItems;
            },

            visualize: function(data) {

                var width = views.detail.cell('detail-router').clientWidth - 50,
                    height = views.detail.cell('detail-router').clientHeight - 20;

                gpuMemCache.routers = adav({
                    data: data,
                    container: 'detail-router',
                    config: {
                        padding: {left: 100, right: 50, top: 10, bottom: 50},
                        viewport: [width, height]
                    },
                    views: [
                        {
                            width: width/2 - 50,
                            height: height,
                            offset: [0, 0]
                        },
                        {
                            width: width/2 - 50,
                            height: height,
                            offset: [width/2+50, 0]
                        }
                    ],
                });

                var start = new Date();
                var result = gpuMemCache.routers
                // .filter({
                //     timestamp: [0, 1600000]
                // })
                .aggregate({
                    $group: ["timestamp", "type"],
                    totalTraffic: {$sum: "traffic"},
                    totalSaturation: {$sum: "saturation"},
                })
                .result('row');

                console.log(result);

                var linkTypes = ['local', 'global', 'terminal'];

                var linkData = new Array(linkTypes.length);
                linkTypes.forEach(function(d, i){
                    linkData[i] = result.filter(function(l) { return l.type == d});
                })

                timelinePlots.linkTraffic = new lineChart({
                    container: views.timeline.body,
                    padding: {left: 100, right: 40, top: 20, bottom: 40},
                    data: linkData,
                    formatX: function(d) { return format(d/1e9) + 's';},
                    series: linkTypes,
                    zero: true,
                    color: ['blue', 'purple', 'green'],
                    vmap: {
                        x: 'timestamp',
                        y: 'totalTraffic',
                        color: 'type',
                    },
                    onchange: function(d) {
                        var terminals = updateTerminals(d.x);
                        var data = updateNetworkLinks(d.x);
                        data.terminals = terminals;
                        network.data =  network.transform(data);
                        network.updateVis();

                    }
                })

                timelinePlots.linkSaturation = new lineChart({
                    container: views.timeline.body,
                    padding: {left: 100, right: 40, top: 20, bottom: 40},
                    data: linkData,
                    formatX: function(d) { return format(d/1e9) + 's';},
                    formatY: function(d) { return format(d/1e9) + 's';},
                    series: linkTypes,
                    zero: true,
                    color: ['blue', 'purple', 'green'],
                    vmap: {
                        x: 'timestamp',
                        y: 'totalSaturation',
                        color: 'type',
                    },
                    onchange: function(d) {
                        updateTerminals(d.x);
                        var routers = updateRouters(d.x);
                        console.log(routers);
                    }
                })

                timelinePlots.linkSaturation.hide();

                gpuMemCache.routers
                .head()
                .filter({
                    type: ['global', 'global']
                })
                .aggregate({
                    $group: ["link_id"],
                    totalTraffic: {$sum: "traffic"},
                    totalSaturation: {$sum: "saturation"},
                })
                .visualize({
                    id: "detail-global-link",
                    mark: "point",
                    x: "totalTraffic",
                    y: "totalSaturation",
                    color: 'purple',
                    alpha: 0.5
                })
                .head()
                .filter({
                    type: ['local', 'local']
                })
                .aggregate({
                    $group: ["link_id"],
                    totalTraffic: {$sum: "traffic"},
                    totalSaturation: {$sum: "saturation"},
                })
                .visualize({
                    id: "detail-local-link",
                    mark: "point",
                    x: "totalTraffic",
                    y: "totalSaturation",
                    color: 'steelblue',
                    alpha: 0.5
                })

            }
        }

        function updateTerminals(timeRange) {
            networkData.terminals = gpuMemCache.terminals
            .head()
            .filter({
                timestamp: timeRange
            })
            .aggregate({
                $group: ["terminal_id"],
                group_id: {$min: "group_id"},
                avg_hops: {$sum: "avg_hop"},
                avg_packet_latency: {$sum: "avg_packet_latency"},
                packets_finished: {$sum: "packets_finished"},
                data_size: {$sum: "data_size"},
                sat_time: {$sum: "busy_time"},
            })
            .visualize({
                id: 'stat-plot',
                mark: "line",
                y: ["data_size", "avg_packet_latency", "busy_time", "terminal_id"],
                // x: "timestamp",
                // perceptual: true,
                color: 'teal',
                alpha: 0.1
            })
            .result('row');

            networkData.terminals.forEach(function(d, i){
                d.router_id = Math.floor(d.terminal_id/TERMINAL_PER_ROUTER);
                d.router_rank = Math.floor(d.router_id/ROUTER_PER_GROUP);
                d.router_port = d.terminal_id % TERMINAL_PER_ROUTER;
                d.group_id = Math.floor(d.terminal_id/TERMINAL_PER_ROUTER/ROUTER_PER_GROUP);
            })
            return networkData.terminals;
        }

        function updateRouters(timeRange) {
            var aggr = gpuMemCache.routers
            .head()
            .filter({
                timestamp: timeRange
            })
            .aggregate({
                $group: ["port", "router_id"],
                totalTraffic: {$sum: "traffic"},
                totalSaturation: {$sum: "saturation"},
            })
            .result('row');

            var routers = pipeline()
            .aggregate({
                $group: 'router_id',
                traffic: {$list: 'totalTraffic'},
                busy_time: {$list: 'totalSaturation'}
            })
            .execute(aggr);

            return routers;
        }

        function getLink(d) {
            var link = {
                group_id: Math.floor(d.router_id / ROUTER_PER_GROUP),
                router_rank: d.router_id % ROUTER_PER_GROUP,
                router_id: d.router_id,
                router_port: d.port,
                sat_time: d.sat_time,
                traffic: d.traffic
            };

            link.target_router = calcTargetRouter(link.group_id, link.router_rank, link.router_port);

            return link;
        }

        function updateNetworkLinks(timeRange) {
            var aggr = gpuMemCache.routers
            .head()
            .filter({
                type: ['global', 'global'],
                timestamp: timeRange
            })
            .aggregate({
                $group: ["link_id"],
                totalTraffic: {$sum: "traffic"},
                totalSaturation: {$sum: "saturation"},
            })
            .visualize({
                id: "detail-global-link",
                mark: "point",
                x: "totalTraffic",
                y: "totalSaturation",
                color: 'purple',
                alpha: 0.5
            })
            .head()
            .filter({
                type: ['local', 'local'],
                timestamp: timeRange
            })
            .aggregate({
                $group: ["link_id"],
                totalTraffic: {$sum: "traffic"},
                totalSaturation: {$sum: "saturation"},
            })
            .visualize({
                id: "detail-local-link",
                mark: "point",
                x: "totalTraffic",
                y: "totalSaturation",
                color: 'steelblue',
                alpha: 0.5
            })
            .head()
            .filter({
                timestamp: timeRange
            })
            .aggregate({
                $group: ["port", "router_id"],
                traffic: {$sum: "traffic"},
                sat_time: {$sum: "saturation"},
            })
            .result('row');

            var localLinks = aggr
                .filter(function(d){
                    return d.port < LOCAL_LINK_COUNT;
                })
                .map(getLink);

            var globalLinks = aggr
                .filter(function(d){
                    return (d.port >= LOCAL_LINK_COUNT && d.port < LOCAL_LINK_COUNT+GLOBAL_LINK_COUNT);
                })
                .map(getLink);

            return {
                localLinks: localLinks,
                globalLinks: globalLinks
            };
        }

        function loadDataFromFile(file, fileId) {
            if(typeof file == 'undefined') return;
            var entity = false, db, rowTotal, rowCount = 0;

            if(file.name.match('terminal')) entity = terminal;
            if(file.name.match('router')) entity = networkLinks;
            if(file.name.match('mpi')) entity = mpiLog;

            if(entity) {
                fileLoader({
                    file: file,
                    // skip: 1,
                    onstart: function(meta) {
                        rowTotal = meta.line;
                        db = cstore({
                            size: entity.allocMem(meta),
                            struct: entity.struct,
                        });
                        fileList.updateCell(fileId, 2, rowTotal);
                    },
                    onload:function (data) {
                        rowCount += data.length;
                        progressBars[fileId].percent = rowCount / rowTotal * 100;
                        var rows = entity.preprocess(data);
                        // console.log(rows);
                        if(Array.isArray(rows)) db.addRows(rows);
                    },
                    oncomplete: function() {
                        var data = db.data();
                        data.stats = db.stats();
                        entity.visualize(data);
                        if(dataSet.hasOwnProperty('terminal') && dataSet.hasOwnProperty('router')) {
                            // startButton.hideLoading();
                            views.dataPanel.style.display = 'none';
                        }
                    }
                });
            }
        }


        return eva;
    }

});
