define(function(require) {
    // dependencies
    const p4gl = require('adav/adav');
    const Layout = require('davi/layout');
    const Panel = require('davi/panel');
    const transform = require('./transform.js');

    var views = {};

    function dualView(w, h) {
        return [
            {
                width: w,
                height: h / 2,
                offset: [0, 0]
            },
            {
                width: w,
                height: h / 2,
                offset: [0, h/2]
            },
        ];
    }

    function triView(w, h) {
        return [
            {
                width: w,
                height: h / 2,
                offset: [0, 0]
            },
            {
                width: w / 2,
                height: h / 2 ,
                offset: [0, h/2]
            },
            {
                width: w / 2,
                height: h / 2,
                offset: [w/2, h/2]
            },
        ]
    };

    var numJobs = 1;

    return function(arg) {
        var stats = {},
            data = arg.data || null,
            container = arg.container || document.body;

        var board = new Layout({
            container: container,
            margin: 10,
            cols: [
                { id: 'global-links', width: 0.25 },
                { id: 'local-links', width: 0.25 },
                { id: 'terminal-metrics',  width: 0.5},
            ]
        });


        views.terminals = new Panel({
            container: board.cell('terminal-metrics'),
            id: "panel-terminals",
            title: "Terminals",
            padding: 20,
            header: {height: 0.05, style: {backgroundColor: '#F4F4F4'}}
        });
        views.localLinks = new Panel({
            container: board.cell('local-links'),
            id: "panel-local-links",
            title: "Local Links",
            padding: 20,
            header: {height: 0.05, style: {backgroundColor: '#F4F4F4'}}
        });
        views.globalLinks = new Panel({
            container: board.cell('global-links'),
            id: "panel-global-links",
            title: "Global Links",
            padding: 20,
            header: {height: 0.05, style: {backgroundColor: '#F4F4F4'}}
        });
        stats.update = function(data) {
            Object.keys(views).forEach(function(vk){
                views[vk].clear();
            })
            var result = transform(data);
            numJobs = result.numJobs;

            visualize(result);
        }

        return stats;
    }

    function visualize(data) {

        var vis = {};

        vis.localLinks = p4gl({
            data: data.localLinks,
            container: views.localLinks.body,
            config: {
                padding: {left: 70, right: 20, top: 10, bottom: 70},
                viewport: [views.localLinks.innerWidth, views.localLinks.innerHeight]
            },
            views: dualView(views.localLinks.innerWidth, views.localLinks.innerHeight)
        })
        .visualize({
            id: "plot-local-links",
            mark: "point",
            x: "traffic",
            y: "sat_time",
            color: 'steelblue',
            alpha: 0.5
        })

        vis.localLinks
        .aggregate({
            $bin: 'traffic',
            total_sat_time : {$sum: "sat_time"},
        })
        .visualize({
            id: 'plot-stats',
            mark: "bar",
            x: "traffic",
            y: "total_sat_time",
            color: 'steelblue'
        });

        p4gl({
            data: data.globalLinks,
            container: views.globalLinks.body,
            config: {
                padding: {left: 70, right: 20, top: 10, bottom: 70},
                viewport: [views.globalLinks.innerWidth, views.globalLinks.innerHeight]
            },
            views: dualView(views.globalLinks.innerWidth, views.globalLinks.innerHeight)
        })
        .visualize({
            id: "plot-global-links",
            mark: "point",
            x: "traffic",
            y: "sat_time",
            color: 'purple',
            alpha: 0.5
        })
        .aggregate({
            $bin: 'traffic',
            total_sat_time : {$sum: "sat_time"},
        })
        .visualize({
            id: 'plot-stats',
            mark: "bar",
            x: "traffic",
            y: "total_sat_time",
            color: 'purple'
        });

        var terminalColorEncoding = (numJobs == 1) ? 'teal' : 'job_id';

        vis.terminals = p4gl({
            data: data.terminals,
            container: views.terminals.body,
            config: {
                padding: {left: 70, right: 50, top: 30, bottom: 70},
                viewport: [
                  views.terminals.innerWidth,
                  views.terminals.innerHeight
                ]
            },
            views: triView(views.terminals.innerWidth, views.terminals.innerHeight)
        })
        // .filter({
        //     terminal_id: [0, 1000]
        // })
        .visualize({
            id: "terminals",
            mark: "line",
            y: [ "terminal_id", "avg_packet_latency", "avg_hops", "data_size", "sat_time"],
            color: terminalColorEncoding,
            alpha: 0.25
        })
        // .visualize({
        //     id: "plot-global-links",
        //     mark: "point",
        //     x: "data_size",
        //     y: "sat_time",
        //     color: 'purple',
        //     alpha: 0.5
        // })
        // .derive({
        //     gid: 'floor(group_id / 5.0)'
        // })
        // .filter({
        //     avg_hops: [2, 3]
        // })
        // .register('branch')
        .aggregate({
            // $group: 'terminal_id',
            $bin: 'avg_packet_latency',
            avg_hops: {$avg: "avg_hops"},
        })
        .visualize({
            id: 'avg_packet_latency',
            mark: "bar",
            x: "avg_packet_latency",
            y: "avg_hops",
            color: 'teal',
            // interact: function(d) {
            //     console.log(d);
            // }
        })
        //
        vis.terminals
        .head()
        .aggregate({
            $bin: 'data_size',
            Total_sat_time : {$sum: "sat_time"},
        })
        .visualize({
            id: 'sattime',
            mark: "bar",
            x: "data_size",
            y: "Total_sat_time",
            color: 'teal'
        });
    }

});
