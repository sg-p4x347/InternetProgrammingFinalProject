function getImageViewer() {
	return document.querySelector('.image-viewer');
}
function zoom(percentage, origin) {
	let viewport = getImageViewer();
	let image = document.getElementById('image');
	image.style.width = image.clientWidth * percentage + 'px';
	// default origin to the center of the viewport
	origin = origin || { x: viewport.clientWidth * 0.5, y: viewport.clientHeight * 0.5 };
	let imageOrigin = { x: image.offsetLeft, y: image.offsetTop };
	// translate so the given origin is at the coordinate system origin
	imageOrigin.x -= origin.x;
	imageOrigin.y -= origin.y;
	// scale the imageOrigin from here
	imageOrigin.x *= percentage;
	imageOrigin.y *= percentage;
	// translate back
	imageOrigin.x += origin.x;
	imageOrigin.y += origin.y;
	
	setImagePos(image, imageOrigin.x, imageOrigin.y);
}
function zoomToFit() {
	let viewport = getImageViewer();
	let image = document.getElementById('image');

	let aspectRatio = image.clientWidth / image.clientHeight;
	let imageWidth = Math.min(viewport.clientHeight * aspectRatio,viewport.clientWidth);
	let imageHeight = Math.min(viewport.clientHeight, imageWidth / aspectRatio);
	imageWidth = imageHeight * aspectRatio;

	image.style.top = 'unset';
	image.style.left = 'unset';
	image.style.width = imageWidth + 'px';
}
function setImagePos(image, x, y) {
	image.style.position = 'absolute';
	image.style.left = x + 'px';
	image.style.top = y + 'px';
}
function initialize() {
	zoomToFit();
	let viewport = getImageViewer();
	let image = document.getElementById('image');
	// initialize scroll to zoom handler (mouse wheel)
	viewport.addEventListener('wheel', (evt) => {
		zoom(1 + evt.wheelDeltaY / 1000, { x: evt.offsetX, y: evt.offsetY });
	});
	// initialize zoom to fit handler (middle mouse button)
	viewport.addEventListener('mousedown', (evt) => {
		if (evt.button === 1) {
			zoomToFit();
		}
	});
	// initialize pan handler (click and drag)
	viewport.addEventListener('mousemove', (evt) => {
		if (evt.buttons === 1) {
			let imagePos = { x: image.offsetLeft, y: image.offsetTop };
			setImagePos(
				image,
				imagePos.x + evt.movementX,
				imagePos.y + evt.movementY
			);
		}
	});
	// aesthetics
	viewport.addEventListener('mousedown', (evt) => viewport.style.cursor = 'grabbing');
	window.addEventListener('mouseup', (evt) => viewport.style.removeProperty('cursor'));
}