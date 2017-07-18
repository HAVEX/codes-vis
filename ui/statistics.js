define(function(require) {
    // dependencies
    const p4gl = require('adav/adav');
    const Layout = require('vastui/layout');
    const Panel = require('vastui/panel');

    return function(data) {
        var trispace = new Layout({
            margin: 10,
            container: 'page-main',
            rows: [
                {
                    height: 0.5,
                    id: 'terminal-metrics',
                },
                {
                    height: 0.5,
                    cols: [
                        {id: 'local-links', width: 0.49},
                        {id: 'global-links', width: 0.5},
                    ]
                },
            ]
        });

        var views = {};

        views.terminals = new Panel({
            container: trispace.cell('terminal-metrics'),
            id: "panel-terminals",
            title: "Terminals",
            header: {height: 0.07, style: {backgroundColor: '#F4F4F4'}}
        });

        views.localLinks = new Panel({
            container: trispace.cell('local-links'),
            id: "panel-local-links",
            title: "Local Links",
            header: {height: 0.07, style: {backgroundColor: '#F4F4F4'}}
        });
        views.globalLinks = new Panel({
            container: trispace.cell('global-links'),
            id: "panel-global-links",
            title: "Global Links",
            header: {height: 0.07, style: {backgroundColor: '#F4F4F4'}}
        });
        p4gl({
            data: data.localLinks,
            container: views.localLinks.body,
            config: {
                padding: {left: 100, right: 50, top: 10, bottom: 70},
                viewport: [views.localLinks.innerWidth*0.8, views.localLinks.innerHeight*0.7]
            },
        })
        .visualize({
            id: "plot-local-links",
            mark: "point",
            x: "traffic",
            y: "sat_time",
            color: 'steelblue',
            alpha: 0.5
        });

        p4gl({
            data: data.globalLinks,
            container: views.globalLinks.body,
            config: {
                padding: {left: 100, right: 50, top: 10, bottom: 70},
                viewport: [views.globalLinks.innerWidth*0.8, views.globalLinks.innerHeight*0.7]
            },
        })
        .visualize({
            id: "plot-global-links",
            mark: "point",
            x: "traffic",
            y: "sat_time",
            color: 'green',
            alpha: 0.5
        });

        p4gl({
            data: data.terminals,
            container: views.terminals.body,
            config: {
                padding: {left: 100, right: 50, top: 30, bottom: 10},
                viewport: [views.terminals.innerWidth*0.8, views.terminals.innerHeight*0.8]
            },
        })
        .visualize({
            id: "terminals",
            mark: "line",
            y: ["terminal_id", "avg_packet_latency", "avg_hops", "data_size", "busy_time"],
            color: 'teal',
            alpha: 0.25
        })
    }

});
