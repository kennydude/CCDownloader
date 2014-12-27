var express = require("express");

var app = express();

var swig = require('swig');

app.engine('html', swig.renderFile);

app.set('view engine', 'html');
app.set('views', __dirname + '/views');

// Swig will cache templates for you, but you can disable
// that and use Express's caching instead, if you like:
app.set('view cache', false);
// To disable Swig's cache, do the following:
swig.setDefaults({ cache: false });

var request = require("request");
var querystring = require("querystring");

var app_id = "5df693d9739242e3ab9a8d912a6c9514",
	app_secret = "ee7b8a37-2d27-4a2c-88dd-1e8e856954da",
	port = process.env['PORT'] || 8080;

app.get("/", function(req, res){
	res.redirect("https://ims-na1.adobelogin.com/ims/authorize/v1? "+ querystring.stringify({
		"redirect_uri" : "http://localhost:" + port + "/auth",
		"scope" : "creative_sdk,AdobeID",
		"idp_flow" : "loign",
		"client_id" : app_id,
		"local" : "en",
		"dc" : "true"
	}));
});

app.get("/auth", function(req, res){

	request.post({
		url : "https://ims-na1.adobelogin.com/ims/token/v1",
		form : {
			"client_id" : app_id,
			"client_secret" : app_secret,
			"code" : req.query['code'],
			"grant_type" : "authorization_code",
			"redirect_uri" : "http://localhost:" + port + "/auth"
		}
	}, function(err, httpResponse, body) {
		var info = JSON.parse(body);
		var token = info['access_token'];
		console.log(info, token);
		res.redirect("/files?" + querystring.stringify({
			"access_token" : token
		}));
	});
});

app.get("/files/:id", function(req, res){
	if(!req.query['access_token']) return res.end("error");
	res.locals['access_token'] = req.query['access_token'];

	request.get({
		url : "https://cc-api-storage.adobe.io/assets/adobe-libraries/" + req.params.id + "/manifest",
		"headers" : {
			"x-api-key" : app_id,
			"Authorization" : "Bearer " + req.query['access_token']
		}
	}, function(err, httpResponse, body) {
		var info = JSON.parse(body);
		res.render("manifest.html", {
			data : info
		})
	});
});

app.get("/preview/:lib/:id/:rendition", function(req, res){
	if(!req.query['access_token']) return res.end("error");
	res.locals['access_token'] = req.query['access_token'];

	var url = "https://cc-api-storage.adobe.io/assets/adobe-libraries/" +
				req.params.lib + "/" +
				req.params.id + "/" + req.params.rendition;
	console.log(url);

	var headers = {
		"X-API-Key" : app_id,
		"Authorization" : "Bearer " + req.query['access_token']
	};
	if(req.query['require'] == "image/png"){
		headers["Accept"] = "image/png";
	}

	request.get({
		url : url,
		"headers" : headers
	}).pipe(res);
});

app.get("/files", function(req, res){
	if(!req.query['access_token']) return res.end("error");
	res.locals['access_token'] = req.query['access_token'];

	request.get({
		url : "https://cc-api-storage.adobe.io/assets/adobe-libraries/",
		qs : {
			"limit" : "30",
			"order" : "desc",
			"orderby" : "modified"
		},
		"headers" : {
			"x-api-key" : app_id,
			"Authorization" : "Bearer " + req.query['access_token']
		}
	}, function(err, httpResponse, body) {
		var info = JSON.parse(body);
		res.render("files.html", {
			data : info
		})
	});
});

var server = app.listen(port, function () {
	var host = server.address().address;
	var port = server.address().port;
	console.log('Creative Cloud Downloader at http://%s:%s', host, port)
})