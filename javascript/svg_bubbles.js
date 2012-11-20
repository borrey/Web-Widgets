(function bubble( window, document, d3, util ){
    var 
    rating_max = 100,
    radius_range = d3.scale.sqrt().range([40, 40]),
    radius = 40,
    arc_line = function ( value ){
	var points = 100,
	angle = d3.scale.linear()
	    .domain([0, points-1])
	    .range([0, (2 * Math.PI * value)/rating_max ]),
	line = d3.svg.line.radial().interpolate("basis").tension(0).radius(radius+radius/2).angle( function(d, i) { return angle(i); } );
	return line(d3.range(points));

    },
    strait_line = function( value ){
	var points = 100,
	circumference = d3.scale.linear()
	    .domain([0, points-1])
	    .range([0, (2 * Math.PI * radius * value)/radius ]),
	line = d3.svg.line()
	    .x(function(d,i) {
		return radius+circumference(i);
	    })
	    .y( 0 ).interpolate('linear');
	return line(d3.range(points));
    },
    MonitorSet = util.objs.Events.extend({
	init : function( svg  ){
	    this.container = document.createElement('div');
	    this.svg = svg || d3.select( this.container ).append('svg');
	    this.bubbles = new util.objs.CountMap();
	    this.listeners = new util.objs.CountMap();
	    this.force = true;
	    util.style.addClassToElement(this.container,'bubbles');
	},
	addUpdateBubbles : function( bubbles ){
	    var idx, bubble;
	    for( idx in bubbles ){
		if( this.bubbles.contains( idx ) ){
		    bubble = util.fn.extend_obj( this.bubbles.get( idx ), 
					       bubbles[idx] );
		}else{
		    bubble = bubbles[idx];
		}
		this.bubbles.add( idx, bubble );
	    }
	},
	removeBubbles : function( bubbles ){
	    var idx;
	    for( idx in bubbles ){
		this.bubbles.remove( idx );
	    }
	},
	cluster : function(alpha) {
	    var entries = this.bubbles.getEntries(), 
	    width = this.container.offsetWidth,
	    height = this.container.offsetHeight,
	    max = null;
	    // Find the largest node for each cluster.
	    entries.forEach(function(d) {
		if (!(max) || (d.rating > max.rating)) {
		    max = d;
		}
	    });
	    return function(d) {
		var node = max,
		l,
		r,
		x,
		y,
		k = 1,
		i = -1;

		// For cluster nodes, apply custom gravity.
		if (node == d) {
		    node = {x: width / 2, y: height / 2};//, radius: -d.radius
		    k = .1 * Math.sqrt(radius);
		}

		x = d.x - node.x;
		y = d.y - node.y;
		l = Math.sqrt(x * x + y * y);
		r = radius + radius;
		if (l != r) {
		    l = (l - r) / l * alpha * k;
		    d.x -= x *= l;
		    d.y -= y *= l;
		    node.x += x;
		    node.y += y;
		}
	    };
	},
	collide : function( alpha ){
	    var entries = this.bubbles.getEntries(),
	    quadtree = d3.geom.quadtree(entries);
	    return function(d) {
		var padding = 5,
		r = radius + 10,//should find d.radius + radius.domain()[1] + padding
		nx1 = d.x - r,
		nx2 = d.x + r,
		ny1 = d.y - r,
		ny2 = d.y + r;
		quadtree.visit(function(quad, x1, y1, x2, y2) {
		    if (quad.point && (quad.point !== d)) {
			var x = d.x - quad.point.x,
			y = d.y - quad.point.y,
			l = Math.sqrt(x * x + y * y),
			r = d.radius + quad.point.radius + (d.color !== quad.point.color) * padding;
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
	    }
	},
	updatePosition : function( e, base, selection, duration ){
	    var that = this,
	    bubbles = base.selectAll(selection);
	    if(this.force){
		bubbles.each(that.cluster(10 * e.alpha * e.alpha))
		    .each(that.collide(0.5));
		    //var q = d3.geom.quadtree(entries), i, d, n = entries.length;
		//for (i = 1; i < n; ++i) q.visit(that.collide(entries[i]));
		//for (i = 1; i < n; ++i) {
		//    d = nodes[i];
		//    context.moveTo(d.x, d.y);
		//    context.arc(d.x, d.y, d.radius, 0, 2 * Math.PI);
		//}

		bubbles.transition().duration(duration).attr( 'transform', function(d){
		    //console.log(d.id,'moving to: ',d.x,',',d.y);
		    return "translate(" + d.x + "," + d.y + ")";
		});
	    }else{
		bubbles.transition().duration(duration).attr( 'transform', function(d){
		    return "translate(" + radius + "," + radius + ")";
		});
	    }
	},
	updateRating : function( base, selection ){
	    var path = base.selectAll( selection );
	    if(this.force){
		path.transition().duration(200).attrTween( 
		    "d", function( a ){
			var i = d3.interpolate( a.rating_init || 0 , a.rating );
			return function(t) {
			    return arc_line( i(t) );
			}
		    }
		);
	    }else{
		path.transition().duration(200).attr('d', function(d) { return strait_line(d.rating);} );
	    }
	},
	updateData: function( ){
	    // bind the data to the selection
	    var that = this,
	    width = this.container.offsetWidth,
	    height = this.container.offsetHeight,
	    entries = this.bubbles.getEntries(),
	    num_nodes_across_radius = Math.sqrt(entries.length/Math.PI),
	    charge = -Math.min(width, height) / num_nodes_across_radius,
	    bubbles = this.svg.selectAll(".bubble")
		.data( entries, function(d){ return d.id; }),
	    force = d3.layout.force()
		.links( [] )
		.nodes( entries )
		.gravity(0)
		.charge(0)
		.size([width,height])
		.on("tick", function( e ){ that.updatePosition( e, that.svg, '.bubble', 0 ); })
		.start();
	    this.svg.attr("width", width).attr("height", height);
	    //  set initial state for each circle
	    var old_drag = force
	    bubbles.enter()
		.append('g')
		.attr('class','bubble')
		.each( function( d, i ){
		    var bubble = d3.select(this),
		    path = bubble.append('path')
		        .attr('stroke-width', '5')
			.attr('stroke-linecap','round')
			.attr('class','rating'),
		    circle = bubble.append('circle')
			.attr("r", radius)
			.attr('class','info'),
		    text = bubble.append('text')
			.attr('text-anchor', 'middle')
			.attr('dominant-baseline', 'middle')
			.attr('class','info_text ')
		    ;
		})
	            .call(force.drag);
	    ;
	    // transition the radius of each circle
	    bubbles
		.transition().duration(200)
		.each( function( d ){
		    var bubble = d3.select(this),
		    text = bubble.selectAll('text.info_text');
		    text.text(d.id+':'+d.rating);
		    that.updateRating( bubble, 'path');
		    d.rating_init = d.rating;
		});

	    //  what happens when an element is removed
	    bubbles.exit()
		.transition().duration(400)
		.each( function( d ){
		    var bubble = d3.select(this),
		    text = bubble.selectAll('text.info_text'),
		    path = bubble.selectAll('path'),
		    circle = bubble.selectAll('circle');
		    text.transition().duration(100).style('font-size',0);
		    circle.transition().duration(100).attr("r", 0);
		    path.attr( "d", arc_line( 0 ) );
		})
		.remove()
	    ;

	    //force
	    bubbles.on( 'click', function( d ){
		that.force = !that.force;
		if(that.force){
		    that.notifyListeners('bubbleUnSelected');
		    force.alpha(0.07);//force.resume();
		}else{
		    that.notifyListeners('bubbleSelected');
		    force.stop();
		}
		bubbles.each( function( bubble, i ){
		    if( !that.force && d.id !== bubble.id ){
			d3.select(this).attr('class','bubble hidden');
		    }else{
			d3.select(this).attr('class','bubble');
			that.updateRating( d3.select(this), '.rating');
			d.x = d.rating;
			d.y = d.rating;			
		    }
		});
		that.updatePosition( that.svg, '.bubble', 100 );
	    });

        }	    
    });
    createBubbleMonitor = function(){
	var monitor = new MonitorSet();
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
