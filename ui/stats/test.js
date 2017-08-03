define(function(require) {
    // dependencies
    const loadData = require('/stats/loadData.js');
    const statsAnalysis = require('/stats/statistics.js');

    return function(dataset) {
        loadData({
            dataset: dataset,
            localLinkPerRouter: 10,
            globalLinkPerRouter: 5
        }, statsAnalysis);
    }

});
