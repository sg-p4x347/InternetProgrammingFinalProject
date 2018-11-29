'use strict';
function toggleTreeNode(id, evt) {
	if (evt) {evt.stopPropagation();}
	let parent = document.getElementById(id);
	if (parent.classList.contains('expandable')) {
		if (parent.classList.contains('expanded')) {
			parent.classList.remove('expanded');
		} else {
			parent.classList.add('expanded');
			// get child nodes from server
			if (parent.children.length === 1) {
				let url = new URL(window.location.href);
				url.pathname = '/drive/treeNode';
				url.searchParams.set('id', id);
				const ajax = new XMLHttpRequest();
				ajax.open('GET', url);

				ajax.addEventListener('load', function () {
					parent.innerHTML += ajax.response;
				});

				ajax.send();
				//fetch(url).then((response) => {
				//	response.text().then((text) => parent.innerHTML += text);
				//});
			}
		}
	}
}
function toggleTreeCollapse() {
	let tree = document.querySelector('.tree');
	if (tree.classList.contains('collapsed')) {
		tree.classList.remove('collapsed');
		tree.classList.add('expanded');
	} else {
		tree.classList.remove('expanded');
		tree.classList.add('collapsed');
	}
}
function treeNodeClick(id, evt) {
	if (evt) {evt.stopPropagation();}
	// deselect the current selection
	let currentItem = document.querySelector('.tree .tree-item.selected');

	if (currentItem) {currentItem.classList.remove('selected');}
	// select the new item
	let newItem = document.getElementById(id);
	newItem.classList.add('selected');

	itemClick(id);
}
toggleTreeNode('root');

//(function () {
//	let parent = document.querySelector('.tree');
//	let url = new URL(window.location.href);
//	url.pathname = "/drive/treeNode";
//	fetch(url).then((response) => {
//		response.text().then((text) => {
//			parent.innerHTML += text;
//			// bootstrap the tree from the root
//			toggleTreeNode('root');
//		});
		
//	});
//})();
