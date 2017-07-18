var fs = require('fs'),
    path = require('path'),
    express = require('express'),
    bodyParser = require('body-parser'),
    app = express(),
    server = require('http').Server(app);

var port = process.env.PORT || 8100,
    host = process.env.HOST || "localhost";

console.log("initializing server ");

// ivastack libs
var srcDir = {
    vui: 'node_modules/davi/src',
    i2v: 'node_modules/i2v/src',
    p4: 'node_modules/p4.js/src',
    flexgl : 'node_modules/flexgl/src',
    adav : 'node_modules/p4.js/gl/src'
}

// Static files
app.use(express.static('ui'));
app.use("/data", express.static('data'));
app.use("/models", express.static('models'));
app.use("/npm", express.static('node_modules'));
app.use("/vastui", express.static(srcDir.vui));
app.use("/i2v", express.static(srcDir.i2v));
app.use("/p4",  express.static(srcDir.p4));
app.use("/flexgl",  express.static(srcDir.flexgl));
app.use("/adav",  express.static(srcDir.adav));
app.use("/semantic", express.static('semantic'));

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: true}));



server.listen(port, host, function(){
    console.log("server started, listening", host, port);
});
