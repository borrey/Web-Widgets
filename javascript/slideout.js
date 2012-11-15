(function slideout( window, document, util ){
    var 
    Slideout = util.objs.Events.extend({
	init : function(){
	    var that = this;
	    this.listeners = new util.objs.CountMap();

	    this.container = document.createElement('div');
	    util.style.addClassToElement(this.container,'slideout');

	    this.top = this.container.appendChild( document.createElement('div') );
	    util.style.addClassToElement(this.top,'top');

	    this.close = this.top.appendChild( document.createElement('a') );
	    this.close.innerHTML = '';
	    util.style.addClassToElement(this.close,'close');
	    util.style.addClassToElement(this.close,'icon-remove');
	    util.dom.addEvent( this.close, 'click', function(){ that.slide( false ); }, true);

	    this.contents = this.container.appendChild( document.createElement('div') );
	    util.style.addClassToElement(this.contents,'content');

	},
	slide : function( open ){
	    this.notifyListeners( 'slideoutChange', {open : open} );
	    if(open){
		console.log('show slide', open);
		util.style.removeClassToElement(this.container,'hidden');
	    }else{
		console.log('hide slide', open);
		util.style.addClassToElement(this.container,'hidden');
	    }
	    
	}
    });
    createSlideout= function(){
	var slide_out = new Slideout();

	slide_out.container.slide = function( open ){ slide_out.slide(open);};

	return slide_out.container;
    }
    ;
    if(util && !('createSlideout' in util ) ){
	util.createSlideout = createSlideout;
    }
})( window, document, window.util);
