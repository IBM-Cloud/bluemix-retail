// Licensed under the Apache License. See footer for details.

//console.log("process.env: " + JSON.stringify(process.env, null, 4))

// modules
var http = require("http")
var cfEnv = require("cf-env")
var express = require("express")
var fs = require("fs");
var path = require("path");
var connect = require("connect"); 			
var lruCache = require("lru-cache");
var util = require("util");
//var date = require("date-utils");

var weather = require("./lib/hello-weather");
var pkg = require("./package.json");

var cfCore = cfEnv.getCore();
var server = http.createServer();

// static content
//var WWWDIR = path.join(__dirname,"./www");
//var IndexHTML = fs.readFileSync(path.join(WWWDIR, "index.html"), "utf8");

// logs
//var accessLogfilename = path.join(__dirname,"./logs/access.log");
//var access_logfile = fs.createWriteStream(accessLogfilename, {flags: 'a'});

// Locations
var Locations = null;

//----------------------------------
// Location Cache
//----------------------------------

var LOCATION_CACHE_ENTRIES_MAX = 500;
var LOCATION_CACHE_MAX_AGE_HRS = 1;
var LocationCache = lruCache({
  max: LOCATION_CACHE_ENTRIES_MAX,
  maxAge: LOCATION_CACHE_MAX_AGE_HRS * 1000 * 60 * 60
});

function buildLocationKey(zip) {
  var key=util.format('%s',zip);
  return key;
}

function buildLocationValue(lat,lon) {
  var val={};
  val.lat=lat;
  val.lon=lon;

  return JSON.stringify(val);
}

function flushLocationCache() {
  console.log("flush LocationCache:");
  LocationCache.reset();
}

// cleans cache by checking against maxAge 
function cleanLocationCache() {
  keys = LocationCache.keys();
  _results = [];
  for (_i = 0, _len = keys.length; _i < _len; _i++) {
    key = keys[_i];
    val = LocationCache.get(key);
    if(LocationsCache.get(key)==null) 
      LocationsCache.del(key);
  }
};

//----------------------------------
// Weather Cache
//----------------------------------

var WEATHER_CACHE_GC_MINS = 5;
var WEATHER_CACHE_ENTRIES_MAX = 500;
var WEATHER_CACHE_MAX_AGE_HRS = 1;
var WeatherCache = lruCache({
  max: WEATHER_CACHE_ENTRIES_MAX,
  maxAge: WEATHER_CACHE_MAX_AGE_HRS * 1000 * 60 * 60
});

function flushWeatherCache() {
  console.log("flush WeatherCache:");
  WeatherCache.reset();
}

function cleanWeatherCache() {
  var key, keys, val, _i, _len, _results;
  console.log("cleanCache()");
  keys = WeatherCache.keys();
  _results = [];
  for (_i = 0, _len = keys.length; _i < _len; _i++) {
    key = keys[_i];
    val = WeatherCache.get(key);
    if (val == null) {
      _results.push(log("   weather entry removed: " + key));
    } else {
      _results.push(void 0);
    }
  }
  return _results;
};

function buildWeatherKey(zip,yearStr,monthStr,dayStr) {
  var key=util.format('%s:%s-%s-%s',zip,yearStr,monthStr,dayStr);
  return key;
}

//----------------------------------
// Weather Responses
//----------------------------------

function flushLocations(req, resp) {
  console.log("flushLocations:");

  flushLocationCache();

  resp.header("Access-Control-Allow-Origin:", "*");
  resp.header("Access-Control-Allow-Methods", "GET");  
  resp.end("Locations Cache Flushed!");
}

function flushWeather(req, resp) {
  console.log("flushWeather:");

  flushWeatherCache();

  resp.header("Access-Control-Allow-Origin:", "*");
  resp.header("Access-Control-Allow-Methods", "GET");
  resp.end("Weather Cache Flushed!");
}

function getLocations(req, resp) {

  response.header("Access-Control-Allow-Origin:", "*");
  response.header("Access-Control-Allow-Methods", "GET");

  if (Locations != null) {
    resp.send(Locations);
    return;
  }
  return weather.getLocations(function(err, data) {
    if (err != null) {
      return handleError(resp, err);
    }
    Locations = data;
    return resp.send({
      locations: Locations
    });
  });
};

function getWeatherByZip(req, resp) {

  var zip = req.params.zip;

  // location cache 
  var locationKey=buildLocationKey(zip);
  var locationValue=LocationCache.get(locationKey);
  if(locationValue && typeof locationValue != "undefined") {
    console.log("getWeatherByZip:  locationValue="+JSON.stringify(locationValue));
    console.log("getWeatherByZip:  zip="+zip+" lat="+locationValue["lat"]+" lon="+locationValue["lon"]);
  }

  var now = new Date();
  var jsonNow=now.toJSON();
  var tomorrow = new Date();
  tomorrow.setHours(tomorrow.getHours()+24);
  var jsonTomorrow=tomorrow.toJSON();

  var yearStr,monthStr,dayStr;
  if(req.query.year != null) 
    yearStr=req.query.year;
  else 
    yearStr=tomorrow.getFullYear();
  if(req.query.month != null)
    monthStr=req.query.month;
  else
    monthStr=tomorrow.getMonth()+1;
  if(req.query.day != null) 
    dayStr=req.query.day;
  else
    dayStr=tomorrow.getDate();
  var then = new Date(yearStr,monthStr,dayStr,0,0,0);
  // must be <= 7 days from now 

  // weather cache 
  var weatherKey=buildWeatherKey(zip,yearStr,monthStr,dayStr);
  var weatherValue = WeatherCache.get(weatherKey);

  if (weatherValue != null) {
    resp.send(value);
    return;
  }
  return weather.getWeatherByZip(zip, yearStr, monthStr, dayStr, function(err, result) {
    if (err != null) {
      return handleError(resp, err);
    } else {
      var lkey=buildLocationKey(zip);
      var lvalue=buildLocationValue(result.lat,result.lon);
      LocationCache.set(lkey,lvalue);

      resp.header("Access-Control-Allow-Origin:", "*");
      resp.header("Access-Control-Allow-Methods", "GET");
      return resp.send(result);
    }
  });
};

function getWeatherByZipTest(req, resp) {

  var zip = req.params.zip;

  // location cache 
  var locationKey=buildLocationKey(zip);
  var locationValue=LocationCache.get(locationKey);

  var now = new Date();
  var jsonNow=now.toJSON();
  var yearStr,monthStr,dayStr;
  if(req.query.year != null) 
    yearStr=req.query.year;
  else 
    yearStr=jsonNow.getFullYear();
  if(req.query.month != null)
    monthStr=req.query.month;
  else
    monthStr=jsonNow.getMonth()+1;
  if(req.query.day != null) 
    dayStr=req.query.day;
  else
    dayStr=jsonNow.getDay();
  var then = new Date(yearStr,monthStr,dayStr,0,0,0);
  // must be <= 7 days from now 

  resp.header("Access-Control-Allow-Origin:", "*");
  resp.header("Access-Control-Allow-Methods", "GET");

  var value=null;

  if (value != null) {
    resp.send(value);
    return;
  }
  return weather.getWeatherByZipUnsumTest(zip, yearStr, monthStr, dayStr, function(err, data) {
    if (err) {
      return handleError(resp, err);
    } else {
      console.log("getWeatherByZipTest:  data="+data);
      return resp.send(data);
    }
  });
};

function getWeatherByGeo(req, resp) {

  console.log('called getWeatherByGeo');
  var lat = req.params.lat;
  var lon = req.params.lon;

  var now = new Date();
  var jsonNow=now.toJSON();
  var tomorrow = new Date();
  tomorrow.setHours(tomorrow.getHours()+24);

  var yearStr,monthStr,dayStr;
  if(req.query.year != null) 
    yearStr=req.query.year;
  else 
    yearStr=tomorrow.getFullYear();
  if(req.query.month != null)
    monthStr=req.query.month;
  else
    monthStr=tomorrow.getMonth()+1;
  if(req.query.day != null) 
    dayStr=req.query.day;
  else
    dayStr=tomorrow.getDate();
  var then = new Date(yearStr,monthStr,dayStr,0,0,0);
  // must be <= 7 days from now 

  return weather.getWeatherByGeo(lat, lon, yearStr, monthStr, dayStr, function(err, data) {
    if (err != null) {
      return handleError(resp, err);
    }
    console.log("getWeatherByGeo:  data="+JSON.stringify(data));
    resp.header("Access-Control-Allow-Origin:", "*");
    resp.header("Access-Control-Allow-Methods", "GET"); 
    return resp.send(data);
  });
};

//-----------------------------------------
// Utilities 
//-----------------------------------------

function setVary(resp, newToken) {
  var vary, varyHeader;
  varyHeader = resp.get("Vary") || "";
  if ("" === varyHeader) {
    vary = "Accept-Encoding";
  } else if (-1 === vary.indexOf("Accept-Encoding")) {
    vary = "" + vary + ", Accept-Encoding";
  }
  if (vary != null) {
    return resp.set("Vary", vary);
  }
};

function permanentRedirectWithSlash(path) {
  return function(req, resp, next) {
    if (req.path !== path) {
      return next();
    }
    return resp.redirect(301, "" + path + "/");
  };
};

function GZipify(req, resp, next) {
  console.log("sending " + req.path + " as gzip'd");
  resp.set("Content-Encoding", "gzip");
  setVary(resp, "Accept-Encoding");
  return next();
};

function logRequest(req, resp, next) {
  console.log("" + req.method + " " + req.url);
  return next();
};

function handleError(resp, err) {
  console.log(JSON.stringify(err,null,2));
  resp.send({
    error: "" + err,
    //stack: "" + err.stack
  });
};

//-----------------------------------------
// Static 
//-----------------------------------------

function getIndexHtml(content) {
  return function(req, resp) {
    resp.header("Content-Type:", "text/html");
    return resp.send(content);
  };
};

//-----------------------------------------
// Routes defined for WebApp
//-----------------------------------------

var app = express();

// configure 
app.configure(function(){
    app.set('title','hello-weather');
    app.use(express.errorHandler({dumpExceptions: true}));
});

// routes 
app.get("/api/v1/flush-locations",flushLocations);
app.get("/api/v1/flush-weather",flushWeather);
app.get("/api/v1/weather-by-geo/:lat,:lon.json", getWeatherByGeo);
app.get("/api/v1/weather-by-zip/:zip.json", getWeatherByZip);

app.get("*", function(req,res) {
	res.end("Hello Weather!");
});

app.listen(cfCore.port);
