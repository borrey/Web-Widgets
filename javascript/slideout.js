(function slideout( window, document, util ){
    var 
    Slideout = util.objs.Events.extend({
	init : function( options ){
	    var that = this;
	    this.listeners = new util.objs.CountMap();

	    this.container = document.createElement('div');
	    util.style.addClassToElement(this.container,'slideout hidden');

	    this.top = this.container.appendChild( document.createElement('div') );
	    util.style.addClassToElement(this.top,'top');

	    this.close = this.top.appendChild( document.createElement('a') );
	    this.close.innerHTML = '';
	    util.style.addClassToElement(this.close,'close');
	    util.style.addClassToElement(this.close,'icon-remove');
	    util.dom.addEvent( this.close, 'click', function(){ that.slide( false ); }, true);

	    this.contents = this.container.appendChild( document.createElement('div') );
	    util.style.addClassToElement(this.contents,'content');

	    this.title = this.top.appendChild( document.createElement('span') );
	    util.style.addClassToElement(this.title,'title');

	    this.tab = this.container.appendChild( document.createElement('span') );
	    util.style.addClassToElement(this.tab,'tab');

	    this.use_tab_height = false;

	    this.update(options);
	},
	setContents : function( child ){
	    util.dom.clearChildren( this.content );
	    this.content.appendChild( child );
	},
	setTitle : function( title ){
	    this.title.innerHTML = title;
	},
	setTab : function( tab ){
	    util.dom.clearChildren( this.tab );
	    this.tab.appendChild( tab );
	},
	slide : function( open ){
	    this.notifyListeners( 'slideoutChange', {open : open} );
	    if(open){
		util.style.removeClassToElement(this.container,'hidden');
	    }else{
		
		util.style.addClassToElement(this.container,'hidden');
	    }
	},
	update : function( options ){
	    if(options){
		if('title' in options){
		    this.setTitle( options.title);
		}
		if('content' in options){
		    this.setContents( options.content);
		}
		if('tab' in options){
		    this.setTab( options.tab);
		}
	    }
	}
    });
    createSlideout= function( init_options ){
	var slide_out = new Slideout( init_options );

	slide_out.container.slide = function( open ){ slide_out.slide(open);};
	slide_out.container.update = function( options ){ slide_out.update(options); }
	return slide_out.container;
    }
    ;
    if(util && !('createSlideout' in util ) ){
	util.createSlideout = createSlideout;
    }
})( window, document, window.util);
