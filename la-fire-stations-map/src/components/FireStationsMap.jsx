// src/components/FireStationsMap.jsx
import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { Loader } from '@googlemaps/js-api-loader';
// Removed the faulty import for AdvancedMarkerElement

const FireStationsMap = () => {
  const [fireStations, setFireStations] = useState([]);
  const [shelters, setShelters] = useState([]);
  const [loading, setLoading] = useState(true);
  const mapRef = useRef(null); // Reference to the map div
  const mapInstanceRef = useRef(null); // Reference to the map instance
  const fireMarkersRef = useRef([]);
  const shelterMarkersRef = useRef([]);

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

  // Fetch Shelters Data
  useEffect(() => {
    const fetchShelters = async () => {
      try {
        const response = await axios.get('http://localhost:5000/api/shelters'); // Update with your backend URL
        console.log('Fetched shelters data:', response.data); // Debugging log
        setShelters(response.data);
      } catch (error) {
        console.error('Error fetching shelters data:', error);
      }
    };

    fetchShelters();
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

  // Add Fire Station Markers to the Map
  useEffect(() => {
    if (mapInstanceRef.current && fireStations.length > 0) {
      // Clear existing fire markers
      fireMarkersRef.current.forEach((marker) => marker.setMap(null));
      fireMarkersRef.current = [];

      fireStations.forEach((station) => {
        const { the_geom, shp_addr, address } = station;
        if (!the_geom || !the_geom.coordinates) return;

        const [lng, lat] = the_geom.coordinates;
        const latNum = parseFloat(lat);
        const lngNum = parseFloat(lng);

        // Create custom marker content
        const markerElement = createMarkerContent('red');

        // Instantiate AdvancedMarkerElement
        const marker = new google.maps.marker.AdvancedMarkerElement({
          map: mapInstanceRef.current,
          position: { lat: latNum, lng: lngNum },
          title: shp_addr,
          content: markerElement,
        });

        // Create an InfoWindow for Fire Station
        const infoWindow = new google.maps.InfoWindow({
          content: `
            <div style="padding: 10px; font-family: Arial, sans-serif;">
              <h2 style="font-size: 16px; font-weight: bold;">${shp_addr}</h2>
              <p>${address}</p>
            </div>
          `,
        });

        // Add click listener using google.maps.event.addListener
        google.maps.event.addListener(marker, 'click', () => {
          infoWindow.open(mapInstanceRef.current, marker);
        });

        // Store marker reference
        fireMarkersRef.current.push(marker);
      });
    }
  }, [mapInstanceRef.current, fireStations]);

  // Add Shelter Markers to the Map
  useEffect(() => {
    if (mapInstanceRef.current && shelters.length > 0) {
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

        // Create custom marker content
        const markerElement = createMarkerContent('blue');

        // Instantiate AdvancedMarkerElement
        const marker = new google.maps.marker.AdvancedMarkerElement({
          map: mapInstanceRef.current,
          position: { lat: latNum, lng: lngNum },
          title: name,
          content: markerElement,
        });

        // Create an InfoWindow for Shelter
        const infoWindow = new google.maps.InfoWindow({
          content: `
            <div style="padding: 10px; font-family: Arial, sans-serif;">
              <h2 style="font-size: 16px; font-weight: bold;">${name}</h2>
              <p>${streetAddress}, ${city}, ${state} ${zip}</p>
            </div>
          `,
        });

        // Add click listener using google.maps.event.addListener
        google.maps.event.addListener(marker, 'click', () => {
          infoWindow.open(mapInstanceRef.current, marker);
        });

        // Store marker reference
        shelterMarkersRef.current.push(marker);
      });
    }
  }, [mapInstanceRef.current, shelters]);

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
