"""Forecast-driven conditions for the model planner.

Adapted from the data scientists' ``weather_extract`` package: an Open-Meteo forecast per trail point
(``forecast.py``), civil-dusk light with a forest margin (``light.py``), and the freezing-level snow rule
from ``weather_extract.trail_profile.sections_above_freezing`` (``snow.py``). ``service.py`` caches
forecasts in memory and on disk and falls back gracefully when the network is down.
"""
