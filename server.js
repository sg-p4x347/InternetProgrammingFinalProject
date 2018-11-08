'use strict';
//herrowwwwwwww
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

const readline = require('readline');
const { google } = require('googleapis');
const request = require('request');

const app = express();

// configure Pug
app.set('view engine', 'pug');
app.set('views', 'views');

// Configure middleware
app.use(express.static('resources'));
app.use(cookieParser());
app.use(session({ secret: "test fest" }));

// If modifying these scopes, delete token.json.
const SCOPES = [
    'https://www.googleapis.com/auth/drive',
    'https://www.googleapis.com/auth/drive.appdata',
    'https://www.googleapis.com/auth/drive.metadata',
    'https://www.googleapis.com/auth/drive.photos.readonly',
    'https://www.googleapis.com/auth/drive.readonly'
];
const TOKEN_PATH = 'token.json';

// Load client secrets from a local file.
fs.readFile('credentials.json', (err, content) => {
  if (err) return console.log('Error loading client secret file:', err);
  // Authorize a client with credentials, then call the Google Drive API.
    startServer(JSON.parse(content));
  //authorize(JSON.parse(content), startServer);
});

/**
 * Create an OAuth2 client with the given credentials, and then execute the
 * given callback function.
 * @param {Object} credentials The authorization client credentials.
 * @param {function} callback The callback to call with the authorized client.
 */
function authorize(credentials,userSession, callback) {
  const {client_secret, client_id, redirect_uris} = credentials.installed;
  const oAuth2Client = new google.auth.OAuth2(
      client_id, client_secret, redirect_uris[0]);

  // Check if we have previously stored a token.
  //fs.readFile(TOKEN_PATH, (err, token) => {
    if (!userSession.token) return getAccessToken(oAuth2Client,userSession, callback);
    //oAuth2Client.setCredentials(userSession.token);
    callback();
}

/**
 * Get and store new token after prompting for user authorization, and then
 * execute the given callback with the authorized OAuth2 client.
 * @param {google.auth.OAuth2} oAuth2Client The OAuth2 client to get token for.
 * @param {getEventsCallback} callback The callback for the authorized client.
 */
function getAccessToken(oAuth2Client,userSession, callback) {
  const authUrl = oAuth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES
  });
  console.log('Authorize this app by visiting this url:', authUrl);
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  rl.question('Enter the code from that page here: ', (code) => {
    rl.close();
      oAuth2Client.getToken(code, (err, token) => {
      if (err) return console.error('Error retrieving access token', err);
      oAuth2Client.setCredentials(token);
      // Store the token to disk for later program executions
      //fs.writeFile(TOKEN_PATH, JSON.stringify(token), (err) => {
      //  if (err) console.error(err);
      //  console.log('Token stored to', TOKEN_PATH);
      //});
          // store token to session
          userSession.token = token;
          userSession.drive = google.drive({ version: 'v3', oAuth2Client });
      callback();
    });
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
function listFiles(userSession,query,callback) {
  
  userSession.drive.files.list({
    pageSize: 100,
    fields: 'nextPageToken, files(id, name, mimeType)',
	q: query
  }, (err, res) => {
    if (err) {
		console.log('The API returned an error: ' + err);
		callback([],err);
	} else {
		callback(res.data.files);
	}
  });
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
function startServer(credentials) {
    app.get('/', function (request, response) {
        response.render('infopage.pug');
    });
    app.get('/drive/list', function (request, response) {
        authorize(credentials, request.session, () => {
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
    app.get('/drive/get', function (request, response) {
        if (request.query.id) {
            getFile(request.session,request.query.id, (fileInstance) => {
                response.render('homepage', { file: fileInstance });
            });
        } else {
            response.render('error', { error:'Please provide a query parameter' });
        }
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
function getFile(userSession,id, callback) {
    getFileMeta(userSession,id, (meta) => {
        getFileContent(userSession,id, (streamBuffer) => {
            let content = '';
            if (meta.mimeType.includes('image')) {
                content = streamBuffer.toString('base64');
            } else {
                content = streamBuffer.toString();
            }
            callback(new File(meta, content));
        });
    });
}

function getFileMeta(userSession,id, callback) {
    let url = 'https://www.googleapis.com/drive/v3/files/' + id;
    request({
        url: url,
        method: 'GET',
        headers: {
            'Authorization': 'Bearer ' + userSession.token.access_token
        }
    }, (err,res,body) => callback(JSON.parse(body)));

}
function getFileContent(userSession,id, callback) {
    let url = 'https://www.googleapis.com/drive/v3/files/' + id;
    request({
        url: url,
        qs: {alt:'media'},
        method: 'GET',
        encoding: null,
        headers: {
            'Authorization': 'Bearer ' + userSession.token.access_token
        }
    }, (err, res, bodyStream) => {
        callback(new Buffer(bodyStream));
    });
}