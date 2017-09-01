var template = '' +
'<div id="specUI" class="ui form" style=" padding: 20px;">' +
  '<div class="fields"  style="width: 100%; background: #EEE; padding: 20px;">' +
    '<div class="twelve wide field">' +
      '<label>Aggregate by</label>' +
      '<select class="ui search dropdown" id="aggregation-attr">' +
      '</select>' +
    '</div>' +
    '<div class="four wide field">' +
      '<label>BinMax</label>' +
      '<input type="number" value="7" disable="" id="aggregation-binMax">' +
    '</div>' +
  '</div>' +
  '<table class="ui very basic celled table">' +
    '<thead>' +
      '<tr>' +
        '<th width="125">Projection</th>' +
        '<th>Visual Encoding</th>' +
        '<th width="180">Color Schemes</th>' +
      '</tr>' +
    '</thead>' +
    '<tbody id="specTable">' +
    '</tbody>' +
  '</table>' +

  '<div class="fields">' +
    '<div class="six wide field" style="text-align: right;">' +
      '<button id="add-layer" class="ui button blue">Add Layer</button>' +
      '<button id="remove-layer" class="ui button red">Remove Layer</button>' +
    '</div>' +
    '<div class="eight wide field ui action input">' +
      '<input type="text" placeholder="Name this config...">' +
      '<button id="save-spec" class="ui button green">Save</button>' +
    '</div>' +
  '</div>' +
'</div>';


define(function(require){
    const colorLegend = require('../c4v/colorLegend');

    var layers = [];

    var colorSchemes = [
        ["#eee", 'steelblue'],
        ["#eee", 'purple'],
        ["#eee", 'teal'],
        ["steelblue", '#E00'],
        'YlGn',
        'Reds',
        'Blues',
        'RdYlGn'
    ];

    var entities = [
        'global_links',
        'local_links',
        // 'router',
        'terminals'
    ];

    const METRICS_NULL = ' --- ';

    var linkMetrics = [
        METRICS_NULL,
        'traffic',
        'sat_time',
    ];

    var terminalMetrics = [
        METRICS_NULL,
        'avg_packet_latency',
        'avg_hops',
        'data_size',
        'sat_time',
        'router_port',
        'router_rank',
    ];
    return function(arg) {
        var options = arg || {},
            container = options.container
            onSave = options.onsave || options.onSave || function(){};

        $('#'+container).html(template);



        var aggrAttr = 'router_rank';

        var metrics = {
            local_links: linkMetrics,
            global_links: linkMetrics,
            terminals: terminalMetrics,
        }

        function updateSelection(sel, options, selectedAttr) {
            var index = (options.indexOf(selectedAttr) > -1) ? options.indexOf(selectedAttr) : 0;
            sel.html('');
            options.forEach(function(opt, ii){
                sel.append($('<option/>').attr('value', opt).text(opt));
            })
            sel.dropdown('set value', options[index]);
            sel.dropdown('set text', options[index]);
            sel.dropdown('refresh');
        }

        function createLayer(arg) {
            var spec = arg || {},
                vmap = spec.vmap || {},
                projectEntity = spec.project || 'global_links',
                colorAttr = vmap.color || null,
                sizeAttr = vmap.size || null,
                xAttr = vmap.x || null,
                yAttr = vmap.y || null,
                colorMap = spec.colors,
                aggregate = spec.aggregate || false;

            if(arg && !spec.vmap) return;

            if(!spec.aggregate) aggregate = true;

            var tr = $('<tr/>'),
                td1 = $('<td/>'),
                td2 = $('<td/>'),
                td3 = $('<td/>'),
                projection = $('<select/>').addClass('ui fluid dropdown'),
                field = $('<div/>').addClass('field');

            var boxLabel = $('<label/>').text('Aggregate'),
                checkbox = $('<div/>').addClass('ui checkbox'),
                boxInput = $('<input/>')
                    .attr('type', 'checkbox')
                    .attr('tabindex', '0')
                    .addClass('hidden');

            var div1 = $('<div/>').addClass('two fields'),
                sizeField = $('<div/>').addClass('field'),
                colorField = $('<div/>').addClass('field'),
                size = $('<select/>').addClass('ui fluid dropdown').attr('vmap', 'size'),
                color = $('<select/>').addClass('ui fluid dropdown').attr('vmap', 'color');

            sizeField.append($('<label/>').text('Size'));
            sizeField.append(size);
            colorField.append($('<label/>').text('Color'));
            colorField.append(color);

            var div2 = $('<div/>').addClass('two fields'),
                cxField = $('<div/>').addClass('field'),
                cyField = $('<div/>').addClass('field'),
                cx= $('<select/>').addClass('ui fluid dropdown').attr('vmap', 'x'),
                cy = $('<select/>').addClass('ui fluid dropdown').attr('vmap', 'y');

            cxField.append($('<label/>').text('Angular (x)'));
            cxField.append(cx);
            cyField.append($('<label/>').text('Radial (y)'));
            cyField.append(cy);

            function updateDropDown(en) {
                updateSelection(size, metrics[en], sizeAttr);
                updateSelection(color, metrics[en], colorAttr);
                if(metrics[en].length > 3) {
                    div2.css('display', 'flex');
                    updateSelection(cx, metrics[en], xAttr);
                    updateSelection(cy, metrics[en], yAttr);
                } else {
                    div2.css('display', 'none');
                }
            }

            updateDropDown(entities[0]);

            checkbox.append(boxLabel);
            checkbox.append(boxInput);
            if(aggregate)
                checkbox.checkbox('check');
            else
                checkbox.checkbox();
            field.append(projection);
            td1.append(field, checkbox);

            div1.append(colorField, sizeField);
            div2.append(cxField, cyField);
            td2.append(div1, div2);

            var colorMenuDiv = $('<div/>')
                .addClass('ui fluid selection dropdown')
                .css('padding', '10px 4px'),
                colorMenu = $('<div/>').addClass('menu'),
                colorDisplay = $('<div/>').addClass('default text');

            colorMenuDiv.append($('<i/>').addClass('dropdown icon'));
            colorMenuDiv.append(colorDisplay);

            colorMenuDiv.append(colorMenu);

            colorSchemes.forEach(function(cs){
                var item = $('<div/>').addClass('item').attr('data-value', cs);


                var colorGardient = colorLegend({
                    width: 120,
                    height: 20,
                    padding: {left: 0, right: 0, top: 0, bottom: 0},
                    colors: cs,
                    nolabel: true
                })

                if(JSON.stringify(cs) == JSON.stringify(colorMap)) {
                    colorDisplay.append(colorGardient.svg);
                    item.addClass('active selected');
                }

                item.append(colorGardient.svg);
                colorMenu.append(item);

            })
            colorMenuDiv.dropdown();

            td3.append(colorMenuDiv);

            tr.append(td1, td2, td3);
            $('#specTable').append(tr);
            updateSelection(projection, entities, projectEntity);
            updateDropDown(projectEntity);

            projection.change(function() {
                var v = $(this).val();
                updateDropDown(v);
            })

            function getLayerSpec(id) {
                var spec = {},
                    sizeAttr = size.val(),
                    colorAttr = color.val(),
                    xAttr = cx.val(),
                    yAttr = cy.val(),
                    colorScheme = colorMenuDiv.dropdown('get value').split(','),
                    vmap = {};

                if(colorScheme.length == 1) colorScheme = colorScheme[0];

                if(sizeAttr != METRICS_NULL) vmap.size = sizeAttr;
                if(colorAttr != METRICS_NULL) vmap.color = colorAttr;
                if(xAttr != METRICS_NULL && xAttr !== null) vmap.x = xAttr;
                if(yAttr != METRICS_NULL && yAttr !== null) vmap.y = yAttr;

                if(aggregate) {
                    spec.aggregate = (aggrAttr == 'router_rank')
                        ? 'router_port'
                        : 'router_rank';

                    if(id === 0) spec.aggregate = aggrAttr;
                }

                spec.project = projection.val();
                spec.vmap = vmap;
                spec.colors = colorScheme;

                return spec;
            }

            return {
                getSpec: getLayerSpec,
                remove: function() {tr.html('')}
            }
        }


        function getSpec() {
            return layers.map(function(layer, li){
                return layer.getSpec(li);
            });
        }

        updateSelection(
            $('#aggregation-attr'),
            ['group_id', 'router_rank', 'router_port', 'job_id', 'traffic', 'sat_time']
        );

        $('#aggregation-attr').change(function(){
            aggrAttr = $(this).val();
            console.log(aggrAttr);
        })

        $("#add-layer").click(function(){
            layers.push(createLayer());
        })

        $("#save-spec").click(function(){
            onSave(getSpec());
        })

        $("#remove-layer").click(function(){
            if(layers.length)
                layers.pop().remove();
        })

        $('.ui.dropdown').dropdown();

        function clearGUI() {
            $('#specTable').html('');
        }

        function createGUI(specs) {
            $('#aggregation-attr').dropdown('set value', specs[0].aggregate);
            $('#aggregation-attr').dropdown('set text', specs[0].aggregate);
            $('#aggregation-attr').dropdown('refresh');
            aggrAttr = specs[0].aggregate;
            clearGUI();
            specs.forEach(function(spec, si){
                var l = createLayer(spec);
                if(l) layers[si] = l;
            })
            $('.item.active.selected').trigger('click');
        }

        return {
            getSpec: getSpec,
            create: createGUI,
            clear: clearGUI
        }

    }
})
