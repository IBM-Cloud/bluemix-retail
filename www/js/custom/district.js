var district;
var districtInitialized=false;

function initializeDistrict() {

    var store3632 = { 
      "name": "Home Depot, North Durham #3632",
      "number":  "3632",
      "saddr":  "1700 N Pointe Dr",
      "city":  "Durham",
      "state":  "NC",
      "zip":  "27705",
      "phone":  "(919) 220-5811",
      "latitude":  36.029414,
      "longitude":  -78.918137,
      "alert": "Thunderstorm Warning"
    };

    var store3620 = {
        "name":  "Home Depot, Durham #3620",
        "number":  "3620",
        "saddr":  "3701 Mt Moriah Road",
        "city":  "Durham",
        "state":  "NC",
        "zip":  "27707",
        "phone":  "(919) 419-0208",
        "latitude": 35.949723,
        "longitude": -78.993268,
        "alert": "Tornado Warning"
    };

    var store3661 = {
        "name":  "Home Depot, Hillsborough, NC #3661",
        "number":  "3661",
        "saddr":  "625 Hampton Point Blvd",
        "city":  "Hillsborough",
        "state":  "NC",
        "zip":  "27278",
        "phone":  "(919) 254-0132",
        "latitude": 36.074237,
        "longitude": -79.109901,
        "alert": "No Alerts"
    };

    var store3634 = {
        "name": "Home Depot, Nw Raleigh #3634",
        "number":  "3634",
        "saddr":  "9517 Strickland Rd",
        "city":  "Raleigh",
        "state":  "NC",
        "zip":  "27615",
        "phone":  "(919) 844-7418",
        "latitude": 35.899285,
        "longitude": -78.654393,
        "alert": "No Alerts"
    };

    var store3644 = {
        "name":  "Home Depot, Apex #3644",
        "number":  "3644",
        "saddr": "1000 Vision Dr",
        "city":  "Apex",
        "state":  "NC",
        "zip":  "27523",
        "phone":  "(919) 387-6554",
        "latitude": 35.750329,
        "longitude": -78.879471,
        "alert": "Severe Thunderstorm Warning"
    };

    var store3647 = {
        "name":  "Home Depot, Wake Forest #3647",
        "number":  "3647",
        "saddr":  "11915 Retail Drive",
        "city":  "Wake Forest",
        "state":  "NC",
        "zip":  "27587",
        "phone": "(919) 562-2202",
        "latitude": 35.971657,
        "longitude": -78.542848,
        "alert": "No Alerts"
    };

    var store3615 = {
        "name":  "Home Depot, Cary #3615",
        "number": "3615",
        "saddr":  "2031 Walnut Street",
        "city":  "Cary",
        "state":  "NC",
        "zip":  "27518",
        "phone":  "(919) 851-5554",
        "latitude": 35.756392,
        "longitude": -78.739065,
        "alert": "No Alerts"
    };

    var stores = [ store3632, store3615, store3647, store3644, store3647, store3634, store3661, store3620 ];

    district = {
      "company":  "Home Depot, Inc.",
      "name" : "District #8724",
      "number" : 8724,
      "list" : stores,
      "length":  stores.length
    };

    for(var i=0;i<district.length;i++) {
        district.list[i].index=i;
    }

    districtInitialized=true;
}

function getDistrictLength() {

    if(!districtInitialized) 
        initializeDistrict();

    return district.length;
}

function getStore(number) {

    if(!districtInitialized) 
        initializeDistrict();
    var store = district.storelist[number];

    return store;
}

function getStoreArray() {

    if(!districtInitialized) 
        initializeDistrict();

    var stores=[];
    for(var i=0;i<getDistrictLength();i++) {
        var store=district.list[i];
        var number="#"+store.number;
        var row = [ number, store.latitude, store.longitude, store.alert, i ]
        stores[i]=row;
    }

    return stores;
}

function districtListHTML() {

    if(!districtInitialized) 
        initializeDistrict();

    var dl="<ol>";
    for(var i=0;i<district.length;i++) {
        var store=district.list[i];
        dl+="<li><address>";
        dl+="<strong>"+store.name+"</strong><br>";
        dl+=store.saddr+"<br>";
        dl+=store.city+", "+store.state+" "+store.zip+"<br>";
        dl+="<abbr title=\"Phone\">P:</abbr> "+store.phone+"<br>";
        dl+="</address>";
    }

    return dl;
}



function alertListHTML() {

    if(!districtInitialized) 
    initializeDistrict();

    var dl="<ol>";
    for(var i=0;i<district.length;i++) {
        var store=district.list[i];
        dl+="<li><strong>"+store.name+"</strong><br>";
        dl+="<p>"+store.alert+"<br>";
    }
    dl+="</ol>";

    console.log("alertListHTML:  dl="+dl);

    return dl;
}

// set HTML on page if section exists
try {
    document.getElementById("districtlistHTML").innerHTML = districtListHTML();
} catch (e) {
}
try {
    document.getElementById("alertlistHTML").innerHTML = alertListHTML();
} catch(e) {
}

