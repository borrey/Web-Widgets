(function bubble( window, document, d3, util ){
    var margin = {top: 0, right: 0, bottom: 0, left: 0},
    MonitorSet = util.objs.Events.extend({
	init : function( radiuses, categories, svg ){
	    var radius_range = radiuses || [10,10];
	    color_range = 1; if( categories && categories.length ){ color_range = categories.length; }
	    if(!svg){
		this.container = document.createElement('div');
		this.svg = d3.select( this.container ).append('svg');
		util.style.addClassToElement(this.container,'bubbles');
	    }else{
		this.container = svg;
		this.svg = svg;
	    }
	    this.bubbles = new util.objs.CountMap();
	    this.listeners = new util.objs.CountMap();
	    this.radius = d3.scale.sqrt().range(radius_range);//array of two numbers min,max
	    this.color = d3.scale.category10().domain(d3.range( color_range ));
	},
	addUpdateBubbles : function( nodes ){
	    var idx, bubble;
	    for( idx in nodes ){
		if( this.bubbles.contains( idx ) ){
		    bubble = util.fn.extend_obj( this.bubbles.get( idx ), 
						 nodes[idx] );
		}else{
		    bubble = nodes[idx];
		}
		this.bubbles.add( idx, bubble );
	    }
	},
	removeBubbles : function( nodes ){
	    var idx;
	    for( idx in nodes ){
		this.bubbles.remove( idx );
	    }
	},
	updateData: function( ){
	    var 
	    that = this,
	    width = this.container.offsetWidth,
	    height = this.container.offsetHeight,
	    nodes = this.bubbles.getEntries(),	
	    bubbles = this.svg.selectAll(".bubble")
		.data( nodes, function(d){ return d.id; }),
	    force = d3.layout.force()
		.nodes(nodes)
		.size([width, height])
		.gravity(0)
		.charge(0)
		.on("tick", function(e){that.tick(e);} )
		.start();
	    width = 960 - margin.left - margin.right;
	    height = 500 - margin.top - margin.bottom;
	    this.svg.attr("width", width).attr("height", height);
	    bubbles.enter()//create
	      .append('g')
	      .attr('class','bubble')
	      .each( function( d, i ){
		  var bubble = d3.select(this),
		  circle = bubble.append('circle')
		      .attr('class','info')
	      })
		  .call(force.drag);
	    bubbles // update
		.transition().duration(200)
		.each( function( d ){
		    var bubble = d3.select(this),
		    circle = bubble.selectAll('circle')
			.style("fill", function(d) { return that.color(d.color); })
			.attr('r', function(d) { return that.radius( d.radius ); });
		});
	    bubbles.exit() // exit
		.transition().duration(400)
		.each( function( d ){
		    var bubble = d3.select(this),
		    circle = bubble.selectAll('circle')
			.transition().duration(100).attr("r", 0);
		})
		    .remove();
	},
	tick : function( e ){
	    var that = this,
	    bubbles = 
		that.svg
		.selectAll(".bubble")
		.each(that.cluster(10 * e.alpha * e.alpha))
		.each(that.collide(.5))
//		    .attr("cx", function(d) { return d.x; })
//		.attr("cy", function(d) { return d.y; });

		    .attr( 'transform', function(d){ 
			var offest = that.radius(d.radius),
			x_offest =  d.x - offest,
			y_offset = d.y - offest;
			return "translate(" 
			    + x_offest  + "," 
			    + y_offset + ")"; 
		    });
	},
	cluster : function(alpha){
	    var that = this,
	    nodes = this.bubbles.getEntries(),
	    width = this.container.offsetWidth,
	    height = this.container.offsetHeight,
	    max = {};
	    width = 960 - margin.left - margin.right;
	    height = 500 - margin.top - margin.bottom;

	    nodes.forEach(function(d) {
		if (!(d.color in max) || (d.radius > max[d.color].radius)) {
		    max[d.color] = d;
		}
	    });
	    return function(d) {
		var node = max[d.color],
		l,
		r,
		x,
		y,
		k = 1,
		i = -1;
		
		// For cluster nodes, apply custom gravity.
		if (node == d) {
		    node = {x: width / 2, y: height / 2, radius: -d.radius};
		    k = .1 * Math.sqrt( that.radius(d.radius));
		}

		x = d.x - node.x;
		y = d.y - node.y;
		l = Math.sqrt(x * x + y * y);
		r = that.radius(d.radius) + that.radius(node.radius);
		if (l != r) {
		    l = (l - r) / l * alpha * k;
		    d.x -= x *= l;
		    d.y -= y *= l;
		    node.x += x;
		    node.y += y;
		}
	    };
	},
	collide : function(alpha){
	    var that = this,
	    nodes = this.bubbles.getEntries(),
	    padding = 6,
	    quadtree = d3.geom.quadtree(nodes);
	    return function(d) {
		var r = that.radius(d.radius) + that.radius.domain()[1] + padding,
		nx1 = d.x - r,
		nx2 = d.x + r,
		ny1 = d.y - r,
		ny2 = d.y + r;
		quadtree.visit(function(quad, x1, y1, x2, y2) {
		    if (quad.point && (quad.point !== d)) {
			var x = d.x - quad.point.x,
			y = d.y - quad.point.y,
			l = Math.sqrt(x * x + y * y),
			r = that.radius(d.radius) + that.radius(quad.point.radius) + (that.color(d.color) !== that.color(quad.point.color)) * padding;
			if (l < r) {
			    l = (l - r) / l * alpha;
			    d.x -= x *= l;
			    d.y -= y *= l;
			    quad.point.x += x;
			    quad.point.y += y;
			}
		    }
		    return x1 > nx2
			|| x2 < nx1
			|| y1 > ny2
			|| y2 < ny1;
		});
	    };
	}
    });
    createBubbleMonitor = function( radius, categories, svg ){
	var monitor = new MonitorSet( radius, categories, svg );
	monitor.container.updateData = function( update, remove ){ 
	    monitor.addUpdateBubbles( update ); 
	    monitor.removeBubbles( remove );
	    monitor.updateData();
	};
	monitor.redraw = function(){
	    monitor.updateData();
	};
	monitor.container.addListener = function( id, listener ){
	    monitor.addListener( id, listener );
	};
	return monitor.container;
    }
    ;
    if(util && !('createBubbleMonitor' in util) ){
	util.createBubbleMonitor = createBubbleMonitor;
    }else{
	throw 'Could not add createBubbleMonitor';
    }
})( window, document, window.d3,  window.util );
