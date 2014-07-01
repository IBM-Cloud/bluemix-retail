//--------------------------------------------
// Client-Side Angular App
//--------------------------------------------

'use strict';

//------------------------
// static constants
//------------------------
var iconBase='https://maps.google.com/mapfiles/kml/shapes/';
var giconBase='http://maps.google.com/mapfiles/ms/icons/';
var liconBase="img/icons/";

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

//---------------------
// angular app
//---------------------
var app = angular.module('app',[
    'ngResource',
    'ngRoute',
    'google-maps',
    'app.districtModule',
    'app.alertModule'
    ])
    .config(['$routeProvider',
      function($routeProvider) {
        $routeProvider.
          when('/district', {
            templateUrl: '../../partial/district.html',
            controller: 'MainController'
          }).
          when('/alerts', {
            templateUrl: '../../partial/alert.html',
            controller: 'MainController'
          }).
          when('/forecast', {
            templateUrl: '../../partial/forecast.html',
            controller: 'MainController'
          }).
          otherwise({
            templateUrl: '../../partial/district.html',
            controller: 'MainController'
            //redirectTo: '../../index.html'
          });
      }]);

app.controller('MainController', function($scope,$route,$timeout,districtFactory,alertFactory) {

    console.log("INITIALIZING MainController");

    var initTime=5000;
    var refreshTime=10000;

    // scope variables
    if(typeof $scope.district=='undefined')
        $scope.district={};
    if(typeof $scope.overridesCurrent=='undefined')
        $scope.overridesCurrent=[];
    if(typeof $scope.overrides=='undefined')
        $scope.overrides=[];

    if(typeof $scope.storelist=='undefined')
        $scope.storelist={};
    if(typeof $scope.alertlist=='undefined')
        $scope.alertlist={};
    if(typeof $scope.sstore=='undefined')
        $scope.sstore; 

    if(typeof $scope.map=='undefined') {
        console.log('INITIALIZING $scope.map');
        $scope.map = {
            center: {
                latitude: 36.029414,
                longitude:-78.918137 
            },
            zoom: 8,
            //events: {
            //    tilesloaded: function (map) {
            //        $scope.$apply(function () {
            //            $scope.mapInstance = map;           
            //        });
            //    }
            //},
            //markers: []
        };
    }

    var mapOptions = {
        zoom: 8,
        center: new google.maps.LatLng(36.029414, -78.918137),
        mapTypeId: google.maps.MapTypeId.TERRAIN
    }

    if(typeof $scope.markers=='undefined')
        $scope.markers = [];

    $scope.onMarkerClicked = function (marker) {
        console.log("CLICKED on marker.  marker.title="+marker.title);
        marker.showWindow=true;
        $scope.$apply();
        //_.each($scope.map.markers, function (mker) {
        //    mker.showWindow = false;
        //});

        //marker.showWindow = true;
    };

    //-----------------------------------
    // Refresh / Initialize  
    //-----------------------------------

    setInterval(function () {
        $scope.$apply(refresh());
    }, refreshTime);

    function refresh() {

        // override change
        if(!(JSON.stringify($scope.overrides)==JSON.stringify($scope.overridesCurrent))) {
            console.log("overrides changed");
            buildMap();
            $scope.overridesCurrent=$scope.overrides;
        }

        var lalert=alertFactory.get();
        lalert.$promise.then(function (data) {
            var changed=typeof $scope.alertlist === 'undefined';
            if (!changed) {
                changed=!(JSON.stringify($scope.alertlist) === JSON.stringify(data.list));
            }
            if (changed) {
                $scope.alertlist=data.list;
            }
        });

        var ldistrict=districtFactory.get();
        ldistrict.$promise.then(function(data) {
            var changed=typeof $scope.district === 'undefined';
            if(!changed) {
                changed=!(JSON.stringify($scope.district)==JSON.stringify(data));
            }
            if(changed) {
                $scope.district=data;
                $scope.storelist=data.list;
                buildMap();
            }
        });
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

    //-----------------------------------
    // $scope functions
    //-----------------------------------

    $scope.weatherOverride = function() {
        console.log('in weatherOverride');
        console.log("weatherOverride:  sstore="+JSON.stringify($scope.sstore));
        console.log("weatherOverride:  salert="+$scope.salert);
        var override = { number: $scope.sstore.number, alert: $scope.salert };
        console.log("pushing override="+JSON.stringify(override));
        $scope.overrides.push(override);
    }

    $scope.runForecast = function() {
        console.log('in runForecast');
        console.log("runForecast:  sstore="+JSON.stringify($scope.sstore));
        console.log("runForecast:  sftype="+$scope.sftype);
    }

    //-----------------------------------
    // buildMap
    //-----------------------------------

    function buildMap() {

        if(varInit($scope.district)) {

            var map = {
                center: {
                    latitude: 36.029414,
                    longitude:-78.918137 
                },
                zoom: 8,
            };

            var markers=[];
            var clickmarkers=[];
            for(var i=0;i<$scope.district.list.length;i++) {
                var store=$scope.district.list[i];

                // overrides 
                for (var j=0;j<$scope.overrides.length;j++) {
                    if (store.number === $scope.overrides[j].number) {
                        console.log("overrides["+j+"].number="+$scope.overrides[j].number);
                        console.log("alert="+$scope.overrides[j].alert);
                        store.alert=$scope.overrides[j].alert;
                    }
                }

                var icon;
                if((store.alert==="No Alert") || (store.alert==="No Alerts"))
                    icon='img/icons/green-dot.png'
                else 
                    icon='img/icons/red-dot.png';
                var marker = { id: i+1, 
                    icon: icon, 
                    coords:  [ store.latitude, store.longitude ],
                    latitude: store.latitude,
                    longitude: store.longitude, 
                    showWindow: false, 
                    title: "#"+store.number,
                    alert: store.alert,
                    content: '<div class="infoWindowContent">'+ store.number +'</div>'
                };
                var clickmarker = {
                    id: i+1,
                    latitude: store.latitude,
                    longitude: store.longitude
                };
                markers[i]=marker;
                clickmarkers[i]=clickmarker;

            };

            map['markers']=markers;
            map['clickMarkers']=clickmarkers;

            $scope.markers=markers;
            $scope.map=map;


            console.log("$scope.markers="+JSON.stringify($scope.markers));
            console.log("$scope.map="+JSON.stringify($scope.map));
        }
    }

});

//-----------------------------
// angular controllers
//-----------------------------



//-----------------------------
// angular modules
//-----------------------------

angular.module('app.districtModule',['ngResource'])
    .factory('districtFactory',function($resource) {
        console.log("in districtFactory");
        return $resource('http://bluemix-retail-26760.mybluemix.net/api/v1/district');
    })
    .value('version','0.1');

angular.module('app.alertModule',['ngResource'])
    .factory('alertFactory',function($resource) {
        console.log("in alertFactory");
        return $resource('http://bluemix-retail-26760.mybluemix.net/api/v1/alertsDB');
    })
    .value('version','0.1');
