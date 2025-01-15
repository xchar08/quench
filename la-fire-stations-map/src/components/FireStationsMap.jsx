// src/components/FireStationsMap.jsx
import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { Loader } from '@googlemaps/js-api-loader';

const FireStationsMap = () => {
  const [fireStations, setFireStations] = useState([]);
  const [loading, setLoading] = useState(true);
  const mapRef = useRef(null); // Reference to the map div
  const mapInstanceRef = useRef(null); // Reference to the map instance

  // Retrieve API key and Map ID from environment variables
  const googleMapsApiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
  const mapId = import.meta.env.VITE_GOOGLE_MAPS_MAP_ID;

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

  // Initialize Google Maps
  useEffect(() => {
    if (!googleMapsApiKey) {
      console.error('Google Maps API key is missing.');
      setLoading(false);
      return;
    }

    const loader = new Loader({
      apiKey: googleMapsApiKey,
      version: 'weekly',
      libraries: ['marker'],
      mapId: mapId || undefined,
    });

    let isMounted = true;

    loader
      .load()
      .then((google) => {
        if (isMounted && mapRef.current) {
          const center = { lat: 34.0522, lng: -118.2437 }; // Los Angeles coordinates
          const map = new google.maps.Map(mapRef.current, {
            center,
            zoom: 10,
            mapId: mapId || undefined,
          });
          mapInstanceRef.current = map;
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

  // Add Markers to the Map
  useEffect(() => {
    if (mapInstanceRef.current && fireStations.length > 0) {
      fireStations.forEach((station) => {
        const { the_geom, shp_addr, address } = station;
        if (!the_geom || !the_geom.coordinates) return;

        const [lng, lat] = the_geom.coordinates;
        const latNum = parseFloat(lat);
        const lngNum = parseFloat(lng);

        const marker = new window.google.maps.marker.AdvancedMarkerElement({
          position: { lat: latNum, lng: lngNum },
          map: mapInstanceRef.current,
          title: shp_addr,
        });

        // Create an InfoWindow
        const infoWindow = new window.google.maps.InfoWindow({
          content: `
            <div style="padding: 10px; font-family: Arial, sans-serif;">
              <h2 style="font-size: 16px; font-weight: bold;">${shp_addr}</h2>
              <p>${address}</p>
            </div>
          `,
        });

        // Add click listener to marker to open InfoWindow
        marker.addListener('click', () => {
          infoWindow.open(mapInstanceRef.current, marker);
        });
      });
    }
  }, [mapInstanceRef.current, fireStations]);

  return (
    <div className="relative">
      {loading && (
        <div className="absolute top-0 left-0 w-full h-full flex justify-center items-center bg-white bg-opacity-75 z-10">
          <div className="text-xl font-semibold">Loading Map...</div>
        </div>
      )}
      <div ref={mapRef} style={{ width: '100%', height: '100vh' }}></div>
    </div>
  );
};

export default FireStationsMap;
