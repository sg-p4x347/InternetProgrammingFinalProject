(function () {
	itemClick('root');
})();
function itemClick(id) {
	let url = new URL(window.location.href);
	url.pathname = "drive/get";
	url.searchParams.set("id", id);

	const ajax = new XMLHttpRequest();
	ajax.open('GET', url);

	ajax.addEventListener('load', function () {
		let fileList = document.querySelector('.viewport');
		fileList.innerHTML = ajax.response;
	});

	ajax.send();
	//fetch(url).then((response) => {
	//	let fileList = document.querySelector('.viewport');
	//	response.text().then((text) => fileList.innerHTML = text);
	//});
}
function viewBtnClick(evt, id) {
    evt.stopPropagation();
    let url = new URL(window.location.href);
    url.pathname = "drive/get";
    url.searchParams.set("id", id);
    window.location.href = url;
}