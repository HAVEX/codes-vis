define(function(require) {

    const ace = require('ace/ace'),
        UI = require('davi/ui'),
        Layout = require('davi/layout'),
        Panel = require('davi/panel'),
        List = require('davi/list'),
        // Table = require('davi/table'),
        Icon = require('davi/icon'),
        Button = require('davi/button');

    const transform = require('./transform'),
        circularVis = require('./circularvis'),
        specifications = require('./projections');

        // colorLegend = require('./colorLegend');
    var guiHTML = require('text!./spec-gui.html'),
        gui = require('./gui');

    return function(arg) {
        var network = {},
            data = arg.data|| null,
            onUpdate = arg.onupdate || arg.onUpdate || function() {},
            container = arg.container || document.body;

        var layoutMain = new Layout({
            container: container,
            margin: 10,
            cols: [
                {
                    width: 0.55,
                    id: 'network-view'
                },
                {
                    width: 0.45,
                    id: 'spec-view'
                },
                // {
                //     width: 0.20,
                //     id: 'data-info',
                // },
            ]
        });

        var views = {},
            visSpec = [];

        // if(typeof data !== undefined)
        //     data = transform(data);

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

        // views.info = new Panel({
        //     container: layoutMain.cell('spec-view'),
        //     id: "panel-info",
        //     title: "Information",
        //     header: {height: 0.05, style: {backgroundColor: '#F4F4F4'}}
        // });


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

        var guiDiv = document.createElement('div');
        guiDiv.setAttribute('id', 'spec-gui');
        guiDiv.style.width = "100%";
        guiDiv.style.height = views.editor.innerHeight + 'px';
        guiDiv.style.display = "none";
        guiDiv.style.overflow = "scroll";
        // guiDiv.innerHTML = guiHTML;
        views.editor.append(guiDiv);

        var specGUI = gui({
            container: 'spec-gui',
            onsave: function(d) { console.log(d);}
        });

        var showEditor = true;
        ace.config.set("packaged", true)
        ace.config.set("basePath", require.toUrl("ace"))
        var editor = ace.edit("spec-editor");
        editor.setTheme("ace/theme/clouds");
        editor.getSession().setMode("ace/mode/json");
        editor.$blockScrolling = Infinity;
        editor.setOptions({
            fontSize: "15pt"
        });
        visSpec = specifications[Object.keys(specifications)[1]];

        editor.session.insert({row:0, column: 0}, JSON.stringify(visSpec, null, 2));

        var config = {
            container: '#panel-network-body',
            width: views.network.innerWidth,
            height:  views.network.innerHeight,
            padding: 0,
        };

        views.editor.header.append(new Icon({
            types: ['edit', 'large', 'blue'],
            onclick: function(){

                if(showEditor) {
                    visSpec = JSON.parse(editor.getValue());
                    specGUI.create(visSpec);
                    this.className = this.className.replace(' blue', '');
                } else {
                    visSpec = specGUI.getSpec();
                    editor.setValue("")
                    editor.session.insert({row:0, column: 0}, JSON.stringify(visSpec, null, 2));

                    this.className += ' blue';
                }

                showEditor = !showEditor;
                editorDiv.style.display = (showEditor) ? 'block': 'none';
                guiDiv.style.display = (showEditor) ? 'none': 'block';
            }
        }))

        var updateButton = new Button({
             label: 'Update',
             types: ['primary', 'xs'],
             size: '0.65em',
             onclick: function() {
                if(showEditor)
                    visSpec = JSON.parse(editor.getValue());
                else
                    visSpec = specGUI.getSpec();

                views.network.clear();
                circularVis(config, visSpec, data);
                network.onUpdate(visSpec);
             }
        });
        views.editor.header.append(updateButton);

        network.update = function(input) {
            data = transform(input);
            views.network.clear();
            visSpec = JSON.parse(editor.getValue());
            circularVis(config, visSpec, data);
        }

        network.getSpec = function() {
            return visSpec;
        }

        network.onUpdate = onUpdate;

        return network;
    }
});
