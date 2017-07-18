define(function(require){

    return function(data, keys) {
        let bins = {},
            keys = Array.isArray(keys) ? keys : [keys];

        data.forEach((d)=>{
            let hash = keys.map((k)=>d[k]).join('');
            bins[hash] = 0;
        })
        bins = Object.keys(bins);

        let results = new Array(bins.length).fill({items:[]});

        data.map(function(d){
            let hash = keys.map((k)=>d[k]).join('');
            let ri = bins.indexOf(hash);

            keys.forEach((k)=>{
                results[ri][k] = d[k];
            });
            result[ri].items.push(d);
        })

        return results;
    }

})
