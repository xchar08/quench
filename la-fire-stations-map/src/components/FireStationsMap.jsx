// src/components/FireStationsMap.jsx
import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { Loader } from '@googlemaps/js-api-loader';
import Papa from 'papaparse';

const FireStationsMap = () => {
  const [fireStations, setFireStations] = useState([]);
  const [shelters, setShelters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [map, setMap] = useState(null);
  const fireMarkersRef = useRef([]);
  const shelterMarkersRef = useRef([]);
  const heatmapRef = useRef(null);
  const [fireLocations, setFireLocations] = useState([]);

  // Retrieve API key and Map ID from environment variables
  const googleMapsApiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
  const mapId = import.meta.env.VITE_GOOGLE_MAPS_MAP_ID;

  // Parse CSV and return an array of fire location objects with temperature data
  const csvToJson = (csv) => {
    const results = Papa.parse(csv, {
      header: true,
      skipEmptyLines: true,
      dynamicTyping: true,
    });
    const locations = results.data.map((fire) => ({
      latitude: fire.latitude,
      longitude: fire.longitude,
      bright_ti4: fire.bright_ti4,
      bright_ti5: fire.bright_ti5,
    }));
    console.log("Parsed fire locations:", locations);
    return locations;
  };

  // Fetch Fire Stations Data
  useEffect(() => {
    const fetchFireStations = async () => {
      try {
        const response = await axios.get('https://data.lacity.org/resource/rnb4-daiw.json');
        setFireStations(response.data);
      } catch (error) {
        console.error('Error fetching fire stations data:', error);
      }
    };
    fetchFireStations();
  }, []);

  // Fetch Shelters Data
  useEffect(() => {
    const fetchShelters = async () => {
      try {
        const response = await axios.get('http://localhost:5000/api/shelters'); // Update with your backend URL
        console.log('Fetched shelters data:', response.data);
        setShelters(response.data);
      } catch (error) {
        console.error('Error fetching shelters data:', error);
      }
    };
    fetchShelters();
  }, []);

  // Fetch fire locations data
  useEffect(() => {
    const fetchFireData = async () => {
      try {
        const response = await fetch(
          'https://firms.modaps.eosdis.nasa.gov/api/area/csv/d3ff7053e821cf760bf415e628a9dce7/VIIRS_SNPP_NRT/-124,32,-113,42/10/2025-01-01'
        );
        const data = await response.text();
        const locations = csvToJson(data);
        console.log('Fetched fires data:', locations);
        setFireLocations(locations);
      } catch (error) {
        console.error('Error fetching fire data:', error);
      }
    };
    fetchFireData();
  }, []);

  // Initialize Google Maps and store in state
  useEffect(() => {
    if (!googleMapsApiKey) {
      console.error('Google Maps API key is missing.');
      setLoading(false);
      return;
    }

    const loader = new Loader({
      apiKey: googleMapsApiKey,
      version: 'weekly',
      libraries: ['marker', 'visualization'],  // Include visualization library for heatmap
      mapId: mapId || undefined,
    });

    let isMounted = true;

    loader
      .load()
      .then((google) => {
        if (isMounted) {
          const center = { lat: 34.0522, lng: -118.2437 }; // Los Angeles coordinates
          const newMap = new google.maps.Map(document.getElementById('map'), {
            center,
            zoom: 10,
            mapId: mapId || undefined,
          });
          setMap(newMap);
          setLoading(false);
        }
      })
      .catch((e) => {
        console.error('Error loading Google Maps:', e);
        setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [googleMapsApiKey, mapId]);

  // Helper function to create custom marker content
  const createMarkerContent = (color) => {
    const div = document.createElement('div');
    div.style.backgroundColor = color;
    div.style.width = '16px';
    div.style.height = '16px';
    div.style.borderRadius = '50%';
    div.style.border = '2px solid white';
    return div;
  };

  // Add Fire Station Markers to the Map (red)
  useEffect(() => {
    if (map && fireStations.length > 0) {
      // Clear existing fire station markers
      fireMarkersRef.current.forEach((marker) => marker.setMap(null));
      fireMarkersRef.current = [];

      fireStations.forEach((station) => {
        const { the_geom, shp_addr, address } = station;
        if (!the_geom || !the_geom.coordinates) return;

        const [lng, lat] = the_geom.coordinates;
        const latNum = parseFloat(lat);
        const lngNum = parseFloat(lng);

        const markerElement = createMarkerContent('red');

        const marker = new google.maps.marker.AdvancedMarkerElement({
          map,
          position: { lat: latNum, lng: lngNum },
          title: shp_addr,
          content: markerElement,
        });

        const infoWindow = new google.maps.InfoWindow({
          content: `
            <div style="padding: 10px; font-family: Arial, sans-serif;">
              <h2 style="font-size: 16px; font-weight: bold;">${shp_addr}</h2>
              <p>${address}</p>
            </div>
          `,
        });

        google.maps.event.addListener(marker, 'click', () => {
          infoWindow.open(map, marker);
        });

        fireMarkersRef.current.push(marker);
      });
    }
  }, [map, fireStations]);

  // Add Shelter Markers to the Map (blue)
  useEffect(() => {
    if (map && shelters.length > 0) {
      // Clear existing shelter markers
      shelterMarkersRef.current.forEach((marker) => marker.setMap(null));
      shelterMarkersRef.current = [];

      shelters.forEach((shelter) => {
        const { latitude, longitude, name, streetAddress, city, state, zip } = shelter;
        if (!latitude || !longitude) {
          console.warn('Shelter missing coordinates:', shelter);
          return;
        }

        const latNum = parseFloat(latitude);
        const lngNum = parseFloat(longitude);
        if (isNaN(latNum) || isNaN(lngNum)) {
          console.warn('Invalid coordinates for shelter:', shelter);
          return;
        }

        const markerElement = createMarkerContent('blue');

        const marker = new google.maps.marker.AdvancedMarkerElement({
          map,
          position: { lat: latNum, lng: lngNum },
          title: name,
          content: markerElement,
        });

        const infoWindow = new google.maps.InfoWindow({
          content: `
            <div style="padding: 10px; font-family: Arial, sans-serif;">
              <h2 style="font-size: 16px; font-weight: bold;">${name}</h2>
              <p>${streetAddress}, ${city}, ${state} ${zip}</p>
            </div>
          `,
        });

        google.maps.event.addListener(marker, 'click', () => {
          infoWindow.open(map, marker);
        });

        shelterMarkersRef.current.push(marker);
      });
    }
  }, [map, shelters]);

  // Create Heatmap for Fires based on brightness values
  useEffect(() => {
    if (map && fireLocations.length > 0) {
      // Remove previous heatmap if exists
      if (heatmapRef.current) {
        heatmapRef.current.setMap(null);
      }

      // Prepare heatmap data points with weights based on bright_ti4
      const heatmapData = fireLocations
        .map((fire) => {
          const { latitude, longitude, bright_ti4 } = fire;
          if (!latitude || !longitude) return null;
          const latNum = parseFloat(latitude);
          const lngNum = parseFloat(longitude);
          if (isNaN(latNum) || isNaN(lngNum)) return null;
          return {
            location: new google.maps.LatLng(latNum, lngNum),
            weight: bright_ti4 || 0, // use bright_ti4 as weight
          };
        })
        .filter(Boolean);

      heatmapRef.current = new google.maps.visualization.HeatmapLayer({
        data: heatmapData,
        map,
        radius: 20, // adjust radius as needed
        gradient: [
          'rgba(0, 255, 255, 0)',    // transparent
          'rgba(0, 255, 255, 1)',    // cyan
          'rgba(0, 191, 255, 1)',    
          'rgba(0, 127, 255, 1)',    
          'rgba(0, 63, 255, 1)',     
          'rgba(0, 0, 255, 1)',      // blue
          'rgba(63, 0, 255, 1)',     
          'rgba(127, 0, 255, 1)',    
          'rgba(191, 0, 255, 1)',    
          'rgba(255, 0, 255, 1)',    
          'rgba(255, 0, 191, 1)',    
          'rgba(255, 0, 127, 1)',    
          'rgba(255, 0, 63, 1)',     
          'rgba(255, 0, 0, 1)'       // red
        ],
      });
    }
  }, [map, fireLocations]);

  return (
    <div className="relative">
      {loading && (
        <div className="absolute top-0 left-0 w-full h-full flex justify-center items-center bg-white bg-opacity-75 z-10">
          <div className="text-xl font-semibold">Loading Map...</div>
        </div>
      )}
      <div id="map" style={{ width: '100%', height: '100vh' }}></div>
    </div>
  );
};

export default FireStationsMap;
