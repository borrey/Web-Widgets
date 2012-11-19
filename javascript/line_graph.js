(function line_graph( window, document, d3, util ){
    var 
    LineGraph = util.objs.Events.extend({
	init : function(){
	    this.container = document.createElement('div');
	    this.svg = d3.select( this.container ).append('svg');
	    this.lines = new util.objs.CountMap();
	    this.listeners = new util.objs.CountMap();
	}
    });
    ;
    

})( window, document, d3,  window.util );
