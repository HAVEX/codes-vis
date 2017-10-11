define(function(require) {

    const loadData = require('../loadData');

    const Panel = require('davi/panel'),
        List = require('davi/list'),
        Table = require('davi/table'),
        Icon = require('davi/icon'),
        Button = require('davi/button');

    var datasets = require('/data/datasets.js'),
        selectedDatasetId = 2;

    return function(arg) {
        var dataManager = {},
            options = arg || {},
            container = options.container,
            oncancel = options.oncancel || function(){},
            onselect = options.onselect || function(){};

        dataManager.onselect = onselect;
        dataManager.data = datasets[Object.keys(datasets)[0]];

        var dataPanel = new Panel({
            container: document.getElementById(container),
            padding: 20,
            margin: 20,
            id: "panel-datalist",
            title: "Dataset",
            style: {
                border: 'none',
                height: 'auto'
            },
            header: {height: 0.075, style: {backgroundColor: '#FFF', border: 'none'}}
        });


        // var dataList = new List({
        //     container: dataPanel.body,
        //     types: ['selection', 'single', 'divided'],
        //     selectedColor: 'blue',
        //     onselect: function(d) {
        //         selectedDatasetId = d;
        //         // selectedDataset = d;
        //         // var ds = datasets[selectedDataset];
        //         // transform(ds).then(function(d){
        //         //     data = d;
        //         //     var newSpec = JSON.parse(editor.getValue());
        //         //     views.network.clear();
        //         //     circularVis(config, newSpec, data);
        //         // });
        //     }
        // })
        // datasets.forEach(function(ds){
        //     dataList.append({
        //         header: ds.tag,
        //         icon: 'cloud download big',
        //         text: ds.groups + ' groups, ' + ds.routers + ' routers, ' + ds.terminals + ' terminals'
        //     })
        // })
        //

        var dataList = new Table({
            container: dataPanel.body,
            width: dataPanel.innerWidth,
            cols: ['Dataset ID', 'Topology Model', '#Groups', '#Routers', "#Terminals", 'Description', 'Action']
        });

        datasets.forEach(function(ds, di){
            dataList.addRow([di, ds.topology, ds.groups, ds.routers, ds.terminals, ds.tag, new Button({
                label: 'Select',
                types: ['primary'],
                onclick: update.bind(null, di)})]);
        })

        // dataList.setSelectedItemIds([selectedDatasetId]);

        function update(dsID) {

            loadData(datasets[dsID])
            .then(function(data) {
                dataManager.data = data;
                dataManager.onselect(data, datasets[dsID]);
            });
        }

        // dataPanel.append(new Button({
        //     label: 'Select',
        //     types: ['primary'],
        //     onclick: function() {
        //         update();
        //     }
        // }));

        var actionDiv = document.createElement('div');
        actionDiv.className = "actions";

        var fileUploadButton = new Button({
            label: ' Open Files ',
            types: ['primary', 'center'],
            icon: 'folder open',
            fileInput: {id: 'testFileUpload', onchange:function() {}}
        });

        actionDiv.append(fileUploadButton);

        actionDiv.append(new Button({
            label: 'Cancel',
            types: ['orange'],
            onclick: oncancel
        }))
        dataPanel.append(actionDiv);


        update(0);

        return dataManager;
    }
})
