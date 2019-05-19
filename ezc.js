// eslint-disable-next-line no-unused-vars
class EZCanvas {

	constructor(settings = {}, canvasElement = '#ezcanvas') {
				
		// Get the canvas element if it hasn't been provided.
		if (typeof canvasElement === 'string') {
			if (canvasElement[0] !== '#') {
				canvasElement = '#' + canvasElement;
			}
			canvasElement = document.querySelector(canvasElement);
		}

		try {
			this.canvasElement = canvasElement;
			this.ctx = canvasElement.getContext('2d');
		} catch (error) {
			// eslint-disable-next-line no-console
			console.log(`EZCanvas couldn't find the specified element, or it was not a canvas. ERR: ${error}`);
		}

		// Default settings
		this.settings = {
			brush: {
				ends: 'round',
				size: 5,
				color: '#000000'
			},
			stabilizer: {
				enabled: true,
				delay: 0.3,
			},
			clearColor: '#FFFFFF',
		};
		// Merge the provided settings
		for (const key in this.settings) {
			if (settings.hasOwnProperty(key)) {
				if (typeof this.settings[key] === 'object') {
					Object.assign(this.settings[key], settings[key]);
				} else {
					this.settings[key] = settings[key];
				}
			}
		}

		this.applySettings();

		// Set up the drawing cursor. Maybe use objects instead of arrays?
		this.currentPos = [0, 0];
		this.lastPos = [0, 0];

		// Bind event listeners
		this.canvasElement.onpointermove = this.handlePointerMove.bind(this);
		this.canvasElement.onpointerdown = this.startLine.bind(this);
		this.canvasElement.onpointerup = this.endLine.bind(this);
		this.canvasElement.onpointerleave = this.endLine.bind(this);

		this.running = false;
	}

	/*
	 * Applies brush settings to the 2d context
	 */
	applySettings() {
		this.ctx.lineWidth = this.settings.brush.size;
		this.ctx.lineCap = this.settings.brush.ends;
		this.ctx.strokeStyle = this.settings.brush.color;

		return this;
	}

	/*
	 * Changes the brush color
	 */
	setBrushColor(color = '#000000') {
		this.settings.brush.color = color;
		this.ctx.strokeStyle = color;
		return this;
	}

	/*
	 * Changes the brush Size
	 */
	setBrushSize(size = 5) {
		this.settings.brush.size = size;
		this.ctx.lineWidth = size;

		return this;
	}

	/*
	 * Clears the canvas to a color (or transparent).
	 * 
	 * If no argument, or 'transparent' is passed, the canvas will be cleared
	 * to transparency.
	 */
	clear(color = 'transparent') {
		if (color === 'transparent') {
			this.ctx.clearRect(0, 0, this.canvasElement.width, this.canvasElement.height);
			
		} else {
			// Probably don't actually need to worry about saving the drawing
			// state right now, since fillstyle isn't used elsewhere, but it can't hurt.
			this.ctx.save();
			this.ctx.fillStyle = color || this.settings.clearColor;
			this.ctx.fillRect(0, 0, this.canvasElement.width, this.canvasElement.height);
			this.ctx.restore();
		}
		
		return this;
	}

	/*
	 * Draws an image to the canvas.
	 *
	 * If fill is true, the image will cover the entire canvas.
	 * otherwise, it will be drawn at actual size.
	 */
	drawImage(url, fill = false) {
		// TODO: support image resize, positioning etc.

		const img = document.createElement('IMG');
		img.onload = () => {
			let dest = [
				0, 0, 
				img.width, img.height
			];
			if (fill) {
				dest = [
					0, 0, 
					this.canvasElement.width, this.canvasElement.height
				];
			}
			this.ctx.drawImage(img, ...dest);
		};
		img.src = url;
		// TODO: error handling

		return this;
	}

	/*
	 * Sets the current pointer position from a pointermove event
	 */
	updatePointerPos(event) {
		const offset = this.canvasElement.getBoundingClientRect();
		const xZoom = this.canvasElement.width / this.canvasElement.clientWidth;
		const yZoom = this.canvasElement.height /this.canvasElement.offsetHeight;
		// Maybe this should be a struct instead of an array?
		if (!this.settings.stabilizer.enabled) {
			this.lastPos = this.currentPos;
		}
		this.currentPos = [
			(event.clientX - offset.left) * xZoom,
			(event.clientY - offset.top) * yZoom
		];
	}

	handlePointerMove(event) {
		this.updatePointerPos(event);
		if (this.running) {
			this.draw();
		}

	}

	/*
	 * Begin drawing a line
	 */
	startLine() {
		this.running = true;

		this.lastPos = this.currentPos;
		this.contextPos = this.currentPos;
		this.ctx.moveTo(...this.currentPos);
		// this.ctx.beginPath();

		// this.ctx.globalAlpha = 0.5
	}

	/*
	 * Stop drawing a line
	 */
	endLine() {
		// make sure stabilized lines reach all the way to the end
		/*if (this.running && this.settings.stabilizer.enabled) {
			this.ctx.beginPath();
			this.ctx.moveTo(...this.lastPos);
			this.ctx.lineTo(...this.currentPos);
			this.ctx.stroke();
		}*/

		this.running = false;
	}

	/*
	 * Draws a line segment
	 */
	draw() {
		this.ctx.beginPath();
		this.ctx.moveTo(...this.lastPos);

		let dest = this.currentPos;

		if (this.settings.stabilizer.enabled) {
			// Difference between the last position and new position
			const diff = [
				this.currentPos[0] - this.lastPos[0],
				this.currentPos[1] - this.lastPos[1]
			];

			// Move the destination point some percentage towards the final destination
			dest = [
				this.lastPos[0] + (diff[0]  * this.settings.stabilizer.delay),
				this.lastPos[1] + (diff[1]  * this.settings.stabilizer.delay)
			];

			this.lastPos = dest;
		}
		
		this.ctx.lineTo(...dest);
		this.ctx.stroke();
	}

	/*
	 * Resizes the canvas to the elements dimensions.
	 * if preserve is true, the existing content will
	 * be redrawn at the new resolution. This produces
	 * blurry edges etc. 
	 */
	resizeCanvas(preserve = true) {

		let img;
		if (preserve) {
			img = this.canvasElement.toDataURL();
		}

		this.canvasElement.height = this.canvasElement.offsetHeight;
		this.canvasElement.width = this.canvasElement.offsetWidth;
		if (preserve) {
			this.drawImage(img);
		}

		//context settings are not preserved on resize.
		this.applySettings();
		
		return this;
	}
}