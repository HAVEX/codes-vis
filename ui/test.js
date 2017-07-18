define(function(require) {
    // dependencies
    const loadData = require('./loadData');
    const statsAnalysis = require('./statistics');

    return function(dataset) {
        loadData(dataset, statsAnalysis);
    }

});
