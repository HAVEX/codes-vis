define(function(){
    return {
            'Custom': [
                {},
            ],
            'Dragonfly intra-group': [
                {
                    aggregate: 'router_rank',
                    project: 'local_links',
                    vmap: {
                        size: 'traffic',
                        color: 'sat_time'
                    },
                    colors: 'Blues'
                },
                {
                    aggregate: 'router_port',
                    project: 'global_links',
                    vmap: {
                        size: 'traffic',
                        color: 'sat_time'
                    },
                    colors: 'PuOr'
                },
                {
                    aggregate: 'router_port',
                    project: 'terminals',
                    vmap: {
                        size: 'data_size',
                        color: 'sat_time'
                    },
                }
            ],
            'Dragonfly inter-group': [
                {
                    aggregate: 'group_id',
                    project: 'global_links',
                    binMax: 9,
                    vmap: {
                        size: 'traffic',
                        color: 'sat_time'
                    },
                    colors: 'Blues'
                },
                {
                    aggregate: 'router_port',
                    project: 'local_links',
                    vmap: {
                        size: 'traffic',
                        color: 'sat_time'
                    },
                    colors: 'PuOr'
                },
                {
                    project: 'terminals',
                    aggregate: 'router_port',
                    vmap: {
                        size: 'data_size',
                        color: 'sat_time'
                    },
                }
            ]
        }
})
