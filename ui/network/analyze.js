define(function(require) {
    // dependencies
    const loadData = require('./loadData'),
        circularVis = require('./circularvis');

    var spec = [
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
    ];

    var config = {
        container: '#page-main',
        width: 800,
        height: 800,
        padding: 20,
    }

    return function(dataset) {
        loadData({
            dataset: dataset,
            localLinkPerRouter: 10,
            globalLinkPerRouter: 5
        }, function(data){
            circularVis(config, spec, data);
        });
    }
});
