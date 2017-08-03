var mpiLog = {
    struct: {
        timestamp    : "float",
        app_id       : "int",
        operation    : "string",
        status       : "int",
        src          : "int",
        dest         : "int",
        message_size : "int"
    },

    allocMem: function(metadata) {
        return metadata.line;
    },

    preprocess: function(lines) {
        var items = [];
        lines.forEach(function(line, i){
            var text = line.split(' ');
            // if(text[0]==' ') text.shift();
            if(line.match('WAITALL COMPLETED')) {
                items.push([
                    parseFloat(text[0]) - 45.739005,
                    text[3],
                    text[5],
                    1,
                    text[8],
                    -1,
                    0,
                ])
            } else if(line.match('SEND')){
                items.push([
                    parseFloat(text[0]) - 45.739005,
                    text[2],
                    text[4],
                    1,
                    text[6],
                    text[8],
                    text[10],
                ])
            }
        })
        return items;
    },

    postprocess: function(data) {
        var vast = adav({
            data: data,
            // indexes: ["timestamp" , "terminal_id"]
        });

        var start = new Date();
        var result = vast
        .derive({
            timeStep: 'floor(@timestamp / 6872.0)',
            group_id: 'floor(@src / 50.0)',

        })
        .group({
            $by: ["timeStep", "group_id"],
            message_size: "$sum",
            // data_size: "$sum",
        });
        // .result();

        console.log("Time spent: ", new Date() - start);
        // console.log(result);

    }
};
