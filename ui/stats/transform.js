define(function(require){
    const loadData = require('../loadData'),
        toArray = require('p4/dataopt/toarray'),
        dataStruct = require('p4/core/datastruct'),
        cstore = require('p4/cquery/cstore');

    const TERMINAL_METRICS = ["lp_id", "terminal_id", "data_size", "avg_packet_latency", "packets_finished", "avg_hops", "sat_time", "job_id", "router_id", "router_rank", "router_port", "group_id"];
    const LINK_METRICS = ["group_id", "router_id", "router_port", "sat_time", "traffic"];

    return function(input) {
        var result = {},
            db = {};
        console.log(Object.keys(input.terminals[0]))
        db = cstore({
            size: input.terminals.length,
            keys: Object.keys(input.terminals[0]),
            types: ["int", "int", "int", "float", "float", "float", "float", "int", "int", "int", "int", "int"]
        })
        db.addRows(toArray(input.terminals));
        result.terminals = db.data();
        result.terminals.stats = db.stats();

        db = cstore({
            size: input.localLinks.length,
            keys: Object.keys(input.localLinks[0]),
            types: ["int", "int", "int", "int", "float", "int", "int"],
        })
        db.addRows(toArray(input.localLinks));
        result.localLinks = db.data();
        result.localLinks.stats = db.stats();

        db = cstore({
            size: input.globalLinks.length,
            keys: Object.keys(input.globalLinks[0]),
            types: ["int", "int", "int", "int", "float", "int", "int"],
        })

        db.addRows(toArray(input.globalLinks));
        result.globalLinks = db.data();
        result.globalLinks.stats = db.stats();
        result.numJobs = input.numJobs;
        return result;
    }
})
