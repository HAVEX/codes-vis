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
let libs = {
    davi: 'davi/src',
    i2v: 'node_modules/i2v/src',
    flexgl : 'node_modules/flexgl/src',
    p4: 'p4/src',
    adav : 'p4/gl/src'
}

let allowedFileTypes = ['js', 'html', 'css'];
let analysisModes = ['stats', 'network', 'timeseries'];

analysisModes.forEach((mode)=>{
    app.get('/' + mode + '/:lib/*', (req, res, next)=>{
        let lib = req.params.lib;
        if(Object.keys(libs).indexOf(lib) !== -1 || lib =='npm') {
            req.url = req.url.replace('/'+mode, '')
        }

        next();
    });

    app.use('/'+mode, express.static(mode));
})

// Static files
Object.keys(libs).forEach(function(lib){
    app.use('/'+lib, express.static(libs[lib]));
})
app.use("/semantic", express.static('semantic'));
app.use("/data", express.static('data'));
app.use("/models", express.static('models'));
app.use("/npm", express.static('node_modules'));
app.use(express.static('ui'));

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: true}));

server.listen(port, host, function(){
    console.log("server started, listening", host, port);
});
