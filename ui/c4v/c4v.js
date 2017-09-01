define(function(require){
    const
        aggregate = require('p4/dataopt/aggregate'),
        arrays = require('p4/core/arrays'),
        pipeline = require('p4/core/pipeline'),
        chord = require('./chord'),
        texts = require('./text'),
        bars = require('./bars'),
        stats = require('p4/dataopt/stats'),
        colorLegend = require('./colorLegend');

    return function hcvis(spec) {
        var layers = spec.layers;
            layerTotal = layers.length,
            rings = new Array(layerTotal);

        var config = spec.config,
            width = config.width || 800,
            height = config.height || width,
            padding = config.padding || 10,
            outerRadius = config.outerRadius || Math.min(width/2, height/2),
            innerRadius = config.innerRadius || Math.min(width/4, height/4),
            container = config.container || "body";

        outerRadius -= padding;

        var cirRange = outerRadius - innerRadius - padding,
            cirOffset = innerRadius,
            sectionRadius = cirOffset,
            cirSize = layers
                .map(function(layer){ return layer.size; })
                .reduce(function(a,b){return a+b;});

        layers.forEach(function(s, si){
            var sectionRadiusRange =  cirOffset + s.size / cirSize * cirRange,
                cirPadding = 0.05 * sectionRadiusRange,
                sectionRadius = 0.95 * sectionRadiusRange,
                colorDomain = ['min', 'max'];

            if(s.type == 'link') {
                rings[si] = chord({
                    container: container,
                    data: s.data,
                    width: width,
                    height: height,
                    colors: s.colors,
                    radius: cirOffset,
                    vmap: s.vmap
                });
                container = rings[si];

            }
            else if(s.type == 'bar') {
                rings[si] = bars({
                    container: container,
                    data: s.data,
                    innerRadius: cirOffset,
                    outerRadius: sectionRadius,
                    colors: s.colors,
                    vmap: s.vmap || s.encoding,
                });
                cirOffset = sectionRadius + cirPadding;
            } else if(s.type == 'text') {
                s.container = container;
                s.radius = cirOffset;
                rings[si] = texts(s);
                cirOffset = sectionRadius + cirPadding;
            }

            if(s.type !== 'text' && s.vmap) {
                if(rings[si].colorDomain) colorDomain = rings[si].colorDomain;
                colorLegend({
                    container: container,
                    colors: s.colors,
                    height: height / layers.length / 6 ,
                    width: outerRadius / 2,
                    title: s.project + ' (' + ((s.vmap) ? s.vmap.color : null) + ')',
                    domain: colorDomain,
                    pos: [outerRadius/2+ padding*4, padding*4 + outerRadius/2 + outerRadius/2 / (layers.length-1) * si]
                })
            }

        })
        return rings;
    }
})
