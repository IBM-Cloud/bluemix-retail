function initialize() { 

    var mapOptions = { center: new google.maps.LatLng(52.5167, 13.3833), zoom: 10, }; 
    var map = new google.maps.Map(document.getElementById("map-canvas"), mapOptions); 
    
} 

google.maps.event.addDomListener(window, 'load', initialize); 