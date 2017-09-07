define(function(require){
    var Layout = require('davi/layout'),
        Panel = require('davi/panel'),
        Button = require('davi/button'),
        Icon = require('davi/icon'),
        ButtonGroup = require('davi/button-group'),
        ProgressBar = require('davi/progress');

    return function(container) {
        var cols  = new Layout({
            margin: 10,
            container: container,
            cols: [
                {
                    id: "col-left",
                    width: 0.45,
                },
                {
                    id: "col-right",
                    width: 0.55,
                },
            ]
        });

        // var projectionView = new Layout({
        //     margin: 0,
        //     container: cols.cell('col-left'),
        //     rows: [
        //         { id: 'projectionView', height: 1.0},
        //     ]
        // })

        var temporalView = new Layout({
            margin: 0,
            container: cols.cell('col-right'),
            rows: [
                { id: 'detailView', height: 0.7},
                { id: 'timelineView', height: 0.3}
            ]
        })

        var views = {};

        views.multidimension = new Panel({
            container: temporalView.cell('detailView'),
            id: "panel-detail",
            padding: 20,
            title: "Detail View",
            header: {height: 36, style: {backgroundColor: '#F4F4F4'}}
        });

        views.detail = new Layout({
            margin: 0,
            container: views.multidimension.body,
            rows: [
                {id: 'detail-terminal', height: 0.5},
                {id: 'detail-router', height: 0.5}
            ]
        });

        views.dataPanel = new Panel({
            container: temporalView.cell('timelineView'),
            id: "panel-data-upload",
            title: "Upload Time-Series Data",
            style: {textAlign: 'center', overflow: 'scroll'},
            header: {height: 36, style: {borderBottom: '1px solid steelblue'}}
        });

        views.timeline = new Panel({
            container: temporalView.cell('timelineView'),
            id: "panel-timeline",
            title: "Timeline View",
            header: {height: 36, style: {backgroundColor: '#F4F4F4'}}
        });

        views.projection = new Panel({
            container: cols.cell('col-left'),
            id: "panel-projection",
            title: "Projection View",
            // height: cols.cell('col-left').clientHeight + 4,
            padding: 20,
            header: {height: 36, style: {backgroundColor: '#F4F4F4'}}
        });

        var projectionConfig = new Icon({
            types: ['setting', 'large'],
            onclick: function() {
            }
        });

        views.projection.header.append(projectionConfig);

        cols.views = views;

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
        cols.right = temporalView;
        cols.buttons = buttons;

        return cols;
    }

})
