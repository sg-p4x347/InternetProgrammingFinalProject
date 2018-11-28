'use strict';

//Twitter setup stuff
const Twit = require('twit');
let passport = require('passport');
let TwitterStrategy = require('passport-twitter').Strategy;
let T = new Twit({
	consumer_key: 'JgZkkpOMzKIpz37icpzyuXqt3',
	consumer_secret: 'wB4wRET9rqrAlNNkJ8xkU8UJ851giK5H7d4Yv1EZcMmyqQaVFN',
	access_token: '1064614241141997568-YrcDjQb0LcJHYvx3BkbP4WGhnaaP8C',
	access_token_secret: 'XwGJL1YYyvo6FUzAoNnssloa0PFecNUgr9lBPnWGCRbW5',
});
passport.use(new TwitterStrategy({
	consumerKey: 'JgZkkpOMzKIpz37icpzyuXqt3',
	consumerSecret: 'wB4wRET9rqrAlNNkJ8xkU8UJ851giK5H7d4Yv1EZcMmyqQaVFN',
	callbackURL: "http://localhost:3000/join"
},
	function (token, tokenSecret, profile, cb) {
		return (cb(null, profile));
	}
));




/*

NODE QUICKSTART
https://developers.google.com/drive/api/v3/quickstart/nodejs

DRIVE QUERY
https://developers.google.com/drive/api/v3/search-parameters

*/
const fs = require('fs');
const express = require('express');
const session = require('express-session');
const cookieParser = require('cookie-parser');
//const cookieSession = require('cookie-session');

//const bodyParser = require('body-parser');

const { google } = require('googleapis');
const request = require('request');

const app = express();
// configure Pug
app.set('view engine', 'pug');
app.set('views', 'views');

// Configure express
app.use(express.static('resources'));

// cookie-session
app.use(session({
	secret: 'mysecret',
	resave:false,
	saveUninitialized:false
}));
app.use(express.json());
app.use(
	express.urlencoded({
		extended: true
	})
);
// cookie-parser
app.use(cookieParser());
// passport
app.use(passport.initialize());
app.use(passport.session());

let GoogleStrategy = require('passport-google-oauth2').Strategy;
passport.use(new GoogleStrategy({
	clientID: '1007788475567-lmecccpb1t4o94jtfj313mufdg0me6p4.apps.googleusercontent.com',
	clientSecret: 'L0RoQgrU8nYkdSFjGEU3ycLB',
	callbackURL: "http://localhost:3000/drive/login/callback",
	passReqToCallback: true

},
function (request,accessToken, refreshToken, profile, callback) {
	callback(null, {
		id: profile.id,
		token: accessToken
	});
}));
passport.serializeUser(function (user, callback) {
	return callback(null, JSON.stringify(user));
});
passport.deserializeUser(function (json, callback) {
	return callback(null, JSON.parse(json));
});
// Configure API resources

const SCOPES = [
	'https://www.googleapis.com/auth/plus.login',
	'https://www.googleapis.com/auth/drive',
	'https://www.googleapis.com/auth/drive.appdata',
	'https://www.googleapis.com/auth/drive.metadata',
	'https://www.googleapis.com/auth/drive.photos.readonly',
	'https://www.googleapis.com/auth/drive.readonly'
];
// Configure application resources
const mimeMappings = JSON.parse(fs.readFileSync('./resources/json/mimeMappings.json'));
function getMimeMapping(mimeType) {
	let mapping = null;
	for (let i = 0; i < mimeMappings["mimeMappings"].length; i++) {
		mapping = mimeMappings["mimeMappings"][i];
		let regex = new RegExp(mapping.pattern);
		if (regex.test(mimeType)) return mapping;
	}
	// the last mapping is returned in no matches were found
	return mapping;
}
// Load client secrets from a local file.
fs.readFile('credentials.json', (err, content) => {
  if (err) return console.log('Error loading client secret file:', err);
  // Authorize a client with credentials, then call the Google Drive API.
	let credentials = JSON.parse(content);
	const { client_secret, client_id, redirect_uris } = credentials.installed;
	const oAuth2Client = new google.auth.OAuth2(
		client_id, client_secret, redirect_uris[0]);
	startServer(oAuth2Client);
});

//function authorize(oAuth2, request,response, callback) {
//  // Check if we have previously stored a token.
//	if (!request.session.token) {
//		// display the authorization page
//		response.render('auth', { authUrl: getAuthorizationUrl(oAuth2) });
//	} else {
//		callback();
//	}
//}
function authorize(request, response,next) {
	if (!request.isAuthenticated()) {
		response.redirect('/drive/login');
	} else {
		next();
	}
}

function getAuthorizationUrl(oAuth2) {
	const authUrl = oAuth2.generateAuthUrl({
		access_type: 'offline',
		scope: SCOPES
	});
	console.log('Authorize this app by visiting this url:', authUrl);
	return authUrl;
}
function getAccessToken(oAuth2,code,callback) {
	oAuth2.getToken(code, (err, token) => {
		if (err) return console.error('Error retrieving access token', err);
		oAuth2.setCredentials(token);
		// store token to session
		callback(token);
	});
}


function getFolderID(drivePath,callback) {
	let folders = drivePath.length > 0 ? drivePath.split('/') : [];
	getFolderIdRecursive('root',folders,callback);
}
function getFolderIdRecursive(parentID,folders,callback) {
	if (folders.length > 0) {
		listFiles(`mimeType = 'application/vnd.google-apps.folder' and name = '${folders[0]}' and '${parentID}' in parents and trashed = false`,function(files) {
			if (files.length === 0) {
				let error = `Cannot find folder: ${folders[0]}`;
				console.log(error);
				callback(undefined,error);
			} else {
				// take the first one
				getFolderIdRecursive(files[0].id,folders.slice(1,folders.length),callback);
			}
		});
	} else {
		callback(parentID);
	}
	
}

function getFilesInFolderByPath(userSession,folderPath,callback) {
	getFolderID(folderPath || "",function(id,error) {
		if (error) {
			callback([],error);
		} else {
            getFilesInFolderById(userSession,id, callback);
		}
	});
}
function getFilesInFolderById(userSession,id, callback) {
    listFiles(userSession,`'${id}' in parents and trashed = false`, callback);
}
function startServer(oAuth2) {
    app.get('/', function (request, response) {
        response.render('infopage.pug');
	});
	

	app.get('/join', (request, response) => {
		response.render('join.pug');
		});
	app.get('/twitter/login', passport.authenticate('twitter'));
	app.post('/twitter/auth', passport.authenticate('twitter', {
		failureRedirect: '/twitter/login',
		successRedirect: '/join'
	}));
	app.get('/tweet', (request, response) => {
		T.post('statuses/update', { status: request.query.TweetData }, function (err, data, response) { });
		response.redirect('/join');
	});
	/*
    app.get('/drive/list', function (request, response) {
		authorize(oAuth2,request,response, () => {
            let getHandler = request.query.id ?
				(callback) => getFilesInFolderById(request.session,request.query.id, callback) :
				(callback) => getFilesInFolderByPath(request.session,request.query.path, callback);
            if (getHandler) {
                getHandler((files, error) => {
                    if (error) {
                        response.render('error', { error });
                    } else {
                        response.render('list', { itemList: files });
                    }
                });
            } else {
                response.render('error', { error });
            }
        });
    });
	*/
	//app.get('/drive/auth',
	//function (request, response) {
	//	getAccessToken(oAuth2, request.query.code, (token) => {
	//		request.session.token = token;
	//		response.redirect('back');
	//	});
	//});
	app.get('/drive/login', passport.authenticate('google', {
		scope: SCOPES
	}));
	app.get('/drive/login/callback', passport.authenticate('google', {
		successRedirect: '/drive',
		failureRedirect: '/drive/login'
	}));
	//----------------------------------------------------------------
	// Full View
	app.get('/drive',
		authorize,
		(request, response) => {
			response.render('list.pug');
		}
	);
	//----------------------------------------------------------------
	// Partial View
	app.get('/drive/get',
		(request, response) => {
			request.query.id = request.query.id || 'root';
			getFileMeta(request.user, request.query.id, (fileMeta) => {
				let mimeMapping = getMimeMapping(fileMeta.mimeType);
				if (fileMeta.mimeType === 'application/vnd.google-apps.folder') {
					// get folder model
					getFilesInFolderById(request.user, request.query.id, (files, error) => {
						if (error) {
							response.render('error.pug', { error });
						} else {
							files.forEach((file) => file.icon = getMimeMapping(file.mimeType).icon);
							response.render('fileList.pug', { itemList: files });
						}
					});
				} else {
					// get file model
					getFile(request.user, request.query.id, (fileInstance) => {
						response.render(mimeMapping.view, { file: fileInstance });
					});
				}
			});
	});
	//----------------------------------------------------------------
	// Partial View
	function populateNode(node) {

	}
	app.get('/drive/tree', (request, response) => {
		getFolderStructure(request.user, (root) => {
			response.render('tree.pug', { rootNodes: root });
		});
	});
	app.get('/drive/treeNode', (request, response) => {
		listFiles(request.user, `mimeType = 'application/vnd.google-apps.folder' and '${request.query.id}' in parents and trashed = false`, (files,error) => {
			if (error) {
				response.render('error.pug', { error });
			} else {
				// determine which folders don't have any sub-folders
				let semiphore = 0;
				files.forEach((file) => {
					semiphore++;
					listFiles(request.user, `mimeType = 'application/vnd.google-apps.folder' and '${file.id}' in parents and trashed = false`, (subFolders, error) => {
						file.hasSubDirectories = subFolders.length !== 0;
						file.img = "/img/folder_32.png";
						if (--semiphore === 0) {
							response.render('treeNodePartial.pug', { itemList: files });
						}
					});
				});
			}
		});
	});
	app.get('/drive/logout', (request, response) => {
		request.logout();
		response.redirect('/');
	});
	const server = app.listen(3000, function() {
		console.log(`Server started on port ${server.address().port}`);
	});
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
function getFile(user,id, callback) {
	getFileMeta(user,id, (meta) => {
		getFileContent(user,id, (streamBuffer) => {
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

function getFileMeta(user,id, callback) {
    let url = 'https://www.googleapis.com/drive/v3/files/' + id;
    request({
        url: url,
        method: 'GET',
        headers: {
			'Authorization': 'Bearer ' + user.token
        }
    }, (err,res,body) => callback(JSON.parse(body)));

}
function getFileContent(user,id, callback) {
    let url = 'https://www.googleapis.com/drive/v3/files/' + id;
    request({
        url: url,
        qs: {alt:'media'},
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
			q: `mimeType = 'application/vnd.google-apps.folder' and trashed = false`
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
				child.parents.forEach((parentID) => {
					let parent = fileMap[parentID];
					if (parent) {
						parent.children.push(child);
					} else {
						root.push(child);
					}
				});
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
