define(function(require) {

    var ace = require('ace/ace'),
        Layout = require('davi/layout'),
        Panel = require('davi/panel'),
        List = require('davi/list'),
        Icon = require('davi/icon'),
        Button = require('davi/button');

    const loadData = require('./loadData'),
        circularVis = require('./circularvis'),
        datasets = require('/data/datasets.js'),
        specifications = require('./default-projections');
        // colorLegend = require('./colorLegend');

    return function(dataset) {
        var layoutMain = new Layout({
            container: 'page-main',
            margin: 10,
            cols: [
                {
                    width: 0.40,
                    id: 'network-view'
                },
                {
                    width: 0.38,
                    id: 'spec-view'
                },
                {
                    width: 0.22,
                    id: 'data-list',
                },
            ]
        });
        var views = {},
            visSpec = [],
            data = {};

        views.network = new Panel({
            container: layoutMain.cell('network-view'),
            id: "panel-network",
            title: "Network Analysis",
            header: {height: 0.05, style: {backgroundColor: '#F4F4F4'}}
        });

        views.editor = new Panel({
            container: layoutMain.cell('spec-view'),
            id: "panel-spec",
            title: "Specification",
            header: {height: 0.05, style: {backgroundColor: '#F4F4F4'}}
        });

        views.datalist = new Panel({
            container: layoutMain.cell('data-list'),
            padding: 20,
            id: "panel-datalist",
            title: "Dataset",
            header: {height: 0.05, style: {backgroundColor: '#F4F4F4'}}
        });

        var selectedDatasets = [],
            selectedDataset = 0;
        var dataList = new List({
            container: views.datalist.body,
            types: ['selection', 'single'],
            selectedColor: 'blue',
            onselect: function(d) {
                selectedDataset = d;

                var ds = datasets[selectedDataset];

                 loadData(ds, function(d){
                     data = d;

                     var newSpec = JSON.parse(editor.getValue());
                     views.network.clear();
                     circularVis(config, newSpec, data);
                 });
            }
        })

        datasets.forEach(function(ds){
            dataList.append({
                header: ds.tag,
                icon: 'cloud download big',
                text: ds.groups + ' groups, ' + ds.routers + ' routers, ' + ds.terminals + ' terminals'
            })

        })

        // dataList.select(4);

        var projectionSelection = document.createElement('select');
        projectionSelection.style.marginRight = '5px';
        Object.keys(specifications).forEach(function(sk){
            var option = document.createElement('option');
            option.value = sk;
            option.innerHTML = sk;
            projectionSelection.appendChild(option);
        })

        projectionSelection.onchange = function(){
            editor.setValue("");
            editor.session.insert({row:0, column: 0}, JSON.stringify(specifications[this.value], null, 2));
        };

        views.editor.header.append('<span>Template: </span>');
        views.editor.header.append(projectionSelection);
        var editorDiv = document.createElement('div');
        editorDiv.setAttribute('id', 'spec-editor');
        editorDiv.style.width = "100%";
        editorDiv.style.height = "100%";
        views.editor.append(editorDiv);


        var showEditor = true;
        ace.config.set("packaged", true)
        ace.config.set("basePath", require.toUrl("ace"))
        var editor = ace.edit("spec-editor");
        editor.setTheme("ace/theme/clouds");
        editor.getSession().setMode("ace/mode/json");
        editor.$blockScrolling = Infinity;
        editor.setOptions({
            fontSize: "14pt"
        });
        visSpec=specifications[Object.keys(specifications)[1]];


        editor.session.insert({row:0, column: 0}, JSON.stringify(visSpec, null, 2));

        var config = {
            container: '#panel-network-body',
            width: views.network.innerWidth,
            height:  views.network.innerHeight,
            padding: 0,
        };
        var updateButton = new Button({
             label: 'Update',
             types: ['primary', 'xs'],
             size: '0.65em',
             onclick: function() {
                 var newSpec = JSON.parse(editor.getValue());
                 views.network.clear();
                 circularVis(config, newSpec, data);
             }
        });

        views.editor.header.append(new Icon({
            types: ['edit', 'large'],
            onclick: function(){
                showEditor = !showEditor;
                editorDiv.style.display = (showEditor) ? 'block': 'none';
            }
        }))
        views.editor.header.append(updateButton);
        views.datalist.header.append(new Button({
            label: 'Select',
            types: ['primary', 'xs'],
            size: '0.65em',
            onclick: function() {
                var ds = datasets[selectedDataset];

                 loadData(ds, function(d){
                     data = d;

                     var newSpec = JSON.parse(editor.getValue());
                     views.network.clear();
                     circularVis(config, newSpec, data);
                 });
             }
        }));

        views.datalist.header.append(new Button({
             label: 'Compare',
             types: ['teal', 'xs'],
             size: '0.65em',
             onclick: function() {

             }
        }));



    }
});
