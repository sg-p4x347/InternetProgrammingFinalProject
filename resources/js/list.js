'use strict';
function itemClick(id) {
	let url = new URL(window.location.href);
	url.pathname = 'drive/get';
	url.searchParams.set('id', id);

	const ajax = new XMLHttpRequest();
	ajax.open('GET', url);

	ajax.addEventListener('load', function () {
		let fileList = document.querySelector('.viewport');
		fileList.innerHTML = ajax.response;
	});

	ajax.send();
}
function viewBtnClick(evt, id) {
	evt.stopPropagation();
	let url = new URL(window.location.href);
	url.pathname = 'drive/get';
	url.searchParams.set('id', id);
	window.location.href = url;
}
(function () {
	itemClick('root');
})();
viewBtnClick;
function toggleTreeNode(id, evt) {
	if (evt) { evt.stopPropagation(); }
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
	if (evt) { evt.stopPropagation(); }
	// deselect the current selection
	let currentItem = document.querySelector('.tree .tree-item.selected');

	if (currentItem) { currentItem.classList.remove('selected'); }
	// select the new item
	let newItem = document.getElementById(id);
	newItem.classList.add('selected');

	itemClick(id);
}
toggleTreeNode('root');
function tweetFileName(TweetData, evt, self) {
	evt.stopPropagation();
	let url = new URL(window.location.href);
	url.pathname = '/tweet';
	url.searchParams.set('TweetData', TweetData);
	const ajax = new XMLHttpRequest();
	ajax.open('GET', url);

	ajax.addEventListener('load', function () {
//		parent.innerHTML += ajax.response;
	});

	ajax.send();
	self.innerHTML = 'Tweeted!'
}

//Shut up eslint
toggleTreeCollapse;
treeNodeClick;
itemClick;