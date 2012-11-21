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
	    this.selected = false;
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
	    bubble_class = that.selected ? 'bubble hidden' : 'bubble',//only for inserts
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
	    this.svg.attr("width", width).attr("height", height);
	    bubbles.enter()//create
	      .append('g')
	      .attr('class', bubble_class)
	      .each( function( d, i ){
		  var bubble = d3.select(this),
		  circle = bubble.append('circle')
		      .attr('class','info');
		  path = bubble.append('path')
		      .attr('stroke', 'steelBlue')
		      .attr('fill', 'none')
		      .attr('stroke-width', 5 )
		      .attr('stroke-linecap','round')
		      .attr('class','rating');
	      })
	      .call(force.drag);
	    bubbles // update
		.transition().duration(200)
		.each( function( bubble_data ){
		    var bubble = d3.select(this),
		    circle = bubble.selectAll('circle')
			.style("fill", function( d ) { return that.color(bubble_data.color); })
			.attr('r', function( d ) { return d.selected ? d3.select(this).attr('r') : that.radius( bubble_data.radius ); });
		    
		});
	    that.updatePath( bubbles.selectAll('path'));
	    bubbles.exit() // exit
		.transition().duration(400)
		.each( function( d ){
		    var bubble = d3.select(this),
		    circle = bubble.selectAll('circle')
			.transition().duration(100).attr("r", 0);
		})
		    .remove();
	     bubbles
		.on( 'click', function( d ){
		    d.selected = !d.selected;
		    that.selected = d.selected;
		    that.notifyListeners('bubbleSelected',{ id: d.id, selected : d.selected, d3_obj : this });
		})
		.on('mouseover', function(d){
		    d.mouse_in = true;
		    setTimeout(function(){
			if( d.mouse_in ){
			    that.notifyListeners('bubbleHovered',{ id: d.id, data : d, d3_obj : this });
			}
		    },500);
		})
		.on('mouseout', function(d){
		    d.mouse_in = false;
		    that.notifyListeners('bubbleUnHover',{ id: d.id, data : d, d3_obj : this });
		})
	},
	tick : function( e ){
	    var that = this,
	    bubbles = 
		that.svg
		.selectAll(".bubble")
		.each(that.cluster(10 * e.alpha * e.alpha))
		.each(that.collide(.5))
		    .attr( 'transform', function(d){ 
			var offest = that.radius(d.radius),
			x_offest =  d.x - offest,
			y_offset = d.y - offest;
			if(d.selected){
			    //console.log(that.svg.select(this).attr('transform'));
			    return d3.select(this).attr('transform');
			}else{
			    return "translate(" 
				+ x_offest  + "," 
				+ y_offset + ")"; 
			}
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
		var node = max[d.color] || d,
		l, r, x, y, k = 1, i = -1;
		max[d.color] = max[d.color] || d;
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
		var r = that.radius(d.radius)+that.radius(d.radius)/2 + that.radius.domain()[1] + padding,
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
	},
	updatePath : function( path ){
	    var that = this;
	    path.transition().duration(200).attrTween( 
		"d", function( a ){
		    var i = d3.interpolate( a.radius_init || 0 , a.radius );
		    a.radius_init = a.radius;
		    return function(t) {
			return that.arc_line( i(t) );
		    }
		}
	    );
	},
	arc_line : function ( value ){
	    var that = this,
	    points = 100,
	    domain = that.radius.domain(),
	    radius = that.radius( value ),
	    angle = d3.scale.linear()
		.domain([0, points-1])
		.range([0, (2 * Math.PI) * (value/ domain[ domain.length-1 ]) ]),
	    line = d3.svg.line.radial().interpolate("basis")
		.tension(0).radius(radius+radius/8).angle( function(d, i) { return angle(i); } );
	    return line(d3.range(points));

	},
	hide : function( hide_test_fn ){
	    var hide_test = hide_test_fn || function(candidate){ return true; };
	    this.svg.selectAll(".bubble").each( function(bubble, i ){
		if(hide_test(bubble)){
		    d3.select(this).attr('class','bubble hidden');
		}else{
		    d3.select(this).attr('class','bubble');
		}
	    });
	}
    }),
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
	monitor.container.radius = monitor.radius;
	monitor.container.color = monitor.color;
	monitor.container.hide = function( hide_test ){ monitor.hide(hide_test); };
	monitor.container.getSvg = function(){ return monitor.svg; };
	return monitor.container;
    }
    ;
    if(util && !('createBubbleMonitor' in util) ){
	util.createBubbleMonitor = createBubbleMonitor;
    }else{
	throw 'Could not add createBubbleMonitor';
    }
    if( util && util.objs ){
	util.objs.MonitorSet = MonitorSet;
    }
})( window, document, window.d3,  window.util );
