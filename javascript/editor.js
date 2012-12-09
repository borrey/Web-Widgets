(function editor( window, document, util ){

    var 
    getTarget = function( initial_target ){
	var target_pt = initial_target,
	target_map_id = target_pt && target_pt.getAttribute ? target_pt.getAttribute('data-map_id') : null;
	while( target_pt && !target_map_id && target_pt !== cursor.elements.root ){
	    target_pt = target_pt.parentNode;
	    target_map_id = target_pt.getAttribute ? target_pt.getAttribute('data-map_id') : null;
	}
	return target_pt;
    },
    getSelectionRange = function(){
	var range = null,
	userSelection = null,
	handleSpecialRange = function( range ){
	    var findTextNode = function( parentElement, text ) {
		//Iterate through all the child text nodes and check for matches
		//As we go through each text node keep removing the text value 
		//(substring) from the beginning of the text variable.
		var container = null, 
		offset = -1,
		node = parentElement.firstChild;
		for( true; node; node = node.nextSibling) {
		    if(node.nodeType==3) {//Text node
			var find=node.nodeValue;
			var pos=text.indexOf(find);
			if(pos==0 && text!=find) { //text==find is a special case
			    text=text.substring(find.length);
			} else {
			    container=node;
			    offset=text.length-1; //Offset to the last character of text. text[text.length-1] will give the last character.
			    break;
			}
		    }
		}
		return {node: container,offset: offset}; //nodeInfo
	    },
	    updateRange = function( range, nodeInfo1, nodeInfo2){
		range.startContainer = nodeInfo1.node;
		range.startOffset = nodeInfo1.offset;
		range.endContainer = nodeInfo2.node;
		range.endOffset = nodeInfo2.offset+1;
		return range;
	    },
	    updateRangeText = function( range, rangeCopy1, rangeCopy2, parentElement1, parentElement2 ){
		
		if(parentElement1 instanceof HTMLInputElement || parentElement2 instanceof HTMLInputElement) {
		    //If user clicks the input button without selecting text, 
		    //then moveToElementText throws an error.
		    return null;
		}
		var rangeObj1=range.duplicate(), 
		rangeObj2=range.duplicate(); //More copies :P

		rangeObj1.moveToElementText(parentElement1); //Select all text of parentElement
		rangeObj1.setEndPoint('EndToEnd',rangeCopy1); //Set end point to the first character of the 'real' selection
		rangeObj2.moveToElementText(parentElement2);
		rangeObj2.setEndPoint('EndToEnd',rangeCopy2); //Set end point to the last character of the 'real' selection
		return updateRange( range, 
				    findTextNode( parentElement1, rangeObj1.text), 
				    findTextNode( parentElement2, rangeObj2.text)
				  );
	    },
	    findParentInfo = function( range, callback ){
		var rangeCopy1=range.duplicate(), 
		rangeCopy2=range.duplicate(); //Create a copy

		rangeCopy1.collapse(true); //Go to beginning of the selection
		rangeCopy1.moveEnd('character',1); //Select only the first character
		
		rangeCopy2.collapse(false); //Go to the end of the selection
		rangeCopy2.moveStart('character',-1); //Select only the last character

		return updateRangeText( range, rangeCopy1, rangeCopy2, rangeCopy1.parentElement(), rangeCopy2.parentElement());
	    },
	    new_range = findParentInfo( range );
	    return new_range;
	};
	if (window.getSelection) {
	    userSelection = window.getSelection();
	    if (userSelection.getRangeAt){
		if(userSelection.rangeCount <= 0){
		    return null;
		}
		range = userSelection.getRangeAt(0);
		return range;
	    }else{ //safari
		range = document.createRange();
		range.setStart ( userSelection.anchorNode, userSelection.anchorOffset );
		range.setEnd ( userSelection.focusNode, userSelection.focusOffset );
		return range;
	    }
	}else if (document.selection) { // should come last; Opera!
	    range =  document.selection.createRange();
	    if(!range){ return null;}
	    if(!range.startContainer && window.document.selection) { //IE8 and below
		return handleSpecialRange( range );
	    }
	    return range;
	}
    },

    Cursor = util.objs.Events.extend({
	init : function( container ){
	    this.cursor_element = document.createElement('span');
	    this.root = container || document.getElementsByTagName("body")[0];
	    previous_view = null;
	    this.cursor_element.setAttribute('id','cursor');
	    this.cursor_element.onmouseup = function( e ){
		var e = event || window.event;
		e.cancelBubble = true;
		if (e.stopPropagation){
		    e.stopPropagation();
		}
		return false;
	    };
	},
	setForm : function( view_obj ){
	    if( this.previous_view ){
		this.previous_view.unsetTarget( this );
	    }
	    this.previous_view = view_obj;
	    view_obj.setTarget( this );
	},
	getElement : function(){
	    return this.cursor_element;
	}
    }),
    BaseObject = util.objs.Events.extend({
	init : function( parent, map_idx, args ){
	    this.target = null;
	    setup( parent, map_idx );
	},
	setup : function( parent, map_idx ){
	    this.parent = parent;
	    this.map_id = map_idx;
	    this.target.setAttribute('data-map_id', map_idx);
	},
	setTarget : function( cursor ){
	    
	},
	unsetTarget : function( cursor ){
	    
	},
	getParentNode : function(){
	    return this.target.parent;
	},
	getTarget : function(){
	    return this.target;
	},
	getNextNode : function(){
	    var target_pt = getTarget( this.target.nextSibling ) || getTarget( this.target.parentNode ),
	    target_map_id = target_pt && target_pt.getAttribute ? target_pt.getAttribute('data-map_id') : null;
	},
	setKeyCapturePos : function( key_capture, pos ){
	    if(key_capture.setSelectionRange){
		key_capture.focus();
		key_capture.setSelectionRange(pos,pos);
	    }else if (key_capture.createTextRange) {
		var range = key_capture.createTextRange();
		range.collapse(true);
		range.moveEnd('character', pos );
		range.moveStart('character', pos );
		range.select();
	    }else{
		alert('Error');
	    }
	},
	getKeyCaptureSelectStart : function( key_capture ){
	    if (key_capture.createTextRange) {
		var r = document.selection.createRange().duplicate();
		r.moveEnd('character', key_capture.value.length)
		if (r.text == ''){
		    return key_capture.value.length;
		}
		return key_capture.value.lastIndexOf(r.text);
	    } else{
		return key_capture.selectionStart;
	    }
	},
	checkSpecialEvents : function( event ){
	    if(event.type === 'keydown'){
		
	    }
	    return false;
	}
    }),
    TextEditor = util.objs.Events.extend({
	init : function( container ){
	    var that = this;
	    this.map = {};
	    this.factory = {
		paragraph : paragraph,
		text : text
	    };
	    this.map_idx = 0;
	    this.container = container;
	    this.base_cursor = new Cursor( container ); 
	    container.onmouseup = function( e ){ 
		that.handleUserSelection( e );
	    };
	},
	handleUserSelection : function( e ){
	    var event = e || window.event,
	    target_pt = getTarget( event.target || event.srcElement ),
	    target_map_id = target_pt.getAttribute ? target_pt.getAttribute('data-map_id') : null,
	    range = getSelectionRange(),
	    node = (range) ? range.startContainer : null,
	    offset = (range) ? range.startOffset : null;
	    if( this.checkIfRangeIsForCursor( range ) ){
		if( target_map_id ){
		    //view.map[target_map_id].set_target( view.map[target_map_id], node, offset );
		}else{
		    throw 'could not find target_map_id';//console.log('could not find target_map_id');
		}
	    }else{
		alert('commenting');
	    }
	},
	checkIfRangeIsForCursor : function( range ){
	    return !range || 
		( range.startContainer && range.endContainer
		  && range.startContainer === range.endContainer
		  && range.startOffset === range.endOffset);
	},
	createView : function( parent, predecessor, type, args ){
	    if( !(type in this.factory) ){
		throw 'Do not know type'
	    }
	    var view_obj = this.factory[type] ? new this.factory[type]( parent, this.map_idx, args ) : null,
	    parent_node = (parent) ? (parent.node || parent.target) : this.container;
	    
	    this.map[this.map_idx] = view_obj; 
	    this.map_idx++;
	    if(parent_node && view_obj.getTarget()){
		if( predecessor && predecessor.getTarget() && predecessor.getTarget().nextSibling){
		    parent_node.insertBefore(predecessor.getTarget().nextSibling);
		}else{
		    parent_node.appendChild(view_obj.getTarget());
		}		
	    }
	    return view_obj;
	}
    }),
    paragraph = BaseObject.extend({
	init : function( parent, map_idx, args ){
	    this.target = document.createElement('p');
	    this.setup( parent, map_idx );
	    this.createForm();
	    this.factory = {
		text : text
	    };
	},
	createForm : function(){
	    var form_element = document.createElement('form'),
	    key_capture = document.createElement('submit');
	    key_capture.innerHTML = 'submit';
	    form_element.onsubmit = function( event ){
		var e = event || window.event;
		e.cancelBubble = true;
		if (e.stopPropagation){
		    e.stopPropagation();
		}
		return false;
	    };
	    form_element.onkeydown = function( event ){
		var e = event || window.event;
		console.log('Hey',event);
	    };
	    form_element.appendChild(key_capture);
	    this.form_element = form_element;
	    this.key_capture = key_capture;
	},
	setTarget : function( node, cursor_pt ){
	    //var cursor_element = cursor_pt.getElement();
	    
	}
    }),
    text = BaseObject.extend({
	init : function( parent, map_idx, args ){
	    this.target = document.createElement('span');
	    this.setup( parent, map_idx );
	    this.createForm();
	    this.node = document.createTextNode('');
	    this.previous_node = document.createTextNode('');
	    this.post_node = document.createTextNode('');
	    this.previous_word_break = document.createElement('br');
	    this.previous_word_node = document.createTextNode('');
	    if( args['text'] ){
		this.updateText( args['text'] );
	    }
	    this.target.appendChild( this.node );
	},
	updateText : function( text ){
	    
	}
	createForm : function(  ){
	    var form_element = document.createElement('form'),
	    key_capture = document.createElement('input');

	    key_capture.setAttribute('type','text');
	    
	    form_element.onsubmit = function( event ){
		var e = event || window.event;
		e.cancelBubble = true;
		if (e.stopPropagation){
		    e.stopPropagation();
		}
		return false;
	    };

	    key_capture.onkeydown = function( event ){
		var e = event || window.event;
		if(! this.checkSpecialEvents( this, e )){
		    setTimeout( function(){text.view.update_text_view(this, e);}, 1, this, e );
		}
	    };
	    key_capture.onmouseup = function( e ){
		key_capture.focus();
		text.view.update_text_view( this, e );
	    };
	    key_capture.onpaste = function( e ){
		console.log('onpaste',e);
		return false;
	    };		

	    form_element.appendChild(key_capture);
	    this.form_element = form_element;
	    this.key_capture = key_capture;
	}
	checkSpecialEvents : function( event ){
	    if(event.type === 'keydown'){
		if( this.)
	    }
	    return false;
	}

    })
    ;


    if( util && util.objs ){
	util.objs.TextEditor = TextEditor;
    }
})( window, document, window.util );
