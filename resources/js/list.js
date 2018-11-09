function itemClick(id) {
	let url = new URL(window.location.href);
	url.pathname = "drive/get";
    url.searchParams.set("id", id);
    window.location.href = url;
}
function viewBtnClick(evt, id) {
    evt.stopPropagation();
    let url = new URL(window.location.href);
    url.pathname = "drive/get";
    url.searchParams.set("id", id);
    window.location.href = url;
}