(function webcam( window, document, utils ){
    var 
    checkBlack = function(data){
	var len = data.length;
	for (var i = 0; i < len; i += 4){
	    if( data[i] || data[i+1] || data[i+2]  ){
		return true;
	    }
	}
	return false;
    },
    Webcam = utils.objs.Events.extend({
	init : function( container_id, webcam_width, webcam_height, flash_location ){
	    var that = this,
	    _flash_location = flash_location || '/flash/JSwebcam.swf';
	    this.listeners = new util.objs.CountMap();
	    this.swf_webcam = new SWFObject( _flash_location, 
					     container_id, webcam_width, webcam_height, 
					     '10.0.0', '#FFFFFF');
	    this.width = webcam_width;
	    this.height = webcam_height;
	    this.webcam_canvas = new util.createImageCanvas( true );
	    this.movie_obj = null;
	    this.movie_stream = null;
	    this.have_image = false;
	    this.canvases = new util.objs.CountMap();
	    this.active_canvases_cnt = 0;
	    window[ container_id ] = {
		started : function(){
		    that.movie_stream = setInterval( function(){ that.updateCanvas( container_id )}, 200  );
		},
		error : function(){
		    this.notifyListeners('webcamMessage', { message: 'error', capturing : false } );
		}
	    }
	},
	createWebcam : function( callback_fn ){//callback_fn to be used to passon image
	    var canvas_id = utils.fn.generateId('canvas'),
	    webcam_canvas = new util.createImageCanvas( true );
	    webcam_canvas.id = canvas_id;
	    webcam_canvas.stream = false;
	    webcam_canvas.callback = callback_fn || function( data ){ if(webcam_canvas.stream){ webcam_canvas.setImage('data:image/jpeg;base64,'+data.image)}};
	    this.canvases.add( canvas_id, webcam_canvas );
	    return webcam_canvas;
	},
	startWebcam : function( id, stream ){
	    var that = this,
	    webcam_canvas = this.canvases.get( id ),
	    ready_test = new utils.objs.TimeoutBufferTest(
		function(){ 
		    return that.have_image; 
		},
		function(){
		    if( stream && !webcam_canvas.stream ){
			that.active_canvases_cnt++;
			webcam_canvas.stream = true;
		    }else if( !stream && webcam_canvas.stream ){
			that.active_canvases_cnt--;
			webcam_canvas.stream = false;
		    }
		    if( that.active_canvases_cnt <= 0 ){//TODO should add itself webcam.streamCamera as a queue
			that.active_canvases_cnt = 0;
			if( that.movie_stream ){
			    clearInterval( that.movie_stream );
			    that.movie_stream = false;
			}
		    }else{
 			if(!that.movie_stream){
			    that.movie_stream = setInterval( function(){ that.takesnapshot( function( data ){
				that.canvases.callEach('callback',{ image : data });
			    }) }, 300 );
			}
		    }
		}
	    );
	    ready_test.startTimeout();
	},
	hasImage : function(){
	    return this.have_image;
	},
	setupSWFObject : function( webcam_handle ){
	    var that = this,
	    timeout = new utils.objs.TimeoutBufferTest(
		function(){ 
		    return document.getElementById(webcam_handle) !== null;
		},
		function(){
		    that.swf_webcam.write(webcam_handle);
		    that.buildSWFObject( webcam_handle );
		}
	    );
	    timeout.startTimeout();
	},
	buildSWFObject : function( webcam_handle ){
	    var that = this,
	    timeout = new utils.objs.TimeoutBufferTest(
		function(){ 
		    that.movie_obj = (navigator.appName.indexOf("Microsoft") !== -1) ? 
			window[ webcam_handle ] : document[ webcam_handle ];
		    return that.movie_obj && 'build' in that.movie_obj;
		},
		function(){
		    that.movie_obj.build();
		}
	    );
	    timeout.startTimeout();
	},
	updateCanvas : function( webcam_handle ){
	    var webcam_container = document.getElementById(webcam_handle)
	    that = this;
	    this.webcam_canvas.setImage('data:image/jpeg;base64,'+this.movie_obj.capture());
	    if( !this.have_image && checkBlack( 
		    this.webcam_canvas.ctx.getImageData( 
		    0, 0, this.width, this.height 
		    ).data)){
		clearInterval(this.movie_stream);
		this.movie_stream = false;
		this.have_image = true;
		utils.style.addClassToElement( webcam_container, 'hide' );
		this.notifyListeners('webcamReady',{ have_image : that.have_image });
	    }
	},
	listCameras : function( callback ){
	    /*callback should take one argument which is an array of camera 
	      { id : <id>, description : <description>}*/
	    callback( this.movie_obj.camera_list() );
	},
	setCamera : function( id ){
	    this.movie_obj.set_camera( id );
	},
	destroyCamera : function( ){
	    this.movie_obj.destroy();
	},
	streamCamera : function( stream ){
	    var that = this,
	    delay = 200;
	    if( this.movie_stream ){
		clearInterval( that.movie_stream );
	    }
	    if(stream){
		this.movie_stream = setInterval( function(){that.streamPick(); }, delay );
	    }
	},
	takesnapshot : function( callback ){
	    var that = this;
	    if( this.movie_obj ){
		callback( that.movie_obj.capture() );
	    }
	},
	streamPick : function(){
	    this.takesnapshot( function( data ){
		that.notifyListeners('stream', data );
	    });
	}	
    });
    if( util !== undefined){
	util.createWebcam = function( path_to_flash ){
	    return new Webcam('webcam', 300, 200, path_to_flash );
	}
    }else{
	throw 'No Framework';
    }

})( window, document, window.util );
