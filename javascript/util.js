(function util( window, document ){
    var /*http://ejohn.org/blog/simple-javascript-inheritance/*/
    initializing = false, fnTest = /xyz/.test(function(){xyz;}) ? /\b_super\b/ : /.*/;
    // The base Class implementation (does nothing)
    this.Class = function(){};
    // Create a new Class that inherits from this class
    Class.extend = function(prop) {
	//http://ejohn.org/blog/simple-javascript-inheritance/
	var _super = this.prototype;
	// Instantiate a base class (but only create the instance,
	// don't run the init constructor)
	initializing = true;
	var prototype = new this();
	initializing = false;
	// Copy the properties over onto the new prototype
	for(var name in prop) {
	    // Check if we're overwriting an existing function
	    prototype[name] = typeof prop[name] == "function" && 
		typeof _super[name] == "function" && fnTest.test(prop[name]) ?
		(function(name, fn){
		    return function() {
			var tmp = this._super;
			// Add a new ._super() method that is the same method
			// but on the super-class
			this._super = _super[name];
			
			// The method only need to be bound temporarily, so we
			// remove it when we're done executing
			var ret = fn.apply(this, arguments);        
			this._super = tmp;
			return ret;
		    };
		})(name, prop[name]) :
            prop[name];
	}
	// The dummy class constructor
	function Class() {
	    // All construction is actually done in the init method
	    if ( !initializing && this.init )
		this.init.apply(this, arguments);
	}
	// Populate our constructed prototype object
	Class.prototype = prototype;
	// Enforce the constructor to be what we expect
	Class.prototype.constructor = Class;
	// And make this class extendable
	Class.extend = arguments.callee;
	return Class;
    };
    var CountMap = Class.extend({/*Object representation of a map with array functions*/
	init : function(){
	    this.map = {};
	    this.cnt = 0;
	},
	add : function( key, value ){
	    if(!this.contains(key)){this.cnt++;}
	    this.map[key] = value;
	},
	remove : function( key ){
	    if(this.contains(key)){
		delete this.map[key];
		this.cnt--;
	    }
	},
	contains : function( key ){
	    return key in this.map;
	},
	get : function( key ){
	    return this.map[key];
	},
	getCnt : function(){
	    return this.cnt;
	},
	callEach : function( callback_name , args ){
	    var idx;
	    for( idx in this.map ){
		if(this.map[idx] && this.map[idx][callback_name]){
		    this.map[idx][callback_name]( args );
		}else{
		    //console.log('skipping', idx, this.map, this.map[idx]);
		}
	    }
	},
	applyEach : function( callback, args ){
	    var idx;
	    for( idx in this.map ){
		callback(this.map[idx], args, idx );
	    }
	},
	getEntries : function(){
	    var idx, entries = [];
	    for( idx in this.map ){
		entries.push( this.map[idx] );
	    }
	    return entries;
	}
    });
    Events = Class.extend({
	init : function( ){
	    this.listeners = new CountMap();
	},
	addListener : function( id, listener ){
	    this.listeners.add( id, listener );
	},
	notifyListeners : function( type, args ){
	    this.listeners.callEach( type, { type : type, args : args });
	}
    }),
    QueuePipe = Events.extend({
	init : function( ){
	    this.queues = new CountMap();
	    this.triggers = new CountMap();
	    this.listeners = new CountMap();
	},
	createTrigger : function( trigger_name ){
	    var trigger = { queue : [ ], status : false };
	    this.triggers.add( trigger_name, trigger );
	    return trigger;
	},
	createQueue : function( queue_name ){
	    var queue = { queue : [], triggers : [] };
	    this.queues.add( queue_name, queue );
	    return queue;
	},
	addTrigger : function( trigger_name, queue_name ){
	    var 
	    trigger = this.triggers.contains( trigger_name) ? 
		this.triggers.get( trigger_name ) : this.createTrigger( trigger_name ), 
	    queue = this.queues.contains( queue_name) ?
		this.queues.get( queue_name ) : this.createQueue( queue_name );
	    if( trigger.queue.lastIndexOf( queue_name ) === -1 ){
		trigger.queue.push( queue_name );
	    }
	    if( !trigger.status
		&& queue.triggers.lastIndexOf( trigger_name ) === -1){
		queue.triggers.push( trigger_name );
	    }
	},
	setTrigger : function( trigger_name ){
	    var
	    trigger = this.triggers.contains( trigger_name) ?
		this.triggers.get( trigger_name ) : this.createTrigger( trigger_name ),
	    idx;
	    trigger.status = true;
	    for( idx = 0; idx < trigger.queue.length; idx++ ){
		this.updateQueue( trigger.queue[idx], trigger_name );
	    }
	},
	updateQueue : function( queue_name, trigger_name ){
	    var 
	    queue = this.queues.contains( queue_name) ?
		this.queues.get( queue_name ) : this.createQueue( queue_name ),
	    trigger_idx = queue.triggers.lastIndexOf( trigger_name );
	    if( trigger_idx !== -1 ){
		queue.triggers.splice( trigger_idx, 1 );
	    }
	    if( queue.triggers.length <= 0 ){
		while( queue.queue.length > 0 ){
		    this.notifyListeners( queue_name, queue.queue.shift() );
		}
	    }
	},
	callback : function( data ){
	    var 
	    queue_name = data.type,
	    queue = this.queues.contains( queue_name ) ? 
		this.queues.get( queue_name ) : this.createQueue( queue_name ); 
	    if( queue.triggers.length <= 0 ){
		while( queue.queue.length > 0 ){
		    var args = queue.queue.shift();
		    this.notifyListeners( queue_name, args.args );
		}
		this.notifyListeners( queue_name, data.args );
	    }else{
		queue.queue.push( data );
	    }
	}
    }),
    TimeoutBuffer = Class.extend({
	init : function( callback ){
	    this.callback = callback;
	    this.in_timeout = false;
	},
	startTimeout : function( timeout ){
	    var that = this;
	    if( !this.in_timeout ){
		this.in_timeout = true;
		setTimeout(function(){ 
		    that.callback(); 
		    that.in_timeout = false;
		}, 1000);
	    }
	}
    }),
    TimeoutBufferTest = Class.extend({
	init : function( test, callback ){
	    this.callback = callback;
	    this.test = test;
	},
	startTimeout : function( timeout ){
	    var that = this,
	    time = timeout || 1000;
	    if( this.test() ){
		this.callback();
	    }else{
		setTimeout(function(){ 
		    that.startTimeout(); 
		}, 1000);
	    }
	}
    }),
    /********* fn **************/
    extend = function(obj, obj_append){
	if (arguments.length > 2) {
	    for (var arg_idx = 1; arg_idx < arguments.length; arg_idx++) {
		extend(obj, arguments[arg_idx]);
	    }
	} else {
	    for (var idx in obj_append) {
		obj[idx] = obj_append[idx];
	    }
	}
	return obj;
    }, 
    generateId = function( prefix ){
	var _prefix = prefix || '';
	return _prefix+(new Date()).getTime()+'_'+ (Math.floor(Math.random() * 1000000)+'').substr(0, 18);
    },
    waitForTestToPass = function( test_fn, fn ){
	if( !test_fn() ){
	    setTimeout( util.waitForTestToPass, 1000, test_fn, fn);
	}else{
	    fn();
	}
    },
    /********* cookies **************/
    setCookie = function( name, value, days){
	if (days) {
	    var date = new Date();
	    date.setTime(date.getTime()+(days*24*60*60*1000));
	    var expires = "; expires="+date.toGMTString();
	}
	else var expires = "";
	document.cookie = name+"="+value+expires+"; path=/";
    },
    getCookie = function( name ){
	var nameEQ = name + "=";
	var ca = document.cookie.split(';');
	for(var i=0;i < ca.length;i++) {
	    var c = ca[i];
	    while (c.charAt(0)==' ') c = c.substring(1,c.length);
	    if (c.indexOf(nameEQ) == 0) return c.substring(nameEQ.length,c.length);
	}
	return null;
    },
    removeCookie = function( name ){
	createCookie(name,"",-1);
    },
    /*************** string ******************/
    hasString = function( full_str, search_str ){
	return full_str.match(new RegExp('(\\s|^)'+search_str+'(\\s|$)','g'));
    },
    addString = function( full_str, add_str, check_exist ){
	var _full_str = full_str || '';
	if( !check_exist || ! hasString( _full_str, add_str ) ){
	    return _full_str+' '+add_str;
	}else{
	    return _full_str;
	}
    }, 
    removeString = function( full_str, remove_str ){
	var _full_str = full_str || '';
	if( _full_str && hasString( _full_str, remove_str ) ){
	    return _full_str.replace(new RegExp('(\\s|^)' + remove_str + '(\\s|$)'),' ');
	}else{
	    return _full_str;
	}
    },
    toggleString = function( full_str, toggle_str ){
	var _full_str = full_str || '';
	if( hasString( _full_str, toggle_str ) ){
	    return removeString( _full_str, toggle_str );
	}else{
	    return addString( _full_str, toggle_str, false );
	}
    },
    /******* dom *******/
    getWindowDimensions = function(){
	var myHeight = 0, myWidth =0;
	if( typeof( window.innerWidth ) == 'number' ) {
	    //Non-IE
	    myWidth = window.innerWidth;
	    myHeight = window.innerHeight;
	} else if( document.documentElement && ( document.documentElement.clientWidth || document.documentElement.clientHeight ) ) {
	    //IE 6+ in 'standards compliant mode'
	    myWidth = document.documentElement.clientWidth;
	    myHeight = document.documentElement.clientHeight;
	} else if( document.body && ( document.body.clientWidth || document.body.clientHeight ) ) {
	    //IE 4 compatible
	    myWidth = document.body.clientWidth;
	    myHeight = document.body.clientHeight;
	}
	return [ myWidth, myHeight ];
    },
    waitForElementToLoad = function( element, ancestor, fn ){
	var _ancestor = ancestor || document.body
	if( !element  ){
	    throw 'missing element';
	    return;
	} 
	if( _ancestor === null || (element !== _ancestor && !_ancestor.contains(element))){
	    setTimeout( waitForElementToLoad, 1000, element, _ancestor, fn);
	}else{
	    fn();
	}
    },
    addEvent = function(obj, evt, fn , stop ){
	var _fn = !stop ? fn : function( e ){ 
	    if( e ){ 
		if(e.stopPropogation){ e.stopPropogation(); }
		if(e.preventDefault){ e.preventDefault(); }
		if('cancelBubble' in e ){ e.cancelBubble = stop; }
	    } else if( window.event && window.event.cancelBubble ){ 
		window.event.cancelBubble = true; 
	    }
	    fn(e); 
	};
	if ( 'undefined' != typeof obj.addEventListener ){
	    obj.addEventListener( evt, _fn, false );
	}
	else if ( 'undefined' != typeof obj.attachEvent ){
	    obj.attachEvent( "on" + evt, _fn );
	}else{
	    throw 'missing EventListener';  
	}
    },
    clearChildren = function( parent_element ){
	if ( parent_element.hasChildNodes() ){
	    while ( parent_element.childNodes.length >= 1 ){
		parent_element.removeChild( parent_element.firstChild );       
	    }
	}
    },
    prependChild = function( parent_element, child_node ){
	parent_element.insertBefore( child_node, parent_element.firstChild);
    },
    isParent = function ( parent_candidate, node ){
	for (; node; node = node.parentNode) {
	    if(parent_candidate === node){
		return true;
	    }
	}
	return false;
    },
    getParents = function( node ){
	var nodes = [];
	for (; node; node = node.parentNode) {
	    nodes.unshift(node);
	}
	return nodes;
    },
    findCommonParent = function( node1, node2 ){
	var parents1 = getParents(node1),
	parents2 = getParents(node2),
	idx;
	if (parents1[0] != parents2[0]){ throw "No common ancestor!";};
	for (idx = 0; idx < parents1.length; idx++) {
	    if (parents1[idx] != parents2[idx]) return parents1[idx - 1]
	}	
    },
    /****** style ********/
    getElementStyle = function( element, css_rule ){
	var strValue = "";
	if(document.defaultView && document.defaultView.getComputedStyle){
	    strValue = document.defaultView.getComputedStyle(element, "").getPropertyValue(css_rule);
	}else if(oElm.currentStyle){
	    css_rule = css_rule.replace(/\-(\w)/g, function (strMatch, p1){
		return p1.toUpperCase();
	    });
	    strValue = element.currentStyle[css_rule];//strCssRule
	}
	return strValue;	
    },
    addClassToElement = function( element, class_name ){
	element.className = addString( element.className, class_name, true );	
    },
    removeClassToElement = function( element, class_name ){
	element.className = removeString( element.className, class_name );	
    },
    toggleClassToElement = function( element, class_name ){
	element.className = toggleString( element.className, class_name );	
    },
    getAvgColor = function( data, precentage ){
	var 
	rgb = [ 0, 0, 0 ],
	count = 0,
	len = ~~(data.length * precentage);//~~ to get floor
	for (var i = 0; i < len; i += 4){
	    count++;
	    rgb[0] += data[i];
	    rgb[1] += data[i+1];
	    rgb[2] += data[i+2];
	}
	return rgb;
    };
    /**************************************************************/

    if(window.util === undefined){
	window.util = {
	    objs : {
		Class : Class,
		CountMap : CountMap,
		Events : Events,
		QueuePipe : QueuePipe,
		TimeoutBuffer : TimeoutBuffer,
		TimeoutBufferTest: TimeoutBufferTest
	    },
	    fn : {
		generateId : generateId,
		extend_obj : extend,
		waitForTestToPass : waitForTestToPass
	    },
	    cookies : {
		set : setCookie,
		get : getCookie,
		remove : removeCookie
	    },
	    string : {
		hasString : hasString,
		addString : addString,
		removeString : removeString,
		toggleString : toggleString
	    },
	    dom : {
		getWindowDimensions : getWindowDimensions,
		waitForElementToLoad : waitForElementToLoad,
		addEvent : addEvent,
		clearChildren : clearChildren,
		prependChild : prependChild,
		isParent : isParent,
		getParents : getParents,
		findCommonParent : findCommonParent
	    },
	    style :{
		getElementStyle : getElementStyle,
		addClassToElement : addClassToElement,
		removeClassToElement : removeClassToElement,
		toggleClassToElement : toggleClassToElement
	    }
	};
    }else{
	throw 'util already exists';
    }

})( window, document );
