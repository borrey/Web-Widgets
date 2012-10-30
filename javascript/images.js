(function images( window, document, util ){
    
    var getEventCoordinates = function( event ){
	return {
	    x : ( event.layerX || event.layerX === 0 ) ? 
		event.layerX : event.offsetX,
	    y : ( event.layerY || event.layerY === 0 ) ? 
		event.layerY : event.offsetY
	};
    }, 
    addOption = function( select_obj, option_text ){
	var option=document.createElement("option");
	option.text = option_text;
	try {
	    // for IE earlier than version 8
	    select_obj.add( option, select_obj.options[null] );
	} catch (e) {
	    select_obj.add(option,null);
	}
    },
    Tool = util.objs.Class.extend({
	init : function( canvas, tmp_canvas, action_stack ){
	    this.canvas = canvas;
	    this.tmp_canvas = tmp_canvas;
	    this.context = canvas.getContext('2d');
	    this.tmp_context = tmp_canvas.getContext('2d');
	    this.action_stack = action_stack;
	    this.restore_on_move = false;
	    this.started = false;
	    this.started_coordinates = { x : 0, y :0 };
	    this.type = 'tool';
	},
	mousedown : function( event ){
	    this.started = true;
	    this.start(getEventCoordinates(event));
	},
	mousemove : function( event ){
	    if(this.started){
		if(this.restore_on_move){
		    this.tmp_context.clearRect(0, 0, this.tmp_canvas.width, this.tmp_canvas.height);
		}
		this.update( getEventCoordinates(event) );
	    }
	},
	mouseup : function( event ){
	    if(this.started){
		this.finish( getEventCoordinates(event) );
		this.started = false;
	    }
	},
	start : function( start_coordinates ){
	    this.started_coordinates = start_coordinates;
	    this.action = { tool : this.type, start : start_coordinates };
	},
	update : function( new_coordinates ){
	    this.action.update = new_coordinates;
	},
	finish : function( end_coordinates ){
	    if(this.restore_on_move){
		this.tmp_context.clearRect(0, 0, this.tmp_canvas.width, this.tmp_canvas.height);
	    }
	    this.update( end_coordinates );
	    this.context.drawImage(this.tmp_canvas, 0, 0);
	    this.tmp_context.clearRect(0, 0, this.tmp_canvas.width, this.tmp_canvas.height);
	    this.action.finish = end_coordinates;
	    this.action_stack.push( this.action );
	}
    }),
    Pen = Tool.extend({
	init : function( canvas, tmp_canvas, action_stack ){
	    this.canvas = canvas;
	    this.tmp_canvas = tmp_canvas;
	    this.context = canvas.getContext('2d');
	    this.tmp_context = tmp_canvas.getContext('2d');
	    this.action_stack = action_stack;
	    this.restore_on_move = false;
	    this.started = false;
	    this.started_coordinates = { x : 0, y :0 };	    
	    this.type = 'pen';
	},
	start : function( start_coordinates ){
	    this.started_coordinates = start_coordinates;
	    this.tmp_context.beginPath();
	    this.tmp_context.moveTo( start_coordinates.x, start_coordinates.y );
	    this.action = { tool : this.type, start : start_coordinates, update : [] };
	},
	update : function( new_coordinates ){
	    this.tmp_context.lineTo( new_coordinates.x, new_coordinates.y);
	    this.tmp_context.stroke();
	    this.action.update.push(new_coordinates);
	}
    }),
    Rectangle = Tool.extend({
	init : function( canvas, tmp_canvas, action_stack ){
	    this.canvas = canvas;
	    this.tmp_canvas = tmp_canvas;
	    this.context = canvas.getContext('2d');
	    this.tmp_context = tmp_canvas.getContext('2d');
	    this.action_stack = action_stack;
	    this.restore_on_move = true;
	    this.started = false;
	    this.started_coordinates = { x : 0, y :0 };
	    this.type = 'rectangle';
	},
	update : function( new_coordinates ){
	    if( this.started_coordinates.x !== new_coordinates.x && 
		this.started_coordinates.y !== new_coordinates.y ){
		this.tmp_context.strokeRect( Math.min( this.started_coordinates.x, new_coordinates.x ),
					 Math.min( this.started_coordinates.y, new_coordinates.y ),
					 Math.abs( this.started_coordinates.x - new_coordinates.x ),
					 Math.abs( this.started_coordinates.y - new_coordinates.y ));
	    }
	}
    }),
    Line = Tool.extend({
	init : function( canvas, tmp_canvas, action_stack ){
	    this.canvas = canvas;
	    this.tmp_canvas = tmp_canvas;
	    this.context = canvas.getContext('2d');
	    this.tmp_context = tmp_canvas.getContext('2d');
	    this.action_stack = action_stack;
	    this.restore_on_move = true;
	    this.started = false;
	    this.started_coordinates = { x : 0, y :0 };
	    this.type = 'line';
	},
	update : function( new_coordinates ){
	    
	    this.tmp_context.beginPath();
	    this.tmp_context.moveTo( this.started_coordinates.x, 
				     this.started_coordinates.y );
	    this.tmp_context.lineTo( new_coordinates.x, new_coordinates.y );
	    this.tmp_context.stroke();
	    this.tmp_context.closePath();
	}
    }),
    Circle = Tool.extend({
	init : function( canvas, tmp_canvas, action_stack ){
	    this.canvas = canvas;
	    this.tmp_canvas = tmp_canvas;
	    this.context = canvas.getContext('2d');
	    this.tmp_context = tmp_canvas.getContext('2d');
	    this.action_stack = action_stack;
	    this.restore_on_move = true;
	    this.started = false;
	    this.started_coordinates = { x : 0, y :0 };
	    this.type = 'circle';
	},
	update : function( new_coordinates ){
	    var a = Math.abs( this.started_coordinates.x - new_coordinates.x ),
	    b = Math.abs( this.started_coordinates.y - new_coordinates.y ),
	    c_square = a*a+b*b,
	    radius = Math.round(Math.sqrt( c_square )),
	    startAngle = 0, endAngle = 2*Math.PI, counterClockwise = false
	    ;
	    this.tmp_context.beginPath();
	    this.tmp_context.arc( this.started_coordinates.x, 
				  this.started_coordinates.y,
				  radius,
				  startAngle, endAngle, counterClockwise
				);
		//this.tmp_context.lineTo( new_coordinates.x, new_coordinates.y );
	    this.tmp_context.stroke();
	    this.tmp_context.closePath();
	}
    }),
    createPaint = function( base_image, width, height ){
	var paint = document.createElement('div'),
	
	canvas = paint.appendChild( document.createElement('canvas') ),
	tmp_canvas = paint.appendChild( document.createElement('canvas') ),
	select = paint.appendChild( document.createElement('select') ),
	undo_stack = [],
	redo_stack = [],
	tools = {
	    pen : new Pen( canvas, tmp_canvas, undo_stack ),
	    rectangle : new Rectangle( canvas, tmp_canvas, undo_stack ),
	    circle : new Circle( canvas, tmp_canvas, undo_stack ),
	    line : new Line( canvas, tmp_canvas, undo_stack )
	},
	current_tool = 'pen',
	tool_fn = function(ev){
	    tools[current_tool][ev.type](ev);
	}
	;

	tmp_canvas.style.position = 'absolute';
	tmp_canvas.style.left = canvas.offsetLeft+'px';
	tmp_canvas.style.top = canvas.offsetTop+'px';

	addOption( select, 'pen' );
	addOption( select, 'line' );
	addOption( select, 'rectangle' );
	addOption( select, 'circle' );
	select.addEventListener('change', function(event){
	    if (tools[this.value]) {
		current_tool = this.value;
	    }	    
	}, false);
	runTool = function( action ){
	    var idx = 0, tool = tools[action.tool];
	    tool.start( action.start );
	    if( action.update ){
		for( idx = 0; idx < action.update.length; idx++){
		    tool.update( action.update[idx] );
		}
	    }
	    tool.finish( action.finish );
	    return action;
	};
	paint.runActionStack = function(){
	    var idx = 0, length = undo_stack.length, tmp_action_stack = undo_stack.slice();
	    undo_stack.splice(0, length );
	    while( tmp_action_stack.length ){
		runTool(tmp_action_stack.shift());
	    }
	};
	paint.undo = function(){
	    if( undo_stack.length ){
		redo_stack.push(undo_stack.pop());
		paint.clear();
		paint.runActionStack();
	    }
	};
	paint.redo = function(){
	    if( redo_stack.length ){
		undo_stack.push( redo_stack.pop() );
		paint.clear();
		paint.runActionStack();
	    }
	};
	paint.clear = function(){
	    var context = canvas.getContext('2d');
	    context.clearRect(0, 0, canvas.width, canvas.height);
	};
	util.style.addClassToElement( paint, 'paint' );
	// Attach the mousedown, mousemove and mouseup event listeners.
	tmp_canvas.addEventListener('mousedown', tool_fn, false);
	tmp_canvas.addEventListener('mousemove', tool_fn, false);
	tmp_canvas.addEventListener('mouseup',   tool_fn, false);
	
	return paint;
    }
    if(util && !('images' in util) ){
	util.images = {
	    createPaint : createPaint
	}
    }
})( window, document, window.util );
