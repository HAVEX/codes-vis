define(function(require) {
    const dataMagement = require("./datamgmt"),
        network = require("network/app"),
        stats =  require("stats/app"),
        timeseries =  require("timeseries/app");

    return function() {
        var pageHeaderHeight = $('#page-header').height() + 20;

        $("#page-network, #page-stats, #page-tseries")
        .css({
            height: $("body").height() - pageHeaderHeight,
            'margin-top': pageHeaderHeight + 'px'
        });

        $('.ui.large.modal')
            .modal('observeChanges', true).modal('hide');

        $('#page-network').transition('fade down');
        $('#page-tseries').transition('fade down');

        $('.ui.sidebar')
            .sidebar({
                transition: 'overlay',
                dimPage: false,
                closable: true
            });
        // $('.ui.sidebar').sidebar('toggle');
        $('.data-button').click(function(){
            // $('.ui.sidebar').sidebar('toggle');
            $('.ui.large.modal').modal('show');
        })

        $(".page-menu > a.item").click(function(){
            $(".page-menu > a.item.active").each(function(menuID,i){
                $(this).removeClass('active');
                $(this.getAttribute('href')).transition('fade down');
            })
            var mode = this.getAttribute('href').slice(1);

            $(this).addClass('active');
            $(this.getAttribute('href')).transition('fade down');

        });

        var boards = {};
        boards.stats = stats({
            container: 'page-stats',
        });

        boards.network = network({
            container: 'page-network',
        });

        boards.tseries = timeseries({
            container: 'page-tseries'
        })

        dataMagement({
            container: 'data-list',
            onselect: function(d) {
                boards.network.update(d);
                boards.stats.update(d);
                boards.tseries.reset();
                $('.ui.large.modal').modal('toggle');
            },
            oncancel: function(d) {
                $('.ui.large.modal').modal('toggle');
            }
        });


        // $('.ui.dropdown').dropdown();
        // $('.ui.checkbox').checkbox();
    }
})
