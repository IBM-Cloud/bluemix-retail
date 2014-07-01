//----------------------------------------------
// REST Server for Retail 
//----------------------------------------------

//console.log("process.env: " + JSON.stringify(process.env, null, 4))

// modules
var http = require("http");
var https = require("https");
var async = require("async");
var URL = require("url");
var cfEnv = require("cf-env");
var express = require("express");
var fs = require("fs");
var path = require("path");
var connect = require("connect"); 			
var util = require("util");
var async = require("async");
var s = require("string");
var htmlParser = require("htmlparser");
var soupSelect = require("soupselect");
var _ = require("underscore");
var select = soupSelect.select;

var port = (process.env.VCAP_APP_PORT || 8192);
var host = (process.env.VCAP_APP_HOST || 'localhost');
var selfurl = JSON.parse(process.env.VCAP_APPLICATION || '{"uris":["' + 'https://' + host + ':' + port + '"]}').uris[0] 

function serviceStartsWith(str) {
  var service = {};
  var services = JSON.parse(process.env.VCAP_SERVICES || '{}');
  if (services != undefined) {
    var arr = []; 
    for (attr in services) { services[attr].forEach(function(s) { arr.push(s) }) };
    arr = arr.filter(function(el){return el.name.substring(0, str.length) === str});
    if (arr.length > 0) {service = arr[0].credentials;}
  }      
  return service;
}

var alertsDbSource = require('./alerts').json;
var districtsDbSource = require('./districts').json

function getHost(url) {
  var host;
  if (url) {
    if (url.indexOf('/', url.length - 1) == url.length - 1) url = url.substring(0, url.length - 1);

    if (url.indexOf('https://') == 0)
      host = url.substring('https://'.length);
    else
    if (url.indexOf('http://') == 0)
      host = url.substring('http://'.length);
    else
      host = url;
  }
  return host;
}

var CLOUDANT_ALERTS_DATABASE_SERVICE = serviceStartsWith(process.env.ALERTS_DATABASE_SERVICE_NAME || 'cloudant-alerts-db')
console.log(JSON.stringify(CLOUDANT_ALERTS_DATABASE_SERVICE, undefined, 2))
var CLOUDANT_ALERTS_URL = (CLOUDANT_ALERTS_DATABASE_SERVICE.cloudantUrl);
var CLOUDANT_ALERTS_HOST = getHost(CLOUDANT_DISTRICTS_URL);
var CLOUDANT_ALERTS_DB_NAME = (CLOUDANT_ALERTS_DATABASE_SERVICE.alertsDbName || 'alerts');
var CLOUDANT_ALERTS_USERNAME = (CLOUDANT_ALERTS_DATABASE_SERVICE.alertsDbKey);
var CLOUDANT_ALERTS_PASSWORD = (CLOUDANT_ALERTS_DATABASE_SERVICE.alertsDbPassword);

var CLOUDANT_DISTRICTS_DATABASE_SERVICE = serviceStartsWith(process.env.CLOUDANT_DISTRICTS_DATABASE_SERVICE || 'cloudant-districts-db')
console.log(JSON.stringify(CLOUDANT_DISTRICTS_DATABASE_SERVICE, undefined, 2))
var CLOUDANT_DISTRICTS_URL = (CLOUDANT_DISTRICTS_DATABASE_SERVICE.cloudantUrl);
var CLOUDANT_DISTRICTS_HOST = getHost(CLOUDANT_DISTRICTS_URL);
var CLOUDANT_DISTRICTS_DB_NAME = (CLOUDANT_DISTRICTS_DATABASE_SERVICE.districtsDbName || 'districts');
var CLOUDANT_DISTRICTS_USERNAME = (CLOUDANT_DISTRICTS_DATABASE_SERVICE.districtsDbKey);
var CLOUDANT_DISTRICTS_PASSWORD = (CLOUDANT_DISTRICTS_DATABASE_SERVICE.districtsDbPassword);

var WEATHER_APP_HOST = (process.env.WEATHER_APP_HOST || 'bluemix-weather');

function authCloudantConn(url, db, user, pass, callback) {
  console.log('*** attempting to auth to cloudant %s', db)
  var cloudantAuthCookie = {};
  var unauthNano = require('nano')(url);
  var authNano;
  var conn = function() {
    return authNano;
  }

  function reauth() {
    unauthNano.request({
      method: "POST",
      db: "_session",
      form: { name: user, password: pass },
      content_type: "application/x-www-form-urlencoded; charset=utf-8"
    }, function (err, body, headers) {
      console.log('*** authenticated to %s err %s', db, err)
      if (err) { 
        callback(err, undefined);
      }
      if (headers && headers['set-cookie']) {
        cloudantAuthCookie = headers['set-cookie'];
        authNano = require('nano')({ url : url + '/' + db, cookie: cloudantAuthCookie });
        callback(undefined, authNano);
      } else {
        callback(new Error("failed to retrieve authsession cookie from cloudant"), undefined);
      }
    });
  }
  reauth();
  setInterval(reauth, 60 * 60 * 1000);
  return conn;
}

function withCloudantConn(req, res, nxt) {
  var conn = cloudantConnPool();
  if (conn == undefined) {
    res.send('Cloudant service is not started yet, please wait and retry your request');
  } else { 
    return nxt(conn);
  }
}

var alertsDocId, districtsDocId;

var DB_alert_id, KEY_alert, PWD_alert, URL_alerts, OPTIONS_alertsDB;
var alertsDb = authCloudantConn(CLOUDANT_ALERTS_URL, CLOUDANT_ALERTS_DB_NAME, CLOUDANT_ALERTS_USERNAME, CLOUDANT_ALERTS_PASSWORD, function(err, alertsDb) {
  if (err) throw err;
  alertsDb.insert(alertsDbSource, function(err, body) {
    if (!err) {
      console.log('Inserted into alerts %s', JSON.stringify(body, undefined, 2));
      alertsDocId = body['id'];

      DB_alert_id=alertsDocId;
      KEY_alert=CLOUDANT_ALERTS_USERNAME;
      PWD_alert=CLOUDANT_ALERTS_PASSWORD;
      URL_alerts=CLOUDANT_ALERTS_URL + '/' + CLOUDANT_ALERTS_DB_NAME +  '/' + DB_alert_id; //"https://osipov.cloudant.com/alerts/"+DB_alert_id;
      OPTIONS_alertsDB = {
        hostname: CLOUDANT_DISTRICTS_HOST,
        port: 443,
        path: '/' + CLOUDANT_ALERTS_DB_NAME + '/'+ DB_alert_id,
        method: 'GET',
        headers: {
          'Content-Type':  'application/json',
        },
        // auth: KEY_alert+":"+PWD_alert
      };

    } else {
      console.log('Error inserting source document into the alerts database, %s', JSON.stringify(err, undefined, 2));
    }
  });       
});

var KEY_district, PWD_district, DB_district_id, URL_district, OPTIONS_districtDB;
var districtsDb = authCloudantConn(CLOUDANT_DISTRICTS_URL, CLOUDANT_DISTRICTS_DB_NAME, CLOUDANT_DISTRICTS_USERNAME, CLOUDANT_DISTRICTS_PASSWORD, function(err, districtsDb) {
  if (err) throw err;
  districtsDb.insert(districtsDbSource, function(err, body) {
    if (!err) {
      console.log('Inserted into districts %s', JSON.stringify(body, undefined, 2));
      districtsDocId = body['id'];

      KEY_district=CLOUDANT_DISTRICTS_USERNAME;
      PWD_district=CLOUDANT_DISTRICTS_PASSWORD;
      DB_district_id=districtsDocId;
      URL_district=CLOUDANT_DISTRICTS_URL + '/' + CLOUDANT_DISTRICTS_DB_NAME + '/' + DB_district_id;
      OPTIONS_districtDB = {
        hostname: CLOUDANT_DISTRICTS_HOST,
        port: 443,
        path: '/' + CLOUDANT_DISTRICTS_DB_NAME + '/' + DB_district_id,
        method: 'GET',
        headers: {
          'Content-Type':  'application/json',
        },
        //auth: KEY_district+":"+PWD_district
      };      

    } else {
      console.log('Error inserting source document into the districts database, %s', JSON.stringify(err, undefined, 2));
    }
  });    
});


 


/*
var DB_alert_id="ded94c18f44ba62b3cceaaf3102a1cfe";
var KEY_alert="hadephislankedyindrophro";
var PWD_alert="ph1FXT7UCfaytMGnsU4ugEaj";
var URL_alerts="https://osipov.cloudant.com/alerts/"+DB_alert_id;
var OPTIONS_alertsDB = {
  hostname: 'osipov.cloudant.com',
  port: 443,
  path: '/alerts/'+DB_alert_id,
  method: 'GET',
  headers: {
    'Content-Type':  'application/json',
  },
  // auth: KEY_alert+":"+PWD_alert
};

var KEY_district="verlyethenedissemeaskedu";
var PWD_district="lOlc5f8CktXhIY3GqGVRnM6g";
var DB_district_id="d13c223a495d35d6e7f608f0cb8b6085";
var URL_district="https://osipov.cloudant.com/districts/"+DB_district_id;
var OPTIONS_districtDB = {
  hostname: 'osipov.cloudant.com',
  port: 443,
  path: '/districts/'+DB_district_id,
  method: 'GET',
  headers: {
    'Content-Type':  'application/json',
  },
  //auth: KEY_district+":"+PWD_district
};
*/

var pkg = require("./package.json");
var cfCore = cfEnv.getCore();
var server = http.createServer();

// static content
var WWWDIR = path.join(__dirname,"./www");
var IndexHTML = fs.readFileSync(path.join(WWWDIR, "index.html"), "utf8");

// logs
var accessLogfilename = path.join(__dirname,"./logs/access.log");
var access_logfile = fs.createWriteStream(accessLogfilename, {flags: 'a'});

//-------------------
//  globals
//-------------------

var alertsDB=null;
var districtDB=null;
var district=null;

var initTime=10000;
var refreshTime=60000;

//----------------------
// initialize / refresh
//----------------------

function refresh() {

  console.log('preparing to call readDBDistrict');

  readDistrictDB();

  //alertsDB={ list: ["No Alerts","Thunderstorm Warning","Severe Thunderstorm Warning", "Tornado Warning", "Tornado Watch", "Snow"]};
  readAlertsDB();

  console.log('preparing to call NOAAAlerts.  district='+JSON.stringify(district));
  readNOAAAlerts();
}

setInterval( 
  function (){
    console.log('refresh');
    refresh();
  }, (function () {     
    if(districtInit())
      return refreshTime;
    else
      return initTime; 
  } )()                      
);

//-------------------
// Request Handlers
//-------------------

function getAlertsDB(req,resp) {

  var emptyAlertsDB={ list: [] };

  if(varInit(alertsDB)) {
    return resp.send(alertsDB);
  } else {
    console.log("getDistrictDB.  alertsDB not yet initialized.");
    return resp.send(emptyAlertsDB);
  } 
}

function getDistrictDB(req,resp) {

  var emptyDistrictDB={ length: 0, list: [] };  

  if(varInit(districtDB)) {
    return resp.send(districtDB);
  } else {
    console.log("getDistrictDB.  districtDB not yet initialized.");
    return resp.send(emptyDistrictDB);
  }
}

function getDistrict(req,resp) {

  var emptyDistrict={ length: 0, list: [] };  
  console.log('getDistrict.  district='+JSON.stringify(district));

  if(districtInit()) {
    return resp.send(district);
  } else {
    console.log("getDistrict.  district not yet initialized.");
    return resp.send(emptyDistrict);
  }
}

//-------------------
// Server-Side
// Database Handlers
//-------------------

function readAlertsDB() {

  var lalerts;
  getHttps(OPTIONS_alertsDB,function(err,body) {
    if(err) {
      console.log("error retrieving alerts cloudant database err="+JSON.stringify(err));
    } else {
      try {
        console.log('readDBAlerts. body='+body);
        lalerts=JSON.parse(body);
        alertsDB=lalerts;
      } catch (e) {
        console.log("readDBAlerts.  error="+e);
      }
    }
  });
}

function readDistrictDB() {

  var ldistrictDB;

  getHttps(OPTIONS_districtDB,function(err,body) {
    if(err) {
      console.log("error retrieving district cloudant database;  err="+JSON.stringify(err));
      var err=new Error("error retrieving district cloudant database");
    } else {
      try {
        ldistrictDB=JSON.parse(body);
        districtDB=ldistrictDB;
        return;
      } catch (e) {
        console.log("readDBDistrict error="+e);
      }
    }
  });
}

//----------------------------------
// REST client for weather alerts
//----------------------------------

function readNOAAAlerts() {


  if(varInit(districtDB)) {

    if(!varInit(district)) {
      console.log('readNOAAAlerts.  initializing district');
      var ldistrict=districtDB;
      for (var i=0;i<districtDB.length;i++) 
        ldistrict.list[i].init=false;
      district=ldistrict;
    }


    for(var i=0;i<district.length;i++) {
      var store=district.list[i];
      readStoreNOAAAlerts(i,store,function(err,index,body) {
        if(err) {
          error=true;
        } else {
          console.log('readNOAAAlerts.  district.list['+index+']='+JSON.stringify(district.list[index]));
          district.list[index]=body;
        }
      });
    }
  }
}

function readStoreNOAAAlerts(index,store,callback) {

  if(varInit(store)) {

    var url="http://" + WEATHER_APP_HOST +".mybluemix.net/api/v1/weather-by-geo/"+store.latitude+","+store.longitude+".json";
    getHttp(url,function(err,body) {

      if(err) {
        console.log("readStoreNOAAAlets.  error getting weather alerts for store="+JSON.stringify(store));
        var err=new Error("readStoreNOAAAlerts.  error getting weather alerts");
        callback(err,null,null);
      } else {
        try {
          weather=JSON.parse(body);
          if (varInit(weather.hazardAMPhenomena) && weather.hazardAMPhenomena!="") 
            store.alert=weather.hazardAMPhenomena;
          else if(varInit(weather.hazardPMPhenomena) && weather.hazardPMPhenomena!="")
            store.alert=weather.hazardPMPhenomena;
          else 
            store.alert="No Alert";

          store.init=true;
          callback(null,index,store);
          console.log('readStoreNOAAAlerts.  store.alert='+store.alert);
        } catch (e) {
          console.log('readStoreNOAAAlerts. gethttp failed.  e='+JSON.stringify(e));
          var err=new Error(e);
          callback(err,null,null);
        }
      }
    });
  } else {
    var err=new Error("readStoreNOAAAlerts.  districtDB not yet initialized");
    callback(err,null,null);
  }
}

//-----------------------------------
// Utilities 
//-----------------------------------

function varInit(gvar) {
  var init=true;

  if(typeof gvar === 'undefined') init=false;
  if(gvar===null) init=false;

  return init;
}

function districtInit() {

  var init=varInit(district) && varInit(districtDB);

  if(init) {
    for (var i=0;i<district.length;i++) {
      if (!varInit(district.list)) init=false;
      else if (!varInit(district.list[i])) init=false;
      else if (district.list[i].init===false) init=false;
    }
  }

  return init;
}

//----------------------------------
// getHttp
// http client requests
//----------------------------------

function getHttp(url, callback) {

  var urlParsed = URL.parse(url);
  var request = http.request(urlParsed);
  request.on("response", function(response) {
    var body = "";
    //response.setTimeout(100000);
    response.setEncoding("utf8");
    response.on("data", function(chunk) {
      body += chunk;
    });
    response.on("end", function(chunk) {
      var err;
      if(!isNaN(chunk) && chunk!=null) 
        body+=chunk;
      if (response.statusCode !== 200) {
        err = Error("http status: " + response.statusCode);
        err.url = url;
        return callback(err, body);
      }
      return callback(null, body);
    });
    response.on("close", function() {
      console.log("close received");
    });
    return response.on("error", function(err) {
      err.url = url;
      return callback(err, body);
    });
  });
  request.on("error", function(err) {
    err.url = url;
    return callback(err);
  });
  request.end();
};

//----------------------------------
// getHttps
// https client requests
//----------------------------------

function getHttps(options, callback) {

  //var urlParsed = URL.parse(url);
  var request = https.request(options,function(response) {
      var body = "";
      //response.setTimeout(100s);
      response.setEncoding("utf8");
      response.on("data", function(chunk) {
        body += chunk;
      });
      response.on("end", function() {
        var err;
        if (response.statusCode != 200) {
          console.log("options.path="+options.path+" getHttps.  statusCode="+response.statusCode);
          err = Error("https status: " + response.statusCode);
          err.url = url;
          return callback(err, body);
        }
        return callback(null, body);
      });
      response.on("close", function() {
        console.log("close received");
      });
      response.on("error", function(err) {
        console.log("getHttps.  error="+JSON.stringify(err));
        err.url = url;
        return callback(err, body);
      });
    });
  request.on("error", function(err) {
    console.log("getHttps.. error="+JSON.stringify(err));
    return callback(err);
  });
  request.end();
};

//-----------------------------------------
// static load of file contents 
//-----------------------------------------

function loadFileContents(path,callback) {
  var f;
  async.waterfall( [
    function(cb) {
      fs.open(path,'r',cb);
    },

    function (handle,cb) {
      f=handle;

      fs.fstat(f, cb);
    },

    function (stats,cb) {
      if(stats.isFile()) {
        var b=new Buffer(10000);
        fs.read(f,b,0,10000,null,cb);
      } else {
        cb(Error("not a file, can't read it"));
      }
    },

    function (bytesRead, buffer, cb) {
      fs.close(f,function (err) {
        if(err) {
          callback(err);
        } else {
          callback(null,buffer.toString("utf8",0,bytesRead));
        }
      });
    }
  ],
  function(err,results) {
    callback(err,results);
  });
}
  
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

//----------------------------------
// parseXML
//----------------------------------

function parseXML(body) {

  var result = null;
  var handler = new htmlParser.DefaultHandler(function(err, nodes) {
    if(err != null) {
      console.log("parseXML:  html parse error, err="+JSON.stringify(err));
      result=null;
      return null;
    } else {
      result=nodes;  
    }
  });
  var parser = new htmlParser.Parser(handler);
  parser.parseComplete(body);
  normalizeElements(result);

  return result;
};

//----------------------------------
// normalizeElements
// allow htmlparse'd xml to work 
// with soupselect
//----------------------------------

function normalizeElements(nodes) {

  if (nodes == null) {
    return;
  }
  if (!_.isArray(nodes)) {
    nodes = [nodes];
  }
  var _len=nodes.length;
  for (var _i = 0; _i < _len; _i++) {
    var node = nodes[_i];
    if (node.type !== "tag") {
      continue;
    }
    node.name = node.name.toLowerCase();
    node.name = node.name.replace(/-/g, "");
    if (node.attribs) {
      if (node.attribs["type"]) {
        node.attribs["type"] = node.attribs["type"].replace(/\s+/, "");
      }
    }
    normalizeElements(node.children);
  }
};

//-----------------------------------------
// Censor Circular References
//-----------------------------------------

function censor(censor) {
  var i = 0;

  return function(key, value) {
    if(i !== 0 && typeof(censor) === 'object' && typeof(value) == 'object' && censor == value) 
      return '[Circular]'; 

    if(i >= 29) // seems to be a harded maximum of 30 serialized objects?
      return '[Unknown]';

    ++i; // so we know we aren't using the original object anymore

    return value;  
  }
}

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
    app.set('title','hello-retail');
    app.use(express.logger({stream: access_logfile }));
    app.use(express.errorHandler({dumpExceptions: true}));
    app.use("/gz", GZipify);
    app.use('/img', express.static(WWWDIR + '/img'));
    app.use('/img', express.directory(WWWDIR + '/img'));
    app.use('/', express.directory(WWWDIR+'/'));
    app.use(express.static(WWWDIR));
});

// routes 
app.get("/api/v1/districtDB",getDistrictDB);
app.get("/api/v1/alertsDB",getAlertsDB);
app.get("/api/v1/district",getDistrict);
app.get("/index.html", getIndexHtml(IndexHTML));
app.use('/img', express.directory(WWWDIR + '/img'));

app.get("*", function(req,res) {
  console.log("req="+JSON.stringify(req,censor(req)));
	res.end("Hello Retail  !!");
});

app.listen(cfCore.port);
