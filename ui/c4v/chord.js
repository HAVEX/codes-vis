define(function(require){
    const pipeline = require('p4/core/pipeline'),
        colorSchemes = require('i2v/colors');

    return function Chord(arg) {
        var options = arg || {},
            container = options.container || "body",
            data = options.data,
            vmap = options.vmap,
            width = options.width || 800,
            height = options.height || width,
            radius = options.radius || Math.min(width/2, height/2),
            padding = options.padding || 0.1,
            domain = options.domain || null,
            colors = options.colors || ['steelblue', 'red'],
            hover = options.hover || function(d) {};

        if(!vmap.hasOwnProperty("size"))
            vmap.size = 'count';

        var matrix = data.map(function(rows){
            return rows.map(function(row){
                return row[vmap.size];
            });
        });

        var chord = d3.layout.chord()
            .padding( 0.1)
            .sortSubgroups(d3.descending)
            .matrix(matrix);

        var colorValues = [];

        data.forEach(function(rows){
            rows.forEach(function(row){
                colorValues = colorValues.concat(row[vmap.color]);
            });
        });

        var colorDomain = [Math.min.apply(null, colorValues), Math.max.apply(null, colorValues)];

        var colorScale;

        if(typeof colors == 'string') {
            colorScale = function(d) {
                var pos = d3.scale.linear()
                    .domain([colorDomain[0], colorDomain[1]])
                    .range([0, colorSchemes(colors).colors.length-1])(d);

                return colorSchemes(colors).colors[Math.floor(pos)];
            }
        } else {
            colorScale = d3.scale.linear()
                .domain([colorDomain[0], colorDomain[1]])
                .range(colors);
        }

        var svg;
        if(typeof container.append === 'function') {
            svg = container;
        } else {
            var offset = Math.min((width / 2), (height / 2))
            svg = d3.select(container).append("svg")
              .attr("width", width)
              .attr("height", height)
              .append("g")
                  .attr("transform", "translate(" + offset + "," + offset + ")");
        }

        var ribbons = svg.append("g")
            .attr("class", "chord")
          .selectAll("path")
            .data(chord.chords)
          .enter().append("path")
            .attr("d", d3.svg.chord().radius(radius))
            .style("fill", function(d){
                var send = data[d.source.index][d.target.index][vmap.color];
                var recv =  data[d.target.index][d.source.index][vmap.color];
                return colorScale(Math.max(send, recv));
            })
            .style("stroke", "#FFF")
            .style("opacity", 1);

        chord.svg = svg;
        chord.colorDomain = colorDomain;
        return chord;
    }
})
