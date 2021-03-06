// extend the class
Localmap.prototype.Background = function (parent, onComplete) {

	// PROPERTIES

	this.parent = parent;
	this.config = parent.config;
	this.element = null;
	this.image = new Image();
	this.tilesQueue = null;
  this.tilesSize = 256;


	// METHODS

  // Slippy map tilenames - https://wiki.openstreetmap.org/wiki/Slippy_map_tilenames#ECMAScript_.28JavaScript.2FActionScript.2C_etc..29
  var long2tile = function long2tile(lon,zoom) { return (Math.floor((lon+180)/360*Math.pow(2,zoom))); }
  var lat2tile = function lat2tile(lat,zoom)  { return (Math.floor((1-Math.log(Math.tan(lat*Math.PI/180) + 1/Math.cos(lat*Math.PI/180))/Math.PI)/2 *Math.pow(2,zoom))); }
  var tile2long = function tile2long(x,z) { return (x/Math.pow(2,z)*360-180); }
  var tile2lat = function tile2lat(y,z) { var n=Math.PI-2*Math.PI*y/Math.pow(2,z); return (180/Math.PI*Math.atan(0.5*(Math.exp(n)-Math.exp(-n)))); }

	this.start = function() {
		// create the canvas
		this.element = document.createElement('div');
		this.element.setAttribute('class', 'localmap-background');
		this.parent.element.appendChild(this.element);
    this.parent.canvasElement = this.element;
		// load the map as tiles
		if (this.config.tilesUrl) { this.loadTiles(); }
		// or load the map as a bitmap
		else { this.loadBitmap(); }
		// catch window resizes
		window.addEventListener('resize', this.redraw.bind(this));
	};

  this.stop = function() {
    // remove the element
    this.parent.element.removeChild(this.element);
  };

	this.update = function() {};

	this.redraw = function() {
		var container = this.config.container;
		var element = this.element;
		var min = this.config.minimum;
		var max = this.config.maximum;
		// calculate the limits
		min.zoom = Math.max(container.offsetWidth / element.offsetWidth, container.offsetHeight / element.offsetHeight);
		max.zoom = 2;
	};

	this.loadBitmap = function() {
		var key = this.config.alias || this.config.key;
		// load the map as a bitmap
		this.image.addEventListener('load', this.onBitmapLoaded.bind(this));
		this.image.setAttribute('src', this.config.mapUrl.replace('{key}', key));
	};

	this.drawBitmap = function() {
		var container = this.config.container;
		var element = this.element;
		var image = this.image;
		var min = this.config.minimum;
		var max = this.config.maximum;
		// use the bounds of subsets of walks
		var pixelsPerLon = image.naturalWidth / (max.lon - min.lon);
		var pixelsPerLat = image.naturalHeight / (max.lat - min.lat);
		var offsetWidth = (min.lon - min.lon_cover) * pixelsPerLon;
		var offsetHeight = (min.lat - min.lat_cover) * pixelsPerLat;
		var croppedWidth = (max.lon_cover - min.lon_cover) * pixelsPerLon;
		var croppedHeight = (max.lat_cover - min.lat_cover) * pixelsPerLat;
		var displayWidth = croppedWidth / 2;
		var displayHeight = croppedHeight / 2;
		// set the size of the canvas to the bitmap
		element.style.width = croppedWidth + 'px';
		element.style.height = croppedHeight + 'px';
		// double up the bitmap to retina size
		image.style.marginLeft = offsetWidth + 'px';
		image.style.marginTop = offsetHeight + 'px';
		// insert image instead of canvas
		element.appendChild(image);
		// redraw the component
		this.redraw();
		// resolve the promise
		onComplete();
	};

	this.measureTiles = function() {
		var min = this.config.minimum;
		var max = this.config.maximum;
		var pos = this.config.position;
		// calculate the cols and rows of tiles
		var minX = long2tile(min.lon_cover, this.config.tilesZoom);
		var minY = lat2tile(min.lat_cover, this.config.tilesZoom);
		var maxX = long2tile(max.lon_cover, this.config.tilesZoom);
		var maxY = lat2tile(max.lat_cover, this.config.tilesZoom);
		// determine the centre tile
		var state = JSON.parse(localStorage.getItem('localmap'));
    var key = this.config.key;
    if (state && state[key]) { pos.lon = state[key].lon; pos.lat = state[key].lat; };
		var posX = long2tile(pos.lon, this.config.tilesZoom);
		var posY = lat2tile(pos.lat, this.config.tilesZoom);
		// return the values
		return {
			'minX': minX,
			'minY': minY,
			'maxX': maxX,
			'maxY': maxY,
			'posX': posX,
			'posY': posY
		};
	};

  this.scoreMarkers = function() {
    var markers = this.config.guideData[this.config.key].markers;
    var lookup = {};
    var x, y, t, r, b, l;
    for (var idx = 0, max = markers.length; idx < max; idx += 1) {
      x = long2tile(markers[idx].lon, this.config.tilesZoom);
      y = lat2tile(markers[idx].lat, this.config.tilesZoom);
      // select coordinates around
      t = y - 1;
      r = x + 1;
      b = t + 1;
      l = x - 1;
      // top row
      lookup[l + '_' + t] = -10;
      lookup[x + '_' + t] = -10;
      lookup[r + '_' + t] = -10;
      // middle row
      lookup[l + '_' + y] = -10;
      lookup[x + '_' + y] = -20;
      lookup[r + '_' + y] = -10;
      // bottom row
      lookup[l + '_' + b] = -10;
      lookup[x + '_' + b] = -10;
      lookup[r + '_' + b] = -10;
    }
    return lookup;
  };

	this.loadTiles = function() {
		var container = this.config.container;
		var element = this.element;
		var coords = this.measureTiles();
		// calculate the size of the grid
    var gridWidth = Math.max(coords.maxX - coords.minX, 1);
    var gridHeight = Math.max(coords.maxY - coords.minY, 1);
    var tileSize = this.tilesSize;
		var croppedWidth = gridWidth * tileSize;
		var croppedHeight = gridHeight * tileSize;
		var displayWidth = croppedWidth / 2;
		var displayHeight = croppedHeight / 2;
		// set the size of the canvas to the correct size
		element.width = croppedWidth;
		element.height = croppedHeight;
		// double up the bitmap to retina size
		element.style.width = displayWidth + 'px';
		element.style.height = displayHeight + 'px';
		// create a queue of tiles
		this.tilesQueue = [];
    var scoreLookup = this.scoreMarkers();
		for (var x = coords.minX; x <= coords.maxX; x += 1) {
			for (var y = coords.minY; y <= coords.maxY; y += 1) {
				this.tilesQueue.push({
					url: this.config.tilesUrl.replace('{x}', x).replace('{y}', y).replace('{z}', this.config.tilesZoom),
					x: x - coords.minX,
					y: y - coords.minY,
          w: tileSize,
          h: tileSize,
					d: Math.abs(x - coords.posX) + Math.abs(y - coords.posY),
          r: scoreLookup[x + '_' + y] || 0
				});
			}
		}
		// render the tiles closest to the centre first
		this.tilesQueue.sort(function(a, b){return (b.d + b.r) - (a.d + a.r)});
		// load the first tile
		this.image = new Image();
		this.image.addEventListener('load', this.onTileLoaded.bind(this));
		this.image.addEventListener('error', this.onTileError.bind(this));
		this.image.setAttribute('src', this.tilesQueue[this.tilesQueue.length - 1].url);
		// redraw the component
		this.redraw();
		// resolve the promise
		onComplete();
	};

	this.drawTile = function(image) {
		// take the last item from the queue
		var props = this.tilesQueue.pop();
		// if an image was returned
		if (image) {
			// clone the image into the container
			var tile = image.cloneNode();
			tile.style.left = (props.x * props.w / 2) + 'px';
			tile.style.top = (props.y * props.h / 2) + 'px';
			tile.style.width = (props.w / 2) + 'px';
			tile.style.height = (props.h / 2) + 'px';
			tile.setAttribute('class', 'localmap-tile');
			this.element.appendChild(tile);
		}
		// if there's more tiles in the queue
		if (this.tilesQueue.length > 0) {
			// load the next tile
			this.image.setAttribute('src', this.tilesQueue[this.tilesQueue.length - 1].url);
		}
	};

	// EVENTS

	this.onBitmapLoaded = function(evt) {
		// place the bitmap on the canvas
		this.drawBitmap();
	};

	this.onTileLoaded = function(evt) {
		// place the bitmap on the canvas
		this.drawTile(evt.target);
	};

	this.onTileError = function(evt) {
		this.drawTile(null);
	};

	this.start();

};
