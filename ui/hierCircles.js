define(["p4/core/pipeline", "i2v/format", "p4/dataopt/stats", "i2v/charts/glHeatmap"],
function(pipeline, printformat, p4Stats, Heatmap) {
    return function hierCircles(option) {
        console.log("hier cir");
        var data = option.data,
            width = option.width || 800,
            height = option.height || width,
            padding = option.padding || 5,
            container = option.container || "body",
            vmap = option.vmap,
            structs = option.structs || [],
            outerRadius = option.outerRadius || Math.min(width/2, height/2),
            innerRadius = option.innerRadius || outerRadius * (1 - Math.pow(structs.length, 0.8) / 5.5),
            numPartition = option.numPartition || structs[0].numPartition || 3,
            compareMode = option.compare || false,
            unhover = option.unhover || function() {},
            hover = option.hover || function(d) {console.log("hover circular view: ", d);};

        outerRadius -= padding;
        if(Array.isArray(numPartition)) numPartition = numPartition.length;

        var matrix = data.map(function(d){
            // return d.busytimes;
            // return d.traffics;
            var values;
            values = (structs[0].vmap.hasOwnProperty("size")) ?
             d[structs[0].vmap.size] : d[structs[0].vmap.color.split("_")[0]+"_count"];
            return values;
        });

        var chord = d3.layout.chord()
            .padding(0.05)
            .sortSubgroups(d3.descending)
            .matrix(matrix);

        function coord(r, d){
            return [
                 r*Math.cos(d- Math.PI / 2),
                 r*Math.sin(d- Math.PI / 2)
            ];
        }

        function vectorAdd(a, b){
            var c = [];
            a.forEach(function(v, i){
                c[i] = v + b[i];
            });

            return c;
        }

        function vectorSum(vectors){
            var result = vectors[0],
                len = vectors[0].length;

            for(var i = 1; i < len; i++){
                result = vectorAdd(result, vectors[i]);
            }

            return result;
        }

        function updateDomain(d1, d2) {
            var d = d1;
            if(typeof(d2) != 'undefined') {
                if(d2.max > d.max) d.max = d2.max;
                if(d2.min < d.min) d.min = d2.min;
            }
            return d;
        }


        var values = [];
        data.forEach(function(d){
            values = values.concat(d[structs[0].vmap.color]);
        });

        var colorDomain = {min: d3.min(values), max: d3.max(values) };

        if(compareMode) {
            if(!structs[0].hasOwnProperty("domains")){
                structs[0].domains = {};
                structs[0].domains[structs[0].vmap.color] = {};
            }
            colorDomain = updateDomain(colorDomain, structs[0].domains[structs[0].vmap.color]);
            structs[0].domains[structs[0].vmap.color].min = colorDomain.min;
            structs[0].domains[structs[0].vmap.color].max = colorDomain.max;
        }

        function linearDomain(domain, n){
            var step = (domain[1] - domain[0])/n,
                res = [];
            for(var i = domain[0]; i<domain[1]; i+=step) {
                res.push(i);
            }

            res.push(domain[1]);
            return res;
        }

        var holdFade = false;
        function fade(opacity) {
          return function(g, i) {
            if(!holdFade)
            svg.selectAll(".chord path")
                .filter(function(d) { return d.source.index != i && d.target.index != i; })
              .transition()
                .style("opacity", opacity);
          };
        }

        var colorScale = d3.scale.linear().domain(linearDomain([colorDomain.min, colorDomain.max], structs[0].colors.length)).range(structs[0].colors);

        if(typeof(structs[0].colorLegend) !== "undefined") structs[0].colorLegend.update([colorDomain.min, colorDomain.max], structs[0].colors);

        var svg = d3.select(container).append("svg")
            .attr("width", width)
            .attr("height", height)
          .append("g")
            .attr("transform", "translate(" + (width / 2 + padding) + "," + (height / 2 + padding) + ")");

        svg.append("g").selectAll("path")
            .data(chord.groups)
          .enter().append("path")
            .style("fill", "transparent")
            .style("stroke", "none")
            .attr("d", d3.svg.arc().innerRadius(innerRadius).outerRadius(outerRadius))
            .on("mouseover", fade(0.1))
            .on("mouseout", fade(1))
            .on("click", function(){holdFade=true;d3.select(this).style("stroke-width", 2).style("stroke", "#000")})
            .on("dblclick", function(){holdFade=false; d3.select(this).style("stroke", "none")});

        structs.slice(1).forEach(function(s){
            s.data = [];
        })
        var chordGroups = chord.groups();
        chordGroups.forEach(function(d, di){

            structs.slice(1).forEach(function(s){
                if(s.entity == "router"){
                    if(s.aggregate){

                        var entries = pipeline().group({
                            $by: 'router_rank',
                            router_id: "$addToSet",
                            total_global_traffic: "$sum",
                            total_global_busy_time: "$sum",
                            total_local_traffic: "$sum",
                            total_local_busy_time: "$sum",
                            group_id: "$addToArray"
                        }).sortBy({router_rank: 1})
                        .execute(data[d.index].data);

                        var delta = (d.endAngle - d.startAngle ) / entries.length;
                        entries.forEach(function(td, ti){
                            var start =  d.startAngle + ti*delta;
                            td.startAngle = start;
                            td.endAngle = start + delta;
                            td.pid = d.index;
                            td.global_traffic = td.total_global_traffic;
                            td.global_busy_time = td.total_global_busy_time;
                            td.local_traffic = td.total_local_traffic;
                            td.local_busy_time = td.total_local_busy_time;
                        });

                        s.data = s.data.concat(entries);
                        //aggregate router by link/port (maybe we don't need it anymore)
                        // var entry = {};
                        // Object.keys(s.vmap).forEach(function(m){
                        //     entry[s.vmap[m]] = vectorSum(data[d.index].data.map(function(a){return a[s.vmap[m]];}));
                        // });
                        // var delta = (d.endAngle - d.startAngle ) / entry[Object.keys(entry)[0]].length;
                        // entry[Object.keys(entry)[0]].forEach(function(e, ei){
                        //     var start =  d.startAngle + ei*delta;
                        //     var col = {startAngle: start, endAngle: start + delta, index: ei, pid: d.index};
                        //     Object.keys(s.vmap).forEach(function(m){
                        //         col[s.vmap[m]] = entry[s.vmap[m]][ei];
                        //     });
                        //     s.data.push(col);
                        // });


                    } else {
                        var delta = (d.endAngle - d.startAngle ) / data[d.index].data.length;
                        data[d.index].data.forEach(function(r, ri){
                            var start =  d.startAngle + ri*delta;
                            var entry = {startAngle: start, endAngle: start+delta , pid: d.index};
                            Object.keys(s.vmap).forEach(function(m){
                                var key  = "total_" + s.vmap[m];
                                entry[key] = r[key];
                            });
                            s.data.push(entry);
                        });
                    }

                } else if(s.entity == "global_link" || s.entity == "local_link") {
                    if(s.aggregate) {
                        var entries = pipeline().group({
                            $by: "port",
                            busy_time: "$sum",
                            traffic: "$sum",
                            router_id: "$addToSet"
                        }).sortBy({port: 1})
                        .execute(data[d.index][s.entity+"s"]);

                        var delta = (d.endAngle - d.startAngle ) / entries.length;

                        entries.forEach(function(td, ti){
                            var start =  d.startAngle + ti*delta;
                            td.startAngle = start;
                            td.endAngle = start + delta;
                            td.pid = d.index;
                        });
                        s.data = s.data.concat(entries);
                    } else {
                        var delta = (d.endAngle - d.startAngle ) / data[d.index][s.entity+"s"].length;
                        data[d.index][s.entity+"s"].forEach(function(td, ti){
                            var start =  d.startAngle + ti*delta;
                            td.startAngle = start;
                            td.endAngle = start + delta;
                            td.pid = d.index;
                        });
                        s.data = s.data.concat(data[d.index][s.entity+"s"]);
                    }
                } else {
                    if(s.aggregate) {
                        var entries = pipeline().group({
                            $by: s.aggregate,
                            terminal_id: "$addToSet",
                            avg_hops: "$avg",
                            busy_time: "$sum",
                            data_size: "$sum",
                            packets_finished: "$sum",
                            avg_packet_latency: "$avg",
                            // workload: "$first"
                        }).sortBy({router_rank: 1, router_port: 1})
                        .execute(data[d.index].terminals);
                        var delta = (d.endAngle - d.startAngle ) / entries.length;

                        entries.forEach(function(td, ti){
                            var start =  d.startAngle + ti*delta;
                            td.startAngle = start;
                            td.endAngle = start + delta;
                            td.pid = d.index;
                        });

                        s.data = s.data.concat(entries);

                    } else {
                        // data[d.index].terminals.forEach(function(td){ td.startAngle = d.startAngle; td.endAngle = d.endAngle; });

                        var delta = (d.endAngle - d.startAngle ) / data[d.index].terminals.length;
                        data[d.index].terminals.forEach(function(td, ti){
                            var start =  d.startAngle + ti*delta;
                            td.startAngle = start;
                            td.endAngle = start + delta;
                            td.pid = d.index;
                        });
                        s.data = s.data.concat(data[d.index].terminals);
                    }
                }
            });
        });

        // svg.selectAll(".cirBase")
        //       .data([{index: 0, startAngle: 0, endAngle: 2*Math.PI}])
        //     .enter()
        //     .append("path")
        //       .style("fill", "#eee")
        //       .style("stroke", "#ccc")
        //       .attr("d", d3.svg.arc().innerRadius(innerRadius).outerRadius(outerRadius))
        //

        svg.append("g")
            .attr("class", "chord")
          .selectAll("path")
            .data(chord.chords)
          .enter().append("path")
            .attr("d", d3.svg.chord().radius(innerRadius))
            .attr("fillColor", function(d){return colorScale(data[d.source.index][structs[0].vmap.color][d.target.index]); })
            // .style("fill", function(d) { return fill(d.target.index); })
            .style("fill", function(d){
                var send = data[d.source.index][structs[0].vmap.color][d.target.index];
                var recv =  data[d.target.index][structs[0].vmap.color][d.source.index];
                // console.log(send, recv);
                return colorScale(Math.max(send, recv));
                // return colorScale(send);
            })
            .style("stroke", "none")
            .style("stroke", function(d){
                return colorScale(data[d.source.index][structs[0].vmap.color][d.target.index]);
            })
            .style("opacity", 1)
            .on("click", function(d){console.log(d);
                var groups = data[d.source.index].data.map(function(g){
                    return g.group_id;
                });
                hover(groups);
                    svg.selectAll(".chord path")
                        .filter(function(a) {
                            return a.source.index == d.source.index
                            && d.target.index == a.target.index;
                        })
                        .transition()
                        .style("fill", "yellow");
            });
            svg.append("g").selectAll("base")
                .data(chord.groups)
                .enter()
                .append("path")
                  .style("fill", "#555")
                  .style("stroke", "#aaa")
                  .style("opacity", 1.0)
                  .attr("d", d3.svg.arc().innerRadius(innerRadius-5).outerRadius(innerRadius));


        var cirRange = outerRadius - innerRadius - padding,
            cirSize = structs.slice(1).map(function(s){ return Object.keys(s.vmap).length; }).reduce(function(a,b){return a+b;}),
            cirOffset = innerRadius;

        structs.slice(1).forEach(function(s, sti){
            var sectionRadiusRange =  cirOffset + Object.keys(s.vmap).length / cirSize * cirRange,
                cirPadding = 0.05 * sectionRadiusRange,
                sectionRadius = 0.95 * sectionRadiusRange,
                getSize = function() { return (sectionRadius); },
                getOpacity = function() { return 1; },
                getColor = function() { return s.colors[0]; },
                numericAttr = Object.keys(s.vmap).map(function(k){
                    return (!s.aggregate && s.entity=="router" ) ? "total_" + s.vmap[k] : s.vmap[k];
                }).filter(function(k){return (k!="workload")}),
                stats = p4Stats(s.data, numericAttr);

            function highlight(d) {

                var terminalIDs;

                if(s.entity == 'router') {
                    terminalIDs = pipeline()
                        .match({router_id: {$in: d.router_id}})
                        .execute(data[d.pid].terminals)
                        .map(function(t){return t.terminal_id});
                } else {
                    if(Array.isArray(d.terminal_id))
                        terminalIDs = d.terminal_id;
                    else
                        if(!Array.isArray(d.router_id))
                            terminalIDs = pipeline()
                                .match({
                                    router_rank: d.pid,
                                    router_port: d.router_port
                                })
                                .execute(data[d.pid].terminals)
                                .map(function(t){return t.terminal_id});
                }
                // console.log(d);
                hover({
                    group: d.group_id,
                    router: d.router_id,
                    node: terminalIDs
                });

                // console.log(d.group_id, d.router_id);
                d3.select(this)
                    .style("stroke-width", 5)
                    .style("stroke", "yellow");
            }

            function unhighlight(d) {
                d3.select(this)
                    .style("stroke-width", 1)
                    .style("stroke", "#fff");

                unhover();
            }

            if(compareMode) {
                if(!s.hasOwnProperty("domains")) s.domains = {};
                Object.keys(stats).forEach(function(k, ki){

                    stats[k] = updateDomain(stats[k], s.domains[k]);
                    if(!s.domains.hasOwnProperty(k)) s.domains[k] = {};
                    s.domains[k].min = stats[k].min;
                    s.domains[k].max = stats[k].max;

                });
            }

            // console.log(s.data, stats);
            if("size" in s.vmap) {
                var sizeAttr = (!s.aggregate && s.entity=="router" ) ? "total_" + s.vmap.size : s.vmap.size;
                if(stats[sizeAttr].max == stats[sizeAttr].min) stats[sizeAttr].max+=0.000001;
                getSize = d3.scale.pow().exponent(0.9)
                    .domain([stats[sizeAttr].min, stats[sizeAttr].max])
                    .range([cirOffset, sectionRadius]);
            }

            if("color" in s.vmap) {
                var colorAttr = (!s.aggregate && s.entity=="router" ) ?  "total_" + s.vmap.color : s.vmap.color;
                if(typeof(s.colors) === "function") {
                    getColor = s.colors;
                } else {
                    if(stats[colorAttr].max == stats[colorAttr].min) stats[colorAttr].max+=0.000001;
                    getColor =  d3.scale.linear()
                    // .domain(linearDomain([stats[colorAttr].min, stats[colorAttr].max], s.colors.length))
                    .domain([stats[colorAttr].min, stats[colorAttr].max])
                    .range(s.colors);
                }

                if(s.hasOwnProperty("colorLegend") && stats.hasOwnProperty(colorAttr))
                    s.colorLegend.update([stats[colorAttr].min, stats[colorAttr].max], s.colors);
            }

            if("opacity" in s.vmap) {
                var opacityAttr = (!s.aggregate && s.entity=="router" ) ?  "total_" + s.vmap.opacity : s.vmap.opacity;

                if(stats[opacityAttr].max == stats[opacityAttr].min) stats[opacityAttr].max+=0.000001;
                getOpacity =  d3.scale.linear()
                .domain([stats[opacityAttr].min, stats[opacityAttr].max])
                .range([0.2,1]);


                // s.opacityLegend.update([stats[colorAttr].min, stats[colorAttr].max], s.colors);
            }


            if("x" in s.vmap && "y" in s.vmap){
                var xAttr = (!s.aggregate && s.entity=="router" ) ?  "total_" + s.vmap.x : s.vmap.x,
                    yAttr = (!s.aggregate && s.entity=="router" ) ?  "total_" + s.vmap.y : s.vmap.y;

                getSize = d3.scale.linear()
                    .domain([stats[sizeAttr].min, stats[sizeAttr].max])
                    .range([2, (sectionRadius - cirOffset)/15]);

                var domainX = [stats[xAttr].min, stats[xAttr].max],
                    domainY = [stats[yAttr].min, stats[yAttr].max];

                var radiusDiff = sectionRadius - cirOffset,
                    paddingY = radiusDiff * 0.1;

                var getPosY = d3.scale.linear()
                    .domain(domainY)
                    .range([cirOffset + paddingY/2, sectionRadius - paddingY/2]);

                s.data.forEach(function(d, di){
                    var angleRange = chordGroups[d.pid].endAngle - chordGroups[d.pid].startAngle,
                        paddingX = 0.1 * angleRange;

                    var getPosX = d3.scale.linear()
                        .domain(domainX)
                        .range([chordGroups[d.pid].startAngle + paddingX/2, chordGroups[d.pid].endAngle- paddingX/2]);

                    var pos = coord(getPosY(d[yAttr]), getPosX(d[xAttr]));

                    d.cx = pos[0];
                    d.cy = pos[1];

                });

                svg.selectAll(".dot")
                      .data(s.data)
                    .enter().append("circle")
                      .attr("class", "dot")
                      .attr("r", function(d){return getSize(d[sizeAttr])})
                      .attr("cx", function(d){return d.cx})
                      .attr("cy",function(d){return d.cy})
                      .style("fill", function(d){return getColor(d[colorAttr])})
                      .style("fill-opacity", function(d){return getOpacity(d[opacityAttr])});

                var group = svg.append("g").selectAll("path")
                  .data(chord.groups)
                .enter().append("g");

                if(s.border || s.axis || true){
                    group.append("path")
                      .style("fill", "transparent")
                      .style("stroke", "#aaa")
                      .attr("d", d3.svg.arc().innerRadius(cirOffset).outerRadius(sectionRadius));
                }

                if(s.axis) {
                    var groupTick = group.selectAll(".group-tick")
                        .data(function(d) { return angularTicks(d, domainX); })
                        .enter().append("g")
                          .attr("class", "group-tick")
                          .attr("transform", function(d) { return "rotate(" + (d.angle * 180 / Math.PI - 90) + ") translate(" + sectionRadius + ",0)"; });

                      groupTick.append("line")
                          .attr("x2", 4)
                          .style("stroke", "#000");

                    groupTick
                    .append("text")
                      .attr("x", 6)
                    //   .attr("dy", ".35em")
                      .attr("transform", function(d) { return d.angle > Math.PI ? "rotate(180) translate(-16)" : null; })
                      .style("text-anchor", function(d) { return d.angle > Math.PI ? "end" : null; })
                      .style("font-size", ".85em")
                      .text(function(d) { return printformat(".2s")(d.value); });

                    // Returns an array of tick angles and values for a given group and step.
                    function angularTicks(d, domain) {
                        var range = domain[1] - domain[0];
                        // if(domain[1] === domain[0]) {
                        //     domain[0] -= 0.01;
                        //     domain[1] += 0.01;
                        // } else {
                        //     range = domain[1] * 1.001 - domain[0];
                        // }

                        var k = (d.endAngle - d.startAngle) * 0.90 / range,
                            step = Math.ceil((domain[1] - domain[0]) / (20/Math.pow(numPartition,0.5)));

                        range += k * range;
                        // if(step <= 0) step =  Math.floor((domain[1] - domain[0]) /2 );
                        return d3.range(0, range, step).map(function(value) {
                            return {value: value, angle: value * k + d.startAngle + (d.endAngle - d.startAngle) * 0.05};
                        });
                    }
                }
            } else {
                var visualElement = svg.append("g").selectAll("path")
                    .data(s.data)
                  .enter().append("path")
                    .style("fill", function(d) { return getColor(d[colorAttr]); })
                    .style("stroke", function(d) { return getColor(d[colorAttr]); })
                    .style("fill-opacity", function(d){return getOpacity(d[opacityAttr])})
                    .attr("d",function(d) { return d3.svg.arc().innerRadius(cirOffset).outerRadius(getSize(d[sizeAttr]))(d) })
                        .on("mouseover", highlight)
                        .on("mouseout", unhighlight);;


                if(s.aggregate) {
                    visualElement
                        .style("stroke", '#fff')
                        .style("stroke-width", 0.5);
                }
            }
            cirOffset = sectionRadius + cirPadding;
        });



        if(structs[0].groupLabel){
            var groupMarks = [];
            chordGroups.forEach(function(g, gi){
                var paVals = data[g.index].data.map(function(gd){ return gd[structs[0].partitionAttr]});
                var minVal = d3.min(paVals),
                    maxVal = d3.max(paVals);

                // groupMarks[gi] = structs[0].partitionAttr + "(" + minVal + "-" + maxVal + ")";
                groupMarks[gi] = printformat(".2s")(minVal) + " - " + printformat(".2s")(maxVal);

                if(structs[0].partitionAttr == "router_rank") {
                    groupMarks[gi] = "router "  + maxVal;
                } else if(structs[0].partitionAttr == "group_id") {
                    groupMarks[gi] = "group " + minVal + "-" + maxVal ;
                } else if(structs[0].partitionAttr == "workload") {
                    groupMarks[gi] = data[g.index].name;
                }
            })

            var groupLabel = svg.append("g").selectAll("groupLabel")
                    .data(chord.groups)
                  .enter().append("g")
                  .attr("transform", function(d) {return "rotate(" + ((d.startAngle + (d.endAngle - d.startAngle)/2) * 180 / Math.PI - 90) + ")translate(" + (outerRadius-padding/2-5) + ",0)";;});

            groupLabel.append("text")
            .attr("dy", ".35em")
            .style("font-size", "1.3em")
            .style("text-anchor", "middle")
            .attr("transform", function(d) { return (d.startAngle + (d.endAngle - d.startAngle)/2) > Math.PI/2 &&  (d.startAngle + (d.endAngle - d.startAngle)/2) < 1.5 * Math.PI ? "rotate(270)" :"rotate(90)"; })
                    .text(function(d) { return  groupMarks[d.index];});
        }

    }

});
