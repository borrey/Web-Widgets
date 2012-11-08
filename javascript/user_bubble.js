(function user_bubble( window, document, d3, util ){
    var 
    arc = d3.svg.arc(),
    rating_max = 100,
    rating_arc = function( value ){
	var start_angle = (2*Math.PI*0)/rating_max,
	end_angle = (2*Math.PI*value)/rating_max;
	return arc({ 
	    startAngle : start_angle,
	    endAngle : end_angle,
	    innerRadius : 15,
	    outerRadius : 20
	});
    },
    MonitorSet = util.objs.Class.extend({
	init : function(){
	    this.container = document.createElement('div');
	    this.svg = d3.select( this.container ).append('svg');
	    this.users = new util.objs.CountMap();
	},
	addUpdateUsers : function( users ){
	    var idx, user;
	    for( idx in users ){
		if( this.users.contains( idx ) ){
		    user = util.fn.extend_obj( this.users.get( idx ), 
				       users[idx] );
		}else{
		    user = users[idx];
		}
		this.users.add( idx, user );
	    }
	},
	removeUsers : function( users ){
	    var idx;
	    for( idx in users ){
		this.users.remove( idx );
	    }
	},
	updatePosition : function( e ){
	    var users = this.svg.selectAll(".user")
		.attr( 'transform', function(d){ 
		    return "translate(" + d.x + "," + d.y + ")";
		});
	},
	updateData: function( ){
	    // bind the data to the selection
	    var that = this,
	    width = this.container.offsetWidth,
	    height = this.container.offsetHeight,
	    entries = this.users.getEntries(),
	    num_nodes_across_radius = Math.sqrt(entries.length/Math.PI),
	    charge = -Math.min(width, height) / num_nodes_across_radius,
	    users = this.svg.selectAll(".user")
		.data( entries, function(d){ return d.id; }),
	    force = d3.layout.force()
		.links( [] )
		.nodes( entries )
		.charge( charge )
		.size([width,height]);
	    //  set initial state for each circle
	    users.enter()
		.append('g')
		.attr('class','user')
		.each( function( d ){
		    var user = d3.select(this),
		    path = user.append('path')
			.attr('class','rating'),
		    circle = user.append('circle')
			.attr("r", 15)
			.attr('class','info'),
		    text = user.append('text')
			.attr('text-anchor', 'middle')
			.attr('dominant-baseline', 'middle')
			.attr('class','info_text ')
		    ;		    
		});
	    
	    // transition the radius of each circle
	    users
		.transition().duration(200)
		//.attr("transform", function( d, i ) { return "translate(" + 100 + "," + (100 + i*40) + ")"; })
		.each( function( d ){
		    var user = d3.select(this),
		    text = user.selectAll('text.info_text'),
		    path = user.selectAll('path');
		    text.text(d.id);
		    path.transition().duration(20000).attrTween( 
			"d", 
			function( a ){
			    var i = d3.interpolate( d.rating_init || 0 , a.rating );
			    return function(t) {
				return rating_arc(i(t));
			    }
			}
		    );
		    d.rating_init = d.rating;
		});

	    //  what happens when an element is removed
	    users.exit()
		.transition().duration(400)
		.each( function( d ){
		    var user = d3.select(this),
		    text = user.selectAll('text.info_text'),
		    path = user.selectAll('path'),
		    circle = user.selectAll('circle');
		    text.transition().duration(100).style('font-size',0);
		    circle.transition().duration(100).attr("r", 0);
		    path.attr( "d", rating_arc(d.rating) );
		})
		.remove()
	    ;

	    force.on("tick", function( e ){ that.updatePosition( ); }).start();
	    users.on( 'click', function( d ){
		console.log('user clicked: ', d);
	    });

        }	    
    });
    createUserMonitor = function(){
	var monitor = new MonitorSet();
	monitor.container.updateData = function( update, remove ){ 
	    monitor.addUpdateUsers( update ); 
	    monitor.removeUsers( remove );
	    monitor.updateData();
	}
	
	return monitor.container;
    }
    ;
    if(util && !('monitor_users' in util) ){
	util.monitor_users = {
	    createUserMonitor : createUserMonitor
	}
    }
})( window, document, d3,  window.util );
