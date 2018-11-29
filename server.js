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
const drive = require('./modules/drive/index.js');
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

//function getAuthorizationUrl(oAuth2) {
//	const authUrl = oAuth2.generateAuthUrl({
//		access_type: 'offline',
//		scope: SCOPES
//	});
//	console.log('Authorize this app by visiting this url:', authUrl);
//	return authUrl;
//}
//function getAccessToken(oAuth2,code,callback) {
//	oAuth2.getToken(code, (err, token) => {
//		if (err) return console.error('Error retrieving access token', err);
//		oAuth2.setCredentials(token);
//		// store token to session
//		callback(token);
//	});
//}



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
		authorize,
		(request, response) => {
			request.query.id = request.query.id || 'root';
			drive.getFileMeta(request.user, request.query.id, (fileMeta) => {
				let mimeMapping = drive.getMimeMapping(fileMeta.mimeType);
				if (fileMeta.mimeType === 'application/vnd.google-apps.folder') {
					// get folder model
					drive.getFilesInFolderById(request.user, request.query.id, (files, error) => {
						if (error) {
							response.render('error.pug', { error });
						} else {
							files.forEach((file) => file.icon = drive.getMimeMapping(file.mimeType).icon);
							response.render('fileList.pug', { itemList: files });
						}
					});
				} else {
					// get file model
					drive.getFile(request.user, request.query.id, (fileInstance) => {
						response.render(mimeMapping.view, { file: fileInstance });
					});
				}
			});
	});
	//----------------------------------------------------------------
	// Partial View
	app.get('/drive/tree',
		authorize,
		(request, response) => {
		drive.getFolderStructure(request.user, (root) => {
			response.render('tree.pug', { rootNodes: root });
		});
	});
	app.get('/drive/treeNode', (request, response) => {
		let mimeType = 'application/vnd.google-apps.folder';
		let mimeMapping = drive.getMimeMapping(mimeType);
		drive.listFiles(request.user, `mimeType = '${mimeType}' and '${request.query.id}' in parents and trashed = false`, (files,error) => {
			if (error) {
				response.render('error.pug', { error });
			} else {
				// determine which folders don't have any sub-folders
				let semiphore = 0;
				files.some((file) => {
					semiphore++;
					drive.listFiles(request.user, `mimeType = '${mimeType}' and '${file.id}' in parents and trashed = false`, (subFolders, error) => {
						if (error) {
							response.render('error.pug', { error });
							response.end();
						} else {
							file.hasSubDirectories = subFolders && subFolders.length !== 0;
							file.img = mimeMapping.icon;
							if (--semiphore === 0) {
								response.render('treeNodePartial.pug', { itemList: files });
							}
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