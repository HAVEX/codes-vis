define(function(require) {
    // dependencies
    var ajax = require('p4/io/ajax'),
        dsv = require('p4/io/parser'),
        dataStruct = require('p4/core/datastruct'),
        arrays = require('p4/core/arrays'),
        pipeline =require('p4/core/pipeline'),
        stats = require('p4/dataopt/stats'),
        cstore = require('p4/cquery/cstore'),
        colors = require('i2v/colors'),
        lineChart = require('i2v/charts/lineChart'),
        format = require('i2v/format')('.2s'),
        hierCircles = require('./hierCircles'),
        dragonfly = require('./dragonfly'),
        parallelCoordinates = require('i2v/charts/parallelCoordinate'),
        scatterPlot = require('i2v/charts/scatter');

    const ROUTER_PER_GROUP = 10,
        TERMINAL_PER_ROUTER = 5;
    return function() {
        var Panel = require('davi/panel'),
            Button = require('davi/button'),
            Table = require('davi/table'),
            ProgressBar = require('davi/progress');

        var fileLoader = require('./fileloader'),
            adav = require('adav/adav');

        var dataPanel = new Panel({
            container: 'page-main',
            id: "panel-data-upload",
            title: "Upload Time-Series Data",
            height: $('#page-main').height() * 0.6,
            width: $('#page-main').width() * 0.8,
            style: {textAlign: 'center'},
            header: {height: 40, style: {borderBottom: '1px solid steelblue'}}
        });

        var ui = require('./layout/trispace')(),
            views = ui.views;

        var timelinePlots = {};
        var terminalMetrics;

        $("#control-timeline > .button").click(function(evt){
            $("#control-timeline > .button").each(function(b){
                $(this).removeClass('blue');
                $(this).addClass('grey');
            })
            $(this).addClass('blue');
            var choice = this.innerText;

            if(choice == 'Link Traffic') {
                timelinePlots.linkSaturation.hide();
                timelinePlots.terminalStat.hide();
                timelinePlots.linkTraffic.show();
            } else if(choice == 'Link Saturation') {
                timelinePlots.linkTraffic.hide();
                timelinePlots.terminalStat.hide();
                timelinePlots.linkSaturation.show();
            } else if(choice == 'Terminal Metrics') {
                timelinePlots.linkTraffic.hide();
                timelinePlots.linkSaturation.hide();
                timelinePlots.terminalStat.show();
            }
        })

        ui.style.visibility = 'hidden';
        dataPanel.style.margin = '50px auto';
        var fileList;
        var dataSet = {},
            gpuMemCache = {},
            networkData = {};
        var progressBars = [],
            startButton;

        var jobMapping = {};

        var fileUploadButton = new Button({
            label: ' Open Files ',
            types: ['primary', 'center'],
            icon: 'folder open',
            fileInput: {id: 'testFileUpload', onchange: function(evt) {
                var files = evt.target.files;
                fileList.style.display = 'table';
                Object.keys(files).forEach(function(f, fi){
                    var fileName = files[f].name;
                    var tr = fileList.addRow([fileName, format(files[f].size)+'B', '--', '']);

                    progressBars[f] = new ProgressBar({
                        percentage: 0,
                        container: tr.childNodes[3],
                        types: ['green']
                    });
                    progressBars[f].style.margin = '0';
                    loadDataFromFile(files[f], fi);

                    if(fileName.match('terminal')) dataSet.terminal = files[f];
                    if(fileName.match('router')) dataSet.router = files[f];
                    if(fileName.match('mpi')) dataSet.mpi = files[f];
                    if(fileName.match('.jobs')) {
                        progressBars[fi].percent = 50;
                        dataSet.jobs = files[f];
                        var reader = new FileReader();
                        reader.onloadend = function(evt) {
                            if (evt.target.readyState == FileReader.DONE) {
                                jobs = evt.target.result.split('\n');
                                jobs.forEach(function(nodes, jobID){
                                    nodes.split(' ').forEach(function(node){
                                        jobMapping[parseInt(node)] = jobID;
                                    })
                                })
                            }
                            progressBars[fi].percent = 100;
                        }
                        reader.readAsText(files[f]);
                    }
                })

                startButton = new Button({
                    label: ' Start Explore and Analyze ',
                    types: ['positive', 'right'],
                    icon: 'chevron right',
                    container: dataPanel.body,
                    onclick: function() {
                        dataPanel.style.display = 'none';
                        ui.style.visibility = 'visible';
                    }
                });
                startButton.style.margin = '20px';
                startButton.showLoading();
            }},
        });
        dataPanel.append(fileUploadButton);
        fileList = new Table({
            container: dataPanel.body,
            width: dataPanel.body * 0.8,
            columns: ['File Name', 'Data Size', 'Number of Records', 'Progress / Status']
        });

        fileList.style.display = 'none';
        fileUploadButton.style.margin = '20px';

        var terminal = {
            struct: {
                terminal_id         : "int",
                packets_finished    : "float",
                data_size           : "int",
                avg_hops            : "float",
                avg_packet_latency  : "float",
                busy_time           : "float",
                timestamp           : "time",
                job_id              : "int"
            },

            preprocess: function(text) {
                return text.map(function(d){
                    var row =  d.split(',');
                    // row[3] = row[3] / row[1];
                    row.push(-1); //default job_id
                    if(dataSet.hasOwnProperty('jobs')){
                        var terminalID = row[0];
                        if(jobMapping.hasOwnProperty(terminalID))
                            row[row.length-1] = jobMapping[terminalID];
                    }
                    return row;
                });
            },

            visualize: function(data) {
                console.log(data);
                gpuMemCache.terminals = adav({
                    data: data,
                    // container: 'detail-terminal',
                    config: {
                        padding: {left: 50, right: 50, top: 30, bottom: 20},
                        viewport: [views.detail.cell('detail-terminal').clientWidth - 100, views.detail.cell('detail-terminal').clientHeight - 50]
                    }
                    // indexes: ["timestamp" , "terminal_id"]
                });

                var start = new Date();
                var result = gpuMemCache.terminals
                .derive({
                    group_id: "floor(terminal_id/50.0)",
                    // avg_hop: "total_hops/packets_finished"
                })
                .register('selectTimeRange')
                .aggregate({
                    $group: ["terminal_id"],
                    totalHopCount: {$sum: "avg_hop"},
                    avgPacketLatency: {$sum: "avg_packet_latency"},
                    totalDataSize: {$sum: "data_size"},
                    saturation: {$sum: "busy_time"}
                })
                .result();

                result.group_id = result.terminal_id.map(function(d) { return Math.floor(d / TERMINAL_PER_ROUTER / ROUTER_PER_GROUP)});

                var features = ['group_id', 'avgPacketLatency', 'saturation', 'totalDataSize', 'terminal_id'];
                var dataMetrics = ['avg_packet_latency', 'avg_hops', 'busy_time', 'data_size', 'terminal_id'];
                terminalMetrics = new parallelCoordinates({
                    container: "detail-terminal",
                    width:  views.multidimension.innerWidth,
                    height:  views.multidimension.innerHeight * 0.5,
                    padding: {left: 100, right: 70, top: 30, bottom: 40},
                    features: features,
                    axis: [1,1,1,1,1],
                    color: 'teal',
                    labels: {
                        saturation: "sat. time",
                        avgPacketLatency: 'packet latency',
                        totalDataSize: 'traffic'
                    },
                    formats: {
                        saturation: function(d){return format(d/1e9) + 's';},
                        avgPacketLatency: function(d){return format(d/2/1e9/1000) + 's';}
                    },
                    data: result,
                    size: result.terminal_id.length

                });

                var result = gpuMemCache.terminals
                .resume('selectTimeRange')
                // .filter({
                //     timestamp: [0, 1600000]
                // })
                .aggregate({
                    $group: ["timestamp"],
                    // totalHopCount: {$sum: "avg_hop"},
                    packet_latency: {$sum: "avg_packet_latency"},
                    data_size: {$sum: "data_size"},
                    saturation: {$sum: "busy_time"}
                })
                .result();

                // var tsCount = result.timestamp.length;
                // features.forEach(function(f, i){
                //     if( f in ['avg_hop', 'avg_packet_latency'] )
                //         result[f] = result[f].map(function(d){ return d / tsCount;});
                // });

                var timeStats =  [];
                var features = ['packet_latency', 'saturation', 'data_size'];
                features.forEach(function(f, i){
                    if(f == 'group_id' || f=='terminal_id') return;
                    var r = result[f];
                    var min = r.reduce(function(a, b) {return ( a < b ? a : b );}),
                        max = r.reduce(function(a, b) {return ( a > b ? a : b );});
                    // console.log(f, max, min);
                    // var max = data.stats[dataMetrics[i]].max,
                    //     min = data.stats[dataMetrics[i]].min;
                    r.forEach(function(v, j){
                        var value = (v - min) / (max - min);
                        timeStats.push({
                            normalized_mean: value,
                            feature: f,
                            timestamp: result.timestamp[j]
                        })
                    })
                })

                var terminalData = new Array(features.length);
                features.forEach(function(f, i){
                    terminalData[i] = timeStats.filter(function(d) { return d.feature == f;})
                });


                timelinePlots.terminalStat = new lineChart({
                    container: views.timeline.body,
                    padding: {left: 100, right: 40, top: 20, bottom: 40},
                    data: terminalData,
                    formatX: function(d) { return format(d/1e9) + 's';},
                    series: features,
                    zero: true,
                    // color: ['red', 'orange'],
                    vmap: {
                        x: 'timestamp',
                        y: 'normalized_mean',
                        color: 'feature',
                    }
                })
                timelinePlots.terminalStat.hide();

                // .visualize({
                //     id: 'stat-plot',
                //     mark: "line",
                //     y: ["totalDataSize", "avgPacketLatency", "totalHopCount", "group_id"],
                //     // x: "timestamp",
                //     // perceptual: true,
                //     color: 'teal',
                //     alpha: 0.1
                // })
                // .visualize({
                //     id: 'timelineplot',
                //     mark: "line",
                //     y: "totalDataSize",
                //     x: "timestamp",
                //     color: 'red',
                //     // alpha: 0.1
                // })

                console.log("Time spent: ", new Date() - start);
                // console.log(result);
            },

            allocMem: function(metadata) {
                return metadata.line;
            },

        };

        var linkTypes = ['local', 'local', 'global', 'terminal'],
            routerTotal,
            portTotal;

        var networkLinks = {
            struct: {
                router_id   : "int",
                timestamp   : "time",
                port        : "int",
                type        : "string",
                saturation  : "float",
                traffic     : "int",
                link_id     : "int",
            },

            allocMem: function(metadata) {
                portTotal = (metadata.header.split(',').length - 2) / 2;
                routerTotal = metadata.line;
                return portTotal * routerTotal;
            },

            preprocess: function(lines) {
                if(!lines.length) return;
                var portTotal = (lines[0].split(',').length - 2) / 2,
                    localPortCount = portTotal / 2,
                    globalPortCount = localPortCount / 2,
                    terminalCount = localPortCount / 2,
                    dataItems = [];

                lines.forEach(function(line, li){
                    var row = line.split(','),
                        routerId = row[0],
                        ts = row[row.length-1],
                        saturations = row.slice(1, portTotal+1),
                        traffics = row.slice(portTotal+1, portTotal*2+1);

                    saturations.forEach(function(item, port){
                        var ltype = linkTypes[Math.floor(port/terminalCount)];
                        var linkId = li * portTotal + port;
                        dataItems.push([routerId, ts, port, ltype, item, traffics[port], linkId]);
                    });
                })

                return dataItems;
            },

            visualize: function(data) {

                var width = views.detail.cell('detail-router').clientWidth - 150,
                    height = views.detail.cell('detail-router').clientHeight - 50;
                gpuMemCache.routers = adav({
                    data: data,
                    container: 'detail-router',
                    config: {
                        padding: {left: 100, right: 50, top: 10, bottom: 50},
                        viewport: [width, height]
                    },
                    views: [
                        {
                            width: width/2 - 100,
                            height: height,
                            offset: [0, 0]
                        },
                        {
                            width: width/2 - 100,
                            height: height,
                            offset: [width/2+100, 0]
                        }
                    ],
                });

                var start = new Date();
                var result = gpuMemCache.routers
                // .filter({
                //     timestamp: [0, 1600000]
                // })
                .aggregate({
                    $group: ["timestamp", "type"],
                    totalTraffic: {$sum: "traffic"},
                    totalSaturation: {$sum: "saturation"},
                })
                .result('row');

                var linkTypes = ['local', 'global', 'terminal'];

                var linkData = new Array(linkTypes.length);
                linkTypes.forEach(function(d, i){
                    linkData[i] = result.filter(function(l) { return l.type == d});
                })

                timelinePlots.linkTraffic = new lineChart({
                    container: views.timeline.body,
                    padding: {left: 100, right: 40, top: 20, bottom: 40},
                    data: linkData,
                    formatX: function(d) { return format(d/1e9) + 's';},
                    series: linkTypes,
                    zero: true,
                    color: ['blue', 'purple', 'green'],
                    vmap: {
                        x: 'timestamp',
                        y: 'totalTraffic',
                        color: 'type',
                    },
                    onchange: function(d) {
                        updateTerminals(d.x);
                        var routers = updateRouters(d.x);
                        console.log(routers);

                        var selectedTerminals = new Float32Array(2550);
                        var ids = [60,61,62,63,64,110,111,112,113,114,160,161,162,163,164,210,211,212,213, 214];
                        ids.forEach(function(d, i){
                            selectedTerminals[d] = 1;
                        });
                        terminalMetrics.select(selectedTerminals);
                    }
                })

                timelinePlots.linkSaturation = new lineChart({
                    container: views.timeline.body,
                    padding: {left: 100, right: 40, top: 20, bottom: 40},
                    data: linkData,
                    formatX: function(d) { return format(d/1e9) + 's';},
                    formatY: function(d) { return format(d/1e9) + 's';},
                    series: linkTypes,
                    zero: true,
                    color: ['blue', 'purple', 'green'],
                    vmap: {
                        x: 'timestamp',
                        y: 'totalSaturation',
                        color: 'type',
                    },
                    onchange: function(d) {
                        updateTerminals(d.x);
                        var routers = updateRouters(d.x);
                        console.log(routers);
                    }
                })

                timelinePlots.linkSaturation.hide();

                gpuMemCache.routers
                .head()
                .filter({
                    type: ['global', 'global']
                })
                .aggregate({
                    $group: ["link_id"],
                    totalTraffic: {$sum: "traffic"},
                    totalSaturation: {$sum: "saturation"},
                })
                .visualize({
                    id: "detail-global-link",
                    mark: "point",
                    x: "totalTraffic",
                    y: "totalSaturation",
                    color: 'purple',
                    alpha: 0.5
                })
                .head()
                .filter({
                    type: ['local', 'local']
                })
                .aggregate({
                    $group: ["link_id"],
                    totalTraffic: {$sum: "traffic"},
                    totalSaturation: {$sum: "saturation"},
                })
                .visualize({
                    id: "detail-local-link",
                    mark: "point",
                    x: "totalTraffic",
                    y: "totalSaturation",
                    color: 'steelblue',
                    alpha: 0.5
                })

                gpuMemCache.routers
                .update()
                .head()
                .filter({
                    type: ['global', 'global'],
                    router_id: [60, 64]
                })
                .aggregate({
                    $group: ["link_id"],
                    totalTraffic: {$sum: "traffic"},
                    totalSaturation: {$sum: "saturation"},
                })
                .visualize({
                    id: "detail-global-link",
                    mark: "point",
                    x: "totalTraffic",
                    y: "totalSaturation",
                    color: 'yellow',
                })
                .head()
                .filter({
                    type: ['local', 'local'],
                    router_id: [60, 64]
                })
                .aggregate({
                    $group: ["link_id"],
                    totalTraffic: {$sum: "traffic"},
                    totalSaturation: {$sum: "saturation"},
                })
                .visualize({
                    id: "detail-local-link",
                    mark: "point",
                    x: "totalTraffic",
                    y: "totalSaturation",
                    color: 'yellow',
                })
            }
        }

        function updateTerminals(timeRange) {
            networkData.terminals = gpuMemCache.terminals
            .resume('selectTimeRange')
            .filter({
                timestamp: timeRange
            })
            .aggregate({
                $group: ["terminal_id"],
                group_id: {$min: "group_id"},
                avg_hops: {$sum: "avg_hop"},
                avg_packet_latency: {$sum: "avg_packet_latency"},
                packets_finished: {$sum: "packets_finished"},
                data_size: {$sum: "data_size"},
                busy_time: {$sum: "busy_time"},
            })
            .result('row');

            networkData.terminals.forEach(function(d, i){
                d.terminal_id = i;
            })
            return networkData.terminals;
        }

        function updateRouters(timeRange) {
            var aggr = gpuMemCache.routers
            .head()
            .filter({
                timestamp: timeRange
            })
            .aggregate({
                $group: ["port","router_id"],
                totalTraffic: {$sum: "traffic"},
                totalSaturation: {$sum: "saturation"},
            })
            .result('row');

            var routers = pipeline()
            .group({
                $by: 'router_id',
                traffic: {totalTraffic: "$addToArray"},
                busy_time: {totalSaturation: "$addToArray"}
            })
            .derive(function(r, ri){
                r.group_id = Math.floor(r.router_id / ROUTER_PER_GROUP);
                r.router_id = r.router_id % ROUTER_PER_GROUP;
                r.router_rank = r.router_id % ROUTER_PER_GROUP;
                r.local_traffic = r.traffic.slice(0, ROUTER_PER_GROUP);
                r.global_traffic = r.traffic.slice(ROUTER_PER_GROUP, ROUTER_PER_GROUP+r.traffic.length/4);
                r.local_busy_time = r.busy_time.slice(0, ROUTER_PER_GROUP);
                r.global_busy_time = r.busy_time.slice(ROUTER_PER_GROUP, ROUTER_PER_GROUP+r.traffic.length/4);
            })
            .match({
                group_id: {$inRange: [0, 34]}
            })
            (aggr);

            var ds = dragonfly({
                numRouter : 510,
                numGroup  : 51,
                numNode   : 2550,
                routers: routers,
                terminals: networkData.terminals
            });

            console.log(routers);

            var result = ds.partition('group_id', 7);

            var struct = [
                {
                    entity: "router",
                    vmap: {
                        color: "global_busy_time",
                        size: "global_traffic"
                    },
                    groupLabel: true,
                    partitionAttr: 'group_id',
                    numPartition: 12,
                    // colors: Colors("Oranges").colors,
                    colors: ["#EEE", "purple"]
                },

                {
                    entity: "router",
                    aggregate: "router_rank",
                    vmap: {
                        color: "local_busy_time",
                        // size: "traffic"
                    },
                    colors: ["steelblue", "red"]
                },
                {
                    entity: "terminal",
                    vmap: {
                        color: "avg_packet_latency",
                        size: "avg_hops"
                    },
                    aggregate: ['router_rank'],
                    colors: ["#EEE", "teal"],
                }
            ]

            views.projection.clear();
            hierCircles({
                container: "#panel-projection-body",
                width: views.projection.innerWidth ,
                structs: struct,
                data: result
            });
            return result;
        }

        function loadDataFromFile(file, fileId) {
            if(typeof file == 'undefined') return;
            var entity = false, db, rowTotal, rowCount = 0;

            if(file.name.match('terminal')) entity = terminal;
            if(file.name.match('router')) entity = networkLinks;
            if(file.name.match('mpi')) entity = mpiLog;

            if(entity) {
                fileLoader({
                    file: file,
                    // skip: 1,
                    onstart: function(meta) {
                        rowTotal = meta.line;
                        db = cstore({
                            size: entity.allocMem(meta),
                            struct: entity.struct,
                        });
                        fileList.updateCell(fileId, 2, rowTotal);
                    },
                    onload:function (data) {
                        rowCount += data.length;
                        progressBars[fileId].percent = rowCount / rowTotal * 100;
                        var rows = entity.preprocess(data);
                        // console.log(rows);
                        if(Array.isArray(rows)) db.addRows(rows);
                    },
                    oncomplete: function() {
                        var data = db.data();
                        data.stats = db.stats();
                        entity.visualize(data);
                        if(dataSet.hasOwnProperty('terminal') && dataSet.hasOwnProperty('router')) {
                            startButton.hideLoading();
                        }
                        // analysis(data);
                    }
                });
            }
        }

        function analysis(data) {

        }
    }

});
