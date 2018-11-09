function toggleTreeNode(id, evt) {
	if (evt) evt.stopPropagation();
	let parent = document.getElementById(id);
	if (parent.classList.contains('expandable')) {
		if (parent.classList.contains('expanded')) {
			parent.classList.remove('expanded');
		} else {
			parent.classList.add('expanded');
			// get child nodes from server
			if (parent.children.length === 1) {
				let url = new URL(window.location.href);
				url.pathname = "/drive/treeNode";
				url.searchParams.set("id", id);
				fetch(url).then((response) => {
					response.text().then((text) => parent.innerHTML += text);
				});
			}
		}
	}
}
// bootstrap the tree from the root
toggleTreeNode('root');