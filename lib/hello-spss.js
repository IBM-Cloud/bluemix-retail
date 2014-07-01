//----------------------------------------------------
// SPSS Model using EPM instance on SoftLayer 
//----------------------------------------------------

var fs = require("fs");
var URL = require("url");
var http = require("http");
var util = require("util");
var _ = require("underscore");
var htmlParser = require("htmlparser");
var soupSelect = require("soupselect");
var lruCache = require("lru-cache");
var async = require("async");

var select = soupSelect.select;
var pkg = require("../package.json");

model = exports;

// constants
var typeof_undefined="undefined";
var typeof_object="object"; 
var typeof_boolean="boolean";
var typeof_number="number"; 
var typeof_string="string";
var typeof_function="function";

// SPSS EPM on Softlayer
var host="174.37.212.29"
var port="8080"
var modelPath="/BlackBox/EPM/model/"; 
var modelScorePath="/BlackBox/EPM/score/";
var modelDeployPath=modelPath;
var modelMetaDataPath="/BlackBox/EPM/metadata/";

// getOptions 

function getOptions(host,port,path,method) {
  var options = {
    host: host,
    port: port,
    path: path,
    method: method
  }

  return options;
}

//----------------------------------
// testcases
//----------------------------------
var unsummarizedTestFile = __dirname+"/../test/ndfdXMLclient.xml";
var summarizedTestFile = __dirname+"/../test/ndfdBrowserClientByDay.xml";

function getTestCase(filename,callback) {
  fs.readFile(filename,"utf-8",function(err,data) {
    if(err!=null) {
      return callback(err);
    }  else {
      return callback(null,data);
    }
  });
}

getTestCaseSummarized = function(url,callback) {
  return getTestCase(summarizedTestFile,callback);
}

getTestCaseUnsummarized = function(url,callback) {
  return getTestCase(unsummarizedTestFile,callback);
}

//----------------------------------
// deployModel 
// deploy or update a model 
//----------------------------------
model.deployModel = function (contextID,callback) {

  callback = getOneTimeInvoker(callback);

  return callback(Error("not supported"));
}

//----------------------------------
// listModels
//----------------------------------
model.listModels = function(callback) {

  callback = getOneTimeInvoker(callback);

  // build url 
  //var listModelOptions = getOptions(host,port,modelPath,"GET");
  var options = {
      host: host,
      port: port,
      path: modelPath,
      method: 'GET',
      headers: {
          'Content-Type':  'application/json',
      }
  };
  var url="http://"+host+":"+port+modelPath;

  return getHttp(options, function(err, body) {
    var self=this;
    if (err != null) {
      console.log("listModels:  err="+JSON.stringify(err));
      err.url = url;
      return callback(err);
    } else {
      return callback(null,body);
    }
  });
}

//----------------------------------
// undeployModel
// undeploy / delete model 
//----------------------------------
model.undeployModel = function (contextID,callback) {

  callback = getOneTimeInvoker(callback);

  return callback(Error("not supported"));
}

//----------------------------------
// downloadModel
//----------------------------------
model.downloadModel = function (contextID,callback) {

  callback = getOneTimeInvoker(callback);

  return callback(Error("not supported"));
}

//----------------------------------
// metadata
//----------------------------------
model.metadata = function (contextID,callback) {

  callback = getOneTimeInvoker(callback);

  // build url 
  //var listModelOptions = getOptions(domain,port,modelMetaDataPath,"GET");
  var options = {
      host: host,
      port: port,
      path: modelMetaDataPath+contextID,
      method: 'GET',
      headers: {
          'Content-Type':  'application/json',
      }
  };
  var url = "http://"+host+":"+port+modelMetaDataPath+"/"+contextID;

  return getHttp(options, function(err, body) {
    var self=this;
    if (err != null) {
      console.log("metadata:  err="+JSON.stringify(err));
      err.url = url;
      return callback(err);
    } else {
      return callback(null,body);
    }
  });
}

model.metadatatype = function (contextID,metadatatype,callback) {

  callback = getOneTimeInvoker(callback);

  // build url 
  //var listModelOptions = getOptions(domain,port,modelMetaDataPath,"GET");
  var options = {
      host: host,
      port: port,
      path: modelMetaDataPath+contextID+"?metadatatype="+metadatatype,
      method: 'GET',
      headers: {
          'Content-Type':  'application/json',
      }
  };
  var url = "http://"+host+":"+port+modelMetaDataPath+"/"+contextID;

  return getHttp(options, function(err, body) {
    var self=this;
    if (err != null) {
      console.log("metadata:  err="+JSON.stringify(err));
      err.url = url;
      return callback(err);
    } else {
      return callback(null,body);
    }
  });
}

//----------------------------------
// scoreModel
//----------------------------------
model.scoreModel = function (contextID,tablename,header,rowArray,callback) {

  console.log("scoreModel: contextID="+contextID);
  console.log("scoreModel: tablename="+tablename);

  callback = getOneTimeInvoker(callback);

  // build url
  var url = "http://"+host+":"+port+"/BlackBox/EPM/score/"+contextID;

  var json={"tablename":tablename,"header":header,"data":rowArray};
  console.log("json="+JSON.stringify(json));

  return postHttp(host,port,modelScorePath+contextID, json, function(err, body) {
    var self=this;
    if (err != null) {
      console.log("scoreModel:  err="+JSON.stringify(err));
      err.url = url;
      return callback(err);
    } else {
      return callback(null,body);
    }
  });

}

//----------------------------------
// getHttp
// http client requests
//----------------------------------

function getHttp(options,callback) {

  var request = http.request(options);
  var url="http://"+options.host+":"+options.port+options.path;
  request.on("response", function(response) {
    var body = "";
    //response.setTimeout(100s);
    response.setEncoding("utf8");
    response.on("data", function(chunk) {
      return body += chunk;
    });
    response.on("end", function() {
      var err;
      if (response.statusCode !== 200) {
        err = Error("http status: " + response.statusCode);
        err.url = url;
        return callback(err, body);
      }
      return callback(null, body);
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
// postHttp
// http client requests
//----------------------------------

function postHttp(host,port,path,postData,callback) {

  var postDataStr=JSON.stringify(postData);
  console.log("postHttp:  postData="+postDataStr);

  // An object of options to indicate where to post to
  var postOptions = {
      host: host,
      port: port,
      path: path,
      method: 'POST',
      headers: {
          //'Content-Type': 'application/x-www-form-urlencoded',
          'Content-Type':  'application/json',
          'Content-Length': postDataStr.length
      }
  };

  // Set up the request
  var postReq = http.request(postOptions, function(res) {
    console.log('postReq:  status: ' + res.statusCode);
    console.log('postReq:  headers: ' + JSON.stringify(res.headers));
    var url="http://"+postOptions.host+":"+postOptions.port+postOptions.path;
    var body="";
    res.setEncoding('utf8');
    res.on('data', function (chunk) {
      body+=chunk;
      console.log('Response chunk: ' + chunk);
    });
    res.on('end',function () {
      console.log("postHttp:  statuscode="+res.statusCode);
      console.log("postHttp:  body="+body);
      if(res.statusCode!=200) {
        var err=Error("http status:  "+res.statusCode);
        err.url=url;
        err.body=body;
        callback(err);
        return;
      }
      return callback(null,body);
    });
  });

  postReq.on("error", function(err) {
    console.log("postHttp:  error"+JSON.stringify(err));
    err.url = url;
    callback(err);
    return;
  });

  // post the data
  postReq.write(postDataStr,"utf8");
  postReq.end();
}

//--------------------------------------
// getOneTimeInvoker 
// ensure callback is only called once 
//--------------------------------------

function getOneTimeInvoker(callback) {

  var called = false;
  return function(err, data) {
    var self=this;
    if (called) {
      return;
    } 
    called = true;
    return callback(err, data);
  };
};

