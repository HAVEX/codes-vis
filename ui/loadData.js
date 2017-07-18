define(function(require){
    const ajax = require('p4/io/ajax'),
        dsv = require('p4/io/parser'),
        dataStruct = require('p4/core/datastruct'),
        cstore = require('p4/cquery/cstore');

    const LOCAL_LINK_COUNT = 34,
        GLOBAL_LINK_COUNT = 4;

    const TERMINAL_METRICS = ["lp_id", "terminal_id", "data_size", "avg_packet_latency", "packets_finished", "avg_hops", "busy_time"];
    const LINK_METRICS = ["group_id", "router_id", "port", "sat_time", "traffic"];

    return function(dataset, callback) {
        ajax.getAll([
            {url: 'data/' + dataset + "/dragonfly-msg-stats", dataType: "text"},
            {url: 'data/' + dataset + "/dragonfly-router-stats", dataType: "text"},
            {url: 'data/' + dataset + "/dragonfly-router-traffic", dataType: "text"}
        ]).then(function(text){

            var terminals = dataStruct({
                array: dsv(text[0], " "),
                header: TERMINAL_METRICS,
                types: ["int", "int", "int", "float", "float", "float", "float"],
                skip: 1
            }).objectArray();

            var busytime = dataStruct({
                array: dsv(text[1], " "),
                header: ["ws", "lp_id", "group_id", "router_id", "local_busy_time", "global_busy_time"],
                types: ["string", "int", "int", "int", "veci"+LOCAL_LINK_COUNT, "veci"+GLOBAL_LINK_COUNT],
                skip: 2,
            }).objectArray();

            var traffic = dataStruct({
                array: dsv(text[2], " "),
                header: ["ws", "lp_id", "group_id", "router_id", "local_traffic", "global_traffic"],
                types: ["string", "int", "int", "int", "veci"+LOCAL_LINK_COUNT, "veci"+GLOBAL_LINK_COUNT],
                skip: 2,
            }).objectArray();

            var localLinks = [],
                globalLinks = [];

            busytime.forEach(function(l, li){
                l.local_busy_time.forEach(function(b, bi){
                    var link = {};
                    link.group_id = l.group_id;
                    link.router_id = l.router_id;
                    link.port = bi;
                    link.sat_time = b;
                    link.traffic = traffic[li].local_traffic[bi];
                    // localLinks.push(link);
                    localLinks.push([l.group_id, l.router_id, bi, link.sat_time, link.traffic]);

                });

                l.global_busy_time.forEach(function(g, gi){
                    var link = {};
                    link.group_id = l.group_id;
                    link.router_id = l.router_id;
                    link.port = gi;
                    link.sat_time = g;
                    link.traffic = traffic[li].global_traffic[gi];
                    globalLinks.push([l.group_id, l.router_id, gi, link.sat_time, link.traffic]);
                    // globalLinks.push(link);
                });
            })

            var result = {},
                db = {};

            db = cstore({
                size: terminals.length,
                keys: TERMINAL_METRICS,
                types: ["int", "int", "int", "float", "float", "float", "float"]
            })
            db.addRows(dsv(text[0], " "));
            result.terminals = db.data();
            result.terminals.stats = db.stats();

            db = cstore({
                size: localLinks.length,
                keys: LINK_METRICS,
                types: ["int", "int", "int", "float", "int"],
            })
            db.addRows(localLinks);
            result.localLinks = db.data();
            result.localLinks.stats = db.stats();

            db = cstore({
                size: globalLinks.length,
                keys: LINK_METRICS,
                types: ["int", "int", "int", "float", "int"],
            })
            db.addRows(globalLinks);
            result.globalLinks = db.data();
            result.globalLinks.stats = db.stats();

            callback(result);
        })
    }
})
