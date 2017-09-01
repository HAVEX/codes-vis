define(function(require){
    const getStats = require('p4/dataopt/stats'),
        colorSchemes = require('i2v/colors');

    return function Bars(arg) {
        var options = arg || {},
            container = options.container || "body",
            data = options.data,
            vmap = options.vmap,
            width = options.width || 800,
            height = options.height || width,
            outerRadius = options.outerRadius || Math.min(width/2, height/2),
            innerRadius = options.innerRadius || outerRadius / 4,
            padding = options.padding || 0.05,
            domain = options.domain || null,
            stats = options.stats || null,
            colors = options.colors || ['white', 'steelblue'],
            hover = options.hover || function(d) {};


        var chords = container.groups();
        var dataItems = [];
        chords.forEach(function(chord, ci){
            var delta = (chord.endAngle - chord.startAngle ) / data[ci].length;
            data[ci].forEach(function(d, di){
                var start =  chord.startAngle + di*delta;
                d.startAngle = start;
                d.endAngle = start + delta;
                d.index = chord.index;
            })
            dataItems = dataItems.concat(data[ci]);
        })

        var svg = container.svg;

        var bars = svg.append("g")
            .attr("transform", "translate(" + (width / 2) + "," + (height / 2) + ")");

        var getSize = function() { return outerRadius; },
            getColor = (typeof colors === 'function') ? colors : function() { return colors[0]};

        if(stats === null) {
            stats = getStats(dataItems, Object.keys(vmap).map(function(k){ return vmap[k]; }));
        }

        if(vmap.color && typeof(colors) != 'function') {
            if(stats[vmap.color].max == stats[vmap.color].min) stats[vmap.color].max+=0.000001;

            if(typeof colors == 'string') {
                getColor = function(d) {
                    var pos = d3.scale.linear()
                        .domain([stats[vmap.color].min, stats[vmap.color].max])
                        .range([0, colorSchemes(colors).colors.length-1])(d);

                    return colorSchemes(colors).colors[Math.floor(pos)];
                }
            } else {
                getColor =  d3.scale.linear()
                    .domain([stats[vmap.color].min, stats[vmap.color].max])
                    .range(colors);
            }
        }

        if(vmap.size) {
            getSize =  d3.scale.pow().exponent(0.9)
                .domain([stats[vmap.size].min, stats[vmap.size].max])
                .range([innerRadius, outerRadius]);
        }

        function createArc(d) {
            return d3.svg.arc()
                .innerRadius(innerRadius)
                .outerRadius(getSize(d[vmap.size]))
                (d);
        }

        var visualElement = svg.append("g").selectAll("path")
            .data(dataItems)
          .enter().append("path")
            .style("fill", function(d) { return getColor(d[vmap.color]); })
            // .style("stroke", function(d) { return getColor(d[vmap.color]); })
            .style("stroke", '#fff')
            .style("stroke-width", 0.5)
            // .style("fill-opacity", function(d){return getOpacity(d[opacityAttr])})
            .attr("d", createArc)
            // .on("mouseover", highlight)
            // .on("mouseout", unhighlight);

        // visualElement
        //     .style("stroke", '#fff')
        //     .style("stroke-width", 0.5);
        bars.svg = svg;
        bars.colorDomain = [stats[vmap.color].min, stats[vmap.color].max];
        return bars;
    }
})
