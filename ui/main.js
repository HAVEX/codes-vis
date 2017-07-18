define(function(require) {
    // dependencies
    var fullAnalysis = require('./fullAnalysis');
    var specification = require('./layout/specification');

    return function() {
        // specification();
        fullAnalysis();

    }

});
