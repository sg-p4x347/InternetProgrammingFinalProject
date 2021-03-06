'use strict';

// Twitter setup stuff
const Twit = require('twit');
let T = new Twit({
	consumer_key: 'JgZkkpOMzKIpz37icpzyuXqt3',
	consumer_secret: 'wB4wRET9rqrAlNNkJ8xkU8UJ851giK5H7d4Yv1EZcMmyqQaVFN',
	access_token: '1064614241141997568-YrcDjQb0LcJHYvx3BkbP4WGhnaaP8C',
	access_token_secret: 'XwGJL1YYyvo6FUzAoNnssloa0PFecNUgr9lBPnWGCRbW5'
});




/*

NODE QUICKSTART
https://developers.google.com/drive/api/v3/quickstart/nodejs

DRIVE QUERY
https://developers.google.com/drive/api/v3/search-parameters

*/
const passport = require('passport');
const express = require('express');
const session = require('express-session');
const cookieParser = require('cookie-parser');
const drive = require('./modules/drive/index.js');

const app = express();
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
	callbackURL: 'http://localhost:3000/drive/login/callback',
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

function authorize(request, response,next) {
	if (!request.isAuthenticated()) {
		response.redirect('/drive/login');
	} else {
		return next();
	}
}



app.get('/', function (request, response) {
	response.render('infopage.pug');
});
app.get('/join', (request, response) => {
	response.render('join.pug');
});
app.get('/tweet', (request, response) => {
	T.post('statuses/update', { status: request.query.TweetData });
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
	});
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
app.get('/drive/treeNode',
	authorize,
	(request, response) => {
		let mimeType = 'application/vnd.google-apps.folder';
		let mimeMapping = drive.getMimeMapping(mimeType);
		drive.listFiles(request.user, `mimeType = '${mimeType}' and '${request.query.id}' in parents and trashed = false`, (files,error) => {
			if (!error) {
			/* Run requests semi-sequentially (timeout) to avoid maxing out request quotas in cases where
				* the drive contains a large number of sub-directories
				* */
				drive.getTreeNodeRecursive(request.user, files, 0, mimeType, mimeMapping, { count: 0 }, (err) => {
					if (!err) {
						response.render('treeNodePartial.pug', { itemList: files });
					}
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
