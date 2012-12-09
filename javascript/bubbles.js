(function bubble( window, document, d3, util ){
    var margin = {top: 0, right: 0, bottom: 0, left: 0},
    BubbleExtras = util.objs.Events.extend({
	init : function( radius ){
	    this.listeners = new util.objs.CountMap();
	    this.radius = radius;
	},
	createPath : function( bubble ){
	    path = bubble.append('path')
		.attr('stroke-linecap','round')
		.attr('class','rating');
	},
	createText : function( bubble ){
	    text = bubble.append('text')
		.attr("text-anchor", "middle")
		.attr("dy", ".3em")
		.text(function(d) { return d.text; })
		.style("font-size", "5px")
		.attr('class','bubbletext');
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
	updateText : function( text, radius_override ){
	    var that = this; 
	    text.style("font-size", function(d) {
		var radius = radius_override || that.radius(d.radius);
		return (2 * radius) / d.text.length+'px'; 
	    });
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

	}
	
    }),
    MonitorSet = util.objs.Events.extend({
	init : function( radiuses, categories, modes, svg ){
	    var that = this,
	    radius_range = radiuses || [10,10];
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
	    this.extras = new BubbleExtras( this.radius );
	    this.filter = {};
	    this.modes = util.fn.extend_obj({ 
		cluster : {
		    bubble_class : 'bubble',
		    hide_test : function( candidate ){ return false },
		    updateBubble : function( selected, tick, that ){
			if(tick){
			    selected.attr( 'transform', function(d){ 
				return "translate("+ d.x  + "," + d.y + ")"; 
			    });
			}else{
			    selected.transition().duration(1000).attr( 'transform', function(d){ 
				return "translate("  + d.x  + ","  + d.y + ")";
			    });
			}
		    }
		},
		progress : {
		    bubble_class : 'bubble',
		    hide_test : function( candidate ){ return false },
		    updateBubble : function( selected, tick, that ){
			var width = that.container.offsetWidth,
			height = that.container.offsetHeight;
			if(!tick){
			    selected.transition().duration(1000)
				.attr( 'transform', function(d){
				    return 'translate('+ width * (d.progress||0)  + ',' + height *(1-d.grade ||0) + ')';
				});
			}
		    }
		},
		selected : {
		    bubble_class : 'bubble hidden',
		    radius_override : 50,
		    hide_test : function( candidate ){ return !candidate.selected; },
		    updateBubble : function( candidate, tick, that ){
			if(!tick){
			    candidate.transition().duration(1000).attr( 'transform', function(d){ 
				return 'translate('+ 50  + ',' + 50 + ')';
			    });
			}
		    },
		    updateCircle : function( candidate, that ){
			candidate.attr('r', function( d ) { 
			    return d.selected ? 50 : that.radius( d.radius );
			})
			.style('fill', function( d ) {
			    return that.color( d.group );
			});
		    }
		},
		filter : {
		    bubble_class : 'bubble hidden',
		    hide_test : function( candidate ){ 
			if( that.filter 
			    && 'category' in that.filter 
			    && 'id' in that.filter ){
			    console.log( 'test:',that.filter );
			    return !(that.filter.id in candidate[that.filter.category]);
			}else{
			    console.log( 'skip:',that.filter );
			    return false;
			}
			
		    },
		    updateBubble : function( selected, tick, that ){
			if(tick){
			    selected.attr( 'transform', function(d){ 
				return "translate("+ d.x  + "," + d.y + ")"; 
			    });
			}else{
			    selected.transition().duration(1000).attr( 'transform', function(d){ 
				return "translate("  + d.x  + ","  + d.y + ")";
			    });
			}
		    }
		}
	    }, modes );
	    this.mode = 'progress';//cluster,selected
	    this.previous_mode = null;
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
	updateCircle : function( circle ){
	    var that = this,
	    update_fn = this.modes[this.mode]['updateCircle'] || function( candidate ){
		candidate.style('fill', function( d ) {
		    return that.color( d.group );
		}).attr('r', function( d ) {
		    return that.radius( d.radius );
		});
	    };
	    update_fn( circle, that );
	},
	updateBubble : function( bubble, tick ){
	    var that = this,
	    selected = bubble || that.svg.selectAll('.bubble'),
	    update_fn = this.modes[this.mode]['updateBubble'];

	    update_fn( selected, tick, that );
	    that.hide();
	    that.updateCircle( selected.selectAll('circle'));
	    that.extras.updateText( selected.selectAll('.bubbletext'), this.modes[this.mode]['radius_override'])
	},
	updateData: function( ){
	    var 
	    that = this,
	    bubble_class = that.modes[ that.mode ][ 'bubble_class' ],//only for inserts
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
		    that.extras.createPath( bubble );
		    that.extras.createText( bubble );
		})
		    .call(force.drag);
	    bubbles // update
		.transition().duration(200)
		.each( function( bubble_data ){
		    var bubble = d3.select(this);
		    that.updateCircle( bubbles.selectAll('circle'), false );
		    that.extras.updatePath( bubble.selectAll('path') );
		    that.extras.updateText( bubble.selectAll('.bubbletext') );
		});
	    that.updateBubble( bubbles, false, that );

	    bubbles.exit() // exit
		.transition().duration(400)
		.each( function( d ){
		    var bubble = d3.select(this),
		    circle = bubble.selectAll('circle')
			.transition().duration(100).attr("r", 0);
		    that.notifyListeners('BubbleRemoved',{ id : d.id, selected : d.selected, d3_obj : this });
		}).remove().call(function( d ){
		});
	    bubbles
		.on( 'click', function( d ){
		    d.selected = !d.selected;
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
	setupFilters : function( filter ){
	    if( 'value' in filter ){
		this.switchMode('filter', null );
		this.filter = filter;
		console.log('filter: ',filter);
	    }else{
		this.switchMode(null, null );
	    }
	},
	switchMode : function( mode, trigger ){
	    var next_mode = mode || this.previous_mode || 'progress';
	    this.previous_mode = this.mode;
	    this.mode = next_mode;
	    this.updateBubble( trigger );
	},
	tick : function( e ){
	    var that = this,
	    bubbles = 
		that.svg
		.selectAll(".bubble")
		.each( that.cluster(10 * e.alpha * e.alpha) )
		    .each(that.collide(.5));
	    that.updateBubble( bubbles, true );
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
		if (!(d.group in max) || (d.radius > max[d.group].radius)) {
		    max[d.group] = d;
		}
	    });
	    return function(d) {
		var node = max[d.group] || d,
		l, r, x, y, k = 1, i = -1;
		max[d.group] = max[d.group] || d;
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
			r = that.radius(d.radius) + that.radius(quad.point.radius) + (that.color(d.group) !== that.color(quad.point.group)) * padding;
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
	hide : function( hide_test_fn ){
	    var hide_test = hide_test_fn || this.modes[this.mode]['hide_test'] || function(candidate){ return true; };
	    this.svg.selectAll(".bubble").each( function(bubble, i ){
		if(hide_test(bubble)){
		    d3.select(this).attr('class','bubble hidden');
		}else{
		    d3.select(this).attr('class','bubble');
		}
	    });
	}
    }),
    createBubbleMonitor = function( radius, categories, modes, svg ){
	var monitor = new MonitorSet( radius, categories, modes, svg );
	if(svg){
	    return monitor;
	}else{
	    monitor.container.updateData = function( update, remove, filter ){ 
		monitor.setupFilters( filter );
		monitor.addUpdateBubbles( update ); 
		monitor.removeBubbles( remove );
		monitor.updateData();
	    };
	    monitor.container.redraw = function(){
		monitor.updateData();
	    };
	    monitor.container.addListener = function( id, listener ){
		monitor.addListener( id, listener );
	    };
	    monitor.container.hide = function( hide_test ){ monitor.hide(hide_test); };
	    monitor.container.getSvg = function(){ return monitor.svg; };
	    monitor.container.updateBubble = function( bubble ){ monitor.updateBubble( bubble, false )};
	    monitor.container.switchMode = function( mode, trigger ){ monitor.switchMode( mode, trigger );}
	    return monitor.container;
	}
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
