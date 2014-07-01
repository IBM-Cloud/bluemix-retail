# Google Maps 

function computeCenterLatLong() {

  var sumlat=0;
  var sumlong=0;

  for (var i=0;i<district.storelist;i++) { 
    var  store=district.storelist[i];
    console.log("store="+JSON.stringify(store));
    sumlat=sumlat+store.latitude;
    sumlong=sumlong+store.longitude;
  }

  var avglat=sumlat/district.storelist.length;
  var avglong=sumlong/district.storelist.length;

  var centerLatLong = new google.maps.LatLng(avglat,avglong);

  return centerLatLong;
}

function computeMinLatLong() {

  var lat=district.storelist[0].latitude;
  var lng=district.storelist[0].longitude;

  for (var i=0;i<district.storelist;i++) { 
    var  store=district.storelist[i];
    if(store.latitude<lat)
      lat=store.latitude;
    if(store.longitude<lng)
      lng=store.longitude;
  }

  var minLatLong = new google.maps.LatLng(lat,lng);

  return minLatLong;
}

function computeMaxLatLong() {

  var lat=district.storelist[0].latitude;
  var lng=district.storelist[0].longitude;

  for (var i=0;i<district.storelist;i++) { 
    var  store=district.storelist[i];
    if(store.latitude>lat)
      lat=store.latitude;
    if(store.longitude>lng)
      lng=store.longitude;
  }

  var maxLatLong = new google.maps.LatLng(lat,lng);

  return maxLatLong;
}

function buildContentString(store) {
  var contentString = '<div class="info_content">'+
    '<p><strong>'+store.name+'</strong><br>'+
    store.saddr+'<br>'+
    store.city+', ' +store.state+' '+store.zip+'<br>'+
    'P: '+store.phone+'</p>' +
    '</div>';  

  return contentString;
}

function buildMarker(store) {
  var storeLatLong=new google.maps.LatLng(store.latitude,store.longitude);

  var marker = new google.maps.Marker({
    position: storeLatLong,
    map: map,
    title:store.name,
      maxWidth: 200,
      maxHeight: 200
  });

  return marker;
}

function computeMarkers() {
  var storemarkers=new Array();
  for (var i=0;i<district.storelist.length;i++) {
    var store=district.storelist[i];

    storemarkers[i]=new Array('#'+store.number,store.latitude,store.longitude);
  }

  var markers1 = [
        ['London Eye, London', 51.503454,-0.119562],
        ['Palace of Westminster, London', 51.499633,-0.124755]
    ];

  var markers2 = [
    ['location 1', 53.47921, -1.00201],
    ['location 2', 53.50726,-1.04641],
    ['location 3', 53.48313,-1.01016],
    ['location 4', 53.48197,-1.00954],
    ['location 5', 53.48319,-1.00842]
  ];

  var markers = [ 
    [ '#3632', 36.029414, -78.918137 ],
    [ '#3620', 35.949723, -78.993268 ],
    [ '#3661', 36.074237, -79.109901 ],
    [ '#3634', 35.899285, -78.654393 ],
    [ '#3644', 35.750329, -78.879471 ],
    [ '#3647', 35.971657, -78.542848 ],
    [ '#3615', 35.756392, -78.739065 ]
  ];

  console.log("markers="+markers);
  console.log("storemarkers="+storemarkers);
  return markers;
}

function computeInfoWindowContent() {
  var infocontents=new Array();
  for (var i=0;i<district.storelist.length;i++) {
    var store=district.storelist[i];

    var content=buildContentString(store);
    infocontents[i]=content;
  }

  var infoWindowContent = [
       ['<div class="info_content">' +
        '<h3>London Eye</h3>' +
        '<p>The London Eye is a giant Ferris wheel situated on the banks of the River Thames. The entire structure is 135 metres (443 ft) tall and the wheel has a diameter of 120 metres (394 ft).</p>' +        '</div>'],
        ['<div class="info_content">' +
        '<h3>Palace of Westminster</h3>' +
        '<p>The Palace of Westminster is the meeting place of the House of Commons and the House of Lords, the two houses of the Parliament of the United Kingdom. Commonly known as the Houses of Parliament after its tenants.</p>' +
        '</div>']
    ];

  console.log("infocontents="+infocontents);
  console.log("infoWindowContent="+infoWindowContent);
  return infoWindowContent;
}

function initializeMap() {

  var centerLatLong = computeCenterLatLong();
  var mapOptions = {
    center: centerLatLong,
    zoom: 7,
    mapTypeControl: false,
    center:centerLatLong,
    panControl:false,
    rotateControl:false,
    streetViewControl: false,
    mapTypeId: google.maps.MapTypeId.ROADMAP
  };
  var bounds = new google.maps.LatLngBounds();

  map = new google.maps.Map(document.getElementById("map-canvas"),
      mapOptions);
  map.setTilt(45);

  var markers=computeMarkers();
  var infoWindowContent=computeInfoWindowContent();

  //    var markers = [
  //      ['London Eye, London', 51.503454,-0.119562],
  //      ['Palace of Westminster, London', 51.499633,-0.124755]
  //  ];
                        
    // Info Window Content
  //  var infoWindowContent = [
  //      ['<div class="info_content">' +
  //      '<h3>London Eye</h3>' +
  //      '<p>The London Eye is a giant Ferris wheel situated on the banks of the River Thames. The entire structure is 135 metres (443 ft) tall and the wheel has a diameter of 120 metres (394 ft).</p>' +        '</div>'],
  //      ['<div class="info_content">' +
  //      '<h3>Palace of Westminster</h3>' +
  //      '<p>The Palace of Westminster is the meeting place of the House of Commons and the House of Lords, the two houses of the Parliament of the United Kingdom. Commonly known as the Houses of Parliament after its tenants.</p>' +
  //      '</div>']
  //  ];
  //  console.log("storecontents="+JSON.stringify(storecontents));
  //  console.log("storemarkers="+JSON.stringify(storemarkers));
  //  storemarkers=markers;
  //  storecontents=infoWindowContent;

  // Display multiple markers on map 
  var infoWindow=new google.maps.InfoWindow(), marker, i;

  // Loop thru array of markers and place on map 
  for(i=0;i<markers.length;i++) {
    var position = new google.maps.LatLng(markers[i][1],
      markers[i][2]);
    bounds.extend(position);
    marker=new google.maps.Marker({
      position: position,
      map: map,
      title: markers[i][0]
    });

    // Allow each marker to have an info window    
    google.maps.event.addListener(markers, 'click', (function(marker, i) {
      return function() {
        infoWindow.setContent(infoWindowContent[i][0]);
        infoWindow.open(map, marker);
      }
    })(marker, i));

    // Automatically center the map fitting all markers on the screen
    map.fitBounds(bounds);   

    // Override our map zoom level once our fitBounds function runs (Make sure it only runs once)
    var boundsListener = google.maps.event.addListener((map), 'bounds_changed', function(event) {
        this.setZoom(14);
        google.maps.event.removeListener(boundsListener);
    });

  }
}

function initialize() {
    var centerLatlng = computeCenterLatLong();   // new google.maps.LatLng(53.47921, -1.00201);
    // mapOptions - required:  zoon, center, mapTypeId
    var mapOptions = {
        zoom: 10,
        center: centerLatlng,
        //mapTypeId: google.maps.MapTypeId.ROADMAP
    };

    map = new google.maps.Map(
            document.getElementById('map-canvas'), mapOptions);
  
    map.setTilt(45);
    
    var bounds = new google.maps.LatLngBounds();
    var SW = computeMinLatLong(); // new google.maps.LatLng(53.47921, -1.05);
    var NE = computeMaxLatLong(); // new google.maps.LatLng(53.50726, -1.001);
    bounds.union(SW,NE);
    
    // Car Parks
    var markers2 = [
        ['location 1', 53.47921, -1.00201],
        ['location 2', 53.50726,-1.04641],
        ['location 3', 53.48313,-1.01016],
        ['location 4', 53.48197,-1.00954],
        ['location 5', 53.48319,-1.00842]
    ];

    var markers3 = [ 
    [ '#3632', 36.029414, -78.918137 ],
    [ '#3620', 35.949723, -78.993268 ],
    [ '#3661', 36.074237, -79.109901 ],
    [ '#3634', 35.899285, -78.654393 ],
    [ '#3644', 35.750329, -78.879471 ],
    [ '#3647', 35.971657, -78.542848 ],
    [ '#3615', 35.756392, -78.739065 ]
  ];
    var markers=computeMarkers();

    var infoWindowContent = [
        '<div class="info_content">' + '<strong>text 1</strong>' + '</div>',
        '<div class="info_content">' + '<strong>text 2</strong>' + '</div>',
        '<div class="info_content">' + '<strong>text 3</strong>' + '</div>',
        '<div class="info_content">' + '<strong>text 4</strong>' + '</div>',
        '<div class="info_content">' + '<strong>text 5</strong>' + '</div>',
        '<div class="info_content">' + '<strong>text 4</strong>' + '</div>',
        '<div class="info_content">' + '<strong>text 5</strong>' + '</div>'
    ];
      
    // set markers 
    for (i = 0; i < markers.length; i++ ) {
        var position = new google.maps.LatLng(markers[i][1], markers[i][2]);
        
        var marker = new google.maps.Marker({
            position: position,
            map: map,
            title: markers[i][0],
            zIndex:  i
        });

        addInfoWindow(marker, infoWindowContent[i], map);
    }
    
    map.fitBounds(bounds);

    // Override our map zoom level once our fitBounds function runs 
    // (Make sure it only runs once)
    var boundsListener = google.maps.event.addListener(
        (map), 'bounds_changed', function(event) {
            this.setZoom(13);
            google.maps.event.removeListener(boundsListener);
    });
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
    var beach = locations[i];
    var myLatLng = new google.maps.LatLng(beach[1], beach[2]);
    var marker = new google.maps.Marker({
        position: myLatLng,
        map: map,
        icon: image,
        shape: shape,
        title: beach[0],
        zIndex: beach[3]
    });
  }
}

function addInfoWindow(marker, message, map) {

    var infoWindow = new google.maps.InfoWindow({
        content: message
    });

    google.maps.event.addListener(marker, 'click', function () {
        infoWindow.open(map, marker);
    });
}

google.maps.event.addDomListener(window, 'load', initialize);


//google.maps.event.addDomListener(window, 'load', initializeMap);
  
//start of modal google map
<!--
$('#mapmodals').on('shown.bs.modal', function () {
    google.maps.event.trigger(map, "resize");
    map.setCenter(myLatlng);
}); 
-->
    //end of modal google map 