(function bubble( window, document, d3, util ){
    var 
    rating_max = 100,
    radius = 10,
    arc_line = function ( value ){
	var points = 100,
	angle = d3.scale.linear()
	    .domain([0, points-1])
	    .range([0, (2 * Math.PI * value)/rating_max ]),
	line = d3.svg.line.radial().interpolate("basis").tension(0).radius(radius+5).angle( function(d, i) { return angle(i); } );
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
	init : function(){
	    this.container = document.createElement('div');
	    this.svg = d3.select( this.container ).append('svg');
	    this.bubbles = new util.objs.CountMap();
	    this.listeners = new util.objs.CountMap();
	    this.force = true;
	    this.svg.style('width','100%');
	    this.svg.style('height','100%');
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
	updatePosition : function( base, selection, duration ){
	    var bubbles = base.selectAll(selection);
	    if(this.force){
		bubbles.transition().duration(duration).attr( 'transform', function(d){ 
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
		.charge( charge )
		.size([width,height])
		.on("tick", function( e ){ that.updatePosition( that.svg, '.bubble', 0 ); })
		.start();
	    //  set initial state for each circle
	    var old_drag = force
	    bubbles.enter()
		.append('g')
		.attr('class','bubble')
		.each( function( d, i ){
		    var bubble = d3.select(this),
		    path = bubble.append('path')
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
	}
	monitor.container.addListener = function( id, listener ){
	    monitor.addListener( id, listener );
	}
	return monitor.container;
    }
    ;
    if(util && !('createBubbleMonitor' in util) ){
	util.createBubbleMonitor = createBubbleMonitor;
    }else{
	throw 'Could not add createBubbleMonitor';
    }
})( window, document, d3,  window.util );
