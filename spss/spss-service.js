// Licensed under the Apache License. See footer for details.

console.log("process.env: " + JSON.stringify(process.env, null, 4))

// modules
var http = require("http")
var cfEnv = require("cf-env")
var express = require("express")
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
var model = require("./lib/hello-spss");
var pkg = require("./package.json");

var cfCore = cfEnv.getCore();
var server = http.createServer();

// static content
//var WWWDIR = path.join(__dirname,"./www");
//var IndexHTML = fs.readFileSync(path.join(WWWDIR, "index.html"), "utf8");

// logs
//var accessLogfilename = path.join(__dirname,"./logs/access.log");
//var access_logfile = fs.createWriteStream(accessLogfilename, {flags: 'a'});

//------------------
// Request Handlers
//-------------------

function getModelList(req, resp) {

  return model.listModels(function(err,result) {
    if(err!=null) {
      return handleError(resp,err);
    } else {
      resp.header("Access-Control-Allow-Origin:", "*");
      resp.header("Access-Control-Allow-Methods", "GET");
      return resp.send(result);
    }
  });
};

function getModelScoresFile(req, resp) {

  var contextID=req.contextID;
  var scoreFile=req.scoreFileFile;

  loadFileContents(__dirname+scoreFile, function (err,result) {
    if(err) {
      handleError(resp,err);
      return;
    }  
    return model.scoreFile(contextID,scoreFile,function(err,result) {
      if(err!=null) {
        return handleError(resp,err);
      } else {
        resp.header("Access-Control-Allow-Origin:", "*");
        resp.header("Access-Control-Allow-Methods", "GET");
        return resp.send(result);
      }
    });
  });
};

function getModelScoresPUT(req,resp) {

  var contextID=req.contextID;

  console.log("getModelScoresPUT:  contextID="+contextID);

  // for test 
  var json = {"tablename":"DRUG1n.sav","header":[ "Age", "Sex", "BP", "Cholesterol", "Na","K", "Drug" ],
    "data":[
        [ 23, "F", "HIGH", "HIGH", 0.792535, 0.031258, "drugY" ],
        [ 47, "M", "LOW", "HIGH", 0.739309, 0.056468, "drugC" ]
      ]
    };

  return model.scoreModel(contextID,json.tablename,json.header,json.data,function (err,result)  {
    if(err!=null) {
      console.log("getModelScoresPUT:  err="+JSON.stringify(err));
      return handleError(resp,err);
    } else {
      resp.header("Access-Control-Allow-Origin:", "*");
      resp.header("Access-Control-Allow-Methods", "GET");
      return resp.send(result);
    }
  });

}

function getModelScoresTest(req,resp) {

  var contextID=req.params.contextID;
  var query = req.query;


  console.log("getModelScoresTest:  contextID="+contextID);
  console.log("getModelScoresTest:  query="+JSON.stringify(query));

  // for test 
  var json = {"tablename":"DRUG1n.sav","header":[ "Age", "Sex", "BP", "Cholesterol", "Na","K", "Drug" ],
    "data":[
      [ 23, "F", "HIGH", "HIGH", 0.792535, 0.031258, "drugY" ],
      [ 47, "M", "LOW", "HIGH", 0.739309, 0.056468, "drugC" ]
      ]
    };

  return model.scoreModel(contextID,json.tablename,json.header,json.data,function (err,result)  {
    if(err) {
      console.log("getModelScoresQP:  err="+JSON.stringify(err));
      return handleError(resp,err);
    } else {
      resp.header("Access-Control-Allow-Origin:", "*");
      resp.header("Access-Control-Allow-Methods", "GET");
      return resp.send(result);
    }
  });
}

function getModelScoresQP(req,resp) {

  var contextID=req.params.contextID;
  var query = req.query;

  console.log("getModelScoresQP:  contextID="+contextID);
  console.log("getModelScoresQP:  query="+JSON.stringify(query));

  model.metadatatype(contextID,"score",function (err,result)  {
      var self=this;
      if(err) {
        console.log("getMetaData:  err="+JSON.stringify(err));
        return handleError(resp,err);
      } else {
        var metadata=JSON.parse(result);
        var message=metadata.message;
        var inputStr = 'Model Score Input Metadata:';
        var outputStr = 'Model Score Output Metadata:';
        var inputIndex=message.indexOf(inputStr);
        var outputIndex=message.indexOf(outputStr);
        var inputmetadata=message.substring(inputStr.length,outputIndex);
        var outputmetadata=message.substring(outputIndex+outputStr.length,message.length);
        var inputdom=parseXML(inputmetadata);
        var outputdom=parseXML(outputmetadata);

        var tableElem=select(inputdom,"metadata table")[0];
        var tableName=tableElem.attribs.name;
        var fieldNodes=select(inputdom,"metadata table field");
        var fieldNames=[fieldNodes.length];
        for(var i=0;i<fieldNodes.length;i++) {
            var fieldElem=fieldNodes[i];
            fieldNames[i]=fieldElem.attribs.name;
        }

        var header=[fieldNames.length];
        for(var i=0;i<fieldNames.length;i++) {
          header[i]=fieldNames[i];
        }

        var dataRow=[fieldNames.length];
        for(var i=0;i<fieldNames.length;i++) {
          dataRow[i]=query[fieldNames[i]];
        }
        var data=[dataRow];

        return model.scoreModel(contextID,tableName,header,data,function (err,result)  {
          if(err) {
            console.log("getModelScoresQP:  err="+JSON.stringify(err));
            return handleError(resp,err);
          } else {
            resp.header("Access-Control-Allow-Origin:", "*");
            resp.header("Access-Control-Allow-Methods", "GET");
            return resp.send(result);
          }
        });
      }
  });
}

function getMetaData(req,resp) {

  var contextID=req.params.contextID;
  var query = req.query;
  var metadatatype=query.metadatatype;

  console.log("getMetaData:  contextID="+contextID);
  console.log("getMetaData:  metadatatype="+JSON.stringify(metadatatype));

  if(typeof metadatatype=='undefined' || metadatatype==null || metadatatype=="") 
    metadatatype="stream";
  
  return model.metadatatype(contextID,metadatatype,function (err,result)  {
    if(err) {
      console.log("getMetaData:  err="+JSON.stringify(err));
      return handleError(resp,err);
    } else {
      resp.header("Access-Control-Allow-Origin:", "*");
      resp.header("Access-Control-Allow-Methods", "GET"); 
      return resp.send(result);
    }
  });
}

//-----------------------------------------
// Utilities 
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
    app.set('title','hello-spss');
    //app.use(express.json());
    //app.use(express.urlencoded());
    //app.use(express.multipart());
    //app.use(express.methodOverride());
    //app.use(app.router);
    //app.use(express.static(path.join(__dirname,"public")));
    //app.use(express.logger({stream: access_logfile }));
    app.use(express.errorHandler({dumpExceptions: true}));
});

// routes 
app.get("/api/v1/", getModelList);
//app.get("/api/v1/score/test",getModelScoresTestQP);
app.get("/api/v1/score/:contextID.json",getModelScoresQP);
app.post("/api/v1/score/:contextID.json",getModelScoresPUT);
app.put("/api/v1/score/:contextID.json",getModelScoresPUT);
//app.get("/api/v1/score/:contextID,:scoreFile.json",getModelScoresFile)
app.get("/api/v1/score/:contextID.json",getModelScoresTest);
app.get("/api/v1/metadata/:contextID.json",getMetaData);  // optional query parameter metadatatype=[stream,score,refresh,evaluation]

//
//app.get("/index.html", getIndexHtml(IndexHTML));
//app.use("/gz", GZipify);
//app.use("/", express["static"](WWWDIR));
app.get("*", function(req,res) {
	res.end("Hello SPSS!");
});

app.listen(cfCore.port);
