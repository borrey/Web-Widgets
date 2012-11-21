(function bullets( window, document, d3, util ){
    function bulletRanges(d) {
	return d.ranges;
    }
    function bulletMarkers(d) {
	return d.markers;
    }
    function bulletMeasures(d) {
	return d.measures;
    }
    function bulletWidth(x) {
	var x0 = x(0);
	return function(d) {
	    return Math.abs(x(d) - x0);
	};
    }
    function bulletTranslate(x) {
	return function(d) {
	    return "translate(" + x(d) + ",0)";
	};
    }
    var bullet = function( width, height ) {
	var orient = "left",
	reverse = false,
	duration = 0,
	ranges = bulletRanges,
	markers = bulletMarkers,
	measures = bulletMeasures,
	tickFormat = null;
	
	function bullet(g) {
	    g.each(function(data, i) {
		var d = data.value,
		rangez = ranges.call(this, d, i).slice().sort(d3.descending),
		markerz = markers.call(this, d, i).slice().sort(d3.descending),
		measurez = measures.call(this, d, i).slice().sort(d3.descending),
		g = d3.select(this),
		x1 = d3.scale.linear()// Compute the new x-scale.
		    .domain([0, Math.max(rangez[0], markerz[0], measurez[0])])
		    .range(reverse ? [width, 0] : [0, width]),
		x0 = this.__chart__ || d3.scale.linear()// Retrieve the old x-scale, if this is an update.
		    .domain([0, Infinity])
		    .range(x1.range()),
		w0 = bulletWidth(x0),// Derive width-scales from the x-scales.
		w1 = bulletWidth(x1),
		range = g.selectAll("rect.range") 
		    .data(rangez),
		measure = g.selectAll("rect.measure")
		    .data(measurez),
		marker = g.selectAll("line.marker")
		    .data(markerz),
		format = tickFormat || x1.tickFormat(8),
		tick = g.selectAll("g.tick")
		    .data(x1.ticks(8), function(d) {
			return this.textContent || format(d);
		    }),
		tickEnter = tick.enter().append("g")
		    .attr("class", "tick")
		    .attr("transform", bulletTranslate(x0))
		    .style("opacity", 1e-6),
		tickUpdate = tick.transition()
		    .duration(duration)
		    .attr("transform", bulletTranslate(x1))
		    .style("opacity", 1)
		;

		// Update the range rects.
		range.enter().append("rect")
		    .attr("class", function(d, i) { return "range s" + i; })
		    .attr("width", w0)
		    .attr("height", height)
		    .attr("x", reverse ? x0 : 0)
		    .transition()
		    .duration(duration)
		    .attr("width", w1)
		    .attr("x", reverse ? x1 : 0);
		range.transition()
		    .duration(duration)
		    .attr("x", reverse ? x1 : 0)
		    .attr("width", w1)
		    .attr("height", height);
		// Update the measure rects.
		measure.enter().append("rect")
		    .attr("class", function(d, i) { return "measure s" + i; })
		    .attr("width", w0)
		    .attr("height", height / 3)
		    .attr("x", reverse ? x0 : 0)
		    .attr("y", height / 3)
		    .transition()
		    .duration(duration)
		    .attr("width", w1)
		    .attr("x", reverse ? x1 : 0);
		measure.transition()
		    .duration(duration)
		    .attr("width", w1)
		    .attr("height", height / 3)
		    .attr("x", reverse ? x1 : 0)
		    .attr("y", height / 3);
		// Update the marker
		marker.enter().append("line")
		    .attr("class", "marker")
		    .attr("x1", x0)
		    .attr("x2", x0)
		    .attr("y1", height / 6)
		    .attr("y2", height * 5 / 6)
		    .transition()
		    .duration(duration)
		    .attr("x1", x1)
		    .attr("x2", x1);
		marker.transition()
		    .duration(duration)
		    .attr("x1", x1)
		    .attr("x2", x1)
		    .attr("y1", height / 6)
		    .attr("y2", height * 5 / 6);

		tickEnter.append("line")
		    .attr("y1", height)
		    .attr("y2", height * 7 / 6);
		tickEnter.append("text")
		    .attr("text-anchor", "middle")
		    .attr("dy", "1em")
		    .attr("y", height * 7 / 6)
		    .text(format);
		// Transition the entering ticks to the new scale, x1.
		tickEnter.transition()
		    .duration(duration)
		    .attr("transform", bulletTranslate(x1))
		    .style("opacity", 1);
		tickUpdate.select("line")
		    .attr("y1", height)
		    .attr("y2", height * 7 / 6);

		tickUpdate.select("text")
		    .attr("y", height * 7 / 6);
		// Transition the exiting ticks to the new scale, x1.
		tick.exit().transition()
		    .duration(duration)
		    .attr("transform", bulletTranslate(x1))
		    .style("opacity", 1e-6)
		    .remove();		
		// Stash the new scale.
		this.__chart__ = x1;
	    });
	    
	    d3.timer.flush();
	}
	// left, right, top, bottom
	bullet.orient = function(x) {
	    if (!arguments.length) return orient;
	    orient = x;
	    reverse = orient == "right" || orient == "bottom";
	    return bullet;
	};

	// ranges (bad, satisfactory, good)
	bullet.ranges = function(x) {
	    if (!arguments.length) return ranges;
	    ranges = x;
	    return bullet;
	};

	// markers (previous, goal)
	bullet.markers = function(x) {
	    if (!arguments.length) return markers;
	    markers = x;
	    return bullet;
	};

	// measures (actual, forecast)
	bullet.measures = function(x) {
	    if (!arguments.length) return measures;
	    measures = x;
	    return bullet;
	};

	bullet.width = function(x) {
	    if (!arguments.length) return width;
	    width = x;
	    return bullet;
	};

	bullet.height = function(x) {
	    if (!arguments.length) return height;
	    height = x;
	    return bullet;
	};

	bullet.tickFormat = function(x) {
	    if (!arguments.length) return tickFormat;
	    tickFormat = x;
	    return bullet;
	};

	bullet.duration = function(x) {
	    if (!arguments.length) return duration;
	    duration = x;
	    return bullet;
	};
	return bullet;
    },
    BulletsSet = util.objs.Events.extend({
	init : function( svg, sizing ){
	    if(!svg){
		this.container = document.createElement('div');
		this.svg = d3.select( this.container ).append('svg')
		;
		
	    }else{
		this.container = svg;
		this.svg = svg;
	    }
	    this.sizing = util.fn.extend_obj( { height : 1, width : 1, top : 0, left : 0 }, sizing );
	    this.bullets = this.svg.append('g');
	    this.listeners = new util.objs.CountMap();
	},
	updateData : function( data_set ){
	    var entries = d3.entries(data_set),
	    width = this.container.offsetWidth * this.sizing.width,
	    height = this.container.offsetHeight * this.sizing.height,
	    entry_height = height/entries.length,
	    max_text = 0,
	    bars = this.bullets.selectAll('.bullet')
		.data( entries, function(d){ return d.key; });

	    this.bullets.attr('transform', 'translate('+ this.container.offsetWidth*this.sizing.left  +',' 
			       + this.container.offsetHeight* this.sizing.top + ")");
	    bars.enter()//create
		.append('g')
		.attr('class', 'bullet')
		.each( function(d, i){
		    var bullet = d3.select(this),
		    chart = bullet.append("g")
			.attr('class', 'chart'),
		    title = bullet.append("g")
			.style("text-anchor", "end")
			.attr("transform", "translate(-6," + entry_height / 2 + ")"),
		    main_title = title.append("text")
			.attr('class', 'title')
			.text(function(d) { return d.value.title; }),
		    sub_title= title.append("text")
			.attr('class', 'subtitle')
			.attr('dy', '1em')
			.text(function(d) { return d.value.subtitle; })
		    ;
		});
	    bars.select('.subtitle').each(function(d,i){ if( max_text < this.offsetWidth ){ max_text = this.offsetWidth }});
	    bars.select('.title').each(function(d,i){ if( max_text < this.offsetWidth ){ max_text = this.offsetWidth }});
	    max_text += 40;
	    bars
		.attr("transform", function(d,i){ return 'translate( '+ max_text +',' + i*entry_height + ')'})
		.select('.chart').call( bullet( width - max_text - 40, (entry_height *5/6) - 20 ) );

	    bars.exit()
		.remove()
	}
    }),
    createBullets = function( svg, sizing ){
	var bullets = new BulletsSet( svg, sizing );
	bullets.container.updateData = function(data){ bullets.updateData(data); };
	return bullets.container;
    }
    ;
    if(util && !('createBullets' in util) ){
	util.createBullets = createBullets;
    }else{
	throw 'Could not add createBullets';
    }
    if( util && util.objs ){
	util.objs.BulletsSet = BulletsSet;
    }


})( window, document, window.d3,  window.util );
