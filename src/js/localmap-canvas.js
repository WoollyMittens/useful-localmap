// extend the class
Localmap.prototype.Canvas = function (parent, onComplete, onMarkerClicked, onMapFocus) {

	// PROPERTIES

	this.parent = parent;
	this.config = parent.config;
	this.element = document.createElement('div');
	this.config.canvasWrapper = this.element;

	// METHODS

	this.start = function() {
		// create a canvas
		this.element.setAttribute('class', 'localmap-canvas');
		this.element.addEventListener('transitionend', this.onUpdated.bind(this));
		// add the canvas to the parent container
		this.config.container.appendChild(this.element);
		// start adding components in turn
		this.addMarkers();
	};

  this.stop = function() {
    // remove each sub-component
    for (var key in this.components)
      if (this.components[key].stop)
        this.components[key].stop(this.config);
    // remove the element
    this.config.container.removeChild(this.element);
  };

	this.update = function() {
		// redraw this component
		this.redraw();
		// update all sub-components
    for (var key in this.components)
      if (this.components[key].update)
        this.components[key].update(this.config);
	};

	this.redraw = function() {
		var container = this.config.container;
		var element = this.element;
		var min = this.config.minimum;
		var max = this.config.maximum;
		var pos = this.config.position;
		// convert the lon,lat to x,y
		var centerX = (pos.lon - min.lon_cover) / (max.lon_cover - min.lon_cover) * element.offsetWidth;
		var centerY = (pos.lat - min.lat_cover) / (max.lat_cover - min.lat_cover) * element.offsetHeight;
		// limit the zoom
		var zoom = Math.max(Math.min(pos.zoom, max.zoom), min.zoom);
		// convert the center into an offset
		var offsetX = -centerX * zoom + container.offsetWidth / 2;
		var offsetY = -centerY * zoom + container.offsetHeight / 2;
		// apply the limits
		offsetX = Math.max(Math.min(offsetX, 0), container.offsetWidth - element.offsetWidth * zoom);
		offsetY = Math.max(Math.min(offsetY, 0), container.offsetHeight - element.offsetHeight * zoom);
		// position the background
		if (this.config.useTransitions) this.element.className += ' localmap-canvas-transition';
		element.style.transform = 'translate3d(' + offsetX + 'px, ' + offsetY + 'px, 0px) scale3d(' + zoom + ', ' + zoom + ',1)';
	};

	// CLASSES

  this.components = {
		indicator: new parent.Indicator(this, onMarkerClicked, onMapFocus),
		location: new parent.Location(this)
  };

	// EVENTS

	this.addMarkers = function() {
		// add the markers to the canvas
		this.components.markers = new parent.Markers(this, onMarkerClicked, this.addBackground.bind(this));
	};

	this.addBackground = function() {
		// add the background to the canvas
		this.components.background = new parent.Background(this, this.addRoute.bind(this));
	};

	this.addRoute = function() {
		// add the route to the canvas
		this.components.route = new parent.Route(this, onComplete);
	};

	this.onUpdated = function(evt) {
		// remove the transition
		this.element.className = this.element.className.replace(/ localmap-canvas-transition/g, '');
	};

	this.start();

};
