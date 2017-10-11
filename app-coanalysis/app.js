define(function(require) {
    // dependencies
    const p4gl = require('adav/adav');
    const Layout = require('davi/layout');
    const Panel = require('davi/panel');
    const Button = require('davi/button');
    const Table = require('davi/table');
    const ProgressBar = require('davi/progress');
    const format = require('i2v/format')('.2s');
    const fileLoader = require('./fileloader');
    const stats = require('p4/dataopt/stats');
    const cstore = require('p4/cquery/cstore');
    const adav = require('adav/adav');
    var views = {};

    var kernelProcessor = {

        preprocess: function(text) {
            return text.map(function(d){
                var row =  d.split(',');
                return row;
            });
        },

        allocate: function(metadata) {
            return cstore({
                size: metadata.line,
                struct: {
                    KP                 : "int",
                    PE                 : "int",
                    VT                 : "time",
                    RT                 : "time",
                    time_ahead_gvt     : "float",
                    total_rollback     : "int",
                    primary_rollback   : "int",
                    secondary_rollback : "int"
                }
            });
        },

        visualize: function(data) {
            var kps = adav({
                data: data,
                // container: 'body',
                config: {
                    viewport: [1, 1]
                }
            });

            var stats = {};

            stats.VT = kps.aggregate({
                $group: ['PE', 'VT'],
                totalRollback: {$sum: 'total_rollback'}
            })
            .result('row');

            console.log(stats);
            return stats;
        }
    };

    var router = {
        struct: {

        }
    }

    var terminal = {
        preprocess: function(text) {
            return text.map(function(d){
                var row =  d.split(',');
                return row;
            });
        },

        allocate: function(metadata) {
            return cstore({
                size: metadata.line,
                struct: {
                    LP : 'int',
                    KP : 'int',
                    PE : 'int',
                    terminal_id : 'int',
                    fin_chunks  : 'int',
                    data_size   : 'int',
                    fin_hops    : 'int',
                    fin_chunks_time : 'float',
                    busy_time       : 'float',
                    end_time        : 'time',
                    fwd_events      : 'int',
                    rev_events      : 'int'
                }
            });
        },

        visualize: function(data) {
            var terminals = adav({
                data: data,
                // container: 'body',
                config: {
                    viewport: [1, 1]
                }
            });

            var stats = {};

            stats.PE = terminals.aggregate({
                $group: ['PE'],
                totalDataSize: {$sum: 'data_size'},
                totalSaturation: {$sum: 'busy_time'},
            })
            .result('row');

            console.log(stats);
            return stats;
        }
    }

    return function(arg) {
        var progressBars = [];

        var stats = {},
            data = arg.data || null,
            container = arg.container || document.body;

        function loadDataFromFile(file, fileId) {
            console.log(file, fileId);
            if(typeof file == 'undefined') return;
            var entity = false, db, rowTotal, rowCount = 0;

            if(file.name.match('kp')) entity = kernelProcessor;
            // if(file.name.match('router')) entity = router;
            if(file.name.match('terminal')) entity = terminal;

            if(entity) {
                fileLoader({
                    file: file,
                    skip: 1,
                    onstart: function(meta) {
                        rowTotal = meta.line;
                        db = entity.allocate(meta);
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
                        console.log(data);
                        entity.visualize(data);
                    }
                });
            }
        }

        var board = new Layout({
            margin: 10,
            cols: [
                { id: 'temporalAnalysis', width: 0.65 },
                { id: 'statsAnalysis',  width: 0.35 },
            ]
        });

        views.timelines = new Panel({
            container: board.cell('temporalAnalysis'),
            id: "panel-timeline",
            title: "Terminal Analysis",
            padding: 10,
            header: {height: 0.05, style: {backgroundColor: '#F4F4F4'}}
        });

        views.stats = new Panel({
            container: board.cell('statsAnalysis'),
            id: "statistical-analysis",
            title: "Statistical Analysis",
            padding: 10,
            header: {height: 0.05, style: {backgroundColor: '#F4F4F4'}}
        });

        fileList = new Table({
            container: document.getElementById('upload-files'),
            // width: dataPanel.body * 0.8,
            columns: ['File Name', 'Data Size', 'Number of Records', 'Progress / Status']
        });

        fileList.style.display = 'none';

        var fileUploadButton = new Button({
            label: ' Open Files ',
            container: document.getElementById('upload-files'),
            types: ['primary', 'center'],
            icon: 'folder open',
            fileInput: {id: 'testFileUpload', onchange: function(evt) {
                var files = evt.target.files;
                fileList.style.display = 'table';
                console.log(files);
                // $('.ui.large.modal').modal('toggle');
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
                });

            }}
        });

        return stats;
    }





});
