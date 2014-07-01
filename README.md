installation
--------------------------------------------------------------------------------

Create 2 Cloudant databases named alerts and districts. 
Create API keys for each and give them admin rights.
Note your Cloudant URL, e.g. https://<username>.cloudant.com, and database API key and password values.
From your command line

	git clone https://github.com/CodenameBlueMix/bluemix-retail.git
	make install
	
Supply configuration parameters as prompted

usage
--------------------------------------------------------------------------------

http://hello-weather.ng.bluemix.net/api/v1/weather-by-zip/<zip>.json?year=2014&month=4&day=28 

http://hello-weather.ng.bluemix.net/api/v1/weather-by-geo/<lat>,<lon>.json?year=2014&month-4&day=28

Note:  date must be within 7 days of current date 

hello-weather
================================================================================

node library and server/web app providing weather data from 

	http://graphical.weather.gov/xml/rest.php

NDFD database: 

	http://graphical.weather.gov/xml/docs/elementInputNames.php

	http://www.nws.noaa.gov/ndfd/technical.htm#elements

result
--------------------------------------------------------------------------------
JSON structure.  For example:  

{
  "createdate": "2014-04-22",
  "effdate": "2014-04-27",
  "lat": 61.22,
  "lon": -149.85,
  "tempmaximum": 50,
  "tempminimum": 34,
  "probPrecipAM": 22,
  "probPrecipPM": 20,
  "hazardAMPhenomena": "",
  "hazardPMPhenomena": "",
  "hazardAMCode": "",
  "hazardPMCode": "",
  "weathersummary": "Chance Rain"
}

weathertype:  

<ul>
<li>"freezing drizzle"</li>
<li>"freezing rain"</li>
<li>"snow showers"</li>
<li>"blowing snow"</li>
<li>"blowing dust"</li>
<li>"rain showers"</li>
<li>"ice pellets"</li>
<li>"frost"</li>
<li>"rain"</li>
<li>"hail"</li>
<li>"snow"</li>
<li>"thunderstorms"</li>
<li>"drizzle"</li>
<li>"fog"</li>
<li>"haze"</li>
<li>"smoke"</li>
<li>"freezing spray"</li>
<li>"ice fog"</li>
<li>"freezing fog"</li>
<li>"water spouts"</li>
<li>"volcanic ash"</li>
<li>"ice crystals"</li>
<li>"blowing sand"</li>
</ul>

weathersummary:  (partial list)

<ul>
<li>"Partly Sunny"</li>
</ul>

hazard phenomena:

<ul>
<li>"Ashfall"</li>
<li>"Air Quality"</li>
<li>"Air Stagnation"</li>
<li>"Blowing Snow"</li>
<li>"Brisk Wind"</li>
<li>"Blizzard"</li>
<li>"Coastal Flood"</li>
<li>"Dust Storm"</li>
<li>"Blowing Dust"</li>
<li>"Excessive Cold"</li>
<li>"Excessive Heat"</li>
<li>"Excessive Wind"</li>
<li>"Areal Flood"</li>
<li>"Flash Flood"</li>
<li>"Dense Fog"</li>
<li>"Flood"</li>
<li>"Frost"</li>
<li>"Red Flag"</li>
<li>"Fire Weather"</li>
<li>"Freeze"</li>
<li>"Gale"</li>
<li>"Hurricane Force Wind"</li>
<li>"Hurricane Wind"</li>
<li>"Heavy Snow"</li>
<li>"Heat"</li>
<li>"Hurricane"</li>
<li>"High Wind"</li>
<li>"Hard Freeze"</li>
<li>"Sleet"</li>
<li>"Ice Storm"</li>
<li>"Lake Effect Snow and Blowing Snow"</li>
<li>"Lake Effect Snow"</li>
<li>"Low Water"</li>
<li>"Lakeshore Flood"</li>
<li>"Lake Wind"</li>
<li>"Marine"</li>
<li>"Special Marine"</li>
<li>"Small Craft, for Rough Bar"</li>
<li>"Snow and Blowing Snow"</li>
<li>"Small Craft"</li>
<li>"Hazardous Seas"</li>
<li>"Small Craft, for Winds"</li>
<li>"Dense Smoke"</li>
<li>"Snow"</li>
<li>"Storm"</li>
<li>"High Surf"</li>
<li>"Severe Thunderstorm"</li>
<li>"Small Craft, for Hazardous Seas"</li>
<li>"Tropical Storm Wind"</li>
<li>"Tornado"</li>
<li>"Tropical Storm"</li>
<li>"Tsunami"</li>
<li>"Typhoon"</li>
<li>"Freezing Spray"</li>
<li>"Wind Chill"</li>
<li>"Wind"</li>
<li>"Winter Storm"</li>
<li>"Winter Weather"</li>
<li>"Freezing Fog"</li>
<li>"Freezing Rain"</li>
<li>"Record High Temperature Possible"</li>
<li>"Record Low Temperature Possible"</li>
<li>"none"</li>
</li>


license
--------------------------------------------------------------------------------

Licensed under [the Apache License, Version 2.0](http://www.apache.org/licenses/LICENSE-2.0.html)
