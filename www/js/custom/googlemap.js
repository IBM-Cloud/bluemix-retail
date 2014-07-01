// The following creates complex markers for stores in a district. 

// icon defaults
var iconBase='https://maps.google.com/mapfiles/kml/shapes/';
var giconBase='http://maps.google.com/mapfiles/ms/icons/';
var liconBase="img/icons/";

// user marker event constants
var EVENT_CLICK='click';
var EVENT_DBLCLICK='dblclick';
var EVENT_MOUSEUP='mouseup';
var EVENT_MOUSEDOWN='mousedown';
var EVENT_MOUSEOVER='mouseover';
var EVENT_MOUSEOUT='mouseout';

var icons = {
  parking: {
    name: 'parking',
    icon: iconBase + 'parking_lot_maps.png'
  },
  number:  {
    name: 'number',
    icon:  [ liconBase + 'number_0.png', liconBase + 'number_1.png', liconBase + 'number_2.png', 
      liconBase + 'number_3.png', liconBase + 'number_4.png', liconBase + 'number_5.png', 
      liconBase + 'number_6.png', liconBase + 'number_7.png', liconBase + 'number_8.png', 
      liconBase + 'number_9.png', liconBase + 'number_10.png' ],
  },
  brand: {
    name: 'brand',
    icon:  giconBase + 'orange-dot.png'
  },
  one: {
    name: 'one',
    icon: giconBase + 'icon1.png'
  },
  noalert: {
    name: 'noalert',
    icon:  giconBase + 'green-dot.png'
  },
  alert : {
    name:  'alert',
    icon:  giconBase + 'red-dot.png'
  }
}

/**
 * Data for the markers consisting of a name, a LatLng and a zIndex for
 * the order in which these markers should display on top of each
 * other.
 */
var stores=null;
var districtmap=null;
var alertmap=null;

function initializeMap() {

  var mapOptions = {
    zoom: 9,
    // center: new google.maps.LatLng(-33.9, 151.2)
    center:  new google.maps.LatLng(35.9, -78.9)
  }

  try {
    districtmap = new google.maps.Map(document.getElementById('map-canvas'),
                                mapOptions);
  } catch (e) {} 
  try {
    alertmap = new google.maps.Map(document.getElementById('map-canvas-alert'),
                                mapOptions);
  } catch(e) {}
  stores=getStoreArray();

  if(districtmap !=null)
    setDistrictMarkers(districtmap, stores);
  if(alertmap !=null) 
    setAlertMarkers(alertmap, stores);
}

//locations == [[ number, store.latitude, store.longitude, store.alert, i ] ... [] ]
function setAlertMarkers(map, locations) {
  // Add markers to the map

  // Shapes define the clickable region of the icon.
  // The type defines an HTML &lt;area&gt; element 'poly' which
  // traces out a polygon as a series of X,Y points. The final
  // coordinate closes the poly by connecting to the first
  // coordinate.
  var shape = {
      coords: [1, 1, 1, 20, 18, 20, 18 , 1],
      type: 'poly'
  };
  for (var i = 0; i < locations.length; i++) {
    var location = locations[i];
    var myLatLng = new google.maps.LatLng(location[1], location[2]);
    var icon;
    if(location[3]==="No Alerts") 
      icon=icons['noalert'].icon;
    else 
      icon=icons['alert'].icon;
    var marker = new google.maps.Marker({
      position: myLatLng,
      map: map,
      icon: icon,
      shape: shape,
      title: location[0],
      zIndex: location[4]
    });
    
    attachAlertInfoMessage(marker,location[3]);
  }
}

// attach info message
function attachAlertInfoMessage(marker, msg) {
  var infowindow = new google.maps.InfoWindow({
    content: msg.toString()
  });

  google.maps.event.addListener(marker, 'click', function() {
    infowindow.open(marker.get('map'), marker);
    console.log("clicked on alert marker:"+marker.title);
  });
}


function alertClickEventHandler(marker) {
  console.log("clicked on alert marker"+marker.title);
}

//locations == [[ number, store.latitude, store.longitude, store.alert, i ] ... [] ]
function setDistrictMarkers(map, locations) {
  // Add markers to the map

  // Marker sizes are expressed as a Size of X,Y
  // where the origin of the image (0,0) is located
  // in the top left of the image.

  // Origins, anchor positions and coordinates of the marker
  // increase in the X direction to the right and in
  // the Y direction down.
  //var image = {
  //  url: 'img/beachflag.png',
    // This marker is 20 pixels wide by 32 pixels tall.
  //  size: new google.maps.Size(20, 32),
    // The origin for this image is 0,0.
  //  origin: new google.maps.Point(0,0),
    // The anchor for this image is the base of the flagpole at 0,32.
  //  anchor: new google.maps.Point(0, 32)
  //};
  // Shapes define the clickable region of the icon.
  // The type defines an HTML &lt;area&gt; element 'poly' which
  // traces out a polygon as a series of X,Y points. The final
  // coordinate closes the poly by connecting to the first
  // coordinate.
  var shape = {
      coords: [1, 1, 1, 20, 18, 20, 18 , 1],
      type: 'poly'
  };
  for (var i = 0; i < locations.length; i++) {
    var location = locations[i];
    console.log("location="+location);
    var myLatLng = new google.maps.LatLng(location[1], location[2]);
    var type='number';
    var icon= icons[type].icon[i+1];
    var marker = new google.maps.Marker({
        position: myLatLng,
        map: map,
        icon: icon,
        shape: shape,
        title: location[0],
        zIndex: location[4]
    });

    attachDistrictInfoMessage(marker,location[0]);
  }
}

function getStoreArray() {

    var len=district.length;

    var stores=[];
    for(var i=0;i<len;i++) {
        var store=district.list[i];
        var number="#"+store.number;
        var row = [ number, store.latitude, store.longitude, store.alert, i ]
        stores[i]=row;
    }

    return stores;
}

// attach district info message
function attachDistrictInfoMessage(marker, msg) {
  var infowindow = new google.maps.InfoWindow({
    content: msg.toString()
  });

  google.maps.event.addListener(marker, 'click', function() {
    infowindow.open(marker.get('map'), marker);
    console.log("clicked on district marker:"+marker.title);
  });
}

function districtClickEventHandler(marker) {
  console.log("clicked on district marker"+marker.title);
}

google.maps.event.addDomListener(window, 'load', initializeMap);