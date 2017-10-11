define(function(require){
    var Layout = require('davi/layout'),
        Panel = require('davi/panel'),
        Button = require('davi/button'),
        ProgressBar = require('davi/progress');

    return function() {
        var gui = new Layout({
            margin: 10,
            container: 'page-main',
            cols: [
                {width: 0.45, id: 'specification'},
                {width: 0.55, id: 'projectionView'},
            ]
        });
        var views = {};
        views.specification = new Panel({
            container: gui.cell('specification'),
            id: "panel-specification",
            title: "Specification",
            header: {height: 40, style: {backgroundColor: '#F4F4F4'}}
        });
        views.projection = new Panel({
            container: gui.cell('projectionView'),
            id: "panel-projection-view",
            title: "Projection View",
            header: {height: 40, style: {backgroundColor: '#F4F4F4'}}
        });
        gui.views = views;
        return gui;
    }
})
