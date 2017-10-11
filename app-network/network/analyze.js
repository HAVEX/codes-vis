define(function(require) {
    // dependencies
    const loadData = require('./loadData'),
        arrays = require('p4/core/arrays'),
        pipeline = require('p4/core/pipeline'),
        aggregate = require('p4/dataopt/aggregate'),
        chord = require('./chord'),
        bars = require('./bars');

    function getConnections(data, spec) {
        var partTotal = data.length || 0,
            entity = Object.keys(spec)[0] || spec,
            metrics = Object.keys(spec[entity]) || spec[entity] || [],
            aggrLinks = new Array(partTotal),
            aggrNodeMap = [];

        data.forEach(function(d, di){
            aggrLinks[di] = new Array(partTotal);

            for(var dj = 0; dj < partTotal; dj++) {
                aggrLinks[di][dj] = {};
                aggrLinks[di][dj][entity] = [];
            }
            d.routers.forEach(function(item){
                aggrNodeMap[item.router_id] = di;
            });
        })
        data.forEach(function(d, di){
            d.routers.forEach(function(item){
                item[entity].forEach(function(e){
                    var src = aggrNodeMap[e.router_id],
                        dest = aggrNodeMap[e.target_router];

                    aggrLinks[src][dest][entity].push(e);
                });
            })
        })
        aggrLinks.forEach(function(links, li){
            links.forEach(function(link, lj) {
                metrics.forEach(function(metric){
                    var opt = spec[entity][metric].slice(1) || 'sum';
                    if(typeof arrays[opt] === 'function') {
                        var values = aggrLinks[li][lj][entity].map(function(d){return d[metric]});
                        aggrLinks[li][lj][metric] = arrays[opt].call(null, values) || 0;
                        aggrLinks[li][lj].count = values.length;
                    }
                })
            })
        })
        return aggrLinks;
    }

    function analysis(data) {
        var result = pipeline()
        .aggregate({
            $bin: {group_id: 6},
            routers: {$data: '*'}
        })
        .execute(data);

        var entity = 'global_links';

        const METRICS = {
            global_links: {
                traffic: '$sum',
                sat_time: '$sum'
            },
            local_links: {
                traffic: '$sum',
                sat_time: '$sum'
            },
            terminals: {
                terminal_id: "$addToSet",
                avg_hops: "$avg",
                busy_time: "$sum",
                data_size: "$sum",
                packets_finished: "$sum",
                avg_packet_latency: "$avg",
            }
        };

        var chordData = result.map(function(c, ci){
            var cData = []
            c.routers.forEach(function(router, ri){
                cData = cData.concat(router[entity]);
            });
            return aggregate(cData, {
                $group: 'router_rank',
                traffic: '$sum',
                sat_time: '$sum'
            })
        })

        var connSpec = {};
        connSpec[entity] = METRICS[entity];

        var conn = getConnections(result, connSpec);

        var bundledLinks = chord({
            container: '#page-main',
            data: conn,
            radius: 200,
            vmap: {
                size: 'traffic',
                color: 'sat_time'
            }
        })

        bars({
            container: bundledLinks,
            data: chordData,
            innerRadius: 220,
            outerRadius: 300,
            colors: ['green', 'red'],
            vmap: {
                size: 'traffic',
                color: 'sat_time'
            }
        })
    }

    return function(dataset) {
        loadData({
            dataset: dataset,
            localLinkPerRouter: 10,
            globalLinkPerRouter: 5
        }, analysis);
    }
});
