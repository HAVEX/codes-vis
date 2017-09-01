define(function(require){
    const pipeline = require('p4/core/pipeline'),
        join = require('p4/dataopt/join'),
        arrays = require('p4/core/arrays'),
        toArray = require('p4/dataopt/toarray'),
        aggregate = require('p4/dataopt/aggregate');

    return function(inputData) {
        var terminals = pipeline().aggregate({
            $group: 'router_id',
            terminals: {$data: '*'},
        })
        .execute(inputData.terminals);

        var localLinks = pipeline().aggregate({
            $group: 'router_id',
            router_rank: {$first: 'router_rank'},
            group_id: {$first: 'group_id'},
            local_links: {$data: '*'}
        })
        .execute(inputData.localLinks);

        var globalLinks = pipeline().aggregate({
            $group: 'router_id',
            router_rank: {$first: 'router_rank'},
            group_id: {$first: 'group_id'},
            global_links: {$data: '*'}
        })
        .execute(inputData.globalLinks);

        var routers = join(join(terminals, localLinks), globalLinks);

        routers.forEach(function(router, ri){
            router.local_traffic = arrays.sum(router.local_links.map((d)=>(d.traffic)));
            router.global_traffic = arrays.sum(router.global_links.map((d)=>(d.traffic)));
            router.terminal_traffic = arrays.sum(router.terminals.map((d)=>(d.data_size)));
            router.job_id = router.terminals[0].job_id;
        })

        return routers;
    }
})
