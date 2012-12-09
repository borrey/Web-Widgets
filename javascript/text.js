(function text( window, document ){
    var 

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
    set_key_capture_pos = function( key_capture, pos ){
	    
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
    get_key_capture_select_start = function( key_capture ){
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
    get_key_capture_select_end = function( key_capture ){
	if (key_capture.createTextRange) {
	    var r = document.selection.createRange().duplicate();
	    r.moveStart('character', -key_capture.value.length);
	    return r.text.length;
	} else{
	    return key_capture.selectionEnd;
	}
    },
    check_if_range_is_for_cursor = function( range ){
	return !range || 
	    ( range.startContainer && range.endContainer
	      && range.startContainer === range.endContainer
	      && range.startOffset === range.endOffset);
    },
    synchronize_keys = function( e ){
	var event = e || window.event,
	shift = event.shiftKey,
	ctrl = event.ctrlKey,
	alt = event.altKey,
	meta = event.metaKey,
	keynum = event.which || event.keyCode || event.charCode,
        keychar = String.fromCharCode(keynum);
	return { 'keynum' : keynum, 
		 'keychar' : keychar, 
		 'shift' : shift, 
		 'ctrl' : ctrl, 
		 'alt' : alt, 
		 'meta' : meta 
	       };
    },
    TextEditor = util.objs.Events.extend({
	init : function( parent, map_idx, args ){
	    this.target = document.createElement('span');
	    this.node = this.target.appendChild( document.createTextNode('') );
	    this.parent = parent;
	    this.map_id = map_idx;
	    this.target.setAttribute('data-map_id', map_idx);

	    this.previous_node = document.createTextNode('');
	    this.post_node = document.createTextNode('');
	    this.previous_word_break = document.createElement('br');
	    this.previous_word_node = document.createTextNode('');
	},
	check_special_events : function( text_view, event ){
	    if(event.type === 'keydown'){
		if(text_view.post_node.nodeValue === '' && event.keyCode === 39){
		    text_view.get_next_node(text_view);
		    return true;
		}else if(text_view.previous_node.nodeValue === '' && event.keyCode === 37){
		    text_view.get_previous_node(text_view);
		    return true;
		}
	    }
	    return false;
	},
	set_target : function( text_view, node, cursor_pt ){
	    var target = text_view.target,
	    text_node = text_view.node,
	    post_node = text_view.post_node,
	    previous_node = text_view.previous_node,
	    cursor_element = views.cursor.elements.cursor_element,
	    key_capture = text_view.key_capture,
	    text_value = text_node.nodeValue;

	    text_view.key_capture.value = text_value;

	    if( node === null ){
		target.insertBefore( post_node, text_node );
		target.insertBefore( cursor_element, post_node );
		target.insertBefore( previous_node, cursor_element );
		target.removeChild( text_node );
		views.cursor.fn.set_form(text_view);
		if( cursor_pt === -1 ){
		    cursor_pt = text_value.length;
		    previous_node.nodeValue = text_value;
		    post_node.nodeValue = '';
		}else{
		    previous_node.nodeValue = '';
		    post_node.nodeValue = text_value;
		}
		setTimeout( function(){text_view.set_key_capture_pos( key_capture, cursor_pt);}, 1 );
	    }else{
		if(node === text_node){
		    target.insertBefore( post_node, text_node );
		    target.insertBefore( cursor_element, post_node );
		    target.insertBefore( previous_node, cursor_element );
		    target.removeChild( text_node );
		    views.cursor.fn.set_form(text_view);
		}else if( node === post_node){
		    cursor_pt = previous_node.nodeValue.length + cursor_pt;
		}
		previous_node.nodeValue = text_value.substring(0, cursor_pt ).replace(/ /g, ' ') || '';
		post_node.nodeValue = text_value.substring( cursor_pt ).replace(/ /g, ' ') || '';
		text_view.set_key_capture_pos( key_capture, cursor_pt );
	    }
	},
	unset_target : function( text_view ){
	    var target = text_view.target,
	    text_node = text_view.node,
	    post_node = text_view.post_node,
	    previous_node = text_view.previous_node,
	    cursor_element = views.cursor.elements.cursor_element;

 	    if( post_node.parentNode === target ){
		target.removeChild(post_node);
	    }
	    if( previous_node.parentNode === target ){
		target.removeChild(previous_node);
	    }
	    if( cursor_element.parentNode === target ){
		target.removeChild(cursor_element);
	    }
	    target.appendChild( text_node );
	},
	update_text : function( text_view, new_text ){
	    text_view.node.nodeValue = new_text;
	},
	create_form : function( text_view ){
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
		if(!text.view.check_special_events( text_view, e )){
		    setTimeout( function(){text.view.update_text_view(text_view, e);}, 1, text_view, e );
		}
	    };
	    key_capture.onmouseup = function( e ){
		key_capture.focus();
		text.view.update_text_view( text_view, e );
	    };
	    key_capture.onpaste = function( e ){
		console.log('onpaste',e);
		return false;
	    };		

	    form_element.appendChild(key_capture);
	    text_view.form_element = form_element;
	    text_view.key_capture = key_capture;
	},
	update_text_view : function( text_view, event ){
	    //alert(text_view);
	    var text_value = text_view.key_capture.value,
	    start = text_view.get_key_capture_select_start( text_view.key_capture ),
	    pre_cursor_value = text_value.substring(0, start).replace(/ /g, ' ') || '',
	    post_cursor_value = text_value.substring(start).replace(/ /g, ' ') || '';
	    text_view.node.nodeValue =  text_value;
	    text_view.previous_node.nodeValue = pre_cursor_value;
	    text_view.post_node.nodeValue = post_cursor_value;
	},
	get_previous_node : function( view_obj ){ 
	    var target_pt = view.get_target( view_obj.target.previousSibling )  || view.get_target( view_obj.target.parentNode ),
	    target_map_id = target_pt && target_pt.getAttribute ? target_pt.getAttribute('data-map_id') : null;
	    if( target_map_id ){
		view.map[ target_map_id ].set_target( view.map[ target_map_id ], null, -1 );
	    }else{
		console.log('missing target', view_obj, target_pt);
	    }

 	},
	get_next_node : function( view_obj ){
	    var target_pt = view.get_target( view_obj.target.nextSibling ) || view.get_target( view_obj.target.parentNode ),
	    target_map_id = target_pt && target_pt.getAttribute ? target_pt.getAttribute('data-map_id') : null;
	    if( target_map_id ){
		view.map[ target_map_id ].set_target( view.map[ target_map_id ], null, 0 );
	    }else{
		console.log('missing target', view_obj, target_pt);
	    }

	},
	set_key_capture_pos : set_key_capture_pos,
	get_key_capture_select_start : get_key_capture_select_start

    });

    if( util && util.objs ){
	util.objs.TextEditor = TextEditor;
    }
})( window, document );
