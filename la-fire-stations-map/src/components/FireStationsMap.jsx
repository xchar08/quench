// src/components/FireStationsMap.jsx
import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { Loader } from '@googlemaps/js-api-loader';
import Papa from 'papaparse';

const FireStationsMap = () => {
  // States and refs
  const [fireStations, setFireStations] = useState([]);
  const [shelters, setShelters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [map, setMap] = useState(null);
  const [fireLocations, setFireLocations] = useState([]);
  const [pathPolyline, setPathPolyline] = useState(null);

  const fireMarkersRef = useRef([]);
  const shelterMarkersRef = useRef([]);
  const heatmapRef = useRef(null);
  const geocoderRef = useRef(null);

  // API Keys from environment variables
  const googleMapsApiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
  const mapId = import.meta.env.VITE_GOOGLE_MAPS_MAP_ID;
  const GRAPH_HOPPER_API_KEY = import.meta.env.VITE_GRAPH_HOPPER_API_KEY;

  // CSV parsing
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

  // Data fetching
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

  useEffect(() => {
    const fetchShelters = async () => {
      try {
        const response = await axios.get('http://localhost:5000/api/shelters'); 
        setShelters(response.data);
      } catch (error) {
        console.error('Error fetching shelters data:', error);
      }
    };
    fetchShelters();
  }, []);

  useEffect(() => {
    const fetchFireData = async () => {
      try {
        const response = await fetch(
          'https://firms.modaps.eosdis.nasa.gov/api/area/csv/d3ff7053e821cf760bf415e628a9dce7/VIIRS_SNPP_NRT/-124,32,-113,42/10/2025-01-01'
        );
        const data = await response.text();
        const locations = csvToJson(data);
        setFireLocations(locations);
      } catch (error) {
        console.error('Error fetching fire data:', error);
      }
    };
    fetchFireData();
  }, []);

  // Initialize Google Maps with visualization library
  useEffect(() => {
    if (!googleMapsApiKey) {
      console.error('Google Maps API key is missing.');
      setLoading(false);
      return;
    }

    const loader = new Loader({
      apiKey: googleMapsApiKey,
      version: 'weekly',
      libraries: ['marker', 'visualization'],
      mapId: mapId || undefined,
    });

    let isMounted = true;
    loader.load().then((google) => {
      if (isMounted) {
        const center = { lat: 34.0522, lng: -118.2437 };
        const mapElement = document.getElementById('map');
        const newMap = new google.maps.Map(mapElement, {
          center,
          zoom: 10,
          mapId: mapId || undefined,
        });
        setMap(newMap);
        setLoading(false);
      }
    }).catch((e) => {
      console.error('Error loading Google Maps:', e);
      setLoading(false);
    });

    return () => { isMounted = false; };
  }, [googleMapsApiKey, mapId]);

  // Initialize geocoder once map is ready
  useEffect(() => {
    if (map && window.google) {
      geocoderRef.current = new window.google.maps.Geocoder();
    }
  }, [map]);

  // Helper to create marker content
  const createMarkerContent = (color) => {
    const div = document.createElement('div');
    div.style.backgroundColor = color;
    div.style.width = '16px';
    div.style.height = '16px';
    div.style.borderRadius = '50%';
    div.style.border = '2px solid white';
    return div;
  };

  // Add Fire Station markers (red)
  useEffect(() => {
    if (map && fireStations.length > 0 && window.google) {
      fireMarkersRef.current.forEach(marker => marker.setMap(null));
      fireMarkersRef.current = [];
      fireStations.forEach(station => {
        const { the_geom, shp_addr, address } = station;
        if (!the_geom || !the_geom.coordinates) return;
        const [lng, lat] = the_geom.coordinates;
        const latNum = parseFloat(lat), lngNum = parseFloat(lng);
        const markerElement = createMarkerContent('red');
        const marker = new window.google.maps.marker.AdvancedMarkerElement({
          map,
          position: { lat: latNum, lng: lngNum },
          title: shp_addr,
          content: markerElement,
        });
        const infoWindow = new window.google.maps.InfoWindow({
          content: `<div style="padding: 10px;"><h2>${shp_addr}</h2><p>${address}</p></div>`,
        });
        window.google.maps.event.addListener(marker, 'click', () => {
          infoWindow.open(map, marker);
        });
        fireMarkersRef.current.push(marker);
      });
    }
  }, [map, fireStations]);

  // Add Shelter markers (blue)
  useEffect(() => {
    if (map && shelters.length > 0 && window.google) {
      shelterMarkersRef.current.forEach(marker => marker.setMap(null));
      shelterMarkersRef.current = [];
      shelters.forEach(shelter => {
        const { latitude, longitude, name, streetAddress, city, state, zip } = shelter;
        if (!latitude || !longitude) return;
        const latNum = parseFloat(latitude), lngNum = parseFloat(longitude);
        if (isNaN(latNum) || isNaN(lngNum)) return;
        const markerElement = createMarkerContent('blue');
        const marker = new window.google.maps.marker.AdvancedMarkerElement({
          map,
          position: { lat: latNum, lng: lngNum },
          title: name,
          content: markerElement,
        });
        const infoWindow = new window.google.maps.InfoWindow({
          content: `<div style="padding: 10px;"><h2>${name}</h2><p>${streetAddress}, ${city}, ${state} ${zip}</p></div>`,
        });
        window.google.maps.event.addListener(marker, 'click', () => {
          infoWindow.open(map, marker);
        });
        shelterMarkersRef.current.push(marker);
      });
    }
  }, [map, shelters]);

  // Create heatmap for fires
  useEffect(() => {
    if (map && fireLocations.length > 0 && window.google) {
      if (heatmapRef.current) heatmapRef.current.setMap(null);
      const heatmapData = fireLocations.map(fire => {
        const { latitude, longitude, bright_ti4 } = fire;
        const latNum = parseFloat(latitude), lngNum = parseFloat(longitude);
        if (!latitude || !longitude || isNaN(latNum) || isNaN(lngNum)) return null;
        return { location: new window.google.maps.LatLng(latNum, lngNum), weight: bright_ti4 || 0 };
      }).filter(Boolean);
      heatmapRef.current = new window.google.maps.visualization.HeatmapLayer({
        data: heatmapData,
        map,
        radius: 20,
        gradient: [
          'rgba(0, 255, 255, 0)',
          'rgba(0, 255, 255, 1)',
          'rgba(0, 191, 255, 1)',
          'rgba(0, 127, 255, 1)',
          'rgba(0, 63, 255, 1)',
          'rgba(0, 0, 255, 1)',
          'rgba(63, 0, 255, 1)',
          'rgba(127, 0, 255, 1)',
          'rgba(191, 0, 255, 1)',
          'rgba(255, 0, 255, 1)',
          'rgba(255, 0, 191, 1)',
          'rgba(255, 0, 127, 1)',
          'rgba(255, 0, 63, 1)',
          'rgba(255, 0, 0, 1)'
        ],
      });
    }
  }, [map, fireLocations]);

  // Utility: Euclidean distance
  const distance = (lat1, lng1, lat2, lng2) => {
    return Math.sqrt((lat1 - lat2) ** 2 + (lng1 - lng2) ** 2);
  };

  // Create an avoidance polygon around a fire
  const createAvoidPolygon = (fire, delta = 0.01) => {
    return [
      `${fire.latitude - delta},${fire.longitude - delta}`,
      `${fire.latitude - delta},${fire.longitude + delta}`,
      `${fire.latitude + delta},${fire.longitude + delta}`,
      `${fire.latitude + delta},${fire.longitude - delta}`,
      `${fire.latitude - delta},${fire.longitude - delta}`
    ].join('|');
  };

  // Fetch route from GraphHopper avoiding specified polygon
  const fetchRouteAvoidingFires = async (origin, destination, avoidPolygon) => {
    const baseUrl = 'https://graphhopper.com/api/1/route';
    const params = new URLSearchParams();
    params.append('key', GRAPH_HOPPER_API_KEY);
    params.append('point', `${origin.lat},${origin.lng}`);
    params.append('point', `${destination.lat},${destination.lng}`);
    params.append('vehicle', 'car');
    params.append('points_encoded', 'false');
    params.append('type', 'json');
    if (avoidPolygon) {
      params.append('avoid_polygons', avoidPolygon);
    }
    const url = `${baseUrl}?${params.toString()}`;
    const response = await fetch(url);
    const data = await response.json();
    return data;
  };

  // Animate marker along the path
  const animateMarker = (pathCoordinates) => {
    if (!map || !window.google || pathCoordinates.length === 0) return;
    const marker = new window.google.maps.Marker({
      map,
      position: pathCoordinates[0],
    });
    let index = 0;
    const interval = setInterval(() => {
      index++;
      if (index >= pathCoordinates.length) {
        clearInterval(interval);
      } else {
        marker.setPosition(pathCoordinates[index]);
      }
    }, 500);
  };

  // Handle search and route computation
  const handleSearch = async () => {
    const address = document.getElementById('address-input').value;
    if (!address || !geocoderRef.current) return;

    geocoderRef.current.geocode({ address }, async (results, status) => {
      if (status === 'OK' && results[0]) {
        const userLocation = results[0].geometry.location;
        let nearestShelter = null;
        let minDist = Infinity;
        shelters.forEach((shelter) => {
          const lat = parseFloat(shelter.latitude);
          const lng = parseFloat(shelter.longitude);
          const d = distance(userLocation.lat(), userLocation.lng(), lat, lng);
          if (d < minDist) {
            minDist = d;
            nearestShelter = { lat, lng };
          }
        });

        if (!nearestShelter) {
          alert("No shelter found.");
          return;
        }

        // Find nearest fire to avoid
        let nearestFire = null;
        let minFireDist = Infinity;
        fireLocations.forEach(fire => {
          const d = distance(userLocation.lat(), userLocation.lng(), fire.latitude, fire.longitude);
          if (d < minFireDist) {
            minFireDist = d;
            nearestFire = fire;
          }
        });

        const avoidPolygon = nearestFire ? createAvoidPolygon(nearestFire) : null;

        const origin = { lat: userLocation.lat(), lng: userLocation.lng() };
        const destination = nearestShelter;

        try {
          const routeData = await fetchRouteAvoidingFires(origin, destination, avoidPolygon);
          if (routeData.paths && routeData.paths.length > 0) {
            const path = routeData.paths[0].points.coordinates.map(coord => ({ lat: coord[1], lng: coord[0] }));

            if (pathPolyline) {
              pathPolyline.setMap(null);
            }
            const polyline = new window.google.maps.Polyline({
              path,
              geodesic: true,
              strokeColor: '#FF0000',
              strokeOpacity: 1.0,
              strokeWeight: 4,
              map,
            });
            setPathPolyline(polyline);

            animateMarker(path);
          } else {
            alert("No route found.");
          }
        } catch (error) {
          console.error('Error fetching route:', error);
          alert("Error fetching route.");
        }
      } else {
        alert('Geocode was not successful: ' + status);
      }
    });
  };

  return (
    <div className="relative">
      {loading && (
        <div className="absolute top-0 left-0 w-full h-full flex justify-center items-center bg-white bg-opacity-75 z-10">
          <div className="text-xl font-semibold">Loading Map...</div>
        </div>
      )}
      <div style={{ position: 'absolute', top: 10, left: 10, zIndex: 5, background: 'white', padding: '5px' }}>
        <input id="address-input" type="text" placeholder="Enter your address" style={{ width: '300px' }} />
        <button onClick={handleSearch}>Find Nearest Shelter</button>
      </div>
      <div id="map" style={{ width: '100%', height: '100vh' }}></div>
    </div>
  );
};

export default FireStationsMap;
