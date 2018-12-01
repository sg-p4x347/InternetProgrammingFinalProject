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
		if (regex.test(mimeType)) {return mapping;}
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
function getFolderID(drivePath, callback) {
	let folders = drivePath.length > 0 ? drivePath.split('/') : [];
	getFolderIdRecursive('root', folders, callback);
}
function getFolderIdRecursive(parentID, folders, callback) {
	if (folders.length > 0) {
		listFiles(`mimeType = 'application/vnd.google-apps.folder' and name = '${folders[0]}' and '${parentID}' in parents and trashed = false`, function (files) {
			if (files.length === 0) {
				let error = `Cannot find folder: ${folders[0]}`;
				console.log(error);
				callback(undefined, error);
			} else {
				// take the first one
				getFolderIdRecursive(files[0].id, folders.slice(1, folders.length), callback);
			}
		});
	} else {
		callback(parentID);
	}
}

function getFilesInFolderByPath(user, folderPath, callback) {
	getFolderID(folderPath || '', function (id, error) {
		if (error) {
			callback([], error);
		} else {
			getFilesInFolderById(user, id, callback);
		}
	});
}
function getFilesInFolderById(user, id, callback) {
	listFiles(user, `'${id}' in parents and trashed = false`, callback);
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
	listFiles(user, 'mimeType = \'application/vnd.google-apps.folder\' and trashed = false', (files) => {
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

	});
}
function listFiles(user, query, callback, pageToken) {
	let qs = {
		pageSize: 100,
		fields: 'nextPageToken, files(id, name, mimeType, parents)',
		q: query
	};
	if (pageToken) {qs.pageToken = pageToken;}
	request({
		url: 'https://www.googleapis.com/drive/v3/files',
		qs: qs,
		headers: {
			'Authorization': 'Bearer ' + user.token
		}
	}, (err, res, body) => {
		if (err) {
			console.log('The API returned an error: ' + err);
			callback([], err);
		} else {
			let responseObj = JSON.parse(body);
			if (responseObj.error) {
				callback([], responseObj.error.errors[0].message);
			} else {
				let files = responseObj.files;
				if (responseObj.nextPageToken) {
					listFiles(user, query, (nextFiles) => {
						callback(files.concat(nextFiles));
					}, responseObj.nextPageToken);
				} else {
					callback(files);
				}
			}
		}
	});
}
function getTreeNodeRecursive(user, files, fileIndex, mimeType, mimeMapping, semiphore, done) {
	let file = files[fileIndex];

	listFiles(user, `mimeType = '${mimeType}' and '${file.id}' in parents and trashed = false`, (subFolders, err) => {
		if (err) {
			done(err);
		} else {
			// determine which folders don't have any sub-folders
			file.hasSubDirectories = subFolders && subFolders.length !== 0;
			file.img = mimeMapping.icon;
			if (++semiphore.count === files.length)
			{done();}
		}
	});
	setTimeout(() => {
		if (++fileIndex < files.length) {
			getTreeNodeRecursive(user, files, fileIndex, mimeType, mimeMapping, semiphore, done);
		}
	}, files.length * 2);
}
module.exports = {
	File: File,
	getFile: getFile,
	getFileMeta: getFileMeta,
	getFolderStructure: getFolderStructure,
	listFiles: listFiles,
	getFilesInFolderById,
	getMimeMapping: getMimeMapping,
	getFilesInFolderByPath: getFilesInFolderByPath,
	getTreeNodeRecursive: getTreeNodeRecursive
};