let map;
let infowindow1;
let service;
let bikeMarkers = [];

function initMap()
{   
    fetchCurrentInfo();
    const dublin = {lat: 53.346057, lng: -6.268001}

    map = new google.maps.Map(document.getElementById("map"),
    {
        center: dublin , zoom: 13.5
    });
    routeMaker();
};
window.initMap = initMap;

let stations;
let currentinfo;
let whatToShowOnMarker = 'bike';
function redrawMarker(input){
    whatToShowOnMarker = input;
    if (whatToShowOnMarker == 'bike'){
        document.getElementById('marker-selector-parking').style.backgroundColor = 'white';
        document.getElementById('marker-selector-parking').style.color = '#010030'
        document.getElementById('marker-selector-bike').style.backgroundColor = '#010030';
        document.getElementById('marker-selector-bike').style.color = 'white'
    } else {
        document.getElementById('marker-selector-parking').style.backgroundColor = '#010030';
        document.getElementById('marker-selector-parking').style.color = 'white'
        document.getElementById('marker-selector-bike').style.backgroundColor = 'white';
        document.getElementById('marker-selector-bike').style.color = '#010030'

    }


    // addMarkers(stations, currentinfo);
    fetchCurrentInfo();
}

function addMarkers(stations, currentinfo) 
{   
    bikeMarkers.forEach(marker => {
        marker.setMap(null)
    });
    const infowindow = new google.maps.InfoWindow();
    stations.forEach(station=>{

        var availableBikes = '';
        var contentStr = '';
        var totalStand = '';
        var markerDisplay = '';
        var markerNumColor = '';

        const blue_icon = "https://images2.imgbox.com/8b/64/Twifkt4W_o.png"
        const space = '&nbsp'
        currentinfo.forEach(stn=>{
            if (stn.number == station.number){
                availableBikes = stn.available_bikes;
                totalStand = availableBikes + stn.available_bike_stands
                var bike_icon;
                var parking_icon;
                if (stn.available_bikes < 4){bike_icon = "<i class='fas fa-person-biking' style = 'color:red'></i>"}
                else {bike_icon = "<i class='fas fa-person-biking' style = 'color:navy'></i>"};

                if (stn.available_bike_stands < 4){parking_icon = "<i class='fas fa-square-parking' style = 'color:red'></i>"}
                else {parking_icon = "<i class='fas fa-square-parking' style = 'color:navy'></i>"};

                contentStr += "<p style = 'color: #000'> Available bikes &nbsp &nbsp" + bike_icon + space + space + stn.available_bikes +
                "</p><p style = 'color: #000'> Available stands &nbsp" + parking_icon + space + space + stn.available_bike_stands + '</p>';
                
                //if a station has 0 available bikes, it shows red marker
                //if its between 1 and 5, the marker is orange
                //else it is blue
            }});

            if (whatToShowOnMarker == 'bike'){
                markerDisplay = availableBikes
            } else {markerDisplay = totalStand - availableBikes}

            if (markerDisplay < 4){markerNumColor = "red"}
            else {markerNumColor = "white"}

        const bike_marker = new google.maps.Marker({
            position: {
                lat: station.position_lat,
                lng: station.position_lng
            },
            map: map,
            title: station.name + ' Station No.  ' + station.number,
            //the marker display's each station's available bikes count
            label: {text: markerDisplay + '', color: markerNumColor}, 
            icon: {url: blue_icon},
            opacity: 1,
        });
        bikeMarkers.push(bike_marker);
        
        bike_marker.addListener("click", () => {
            let chosenDay = document.getElementById('pick-a-day').value;
            stationNumber = parseInt(bike_marker.getTitle().slice(bike_marker.getTitle().length - 3, bike_marker.getTitle().length))
            if (chosenDay == 'avg'){stationAvgOccupancyGetter(stationNumber, totalStand)}
            else {predictiveModelResultGetter(stationNumber, parseInt(chosenDay), totalStand)}
            if(startflag == true){
                startingStationPosition = []
                startingStationPosition.push(bike_marker.getPosition().lat())
                startingStationPosition.push(bike_marker.getPosition().lng())
                startingStationName = (bike_marker.getTitle())
                routeMaker()
                
            } else if (endflag == true) {
                endStationPosition = []
                endStationPosition.push(bike_marker.getPosition().lat())
                endStationPosition.push(bike_marker.getPosition().lng())
                endStationName = (bike_marker.getTitle())
                routeMaker()
            }

            //if the map is too zoomed out, clicking on a marker sets the zoom to 15
            //if the map is zoomed in close, clicking on a marker does not change the zoom level
            if(map.getZoom() < 15){map.setZoom(15)}
            else {map.setZoom(map.getZoom())};

            map.panTo(bike_marker.getPosition());
            infowindow.close();
            infowindow.setContent(
                '<h1 style = "font-size: small; color: #000">' + bike_marker.getTitle() + '</h1>' 
                + contentStr);
            infowindow.open();
            
            if(startflag == false && endflag == false){infowindow.open(bike_marker.getMap(), bike_marker)}
        })
        
        bike_marker.addListener("mouseover", () => {
            if (map.getZoom() > 14.9){
            infowindow.close();
            infowindow.setContent(
                '<h1 style = "font-size: small; color: #000">' + bike_marker.getTitle() + '</h1>' 
                + contentStr);
            
            if(startflag == false && endflag == false){infowindow.open(bike_marker.getMap(), bike_marker)}}
        });

        if (startflag == true || endflag == false) {bike_marker.addListener("mouseout", () => {
            infowindow.close();
        })}
    })
};

function fetchCurrentInfo() {
    const static_stations_info_url = '/stations';           //need to fetch the stations json
    const current_station_info_url = '/currentstations';    //then also need to fetch the current station information json
    const current_weather_info_url = '/currentweather';
    const current_weather_icon = 
'https://api.openweathermap.org/data/2.5/weather?lat=53.35&lon=-6.26&appid=b7d6a55bc0fff59fb0d5f7c3c1668417&units=metric';


    const request1 = fetch(static_stations_info_url).then(response => response.json());
    const request2 = fetch(current_station_info_url).then(response => response.json());
    const request3 = fetch(current_weather_info_url).then(response => response.json());
    const request4 = fetch(current_weather_icon).then(res => res.json()).then((out) => getIconId(out.weather[0].icon));

    
    return Promise.all([request1, request2, request3, request4]).then(data => {
        const jsonData1 = data[0];
        const jsonData2 = data[1];
        const jsonData3 = data[2];
        const jsonData4 = data[4];
        // call add markers
        stations = jsonData1;
        currentinfo = jsonData2;
        addMarkers(stations, currentinfo);
        displayWeather(jsonData3)}
    );
}
fetchCurrentInfo()

var iconid;
function getIconId(info) {
    iconid = info
    return iconid
}

let todayAsWeekDay;
function displayWeather(weather_json){
    weather_data = weather_json[0]
    const space = '&nbsp'
    const temperature = Math.round(weather_data.temperature);
    const windSpeed = Math.round(weather_data.windspeed * 10) / 10;
    var windIconColor;
    if (windSpeed > 10 && windSpeed < 17){ windIconColor = 'orange'
    } else if (windSpeed >= 17) {windIconColor = 'red'} else {windIconColor = 'white'}


    const updatedTime = weather_data.time;
    let today;
    weekDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

    for (i = 0; i < 7; i++){
        if (weekDays[i] == updatedTime.slice(0,3)){
            today = i
        }
    }
    todayAsWeekDay = weekDays[today]

    document.getElementById('day-2').innerHTML = weekDays[(today+1)%7]
    document.getElementById('day-3').innerHTML = weekDays[(today+2)%7]
    document.getElementById('day-4').innerHTML = weekDays[(today+3)%7]
    document.getElementById('day-5').innerHTML = weekDays[(today+4)%7]

    // const pressure = weather_data.pressure;
    var toBeShown = '<img src = "https://openweathermap.org/img/wn/' + iconid + '@2x.png">' +
                '<div id = "weather-temperature"> ' + temperature + '°C current </div>' + 
                '<p id = "wind-speed"><i class="fas fa-wind" style = "color:' + windIconColor + '"></i>' + space + windSpeed + 'm/s </p>'
    document.getElementById("weather-data").innerHTML = toBeShown;
}

let startingStationPosition = []
let endStationPosition = []
let startingStationName;
let endStationName;
let startflag = false
let endflag = false
let directionsArray = [];

function startStationSelector(){
    startflag = true
    endflag = false   
}

function endStationSelector(){
    endflag = true
    startflag = false    
}

function routeMaker(){
    const start_input  = document.getElementById("starting_location");
    const end_input  = document.getElementById("destination_location");
    const directionsRenderer = new google.maps.DirectionsRenderer();
    const directionsService = new google.maps.DirectionsService();

    const start_searchItem = new google.maps.places.SearchBox(start_input);
    const end_searchItem = new google.maps.places.SearchBox(end_input);

    if(startflag == true){
        document.getElementById("starting_location").value = startingStationName
        startflag = false
    }

    if(endflag == true){
        document.getElementById("destination_location").value = endStationName;
        displayRouteAutofill(directionsService , directionsRenderer)
        endflag = false

    }


    directionsRenderer.setMap(map);

    map.addListener("bounds_changed", ()=>{
        start_searchItem.setBounds(map.getBounds());
        end_searchItem.setBounds(map.getBounds());
    });

    start_searchItem.addListener("places_changed", ()=> {
        const startingPlace = start_searchItem.getPlaces();

        if(startingPlace.length == 0){
            return;
        }
        startingPlace.forEach((startingPlace) => {
            if(!startingPlace.geometry || !startingPlace.geometry.location) {
                console.log("Places contain no geometry...")
                return;
            }
            
            startmarker = new google.maps.Marker({
                    map,
                    title: startingPlace.name,
                    position: startingPlace.geometry.location,
                    opacity: 0,
                })
        });
        map.setZoom(15)
        map.panTo(startmarker.getPosition());
        displayRoute(directionsService , directionsRenderer)
    })

    end_searchItem.addListener("places_changed", ()=> {
        const destinationPlace = end_searchItem.getPlaces();
        
        if(destinationPlace.length == 0){
            return;
        }
        destinationPlace.forEach((destinationPlace) => {
            if(!destinationPlace.geometry || !destinationPlace.geometry.location) {
                console.log("Places contain no geometry...")
                return;
            }
           
        endmarker = new google.maps.Marker({
                    map,
                    title: destinationPlace.name,
                    position: destinationPlace.geometry.location,
                    opacity: 0,
                })
        });
        map.setZoom(15)
        map.panTo(endmarker.getPosition());
        displayRoute(directionsService , directionsRenderer)
    })

    document.getElementById("travel-mode").addEventListener("change", () => {
        displayRoute(directionsService, directionsRenderer);
      });

    function displayRoute( directionsService , directionsRenderer){
        const selectedValue = document.querySelector('input[name="mode"]:checked').value; 
        
        if (selectedValue == "WALKING") {
            travelmode = google.maps.TravelMode.WALKING;
        }
        if (selectedValue == "DRIVING") {
            travelmode = google.maps.TravelMode.DRIVING;
        }
        if (selectedValue == "TRANSIT") {
            travelmode = google.maps.TravelMode.TRANSIT;
        }
        if (selectedValue == "BICYCLING") {
            travelmode = google.maps.TravelMode.BICYCLING;
        }
        directionsService.route({
            origin: startmarker.getPosition(),
            destination: endmarker.getPosition(),
            travelMode: travelmode,
        }).then((response) => {directionsRenderer.setDirections(response);
        }).catch((error) => window.alert("Direction request failed: " + error));
    }

    function displayRouteAutofill(directionsService , directionsRenderer){
        if (directionsArray.length != 0){directionsArray.forEach(route => {
            route.setMap(null)
        })}

        directionsService.route({
            origin: {lat: startingStationPosition[0], lng: startingStationPosition[1]},
            destination: {lat: endStationPosition[0] ,lng: endStationPosition[1]},
            travelMode: google.maps.TravelMode.BICYCLING,
        }).then((response) => {directionsRenderer.setDirections(response);
        directionsArray.push(directionsRenderer)}).catch((error) => window.alert("Direction request failed: " + error));
    }
}

function stationAvgOccupancyGetter(station_id, stationStands){
    const stations_data_getter_url = '/station_avg_data/' + station_id;           
    const request1 = fetch(stations_data_getter_url).then(response => response.json())
    .then(data => {
        const jsonData1 = data;
        stationAvgOccupancyProcessor(jsonData1, station_id, stationStands);}
    )    
}


var dummyCounter = 0
async function stationAvgOccupancyProcessor(jsonData, station_id, stationStands){
    dummyCounter ++; 
    let timeList = await jsonData.index
    let dailyAvgOccupancy = await jsonData.data
    document.getElementById('graph1').innerHTML = '<canvas id="myDailyChart' + dummyCounter + '" style="width: 100%; height: 100%">Graph daily</canvas>';

    GraphDrawer(stationStands);

    async function GraphDrawer(stationStands)
    { 
    
    const chartid = 'myDailyChart' + dummyCounter

    const ctx = document.getElementById(chartid).getContext("2d"); 
    
    const gradient = ctx.createLinearGradient(0, 0, 0, 200);
        gradient.addColorStop(0, "rgba(216, 27, 96, 0.85)");   
        gradient.addColorStop(1, "rgba(216, 27, 96, 0.10)");
    
    
    
    DailyAvg = new Chart(ctx, {
    type: 'line',
    data: {
    labels: timeList,
    datasets: [{
        label: 'Weekly Average Daily Bike Availability At Station ' + station_id,
        labelColor: '#fff',
        data: dailyAvgOccupancy,
        fill: true,
        backgroundColor: gradient,
        }]
    },
    options: {
        tension: 0.1,
        
       
    scales: {
        x: {
            ticks: {
                color: "#fff"
              },
            
        },
        y: {
            min: 0,
            max: stationStands ,
            ticks: {
                color: "#fff"
              }
        }
    }
}
}
);
}}

//load a default station at the start
stationAvgOccupancyGetter(1,31);

async function predictiveModelResultGetter(station_id, days_from_today, totalStands){
    const stations_data_ml = '/predicted_occupancy/' + station_id + '&' + days_from_today;        
    const request1 = fetch(stations_data_ml).then(response => response.json())
    .then(data => {
        const jsonData1 = data;
        stationPredictedOccupancyProcessor(jsonData1, station_id, totalStands);
    }
    )
}


let dummyCounter2 = 0;
async function stationPredictedOccupancyProcessor(jsonData, station_id, stationStands){
    dummyCounter2 ++; 
    
    const timeList = []
    const dailyAvgOccupancy = []
    for (i = 0; i<24; i++){
        timeList[i] = i
        dailyAvgOccupancy[i] = jsonData[i]
    }


    console.log("timelist: ", timeList);
    console.log("dailyavgoccupancy: ", dailyAvgOccupancy)
    // let timeList = await jsonData.index
    // let dailyAvgOccupancy = await jsonData.data
    document.getElementById('graph1').innerHTML = '<canvas id="myDailyChart' + dummyCounter + '" style="width: 100%; height: 100%">Graph daily</canvas>';

    GraphDrawer(stationStands);

    async function GraphDrawer(stationStands)
    { 
    
    const chartid = 'myDailyChart' + dummyCounter

    const ctx = document.getElementById(chartid).getContext("2d"); 
    
    const gradient = ctx.createLinearGradient(0, 0, 0, 200);
        gradient.addColorStop(0, "rgba(0, 255, 243, 0.85)");   
        gradient.addColorStop(1, "rgba(0, 255, 243, 0.10)");
    
    let selectElement = document.getElementById('pick-a-day')
    let chosenDay = selectElement.options[selectElement.selectedIndex].innerHTML;
    DailyAvg = new Chart(ctx, {
    type: 'line',
    data: {
    labels: timeList,
    datasets: [{
        label: 'Expected Daily Occupancy at Station ' + station_id + ' on ' + chosenDay,
        labelColor: '#fff',
        data: dailyAvgOccupancy,
        fill: true,
        backgroundColor: gradient,
        }]
    },
    options: {
        tension: 0.1,
        
       
    scales: {
        x: {
            ticks: {
                color: "#fff"
              },
            
        },
        y: {
            min: 0,
            max: stationStands + 5,
            ticks: {
                color: "#fff"
              }
        }
    }
}
}
);
}}



function forecastGetter(){
    const weather_forecast = 'https://api.openweathermap.org/data/2.5/forecast?lat=53.35&lon=-6.26&appid=b7d6a55bc0fff59fb0d5f7c3c1668417&units=metric';
    const request = fetch(weather_forecast).then(response => response.json()).then(out => forecastStorer(out));
}

let forecast;
async function forecastStorer(fore_cast_json){
    forecast = await fore_cast_json
}
forecastGetter()

const myHourSelection = document.getElementById('pick-an-hour');
myHourSelection.addEventListener("change", function() {
  displayForecastWeather(forecast, myDaySelection.value, myHourSelection.value)
});

const myDaySelection = document.getElementById('pick-a-day');
myDaySelection.addEventListener("change", function() {
    displayForecastWeather(forecast, myDaySelection.value, myHourSelection.value);
});

function displayForecastWeather(forecast, day, hour){
    if (day == 'avg' && hour == 'none'){
        fetchCurrentInfo()
    }
    else{
    const space = '&nbsp'
    forecastData = forecast.list
    const currentDate = forecastData[0].dt_txt.slice(8,10);
    const DayToChoose = parseInt(currentDate) + parseInt(day)
    let selectedWeatherInfo;

    forecastData.forEach(hourlyWeather => {
        if(hourlyWeather.dt_txt.slice(8,10) == DayToChoose && 
        hourlyWeather.dt_txt.slice(11,16)== hour){
            selectedWeatherInfo = hourlyWeather
        }
    })
    weekDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
    let today_index = 0;
    for (let i = 0; i < weekDays.length; i++){
        if (weekDays[i] == todayAsWeekDay){
            today_index = i
        }
    }
    const DayToDisplay = weekDays[(today_index + parseInt(day)) % 7]
    const iconID = selectedWeatherInfo.weather[0].icon;
    const temperature = Math.round(selectedWeatherInfo.main.temp);
    const windSpeed = Math.round(selectedWeatherInfo.wind.speed * 10) / 10;
    var windIconColor;
    if (windSpeed > 10 && windSpeed < 17){ windIconColor = 'orange'
    } else if (windSpeed >= 17) {windIconColor = 'red'} else {windIconColor = 'white'}

    var toBeShown = '<img src = "https://openweathermap.org/img/wn/' + iconID + '@2x.png">' +
                '<div id = "weather-temperature"> ' + temperature + '°C' + space + DayToDisplay + '</div>' + 
                '<p id = "wind-speed"><i class="fas fa-wind" style = "color:' + windIconColor+ '"></i>' + space + windSpeed + 'm/s' + space + space + space + space + hour +  '</p>'
    document.getElementById("weather-data").innerHTML = toBeShown;
}}

