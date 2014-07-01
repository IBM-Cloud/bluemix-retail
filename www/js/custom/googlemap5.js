// The following creates complex markers for stores in a district. 

var iconBase='https://maps.google.com/mapfiles/kml/shapes/';
var giconBase='http://maps.google.com/mapfiles/ms/icons/';

var icons = {
  parking: {
    name: 'parking',
    icon: iconBase + 'parking_lot_maps.png'
  },
  number:  {
    name: 'number',
    icon:  [ giconBase + 'icon0.png', giconBase + 'icon1.png', giconBase + 'icon2.png', 
      giconBase + 'icon3.png', giconBase + 'icon4.png', giconBase + 'icon5.png', 
      giconBase + 'icon6.png', giconBase + 'icon7.png', giconBase + 'icon8.png', 
      giconBase + 'icon9.png', giconBase + 'icon10.png' ],
    shadow:  [ giconBase + 'icon0.png', giconBase + 'icon1s.png', giconBase+'icon2s.png', 
      giconBase + 'icon3s.png', giconBase + 'icon4s.png', giconBase + 'icon5s.png', 
      giconBase + 'icon6s.png', giconBase + 'icon7s.png', giconBase + 'icon8s.png', 
      giconBase  + 'icon9s.png',giconBase + 'icon10s.png' ],
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
var stores;
var map;

function initializeMap() {

  var mapOptions = {
    zoom: 10,
    // center: new google.maps.LatLng(-33.9, 151.2)
    center:  new google.maps.LatLng(35.9, -78.9)
  }
  map = new google.maps.Map(document.getElementById('map-canvas'),
                                mapOptions);
  stores=getStoreArray();

  setMarkers(map, stores);
}

function setMarkers(map, locations) {
  // Add markers to the map

  // Marker sizes are expressed as a Size of X,Y
  // where the origin of the image (0,0) is located
  // in the top left of the image.

  // Origins, anchor positions and coordinates of the marker
  // increase in the X direction to the right and in
  // the Y direction down.
  var image = {
    url: 'img/beachflag.png',
    // This marker is 20 pixels wide by 32 pixels tall.
    size: new google.maps.Size(20, 32),
    // The origin for this image is 0,0.
    origin: new google.maps.Point(0,0),
    // The anchor for this image is the base of the flagpole at 0,32.
    anchor: new google.maps.Point(0, 32)
  };
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
    var type='brand';
    var marker = new google.maps.Marker({
        position: myLatLng,
        map: map,
        icon: icons[type].icon,
        shape: shape,
        title: location[0],
        zIndex: location[3]
    });
  }
}

google.maps.event.addDomListener(window, 'load', initializeMap);