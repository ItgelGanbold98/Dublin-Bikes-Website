import requests
import json
import sqlalchemy as sqla
from sqlalchemy import create_engine
from pprint import pprint
import simplejson as json
import requests
from IPython.display import display
import datetime
import time

URI = "dbbikes.cfjfzkae45jy.eu-west-1.rds.amazonaws.com"
PORT="3306"
DB="dbbikes"
USER="admin"
PASSWORD = "mypassword"

engine = create_engine("mysql+mysqldb://{}:{}@{}:{}/{}".format(USER, PASSWORD, URI, PORT, DB), echo=True)

sql = """
CREATE DATABASE IF NOT EXISTS dbbikes;
"""

connection = engine.connect()

connection.execute(sql)



def weather_to_db(text):
    sql = """
    DROP TABLE IF EXISTS currentweather;
    """
    connection.execute(sql)

    sql = """
    CREATE TABLE IF NOT EXISTS currentweather (
    time DATETIME,
    temperature FLOAT(3,2),
    windspeed FLOAT(4,2),
    pressure FLOAT(5,1),
    description VARCHAR(256),
    cloudiness VARCHAR(256)
    );
    """

    res = connection.execute(sql)
        
    
    weather_infos = json.loads(text)
    vals = (str(datetime.datetime.fromtimestamp(int(weather_infos.get('dt')))),
            float(weather_infos.get('main').get('temp')),
            float(weather_infos.get('wind').get('speed')),
            float(weather_infos.get('main').get('pressure')),
            weather_infos.get('weather')[0].get('description'),
            weather_infos.get('clouds').get('all'))
    connection.execute("insert into currentweather values(%s,%s,%s,%s,%s,%s);", vals)
    return

weather_api_key = 'b7d6a55bc0fff59fb0d5f7c3c1668417'
lat='53.35'
lon='-6.26'
weather_api_query = f"https://api.openweathermap.org/data/2.5/weather?lat={lat}&lon={lon}&appid={weather_api_key}&units=metric"

def main():
    while True:
        try:
            connection = engine.connect()
            weather_r = requests.get(weather_api_query)
            weather_to_db(weather_r.text)
            print("Weather scraping is done, now waiting...")
            connection.close()
            time.sleep(30*60) #Scrape every 30 minutes
        except:
            print("Error. Something went wrong.") 
    return

main()