'use strict';
const request = require('request');
const fs = require('fs');
// Configure application resources
const mimeMappings = JSON.parse(fs.readFileSync('./resources/json/mimeMappings.json'));
function getMimeMapping(mimeType) {
	let mapping = null;
	for (let i = 0; i < mimeMappings['mimeMappings'].length; i++) {
		mapping = mimeMappings['mimeMappings'][i];
		let regex = new RegExp(mapping.pattern);
		if (regex.test(mimeType)) { return mapping; }
	}
	// the last mapping is returned in no matches were found
	return mapping;
}
class File {
	constructor(meta, content) {
		for (let metaProp in meta) {
			this[metaProp] = meta[metaProp];
		}
		this.content = content;
	}
	createImageUrl() {
		return `data:${this.mimeType};base64,${this.content}`;
	}
}
function getFile(user, id, callback) {
	getFileMeta(user, id, (meta) => {
		getFileContent(user, id, (streamBuffer) => {
			let content = '';
			if (meta.mimeType && meta.mimeType.includes('image')) {
				content = streamBuffer.toString('base64');
			} else {
				content = streamBuffer.toString();
			}
			callback(new File(meta, content));
		});
	});
}

function getFileMeta(user, id, callback) {
	let url = 'https://www.googleapis.com/drive/v3/files/' + id;
	request({
		url: url,
		method: 'GET',
		headers: {
			'Authorization': 'Bearer ' + user.token
		}
	}, (err, res, body) => callback(JSON.parse(body)));

}
function getFileContent(user, id, callback) {
	let url = 'https://www.googleapis.com/drive/v3/files/' + id;
	request({
		url: url,
		qs: { alt: 'media' },
		method: 'GET',
		encoding: null,
		headers: {
			'Authorization': 'Bearer ' + user.token
		}
	}, (err, res, bodyStream) => {
		callback(new Buffer(bodyStream));
	});
}
function getFolderStructure(user, callback) {
	request({
		url: 'https://www.googleapis.com/drive/v3/files',
		pageSize: 300,
		qs: {
			fields: 'files(id, name, mimeType, parents)',
			q: 'mimeType = \'application/vnd.google-apps.folder\' and trashed = false'
		},
		headers: {
			'Authorization': 'Bearer ' + user.token
		}
	}, (err, res, body) => {
		if (err) {
			console.log('The API returned an error: ' + err);
			callback([], err);
		} else {
			let files = JSON.parse(body).files;
			// create a root array
			let root = [];

			// map the files by id
			let fileMap = {};
			files.forEach((file) => {
				file.children = [];
				let mimeMapping = getMimeMapping(file.mimeType);
				file.img = mimeMapping.icon;
				fileMap[file.id] = file;
			});
			// add children based on parent relationships
			for (let id in fileMap) {
				let child = fileMap[id];
				if (child.parents) {
					child.parents.forEach((parentID) => {
						let parent = fileMap[parentID];
						if (parent) {
							parent.children.push(child);
						} else {
							root.push(child);
						}
					});
				} else {
					root.push(child);
				}
			}
			callback(root);
		}
	});
}
function listFiles(user, query, callback) {

	request({
		url: 'https://www.googleapis.com/drive/v3/files',
		qs: {
			pageSize: 100,
			fields: 'nextPageToken, files(id, name, mimeType)',
			q: query
		},
		headers: {
			'Authorization': 'Bearer ' + user.token
		}
	}, (err, res, body) => {
		if (err) {
			console.log('The API returned an error: ' + err);
			callback([], err);
		} else {
			callback(JSON.parse(body).files);
		}
	});
}
module.exports = {
	File: File,
	getFile: getFile,
	getFileMeta: getFileMeta,
	getFolderStructure: getFolderStructure,
	listFiles: listFiles,
	getMimeMapping: getMimeMapping
};