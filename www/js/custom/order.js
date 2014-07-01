//------------------------------------
// Client-Side
// Orders 
//------------------------------------

var items;
var itemsInitialized=false;

function initializeItems() {

    var ItemShovel={
        "sku": 12345,
        "desc": "Snow Shovel",
        "inv": 12,
        "oforecast":   15,
        "uforecast":  15
    };

    var ItemSalt = { 
      "sku": 12345,
      "desc": "Salt, 10 lbs",
      "inv":  12,
      "oforecast":  8,
      "uforecast": 8
    };

    var ItemUmbrella = {
      "sku": 77789,
      "desc":  "Beach Umbrella",
      "inv": 29,
      "oforecast": 23,
      "uforecast": 89
    };

    var ItemGenerator = {
      "sku": 77123,
      "desc": "Generator",
      "inv": 8,
      "oforecast":1,
      "uforecast": 15
    };
 
    var itemlist = [ ItemShovel, ItemSalt, ItemUmbrella, ItemGenerator ];   

    items = {
      "list" : itemlist,
      "length":  itemlist.length
    };

    for(var i=0;i<items.length;i++) {
        items.list[i].index=i;
    }

    itemsInitialized=true;
}

function itemListHTML() {

    if(!itemsInitialized) {     
        initializeItems();
    }

    var dl="<table class=\"table table-striped\">";
    dl+="<thead>";
    dl+="<tr>";
    dl+="<th>sku</th>";
    dl+="<th>description</th>";
    dl+="<th>inventory</th>";
    dl+="<th>orig. sales forecast</th>";
    dl+="<th>updated sales forecast</th>";
    dl+="</tr>";
    dl+="</thead>";
    dl+="<tbody>";
    for(var i=0;i<items.length;i++) {
        var item=items.list[i];
        dl+="<tr>";
        dl+="<th>"+item.sku+"</th>";
        dl+="<th>"+item.desc+"</th>";
        dl+="<th>"+item.inv+"</th>";
        dl+="<th>"+item.oforecast+"</th>";
        dl+="<th>"+item.uforecast+"</th>";
        dl+="</tr>";
    }
    dl+="</tbody>";
    dl+="</table>";

    console.log("itemListHTML:  dl="+dl);

    return dl;
}

// update itemList HTML if exists on page 
try {
  document.getElementById("itemlistHTML").innerHTML = itemListHTML();
} catch (e) {
  console.log("error setting itemlist");
  console.log("itemListHTML="+itemListHTML());
}

