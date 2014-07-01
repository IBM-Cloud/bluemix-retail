//----------------------------------------------------
// Weather Forecast
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

weather = exports;

// constants
var typeof_undefined="undefined";
var typeof_object="object"; 
var typeof_boolean="boolean";
var typeof_number="number"; 
var typeof_string="string";
var typeof_function="function";

// NOAA unsummarized data
var URLprefixUnsum = "http://graphical.weather.gov/xml/sample_products/browser_interface/ndfdXMLclient.php";
// NOAA summarized data 
var URLprefixSum = "http://graphical.weather.gov/xml/sample_products/browser_interface/ndfdBrowserClientByDay.php";
// https://api.forecast.io/forecast/APIKEY/LATITUDE,LONGITUDE[,TIME]
var URLprefix = "https://api.forecast.io/forecast"

// NOAA sum suffix
var URLsuffixSum = "&format=24+hourly&numDays=1&propertyName=wx,maxt,mint,appt,qpf,snow,iceaccum,sky,wspd,rh,maxrh,minrh,pop12,wwa";
// NOAA unsum suffix
var URLsuffixUnsum="&product=time-series&Unit=e&wx=wx&maxt=maxt&mint=mint&appt=appt&qpf=qpf&snow=snow&iceaccum=iceaccum&sky=sky&wspd=wspd&rh=rh&maxrh=maxrh&minrh=minrh&pop12=pop12&wwa=wwa";

var dataFields = ["date","lat","lon","cloudamount","windspeed","humidityrelative","humiditymaximumrelative","tempmaximum",
  "tempminimum","tempapparent","precipsnow","precipliquid","probPrecipAM","probPrecipPM","hazardAMPhenomena","hazardPMPhenomena",
  "hazardAMCode","hazardPMCode","weathersummary"];

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
// getLocations 
//----------------------------------

weather.getLocations = function(city,callback) {

  callback = getOneTimeInvoker(callback);
  
  var url = "" + URLprefixUnsum + "?listCitiesLevel="+city;
  getHttp(url, function(err, body) {
    if (err != null) {
      err.url = url;
      return callback(err);
    }
    try {
      return handleNOAAlocations(body, callback);
    } catch (_error) {
      err = _error;
      err.url = url;
      return callback(err);
    }
  });
};

//----------------------------------
// getWeatherByZip
//----------------------------------

weather.getWeatherByZip = function(zipcode, yearStr, monthStr, dayStr, callback) {

  callback = getOneTimeInvoker(callback);

  // compute start/stop dates
  // T00:00, T03:00, T06:00, T09:00, T12:00, T15:00, T18:00, T21:00
  var direction=1;  // 1 for east, -1 for west 
  //var offset = direction * lon * 24 / 360;
  var offset=-6;
  var bDate=new Date(parseInt(yearStr),parseInt(monthStr)-1,parseInt(dayStr));
  var eDate=new Date(parseInt(yearStr),parseInt(monthStr)-1,parseInt(dayStr));
  bDate.setHours(bDate.getHours()+offset);
  eDate.setHours(eDate.getHours()+offset+24);
  var bDateArr=bDate.toJSON().split("T");
  var eDateArr=eDate.toJSON().split("T");
  var bDateStr=bDateArr[0]+"T06:00";
  var eDateStr=eDateArr[0]+"T06:00";
  
  var parsedZipcode = parseInt("" + zipcode);
  if (isNaN(parsedZipcode)) {
    return callback(Error("zipcode value is not an integer"));
  }

  // build url 
  var summarizedurl = "" + URLprefixSum + "?zipCodeList="+zipcode+"&startDate="+bDateStr+URLsuffixSum;
  var unsummarizedurl = "" + URLprefixUnsum+"?zipCodeList="+zipcode+"&begin="+bDateStr+"&end="+eDateStr+URLsuffixUnsum;

  async.parallel([

    function(cb) {

      processNOAARequest(true,summarizedurl,function(err,body) {

        if(err!=null)
          return cb(err);
        else 
          return cb(null,body);

      });
    },

    function(cb) {
      processNOAARequest(false,unsummarizedurl,function(err,body) {
        if(err!=null)
          return cb(err);
        else 
          return cb(null,body);

      }); 
    }
  ],
  function(err, results){
    if(err!=null) 
      callback(err);
    else {
      var json1=results[0];
      var json2=results[1];

      var result=json2;
      result["date"]=util.format("%s-%s-%s",yearStr,addZ(monthStr),addZ(dayStr));
      for(var key in json1) {
        if(typeof json2[key]!= typeof_undefined && json2[key]!=json1[key]) {
          console.log("getWeatherByZip:  WARN json1["+key+"]="+JSON.stringify(json1[key])+"  json2["+key+"]="+JSON.stringify(json2[key]));
        }
        result[key] = json1[key];
      }
      callback(null,result);
    }
  });
};



//----------------------------------
// getWeatherByGeo
//----------------------------------

weather.getWeatherByGeo = function(lat, lon, yearStr, monthStr, dayStr, callback) {

  callback = getOneTimeInvoker(callback);

  // validate inputs
  var parsedLat = parseFloat("" + lat);
  if (isNaN(parsedLat)) {
    console.log("getWeatherByGeo:  latitude value is not a number");
    return callback(Error("latitude value is not a number"));
  }
  var parsedLon = parseFloat("" + lon);
  if (isNaN(parsedLon)) {
    console.log("getWeatherByGeo:  longitude value is not a number");
    return callback(Error("longitude value is not a number"));
  }

  // compute start/stop dates
  // T00:00, T03:00, T06:00, T09:00, T12:00, T15:00, T18:00, T21:00
  var direction=1;  // 1 for east, -1 for west 
  var offset = direction * lon * 24 / 360;
  offset=3*Math.round(offset/3);
  var bDate=new Date(parseInt(yearStr),parseInt(monthStr)-1,parseInt(dayStr));
  var eDate=new Date(parseInt(yearStr),parseInt(monthStr)-1,parseInt(dayStr));
  bDate.setHours(bDate.getHours()+offset);
  eDate.setHours(eDate.getHours()+offset+24);
  var bDateArr=bDate.toJSON().split("T");
  var eDateArr=eDate.toJSON().split("T");
  var bDateStr=bDateArr[0]+"T06:00";
  var eDateStr=eDateArr[0]+"T06:00";

  // build url 
  var summarizedurl = "" + URLprefixSum + "?lat="+lat+"&lon="+lon+"&startDate="+bDateStr+URLsuffixSum;
  var unsummarizedurl = "" + URLprefixUnsum + "?lat="+lat+"&lon="+lon+"&begin="+bDateStr+"&end="+eDateStr+URLsuffixUnsum;

  async.parallel([

    function(cb) {

      processNOAARequest(true,summarizedurl,function(err,body) {

        if(err!=null)
          return cb(err);
        else 
          return cb(null,body);

      });
    },

    function(cb) {
      processNOAARequest(false,unsummarizedurl,function(err,body) {
        if(err!=null)
          return cb(err);
        else 
          return cb(null,body);

      }); 
    }
  ],
  // optional callback
  function(err, results){
    if(err!=null) 
      callback(err);
    else {
      var json1=results[0];
      var json2=results[1];

      var result=json2;
      result["date"]=util.format("%s-%s-%s",yearStr,addZ(monthStr),addZ(dayStr));
      for(var key in json1) {
        if(typeof json2[key]!= typeof_undefined && json2[key]!=json1[key]) {
          console.log("getWeatherByGeo:  WARN json1["+key+"]="+JSON.stringify(json1[key])+"  json2["+key+"]="+JSON.stringify(json2[key]));
        }
        result[key] = json1[key];
      }
      callback(null,result);
    }
  });
};

//----------------------------------
// getWeatherByZipSumTest
// testcase for summarized xml
//----------------------------------

weather.getWeatherByZipSumTest = function(zipcode, yearStr, monthStr, dayStr, callback) {

  var parsedZipcode, url;
  var callback = getOneTimeInvoker(callback);

  var dateStr=util.format('%s-%s-%s',yearStr,monthStr,dayStr);
  
  var parsedZipcode = parseInt("" + zipcode);
  if (isNaN(parsedZipcode)) {
    console.log("weather.getWeatherByZipSumTest:  zipcode value is not an integer");
    return callback(Error("zipcode value is not an integer"));
  }

  var url="";

  getTestCaseSummarized(url, function(err,body) {
    var self = this;
    if (err) {
      console.log("getWeatherByZipSumTest:  err detected.  err="+JSON.stringify(err));
      err.url = url;
      return callback(err);
    } else 
      handleNOAAsummarized(body, function(err,handle) {
        if(err) {
          console.log("weather.getWeatherByZipSumTest:  handleNOAAsummarized failed.  err="+JSON.stringify(err));
          return callback(err);
        } else {
          return callback(null,handle);
        }
      });  
  });
};

//----------------------------------
// getWeatherByZipUnsumTest
// testcase for unsummarized xml
//----------------------------------

weather.getWeatherByZipUnsumTest = function(zipcode, yearStr, monthStr, dayStr, callback) {

  var parsedZipcode, url;
  var callback = getOneTimeInvoker(callback);

  var bdateStr=util.format('%s-%s-%s',yearStr,monthStr,dayStr);
  var edateStr=util.format('%s-%s-%s',yearStr,monthStr,dayStr+1);
  
  var parsedZipcode = parseInt("" + zipcode);
  if (isNaN(parsedZipcode)) {
    console.log("weather.getWeatherByZipUnsumTest:  zipcode value is not an integer");
    return callback(Error("zipcode value is not an integer"));
  }

  var url="";

  getTestCaseUnsummarized(url, function(err,body) {
    var self = this;
    if (err) {
      console.log("getWeatherByZipUnsumTest:  err detected");
      err.url = url;
      return callback(err);
    } else 
      handleNOAAunsummarized(body, function(err,handle) {
        if(err) {
          console.log("weather.getWeatherByZipUnsumTest:  handleNOAAunsummarized failed");
          return callback(err);
        } else {
          return callback(null,handle);
        }
      });  
  });
};

//----------------------------------
// processNOAARequest
//----------------------------------
function processNOAARequest(summarized,url,callback) {

  console.log("processNOAARequest:   url="+url);

  getHttp(url, function(err, body) {
    var self=this;
    if (err != null) {
      console.log("processNOAARequest:  err="+JSON.stringify(err));
      err.url = url;
      return callback(err);
    } else {
      if(summarized) {
        handleNOAAsummarized(body, function(err,handle) {
          if(err!=null) {
            console.log("processNOAARequest:  handleNOAAsummarized failed.  err="+JSON.stringify(err));
            return callback(err);
          } else {
            return callback(null,handle);
          }
        });  
      } else {
        handleNOAAunsummarized(body, function(err,handle) {
          if(err!=null) {
            console.log("processNOAARequest:  handleNOAAunsummarized failed.  err="+JSON.stringify(err));
            return callback(err);
          } else {
            return callback(null,handle);
          }
        });
      }
    } 
  });
};

//----------------------------------
// handleNOAAlocations
//----------------------------------

function handleNOAAlocations(xml, callback) {
  var city, cn, cnList, dom, i, lat, ll, llList, lon, result, st, _i, _ref, _ref1, _ref2;
  dom = parseXML(xml);

  // error checking
  var errorElem=select(dom,"error pre problem")[0];
  if(errorElem && typeof errorElem!=typeof_undefined) {
    var errormsg=errorElem.children[0].data;
    console.log("handleNOAAunsummarized:  Invalid Request:  "+errormsg);
    callback(Error("Invalid Request:  "+errormsg),null);
    return;
  }

  llList = getText(select(dom, "latlonlist"));
  cnList = getText(select(dom, "citynamelist"));
  llList = llList.split(" ");
  cnList = cnList.split("|");
  result = [];
  for (i = _i = 0, _ref = llList.length; 0 <= _ref ? _i < _ref : _i > _ref; i = 0 <= _ref ? ++_i : --_i) {
    ll = llList[i];
    cn = cnList[i];
    _ref1 = ll.split(","), lat = _ref1[0], lon = _ref1[1];
    _ref2 = cn.split(","), city = _ref2[0], st = _ref2[1];
    lat = parseFloat(lat);
    lon = parseFloat(lon);
    result.push({
      lat: lat,
      lon: lon,
      city: city,
      st: st
    });
  }
  console.log("handleNOAAlocations:  result="+JSON.stringify(result));
  callback(null, result);
};

//----------------------------------
// handleNOAAunsummarized
// NOAA unsummarized weather data 
//----------------------------------

function handleNOAAunsummarized(xml, callback) {

  var result = {};
  var dom = parseXML(xml);

  // error checking
  var errorElem=select(dom,"error pre problem")[0];
  if(errorElem && typeof errorElem!=typeof_undefined) {
    var errormsg=errorElem.children[0].data;
    console.log("handleNOAAunsummarized:  Invalid Request:  "+errormsg);
    return callback(Error("Invalid Request:  "+errormsg),null);
  }
  errorElem=select(dom,"error pre")[0];
  if(errorElem && typeof errorElem!=typeof_undefined) {
    var errormsg=errorElem.children[0].data;
    console.log("handleNOAAunsummarized:  Invalid Request:  "+errormsg);
    return callback(Error("Invalid Request:  "+errormsg),null);
  }

  // creation date
  //var now=new Date();
  //var cDateElem=getDate(select(dom,"creationdate"));
  //var cJsonDate=now.toJSON();
  //result.createdate = cJsonDate.substr(0,10);

  // effective date 
  //var eDateNode = select(dom,"data timelayout startvalidtime")[0];
  //var eDateElem = eDateNode.children[0];
  //var eDate = eDateElem["data"];
  //var eDateStr = eDate.substr(0,10);
  //result.effdate = eDateStr;

  // latitude and longitude 
  var pointElem = select(dom, "data location point")[0];
  result.lat = parseFloat(pointElem.attribs.latitude);
  result.lon = parseFloat(pointElem.attribs.longitude);

  // cloud amount
  var cloudAmountNodes = select(dom,"data parameters cloudamount value");
  var cloudArr=getIntDataArray(cloudAmountNodes,[]);
  result.cloudamount=getAvgArray(cloudArr);

  // windspeed 
  var windspeedNodes = select(dom,"data parameters windspeed value");
  var windArr=getIntDataArray(windspeedNodes,[]);
  result.windspeed=getAvgArray(windArr);

  // humidity
  var humidity = select(dom,"data parameters humidity");
  for (var _i=0; _i<humidity.length; _i++) {
    var humidityParentNode = humidity[_i];
    var humidityType=humidityParentNode.attribs.type;
    var humidityArr=getFloatDataArray(humidityParentNode,[]);
    if(humidityType=="maximumrelative") {
      result["humidity"+humidityType]=getMaxArray(humidityArr);
    } else if(humidityType=="minimumrelative") {
      result["humidity"+humidityType]=getMinArray(humidityArr);
    } else 
      result["humidity"+humidityType]=getAvgArray(humidityArr);
  }

  // temperature
  //var temp=select(dom,"data parameters temperature");
  //for (var _i=0; _i < temp.length; _i++) {
  //  var tempParentNode = temp[_i];
  //  var tempType=tempParentNode.attribs.type;
  //  var tempArr=getIntDataArray(tempParentNode,[]);
  //  if(tempType=="maximum") {
  //    result["temp"+tempType]=getMaxArray(tempArr);
  //  } else if(tempType=="minimum") {
  //    result["temp"+tempType]=getMinArray(tempArr);
  //  } else 
  //    result["temp"+tempType]=getAvgArray(tempArr);
  //}

  // precipitation, type=snow,liquid
  var precip=select(dom,"data parameters precipitation");
  for (var _i = 0; _i < precip.length; _i++) {
    var precipParentNode = precip[_i];
    var precipType=precipParentNode.attribs.type;
    var precipArr=getFloatDataArray(precipParentNode,[]);
    result["precip"+precipType]=getSumArray(precipArr);
  }

  console.log("handle_getWeather_Unsum:  result="+JSON.stringify(result));
  callback(null, result);
};

//----------------------------------------
// handleNOAAsummarized
// process NOAA summarized weather data 
//----------------------------------------

handleNOAAsummarized = function(xml, callback) {
  var result = {};
  var dom = parseXML(xml);

  // error checking
  var errorElem=select(dom,"error pre problem")[0];
  if(errorElem && typeof errorElem!=typeof_undefined) {
    var errormsg=errorElem.children[0].data;
    console.log("handleNOAAunsummarized:  Invalid Request:  "+errormsg);
    return callback(Error("Invalid Request:  "+errormsg),null);
  }
  errorElem=select(dom,"errormessage")[0];
  if(errorElem && typeof errorElem!=typeof_undefined) {
    var errormsg=errorElem.children[0].children[0].data;
    console.log("handleNOAAunsummarized:  Invalid Request:  "+errormsg);
    return callback(Error("Invalid Request:  "+errormsg),null);
  }

  // creation date
  //var now=new Date();
  //var cDateElem=getDate(select(dom,"creationdate"));
  //var cJsonDate=now.toJSON();
  //result.createdate = cJsonDate.substr(0,10);;

  // effective date 
  //var eDateNode = select(dom,"data timelayout startvalidtime")[0];
  //var eDateElem = eDateNode.children[0];
  //var eDate = eDateElem["data"];
  //var eDateStr = eDate.substr(0,10);
  //result.effdate = eDateStr;

  // latitutde and longitude 
  var pointElem = select(dom, "data location point")[0];
  result.lat = parseFloat(pointElem.attribs.latitude);
  result.lon = parseFloat(pointElem.attribs.longitude);

  // temperature
  var temp=select(dom,"data parameters temperature");
  for (var _i=0; _i < temp.length; _i++) {
    var tempParentNode = temp[_i];
    var tempType=tempParentNode.attribs.type;
    var tempArr=getIntDataArray(tempParentNode,[]);
    if(tempType=="maximum") {
      result["temp"+tempType]=getMaxArray(tempArr);
    } else if(tempType=="minimum") {
      result["temp"+tempType]=getMinArray(tempArr);
    } else 
      result["temp"+tempType]=getAvgArray(tempArr);
  }

  // probability of precipitation
  var probPrecipAM=0;
  var probPrecipPM=0;
  try {
    var probPrecipAMNode = select(dom,"data parameters probabilityofprecipitation value")[0];
    var probPrecipAMElem = probPrecipAMNode.children[0];
    probPrecipAM = parseFloat(probPrecipAMElem.data);
    var probPrecipPMNode = select(dom,"data parameters probabilityofprecipitation value")[1];
    var probPrecipPMElem = probPrecipPMNode.children[0];
    probPrecipPM = parseFloat(probPrecipPMElem.data);
  } catch (err) {} 
  result.probPrecipAM=probPrecipAM;
  result.probPrecipPM=probPrecipPM;

  // hazards if any
  //var hazardAMCode="";
  //var hazardPMCode="";
  var hazardAMPhenomena="";
  var hazardPMPhenomena="";
  try {
    var hazardAMNode = select(dom,"data parameters hazards hazardconditions hazard")[0];
    if(hazardAMNode != null) {
      //hazardAMCode = hazardAMNode.attribs["hazardCode"];
      hazardAMPhenomena = hazardAMNode.attribs["phenomena"];
    }
  } catch (err) {}
  try {
    var hazardPMNode = select(dom,"data parameters hazards hazardconditions hazard")[1];
    if(hazardPMNode != null) {
      //var hazardPMCode = hazardPMNode.attribs["hazardCode"];
      var hazardPMPhenomena = hazardPMNode.attribs["phenomena"];
    }
  } catch (err) {}
  result.hazardAMPhenomena=hazardAMPhenomena;
  result.hazardPMPhenomena=hazardPMPhenomena;
  //result.hazardAMCode = hazardAMCode;
  //result.hazardPMCode = hazardPMCode;

  // weather summary string 
  var weatherSummary="";
  try {
    var weatherSummaryNode = select(dom,"data parameters weather weatherconditions")[0];
    weatherSummary=weatherSummaryNode.attribs["weather-summary"];
  } catch (err) {}
  result.weathersummary=weatherSummary;

  console.log("handleNOAAsummarized:  result="+JSON.stringify(result));
  callback(null, result);
};

//-----------------------------------
// convert  
//-----------------------------------
addZ = function(n) { 
  return n<10? '0'+n:''+n; 
}

valueParserInt = function(dom) {
  var text, value;
  text = getText(dom);
  value = parseInt(text, 10);
  if (isNaN(value)) {
    value = 0;
  }
  return value;
};

valueParserFloat = function(dom) {

  var text = getText(dom);
  var value = parseFloat(text);
  if (isNaN(value)) {
    value = 0.0;
  }
  return value;
};

//----------------------------------
// parse dom for value types 
//----------------------------------

getTimeLayouts = function(dom) {
  var key, layoutElement, layoutElements, result, timeElements, times, _i, _len;
  result = {};
  layoutElements = select(dom, "timelayout");
  for (_i = 0, _len = layoutElements.length; _i < _len; _i++) {
    layoutElement = layoutElements[_i];
    key = getText(select(layoutElement, "layoutkey"));
    timeElements = select(layoutElement, "startvalidtime");
    times = _.map(timeElements, function(timeElement) {
      return getDate(timeElement);
    });
    result[key] = times;
  }
  return result;
};

getDate = function(nodes) {
  var result;

  var text = getText(nodes);
  var date = new Date(text);
  try {
    result=date.toISOString().replace("T", " ");
  } catch (err) {
    console.log("getDate:  ERROR:  failed to parse Date  err="+err+"   nodes="+JSON.stringify(nodes));
    result=null;
  }
  return result;
};

getText = function(nodes, result) {

  if (!util.isArray(nodes)) {
    nodes = [nodes];
  }
  result = result || "";
  var _len=nodes.length;
  for (var _i = 0; _i < _len; _i++) {
    var node = nodes[_i];
    if (node.type === "text") {
      var v=node.data;
      result += v;
    }
    if (node.children != null) {
      result = getText(node.children, result);
    }
  }
  return result;
};

getIntDataArray = function(nodes, result) {

  if (!util.isArray(nodes)) {
    nodes = [nodes];
  }
  var _len=nodes.length;
  for (var _i = 0; _i < _len; _i++) {
    var node = nodes[_i];
    if (node.type === "text") {
      var v=parseInt(node.data);
      if(!isNaN(v))
        result.push(v);
    }
    if (node.children != null) {
      result = getIntDataArray(node.children, result);
    }
  }
  return result;
}

getFloatDataArray = function(nodes, result) {

  if (!util.isArray(nodes)) {
    nodes = [nodes];
  }
  var _len=nodes.length;
  for (var _i = 0; _i < _len; _i++) {
    var node = nodes[_i];
    if (node.type === "text") {
      var v=parseFloat(node.data);
      if(!isNaN(v))
        result.push(v);
    }
    if (node.children != null) {
      result = getFloatDataArray(node.children, result);
    }
  }
  return result;
}

//----------------------------------
// compute Avg,Sum,Min, or Max 
//----------------------------------

getAvgArray = function(arr) {
  var entries=0;
  var total=0;

  if(arr && typeof arr!=typeof_undefined) {
    arr.forEach(function(entry) {
      if(entry && typeof entry!=typeof_undefined) {
        entries++;
        amount=entry;
      } else 
        amount=0;
      if(typeof amount==typeof_number)
        total+=amount;
    });
  } else {
    console.log("getAvgArray:  arr is undefined");
  }

  var avg;
  try {
    avg = total/entries;
  } catch(err) {
    console.log("getAvgArray:  WARN failed to compute avg, total="+total+"  entries="+entries);
    avg=0;
  }

  return avg;
}

getSumArray = function(arr) {

  var total=0;

  if(arr && typeof arr!=typeof_undefined) {
    arr.forEach(function(entry) {
      if(entry && typeof entry!=typeof_undefined) {
        amount=entry;
      } else 
        amount=0;
      if(typeof amount==typeof_number)
        total+=amount;
    });
  } else {
    console.log("getSumArray:  arr is undefined");
  }

  return total;
}

getMaxArray = function(arr) {
  var max=0;
  var foundOne=false

  if(arr && typeof arr!=typeof_undefined) {
    arr.forEach(function(entry) {
      if(entry && typeof entry!=typeof_undefined) {
        amount=parseInt(entry);
        if(!foundOne) {
          foundOne=true;
          max=amount;
        } else if(amount>max) {
          max=amount;
        }
      } else 
        amount=0;
    });
  } else {
    console.log("getMaxArray:  arr is undefined");
  }

  if(!foundOne) 
    return null;
  else
    return max;
}

getMinArray = function(arr) {
  var min=0;
  var foundOne=false

  if(arr && typeof arr!=typeof_undefined) {
    arr.forEach(function(entry) {
      if(entry && typeof entry!=typeof_undefined) {
        amount=parseInt(entry);
        if(!foundOne) {
          foundOne=true;
          min=amount;
        } else if(amount<min) {
          min=amount;
        }
      } else 
        amount=0;
    });
  } else {
    console.log("getMinArray:  arr is undefined");
  }

  if(!foundOne) 
    return null;
  else
    return min;
}

//----------------------------------
// findElements
//----------------------------------

findAttribs = function(nodes, tag, result) {

  if(!_isArray(nodes)) nodes=[nodes];
  result = result || [];

  if(nodes && typeof nodes!=typeof_undefined) {
    nodes.forEach(function (n) {
      if(n && typeof n!=typeof_undefined) 
        if(n.attribs && typeof n.attribs!=typeof_undefined)
          if(n.attribs)
            findAttribs(n.attribs,tag,result);
          if(n.attribs[tag] && n.attribs[tag]!=undefined) 
            result.push(n.attribs[tag]);
        findAttribs(n.children,tag,result);
    });
  }
  return result;
};

findElements = function(nodes, tag, result) {

  result = result || [];
  var _len=nodes.length;
  for (var _i = 0; _i < _len; _i++) {
    var node = nodes[_i];
    if (node && node.type == "tag") {
      if (node.name && node.name == tag) {
        console.log("node="+JSON.stringify(node));
        result.push(node);
      }
    }
    if (node.children != null) {
      findElements(node.children, tag, result);
    }
  }
  return result;
};

findElement = function(nodes, tag, result) {

  var elements = findElements(nodes, tag);
  return elements[0];
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

//----------------------------------
// getHttp
// http client requests
//----------------------------------

function getHttp(url, callback) {

  var urlParsed = URL.parse(url);
  var request = http.request(urlParsed);
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

