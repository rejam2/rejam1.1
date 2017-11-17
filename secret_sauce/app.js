/**
 * This is an example of a basic node.js script that performs
 * the Authorization Code oAuth2 flow to authenticate against
 * the Spotify Accounts.
 *
 * For more information, read
 * https://developer.spotify.com/web-api/authorization-guide/#authorization_code_flow
 */

var express = require("express"); // Express web server framework
var request = require("request"); // "Request" library
var querystring = require("querystring");
var cookieParser = require("cookie-parser");

var client_id = "e45ed3cdf4e4442a8bc1fc79a1c2fa0f"; // Your client id
var client_secret = ""; // Your secret
var redirect_uri = "http://localhost:8888/callback"; // Your redirect uri

/**
 * Generates a random string containing numbers and letters
 * @param  {number} length The length of the string
 * @return {string} The generated string
 */
var generateRandomString = function(length) {
  var text = "";
  var possible =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

  for (var i = 0; i < length; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
};

var stateKey = "spotify_auth_state";

var app = express();

app.use(express.static(__dirname + "/public")).use(cookieParser());

app.get("/login", function(req, res) {
  var state = generateRandomString(16);
  res.cookie(stateKey, state);

  // your application requests authorization
  var scope =
    "user-read-private user-read-email playlist-modify-public playlist-modify-private";
  res.redirect(
    "https://accounts.spotify.com/authorize?" +
      querystring.stringify({
        response_type: "code",
        client_id: client_id,
        scope: scope,
        redirect_uri: redirect_uri,
        state: state
      })
  );
});

app.get("/callback", function(req, res) {
  // your application requests refresh and access tokens
  // after checking the state parameter

  var code = req.query.code || null;
  var state = req.query.state || null;
  var storedState = req.cookies ? req.cookies[stateKey] : null;

  if (state === null || state !== storedState) {
    res.redirect(
      "/#" +
        querystring.stringify({
          error: "state_mismatch"
        })
    );
  } else {
    res.clearCookie(stateKey);
    var authOptions = {
      url: "https://accounts.spotify.com/api/token",
      form: {
        code: code,
        redirect_uri: redirect_uri,
        grant_type: "authorization_code"
      },
      headers: {
        Authorization:
          "Basic " +
          new Buffer(client_id + ":" + client_secret).toString("base64")
      },
      json: true
    };

    request.post(authOptions, function(error, response, body) {
      if (!error && response.statusCode === 200) {
        var access_token = body.access_token,
          refresh_token = body.refresh_token;

        var options = {
          url: "https://api.spotify.com/v1/me",
          headers: { Authorization: "Bearer " + access_token },
          json: true
        };

        // use the access token to access the Spotify Web API
        request.get(options, function(error, response, body) {
          console.log(body);
        });

        // we can also pass the token to the browser to make requests from there
        res.redirect(
          "/#" +
            querystring.stringify({
              access_token: access_token,
              refresh_token: refresh_token
            })
        );
      } else {
        res.redirect(
          "/#" +
            querystring.stringify({
              error: "invalid_token"
            })
        );
      }
    });
  }
});

app.get("/refresh_token", function(req, res) {
  // requesting access token from refresh token
  var refresh_token = req.query.refresh_token;
  var authOptions = {
    url: "https://accounts.spotify.com/api/token",
    headers: {
      Authorization:
        "Basic " +
        new Buffer(client_id + ":" + client_secret).toString("base64")
    },
    form: {
      grant_type: "refresh_token",
      refresh_token: refresh_token
    },
    json: true
  };

  request.post(authOptions, function(error, response, body) {
    if (!error && response.statusCode === 200) {
      var access_token = body.access_token;
      res.send({
        access_token: access_token
      });
    }
  });
});

app.get("/get_spotify_user_info", function(req, res) {
  var access_token = req.query.access_token;

  console.log("requesting spotify user info");

  var options = {
    url: "https://api.spotify.com/v1/me",
    headers: { Authorization: "Bearer " + access_token },
    json: true
  };

  request.get(options, function(error, response, body) {
    console.log(response.statusCode);
    if (!error && response.statusCode === 200) {
      console.log("Request Made!");
      res.send(body);
    }
  });
});

app.get("/search_spotify", function(req, res) {
  var searchTerm = req.query.q;
  var searchType = req.query.type;
  var access_token = req.query.access_token;

  console.log("sending spotify request");

  var options = {
    url:
      "https://api.spotify.com/v1/search?q=" +
      searchTerm +
      "&type=" +
      searchType,
    headers: {
      Authorization: "Bearer " + access_token
    },
    json: true
  };

  request.get(options, function(error, response, body) {
    console.log(response.statusCode);
    if (!error && response.statusCode === 200) {
      console.log("Request Made!");
      res.send(body);
    }
  });
});

app.get("/create_spotify_playlist", function(req, res) {
  var access_token = req.query.access_token;
  var user_id = req.query.user_id;

  console.log("sending request to create spotify playlist");

  var options = {
    url: "https://api.spotify.com/v1/users/" + user_id + "/playlists",
    headers: {
      Authorization: "Bearer " + access_token,
      "Content-Type": "application/json"
    },
    body: {
      name: "reJam"
    },
    json: true
  };

  console.log(options.url);

  request.post(options, function(error, response, body) {
    console.log(response.statusCode);
    if (
      !error &&
      (response.statusCode === 200 || response.statusCode === 201)
    ) {
      console.log("Request Made!");
      res.send(body);
    }
  });
});

app.get("/update_spotify_playlist", function(req, res) {
  var access_token = req.query.access_token;
  var user_id = req.query.user_id;
  var playlist_id = req.query.playlist_id;
  var track_id = req.query.track_id;

  console.log("sending request to update spotify playlist");

  var options = {
    url:
      "https://api.spotify.com/v1/users/" +
      user_id +
      "/playlists/" +
      playlist_id +
      "/tracks?uris=" +
      track_id,
    headers: {
      Authorization: "Bearer " + access_token
      // "Content-Type": "application/json"
    },
    json: true
  };

  console.log(options.url);

  request.put(options, function(error, response, body) {
    console.log(response.statusCode);
    if (
      !error &&
      (response.statusCode === 200 || response.statusCode === 201)
    ) {
      console.log("Playlist Updated!");
      res.send(response);
    }
  });
});

app.get("/search_setlist", function(req, res) {
  var artistName = req.query.artistName;

  console.log("sending setlist.fm request");

  var options = {
    url:
      "https://api.setlist.fm/rest/1.0/search/setlists?artistName=" +
      artistName,
    headers: {
      Accept: "application/json",
      "x-api-key": "a00dce36-dd8d-4962-9ebd-c4234b60e0f5"
    }
  };

  request.get(options, function(error, response, body) {
    console.log(response.statusCode);
    if (!error && response.statusCode === 200) {
      var info = JSON.parse(body);
      console.log("Request Made!");
      res.send(info);
    }
  });
});

app.get("/get_setlist", function(req, res) {
  var setlistID = req.query.setlistID;

  console.log("sending setlist.fm setlist request");

  var options = {
    url: "https://api.setlist.fm/rest/1.0/setlist/" + setlistID,
    headers: {
      Accept: "application/json",
      "x-api-key": "a00dce36-dd8d-4962-9ebd-c4234b60e0f5"
    }
  };

  console.log(options.url);

  request.get(options, function(error, response, body) {
    console.log(response.statusCode);
    if (!error && response.statusCode === 200) {
      var info = JSON.parse(body);
      console.log("Request Made!");
      res.send(info);
    }
  });
});

console.log("Listening on 8888");
var port = process.env.port || 8888;
app.listen(port);
