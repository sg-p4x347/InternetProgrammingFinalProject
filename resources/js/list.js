'use strict';
(function () {
	itemClick('root');
})();
function itemClick(id) {
	let url = new URL(window.location.href);
	url.pathname = 'drive/get';
	url.searchParams.set('id', id);
	fetch(url).then((response) => {
		let fileList = document.querySelector('.viewport');
		response.text().then((text) => fileList.innerHTML = text);
	});
}
//function viewBtnClick(evt, id) {
//	evt.stopPropagation();
//	let url = new URL(window.location.href);
//	url.pathname = 'drive/get';
//	url.searchParams.set('id', id);
//	window.location.href = url;
//}