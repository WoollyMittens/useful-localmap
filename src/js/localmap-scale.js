// extend the class
Localmap.prototype.Scale = function (parent) {

	// PROPERTIES

	this.parent = parent;
	this.config = parent.config;
	this.element = document.createElement('div');
	this.zoom = null;
	this.delay = null;

	// METHODS

	this.start = function() {
		// add the scale to the interface
		this.element.setAttribute('class', 'localmap-scale');
		this.config.container.appendChild(this.element);
	};

  this.stop = function() {
    // remove the element
    this.config.container.removeChild(this.element);
  };

	this.update = function() {
		// defer redraw until idle
		if (this.config.position.zoom !== this.zoom) {
			clearTimeout(this.delay);
			this.delay = setTimeout(this.redraw.bind(this), 10);
		}
		// store the current zoom level
		this.zoom = this.config.position.zoom;
	};

	this.redraw = function() {
		// how big is the map in kilometres along the bottom
		var mapSize = this.distance(
			{'lon': this.config.minimum.lon_cover, 'lat': this.config.maximum.lat_cover},
			{'lon': this.config.maximum.lon_cover, 'lat': this.config.maximum.lat_cover}
		);
		// what portion of that is in the container
		var visible = this.config.container.offsetWidth / this.config.canvasWrapper.offsetWidth / this.config.position.zoom;
		// use a fraction of that as the scale
		var scaleSize = visible * mapSize / 6;
		// round to the nearest increment
		var scale = 100, label = '100km';
		if (scaleSize < 50) { scale = 50; label = '50km' }
		if (scaleSize < 20) { scale = 20; label = '20km' }
		if (scaleSize < 10) { scale = 10; label = '10km' }
		if (scaleSize < 5) { scale = 5; label = '5km' }
		if (scaleSize < 2) { scale = 2; label = '2km' }
		if (scaleSize < 1) { scale = 1; label = '1km' }
		if (scaleSize < 0.5) { scale = 0.5; label = '500m' }
		if (scaleSize < 0.2) { scale = 0.2; label = '200m' }
		if (scaleSize < 0.1) { scale = 0.1; label = '100m' }
		// size the scale to the increment
		this.element.style.width = (scale / visible / mapSize * 100) + '%';
		// fill the scale with the increment
		this.element.innerHTML = label;
	};

	this.distance = function(A, B) {
		var lonA = Math.PI * A.lon / 180;
		var lonB = Math.PI * B.lon / 180;
		var latA = Math.PI * A.lat / 180;
		var latB = Math.PI * B.lat / 180;
		var x = (lonA - lonB) * Math.cos((latA + latB)/2);
		var y = latA - latB;
		var d = Math.sqrt(x*x + y*y) * 6371;
		return d;
	};

	// EVENTS

	this.start();

};
