from flask import Flask, g, jsonify, render_template
import sqlalchemy as sqla
from sqlalchemy import create_engine
import traceback
import functools
import pandas as pd
from json import loads, dumps
import simplejson as json
import time
import datetime
import requests
import pickle

app = Flask(__name__)

URI = "dbbikes.cfjfzkae45jy.eu-west-1.rds.amazonaws.com"
PORT="3306"
DB="dbbikes"
USER="admin"
PASSWORD = "mypassword"

def connect_to_database():
    engine = create_engine("mysql+mysqlconnector://{}:{}@{}:{}/{}".format(USER, PASSWORD, URI, PORT, DB), echo=True)
    return engine

def get_db():
    db = getattr(g, '_database', None)
    if db is None:
        db = g._database = connect_to_database()
    return db

@app.teardown_appcontext
def close_connection(exception):
    db = getattr(g, '_database', None)
    if db is not None:
        try:
            db.close()
        except:
            print("no db.close")

@app.route("/stations")
@functools.lru_cache(maxsize=128)
def get_stations():
    engine = get_db()
    sql = "select * from station;"
    try:
        with engine.connect() as conn:
            rows = conn.execute(sqla.text(sql)).fetchall()
            conn.close()
            return jsonify([row._asdict() for row in rows])

    except:
        print(traceback.format_exc())
        return "error in get_stations", 404


@app.route("/currentstations")
@functools.lru_cache(maxsize=128)
def get_current_stations_info():
    engine = get_db()
    sql = "select * from currentavailability;"
    try:
        with engine.connect() as conn:
            rows = conn.execute(sqla.text(sql)).fetchall()
            conn.close()
            return jsonify([row._asdict() for row in rows])


    except:
        print(traceback.format_exc())
        return "error in current stations", 404

@app.route("/currentweather")
@functools.lru_cache(maxsize=128)
def get_current_weather_info():
    engine = get_db()
    sql = "select * from currentweather;"
    try:
        with engine.connect() as conn:
            rows = conn.execute(sqla.text(sql)).fetchall()
            conn.close()
            return jsonify([row._asdict() for row in rows])
    except:
        print(traceback.format_exc())
        return "error in current weather", 404

api_call = "https://api.openweathermap.org/data/2.5/forecast?lat=53.35&lon=-6.26&appid=b7d6a55bc0fff59fb0d5f7c3c1668417&units=metric"

def weather_forecast(days_from_today, hour):
    engine = get_db()
    try:
        with engine.connect() as connection:
            forecast_info = requests.get(api_call)
            forecast_info_json = json.loads(forecast_info.text)
            connection.close()
    except:
        print("Unable to get availability data for data analysis")
    today = datetime.date.today()
    date_time = datetime.datetime(today.year, today.month, today.day + days_from_today, hour)
    time_unix_timestamp = int(time.mktime(date_time.timetuple()))
    
    index = 0
    closest_date = abs(forecast_info_json.get('list')[0].get('dt') - time_unix_timestamp)
    for i in range(40):
        if abs(forecast_info_json.get('list')[i].get('dt') - time_unix_timestamp) < closest_date:
            closest_date = abs(forecast_info_json.get('list')[i].get('dt') - time_unix_timestamp)
            index = i

    weather_info = forecast_info_json.get('list')[index]
    weather_data = {}
    weather_data['temperature'] = weather_info.get('main').get('temp')
    weather_data['windspeed'] = weather_info.get('wind').get('speed')
    weather_data['pressure'] = weather_info.get('main').get('pressure')
    weather_data['cloudiness'] = weather_info.get('clouds').get('all')
    weather_data['description'] = weather_info.get('weather')[0].get('description')
#     # Convert the dictionary to a DataFrame
    future_weather_data = pd.DataFrame(weather_data, index=[0])
#     # One-hot encode the 'description' column
    future_weather_data = pd.get_dummies(future_weather_data, columns=['description'])
    return future_weather_data


def predict_for_future_date(station_id, days_from_today, hour):
    # Load the model
    with open("/Users/itgel98/Desktop/Masters Semester 2/COMP30830 Software Engineering/Group Project/Software-Engineering-Project/predictive_model/model_{}.pkl".format(station_id), "rb") as handle:
        model = pickle.load(handle)


    # Get future weather data
    future_weather_data = weather_forecast(days_from_today, hour)
    today_date = datetime.date.today()
    
    # Preprocess future_weather_data and make the prediction
    future_date = pd.to_datetime(today_date)
    day = future_date.day + days_from_today
    hour = hour
    year = future_date.year
    month = future_date.month
    is_weekday = int((future_date.weekday() >= 0) & (future_date.weekday() <= 4))
    is_busy_hours = int(((hour >= 7) & (hour <= 10)) | ((hour >= 16) & (hour <= 19)))
    cold_weather = (future_weather_data['temperature'][0] < 5).astype(float)
    windy_weather = (future_weather_data['windspeed'][0] > 8).astype(float)

    # Create input DataFrame
    input_df = future_weather_data.copy()
    input_df['year'] = year
    input_df['month'] = month
    input_df['day'] = day
    input_df['hour'] = hour
    input_df['number'] = station_id
    input_df['is_weekday'] = is_weekday
    input_df['is_busy_hours'] = is_busy_hours
    input_df['cold_weather'] = cold_weather
    input_df['windy_weather'] = windy_weather

    A = ['number', 'year', 'month', 'day', 'hour', 'minute_x', 'temperature',
       'windspeed', 'pressure', 'cloudiness', 'minute_y', 'is_weekday',
       'description_broken clouds', 'description_clear sky',
       'description_few clouds', 'description_fog',
       'description_heavy intensity rain',
       'description_light intensity drizzle',
       'description_light intensity drizzle rain',
       'description_light intensity shower rain', 'description_light rain',
       'description_light snow', 'description_mist',
       'description_moderate rain', 'description_overcast clouds',
       'description_ragged shower rain', 'description_scattered clouds',
       'description_shower rain', 'description_sleet', 'description_snow',
       'is_busy_hours', 'cold_weather', 'windy_weather']
    X = pd.DataFrame(columns = A)


    # Make sure the input DataFrame has the same columns as the training data
    for col in X.columns:
        if col not in input_df.columns:
            input_df[col] = 0

    # Reorder the columns to match the training data
    input_df = input_df[X.columns]

     # Make the prediction
    prediction = model.predict(input_df)
    available_bikes, available_bike_stands = prediction[0]

    # Ensure available_bikes is greater than 0
    available_bikes = max(0, available_bikes)

    # Ensure available_bike_stands is greater than 0 and less than or equal to 114
    available_bike_stands = max(0, available_bike_stands)
    return [int(available_bikes), int(available_bike_stands)]

@app.route("/predicted_occupancy/<int:station_id>&<int:days_from_today>")
@functools.lru_cache(maxsize=128)
def predicted_station_occupancy(station_id, days_from_today):
    no_of_bikes = {}
    for i in range(24):
        mydata = predict_for_future_date(station_id, days_from_today, i)
        no_of_bikes[i] = mydata[0]
    return no_of_bikes

@app.route("/station_avg_data/<int:station_id>")
@functools.lru_cache(maxsize=128)
def station_avg_data(station_id):
    engine = get_db()
    try:
        with engine.connect() as connection:
            df = pd.read_sql_query(f"select * from availability where number = {station_id} limit 2016;", connection)
            connection.close()
            df = df.drop_duplicates(keep='first')
            df['last_update'] = pd.to_datetime(df['last_update'])
            df = df.set_index('last_update')
            df = df.resample('10T').mean()
            df = df.groupby(df.index.hour).mean()
            result = df['available_bikes'].to_json(orient="split")
            parsed = loads(result)
            return dumps(parsed, indent=4)
    except:
        print(traceback.format_exc())
        return "error in station availability", 404
    
@app.route("/")
def render():
    return render_template('index.html')

if __name__ == "__main__":
    app.run(debug = True, port = 8000)