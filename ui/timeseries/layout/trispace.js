define(function(require){
    var Layout = require('davi/layout'),
        Panel = require('davi/panel'),
        Button = require('davi/button'),
        Icon = require('davi/icon'),
        ButtonGroup = require('davi/button-group'),
        ProgressBar = require('davi/progress');

    return function() {
        var trispace = new Layout({
            margin: 10,
            container: 'page-main',
            cols: [
                {
                    width: 0.42,
                    rows: [
                        {id: 'projectionView', width: 1.0},
                    ]
                },
                {
                    width: 0.58,
                    rows: [
                        {id: 'detailView', height: 0.72},
                        {id: 'timelineView', height: 0.28},
                        // {id: "controlView",height: 0.05},
                    ]
                },
            ]
        });

        var views = {};

        views.multidimension = new Panel({
            container: trispace.cell('detailView'),
            id: "panel-detail",
            title: "Detail View",
            header: {height: 36, style: {backgroundColor: '#F4F4F4'}}
        });

        views.detail = new Layout({
            margin: 10,
            container: views.multidimension.body,
            rows: [
                {id: 'detail-terminal', width: 0.5},
                {id: 'detail-router', width: 0.5}
            ]
        });

        views.timeline = new Panel({
            container: trispace.cell('timelineView'),
            id: "panel-timeline",
            title: "Timeline View",
            header: {height: 36, style: {backgroundColor: '#F4F4F4'}}
        });

        views.projection = new Panel({
            container: trispace.cell('projectionView'),
            id: "panel-projection",
            title: "Projection View",
            padding: 20,
            header: {height: 36, style: {backgroundColor: '#F4F4F4'}}
        });

        var projectionConfig = new Icon({
            types: ['setting', 'large'],
            onclick: function() {
            }
        });

        views.projection.header.append(projectionConfig);

        trispace.views = views;

        var buttons = {};
        buttons.linkTraffic = new Button({
            label: 'Link Traffic',
            types: ['blue'],
            size: '8px'
        });
        buttons.linkSaturation = new Button({
            label: 'Link Saturation',
            types: ['grey'],
            size: '8px'
        });
        buttons.terminalStat = new Button({
            label: 'Terminal Metrics',
            types: ['grey'],
            size: '8px'
        });
        buttons.timeline = new ButtonGroup({
            id: 'control-timeline',
            buttons: [
                buttons.linkTraffic,
                buttons.linkSaturation,
                buttons.terminalStat
            ]
        })
        views.timeline.header.append(buttons.timeline);
        trispace.buttons = buttons;

        return trispace;
    }

})
