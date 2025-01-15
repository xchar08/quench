// src/components/FireStationsMap.jsx
import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { Loader } from '@googlemaps/js-api-loader';
import Papa from 'papaparse';
import * as tf from '@tensorflow/tfjs';
import OpenAI from 'openai'; 
import hydrantpng from '../assets/firehydrant.png';

const FireStationsMap = () => {
  // ----------------------------------------------------------------
  // States and refs
  // ----------------------------------------------------------------
  const [fireStations, setFireStations] = useState([]);
  const [shelters, setShelters] = useState([]);
  const [hydrants, setHydrants] = useState([]);
  const [fireLocations, setFireLocations] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [alertsLoading, setAlertsLoading] = useState(true);

  const [loading, setLoading] = useState(true);
  const [map, setMap] = useState(null);
  const [pathPolyline, setPathPolyline] = useState(null);
  const [model, setModel] = useState(null);

  // Refs for markers & overlays
  const fireMarkersRef = useRef([]);
  const shelterMarkersRef = useRef([]);
  const hydrantMarkersRef = useRef([]);
  const heatmapRef = useRef(null);
  const alertsRef = useRef([]); // to store weather alert polygons
  const geocoderRef = useRef(null);

  // -------------- NEW TOGGLE STATES --------------
  const [showFireStations, setShowFireStations] = useState(true);
  const [showShelters, setShowShelters] = useState(true);
  const [showHydrants, setShowHydrants] = useState(true);
  const [showHeatmap, setShowHeatmap] = useState(true);
  const [showWeatherAlerts, setShowWeatherAlerts] = useState(true);
  // -----------------------------------------------

  // Environment / API Keys
  const googleMapsApiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
  const mapId = import.meta.env.VITE_GOOGLE_MAPS_MAP_ID;
  const GRAPH_HOPPER_API_KEY = import.meta.env.VITE_GRAPH_HOPPER_API_KEY;
  const TF_MODEL_URL = import.meta.env.VITE_TF_MODEL_URL;
  const NEBIUS_API_KEY = import.meta.env.VITE_NEBIUS_API_KEY;

  // Initialize Nebius AI client
  const nebiusClient = new OpenAI({
    baseURL: 'https://api.studio.nebius.ai/v1/',
    apiKey: NEBIUS_API_KEY,
    dangerouslyAllowBrowser: true, // WARNING: Exposes key in browser
  });

  // ----------------------------------------------------------------
  // CSV parsing (NASA fires)
  // ----------------------------------------------------------------
  const csvToJson = (csv) => {
    const results = Papa.parse(csv, {
      header: true,
      skipEmptyLines: true,
      dynamicTyping: true,
    });
    const locations = results.data.map((fire) => ({
      latitude: parseFloat(fire.latitude),
      longitude: parseFloat(fire.longitude),
      bright_ti4: parseFloat(fire.bright_ti4),
      bright_ti5: parseFloat(fire.bright_ti5),
    }));
    console.log("Parsed fire locations:", locations);
    return locations;
  };

  // ----------------------------------------------------------------
  // 1) Fetch Weather Alerts (NWS)
  // ----------------------------------------------------------------
  useEffect(() => {
    const fetchWeatherAlerts = async () => {
      try {
        setAlertsLoading(true);
        const response = await axios.get('https://api.weather.gov/alerts/active?area=CA');
        const filteredAlerts = response.data.features.filter((alert) => {
          const severity = alert.properties.severity;
          // Example filter for "Severe" only
          return severity === 'Severe';
        });
        setAlerts(filteredAlerts);
        setAlertsLoading(false);
      } catch (error) {
        console.error('Error fetching alerts:', error);
        setAlertsLoading(false);
      }
    };

    fetchWeatherAlerts();
  }, []);

  // Helper to pick a color for each alert severity
  const getAlertColor = (severity) => {
    switch (severity) {
      case 'Severe':
        return 'red';
      case 'Warning':
        return 'orange';
      case 'Advisory':
        return 'yellow';
      case 'Watch':
        return 'blue';
      default:
        return 'green';
    }
  };

  // ----------------------------------------------------------------
  // 2) Fetch Fire Stations
  // ----------------------------------------------------------------
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

  // ----------------------------------------------------------------
  // 3) Fetch Shelters
  // ----------------------------------------------------------------
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

  // ----------------------------------------------------------------
  // 4) Fetch NASA Fire Data (CSV)
  // ----------------------------------------------------------------
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

  // ----------------------------------------------------------------
  // 5) Fetch Hydrants (from /public/data/Hydrants.json)
  // ----------------------------------------------------------------
  useEffect(() => {
    const fetchHydrants = async () => {
      try {
        const response = await fetch('/data/Hydrants.json');
        const jsonData = await response.json();

        if (jsonData && jsonData.features) {
          const hydrantArr = jsonData.features.map((feat) => ({
            objectId: feat.attributes?.OBJECTID,
            sizeCode: feat.attributes?.SIZE_CODE,
            makeDesc: feat.attributes?.MAKE_DESCRIPTION,
            mainSize: feat.attributes?.MAIN_SIZE,
            tooltip: feat.attributes?.TOOLTIP,
            url: feat.attributes?.NLA_URL,
            latitude: feat.geometry?.y,
            longitude: feat.geometry?.x,
          }));
          setHydrants(hydrantArr);
        }
      } catch (error) {
        console.error('Error fetching hydrants data:', error);
      }
    };
    fetchHydrants();
  }, []);

  // ----------------------------------------------------------------
  // 6) Train Dummy TensorFlow Model
  // ----------------------------------------------------------------
  useEffect(() => {
    const trainDummyModel = async () => {
      try {
        const dummyModel = tf.sequential();
        dummyModel.add(tf.layers.dense({units: 10, inputShape: [3], activation: 'relu'}));
        dummyModel.add(tf.layers.dense({units: 3, activation: 'softmax'}));
        dummyModel.compile({optimizer: 'adam', loss: 'categoricalCrossentropy'});

        const xs = tf.randomNormal([100, 3]);
        const ys = tf.randomUniform([100, 3]);
        await dummyModel.fit(xs, ys, {epochs: 5});
        setModel(dummyModel);
        console.log('Dummy model trained successfully.');
      } catch (error) {
        console.error('Error training dummy model:', error);
      }
    };
    trainDummyModel();
  }, []);

  // ----------------------------------------------------------------
  // 7) Initialize Google Map
  // ----------------------------------------------------------------
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
    loader
      .load()
      .then((google) => {
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
      })
      .catch((e) => {
        console.error('Error loading Google Maps:', e);
        setLoading(false);
      });
    return () => {
      isMounted = false;
    };
  }, [googleMapsApiKey, mapId]);

  // ----------------------------------------------------------------
  // 8) Initialize Geocoder
  // ----------------------------------------------------------------
  useEffect(() => {
    if (map && window.google) {
      geocoderRef.current = new window.google.maps.Geocoder();
    }
  }, [map]);

  // ----------------------------------------------------------------
  // Helper: createMarkerContent (colored circle)
  // ----------------------------------------------------------------
  const createMarkerContent = (color) => {
    const div = document.createElement('div');
    div.style.backgroundColor = color;
    div.style.width = '16px';
    div.style.height = '16px';
    div.style.borderRadius = '50%';
    div.style.border = '2px solid white';
    return div;
  };

  // ----------------------------------------------------------------
  // 9) Weather Alerts (Polygons)
  // ----------------------------------------------------------------
  useEffect(() => {
    // Clear any existing polygons
    alertsRef.current.forEach((poly) => poly.setMap(null));
    alertsRef.current = [];

    // If not showing alerts or still loading, skip
    if (!map || alertsLoading || !showWeatherAlerts) return;
    if (alerts.length === 0) return;

    // Otherwise, draw polygons
    alerts.forEach((alert) => {
      const { properties } = alert;
      const severity = properties.severity;
      const alertColor = getAlertColor(severity);

      const affectedZones = properties.affectedZones;
      if (affectedZones && affectedZones.length > 0) {
        affectedZones.forEach(async (zoneUrl) => {
          try {
            const zoneResponse = await axios.get(zoneUrl);
            const zoneData = zoneResponse.data;
            const zoneGeometry = zoneData.geometry;

            if (zoneGeometry && zoneGeometry.type === 'Polygon' && zoneGeometry.coordinates) {
              const polygonPath = zoneGeometry.coordinates[0].map((coord) => ({
                lat: coord[1],
                lng: coord[0],
              }));

              const polygon = new window.google.maps.Polygon({
                paths: polygonPath,
                strokeColor: alertColor,
                strokeOpacity: 0.1,
                strokeWeight: 2,
                fillColor: alertColor,
                fillOpacity: 0.1,
                map,
              });

              const infoWindow = new window.google.maps.InfoWindow({
                content: `<div style="padding: 5px;">
                  <strong>Red Flag Warning / WildFire Alert</strong><br />
                  Severity: ${severity}
                </div>`,
              });

              polygon.addListener('click', (event) => {
                // Position the info window at the clicked location
                infoWindow.setPosition(event.latLng);
                infoWindow.open(map);
              });

              alertsRef.current.push(polygon);
            }
          } catch (error) {
            console.error('Error fetching zone data:', error);
          }
        });
      }
    });
  }, [map, alerts, alertsLoading, showWeatherAlerts]);

  // ----------------------------------------------------------------
  // 10) Fire Station Markers (red)
  // ----------------------------------------------------------------
  useEffect(() => {
    // Clear existing markers
    fireMarkersRef.current.forEach(marker => marker.setMap(null));
    fireMarkersRef.current = [];

    // If not showing or missing data, skip
    if (!map || !showFireStations || fireStations.length === 0 || !window.google) {
      return;
    }

    // Otherwise, create new markers
    fireStations.forEach((station) => {
      const { the_geom, shp_addr, address } = station;
      if (!the_geom || !the_geom.coordinates) return;
      const [lng, lat] = the_geom.coordinates;
      const latNum = parseFloat(lat);
      const lngNum = parseFloat(lng);
      if (isNaN(latNum) || isNaN(lngNum)) return;

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
      marker.addListener('click', () => {
        infoWindow.open(map, marker);
      });

      fireMarkersRef.current.push(marker);
    });
  }, [map, fireStations, showFireStations]);

  // ----------------------------------------------------------------
  // 11) Shelter Markers (blue)
  // ----------------------------------------------------------------
  useEffect(() => {
    shelterMarkersRef.current.forEach(marker => marker.setMap(null));
    shelterMarkersRef.current = [];

    if (!map || !showShelters || shelters.length === 0 || !window.google) {
      return;
    }

    shelters.forEach((shelter) => {
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
      marker.addListener('click', () => {
        infoWindow.open(map, marker);
      });

      shelterMarkersRef.current.push(marker);
    });
  }, [map, shelters, showShelters]);

  // ----------------------------------------------------------------
  // 12) Hydrant Markers (custom icon)
  // ----------------------------------------------------------------
  useEffect(() => {
    hydrantMarkersRef.current.forEach((marker) => marker.setMap(null));
    hydrantMarkersRef.current = [];

    if (!map || !showHydrants || hydrants.length === 0 || !window.google) {
      return;
    }

    hydrants.forEach((hydrant) => {
      if (!hydrant.latitude || !hydrant.longitude) return;
      const latNum = parseFloat(hydrant.latitude);
      const lngNum = parseFloat(hydrant.longitude);
      if (isNaN(latNum) || isNaN(lngNum)) return;

      const marker = new window.google.maps.Marker({
        map,
        position: { lat: latNum, lng: lngNum },
        icon: {
          url: hydrantpng,
          // adjust size as desired
          scaledSize: new window.google.maps.Size(16, 20),
        },
        title: hydrant.sizeCode || 'Hydrant',
      });

      const infoHtml = `
        <div style="padding: 10px;">
          <h2>Hydrant #${hydrant.objectId || ''}</h2>
          <p>Size Code: ${hydrant.sizeCode || ''}</p>
          <p>Make: ${hydrant.makeDesc || ''}</p>
          <p>Main Size: ${hydrant.mainSize || ''}</p>
          <p>${hydrant.tooltip || ''}</p>
          <a href="${hydrant.url || '#'}" target="_blank" rel="noopener noreferrer">Details</a>
        </div>
      `;
      const infoWindow = new window.google.maps.InfoWindow({ content: infoHtml });
      marker.addListener('click', () => {
        infoWindow.open(map, marker);
      });

      hydrantMarkersRef.current.push(marker);
    });
  }, [map, hydrants, showHydrants]);

  // ----------------------------------------------------------------
  // 13) Fire Heatmap
  // ----------------------------------------------------------------
  useEffect(() => {
    // Remove old heatmap
    if (heatmapRef.current) {
      heatmapRef.current.setMap(null);
      heatmapRef.current = null;
    }

    // If we want to show heatmap & we have data:
    if (!map || !showHeatmap || fireLocations.length === 0 || !window.google) {
      return;
    }

    const heatmapData = fireLocations
      .map((fire) => {
        const latNum = parseFloat(fire.latitude);
        const lngNum = parseFloat(fire.longitude);
        if (isNaN(latNum) || isNaN(lngNum)) return null;
        return {
          location: new window.google.maps.LatLng(latNum, lngNum),
          weight: fire.bright_ti4 || 0,
        };
      })
      .filter(Boolean);

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
        'rgba(255, 0, 0, 1)',
      ],
    });
  }, [map, fireLocations, showHeatmap]);

  // ----------------------------------------------------------------
  // 14) Utility: Euclidean distance
  // ----------------------------------------------------------------
  const distance = (lat1, lng1, lat2, lng2) => {
    return Math.sqrt((lat1 - lat2) ** 2 + (lng1 - lng2) ** 2);
  };

  // ----------------------------------------------------------------
  // 15) GraphHopper & Routing Logic (unchanged)
  // ----------------------------------------------------------------
  const createAvoidPolygonWKT = (fire, delta = 0.1) => {
    const lat = fire.latitude;
    const lng = fire.longitude;
    const coordinates = [
      `${lng - delta} ${lat - delta}`,
      `${lng - delta} ${lat + delta}`,
      `${lng + delta} ${lat + delta}`,
      `${lng + delta} ${lat - delta}`,
      `${lng - delta} ${lat - delta}`,
    ].join(', ');
    return `polygon((${coordinates}))`;
  };

  // Fetch route from GraphHopper avoiding specified polygons
  const fetchRouteAvoidingFires = async (origin, destination, avoidPolygons) => {
    const baseUrl = 'https://graphhopper.com/api/1/route';
    const params = new URLSearchParams();
    params.append('key', GRAPH_HOPPER_API_KEY);
    params.append('point', `${origin.lat},${origin.lng}`);
    params.append('point', `${destination.lat},${destination.lng}`);
    params.append('vehicle', 'car');
    params.append('points_encoded', 'false');
    params.append('type', 'json');

    avoidPolygons.forEach(polygon => {
      params.append('avoid_polygons', polygon);
    });

    const url = `${baseUrl}?${params.toString()}`;
    console.log('GraphHopper API URL:', url);
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`GraphHopper API error: ${response.statusText}`);
    }
    const data = await response.json();
    return data;
  };

  // Simple route fetch without avoidance
  const fetchRouteSimple = async (origin, destination) => {
    const baseUrl = 'https://graphhopper.com/api/1/route';
    const params = new URLSearchParams();
    params.append('key', GRAPH_HOPPER_API_KEY);
    params.append('point', `${origin.lat},${origin.lng}`);
    params.append('point', `${destination.lat},${destination.lng}`);
    params.append('vehicle', 'car');
    params.append('points_encoded', 'false');
    params.append('type', 'json');
    const url = `${baseUrl}?${params.toString()}`;
    console.log('Simple Route URL:', url);
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
      icon: {
        path: window.google.maps.SymbolPath.CIRCLE,
        scale: 6,
        fillColor: '#FF0000',
        fillOpacity: 1,
        strokeWeight: 1,
      },
    });
    let index = 0;
    const interval = setInterval(() => {
      index++;
      if (index >= pathCoordinates.length) {
        clearInterval(interval);
        marker.setMap(null);
      } else {
        marker.setPosition(pathCoordinates[index]);
      }
    }, 200);
  };

  // Nebius AI function for optimal deployment suggestions (placeholder)
  const getOptimalDeploymentsFromNebius = async (stations, fires) => {
    const prompt = `Here are fire stations: ${JSON.stringify(stations)}.
Here are fires: ${JSON.stringify(fires)}.
Suggest optimal deployment of 3 trucks per station to extinguish fires.
Provide assignments in JSON format.`;
    try {
      const response = await nebiusClient.chat.completions.create({
        max_tokens: 500,
        temperature: 0.7,
        top_p: 1,
        top_k: 50,
        n: 1,
        stream: false,
        model: "meta-llama/Meta-Llama-3.1-70B-Instruct",
        messages: [
          {
            role: "system",
            content: "You are an expert in emergency response planning."
          },
          {
            role: "user",
            content: prompt
          }
        ]
      });
      console.log("Nebius AI assignments:", response.choices[0].message.content);
    } catch (error) {
      console.error("Error with Nebius AI API:", error);
    }
  };

  // Handle search and route computation for nearest shelter
  const handleSearch = async () => {
    const address = document.getElementById('address-input').value.trim();
    if (!address || !geocoderRef.current) {
      alert('Please enter a valid address.');
      return;
    }
  
    geocoderRef.current.geocode({ address }, async (results, status) => {
      if (status === 'OK' && results[0]) {
        const userLocation = results[0].geometry.location;
        console.log('User Location:', userLocation.lat(), userLocation.lng());

        // Find nearest shelter
        let nearestShelter = null;
        let minDist = Infinity;
        let fullAddress = null;
        let city = null;

        shelters.forEach((shelter) => {
          const lat = parseFloat(shelter.latitude);
          const lng = parseFloat(shelter.longitude);
          const d = distance(userLocation.lat(), userLocation.lng(), lat, lng);
          const streetAddress = shelter.streetAddress
          const city = shelter.city
          const state = shelter.state
          const zip = shelter.zip
          const name = shelter.name
          const fullAddress = `${city}, ${state}, ${streetAddress}, ${zip}`;
          // zip is state, state is city, city is address. address is county

          if (d < minDist) {
            minDist = d;
            nearestShelter = { lat, lng , fullAddress, city, state, zip, name, d};
          }
        });

        if (!nearestShelter) {
          alert("No shelter found.");
          return;
        }

        console.log('Nearest Shelter:', nearestShelter, fullAddress, city);
        
        const shelterInfoWindow = new window.google.maps.InfoWindow({
          content: `<div><strong>Shelter Name: ${nearestShelter.name}</strong><br>
                    Nearest Shelter<br>
                    Address: ${nearestShelter.fullAddress}<br>
                   `,
          position: { lat: nearestShelter.lat, lng: nearestShelter.lng },
        });
      // Open InfoWindow on map
      shelterInfoWindow.open(map);

      // Optionally, place a marker at the shelter location
      const shelterMarker = new window.google.maps.Marker({
        position: { lat: nearestShelter.lat, lng: nearestShelter.lng },
        map,
        title: 'Nearest Shelter',
      });

        // Find fires within ~10 km radius
        let firesToAvoid = fireLocations.filter(fire => {
          const d = distance(userLocation.lat(), userLocation.lng(), fire.latitude, fire.longitude);
          return d <= 0.09;
        });

        // Sort fires by proximity and limit to top 20
        firesToAvoid.sort((a, b) => {
          const da = distance(userLocation.lat(), userLocation.lng(), a.latitude, a.longitude);
          const db = distance(userLocation.lat(), userLocation.lng(), b.latitude, b.longitude);
          return da - db;
        });
        firesToAvoid = firesToAvoid.slice(0, 20);

        // Create WKT avoidance polygons for limited fires
        const avoidancePolygons = firesToAvoid.map(fire => createAvoidPolygonWKT(fire));
        console.log('Avoidance Polygons:', avoidancePolygons);

        const origin = { lat: userLocation.lat(), lng: userLocation.lng() };
        const destination = nearestShelter;

        try {
          const routeData = await fetchRouteAvoidingFires(origin, destination, avoidancePolygons);
          console.log('GraphHopper Route Data:', routeData);

          if (routeData.paths && routeData.paths.length > 0) {
            const path = routeData.paths[0].points.coordinates.map(coord => ({ lat: coord[1], lng: coord[0] }));
            console.log('Route Path:', path);

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
            alert("No route found. Please try a different address or check fire data.");
          }
        } catch (error) {
          console.error('Error fetching route:', error);
          alert("Error fetching route. Please check the console for details.");
        }
      } else {
        alert('Geocode was not successful: ' + status);
      }
    });
  };

  // Simulate truck deployment using street routes with Nebius integration
  const simulateTruckDeployment = async () => {
    if (!map || !window.google) return;

    // Call Nebius AI for suggestions (currently placeholder)
    await getOptimalDeploymentsFromNebius(fireStations, fireLocations);

    const truckRadius = 0.05;
    const trucks = [];
    fireStations.forEach(station => {
      for (let i = 0; i < 3; i++) {
        trucks.push({ station, assigned: false });
      }
    });

    const sortedFires = [...fireLocations].sort((a, b) => b.bright_ti4 - a.bright_ti4);
    const assignments = [];

    for (let truck of trucks) {
      let bestFire = null;
      let minDist = Infinity;
      for (let fire of sortedFires) {
        if (fire.assigned) continue;
        const stationLat = parseFloat(truck.station.the_geom.coordinates[1]);
        const stationLng = parseFloat(truck.station.the_geom.coordinates[0]);
        const dist = distance(stationLat, stationLng, fire.latitude, fire.longitude);
        if (dist < minDist && dist <= truckRadius) {
          minDist = dist;
          bestFire = fire;
        }
      }
      if (bestFire) {
        truck.assigned = true;
        bestFire.assigned = true;
        assignments.push({ truck, fire: bestFire });
      }
    }

    for (let {truck, fire} of assignments) {
      const stationLat = parseFloat(truck.station.the_geom.coordinates[1]);
      const stationLng = parseFloat(truck.station.the_geom.coordinates[0]);
      const origin = { lat: stationLat, lng: stationLng };
      const destination = { lat: fire.latitude, lng: fire.longitude };
      try {
        const routeData = await fetchRouteSimple(origin, destination);
        if (routeData.paths && routeData.paths.length > 0) {
          const path = routeData.paths[0].points.coordinates.map(coord => ({ lat: coord[1], lng: coord[0] }));
          new window.google.maps.Polyline({
            path,
            geodesic: true,
            strokeColor: '#00FF00',
            strokeOpacity: 1.0,
            strokeWeight: 3,
            map,
          });
        }
      } catch (error) {
        console.error('Error fetching route for truck:', error);
      }
    }
  };

  // ----------------------------------------------------------------
  // Render
  // ----------------------------------------------------------------
  return (
    <div className="relative">
      {loading && (
        <div className="absolute top-0 left-0 w-full h-full flex justify-center items-center bg-white bg-opacity-75 z-10">
          <div className="text-xl font-semibold">Loading Map...</div>
        </div>
      )}

      {/* Basic UI for searching an address, etc. */}
      <div
        style={{
          position: 'absolute',
          top: 10,
          left: 10,
          zIndex: 5,
          background: 'white',
          padding: '10px',
          borderRadius: '5px',
          boxShadow: '0 2px 6px rgba(0,0,0,0.3)',
        }}
      >
        <input
          id="address-input"
          type="text"
          placeholder="Enter your address"
          style={{ width: '250px', padding: '5px' }}
        />
        <button onClick={handleSearch} style={{ marginLeft: '10px', padding: '5px 10px' }}>
          Find Nearest Shelter
        </button>
        <button onClick={simulateTruckDeployment} style={{ marginLeft: '10px', padding: '5px 10px' }}>
          Deploy Trucks
        </button>
      </div>

      {/* NEW: Overlays Toggle UI at bottom-right */}
      <div
        style={{
          position: 'absolute',
          bottom: 10,
          right: 10,
          zIndex: 5,
          background: 'white',
          padding: '10px',
          borderRadius: '5px',
          boxShadow: '0 2px 6px rgba(0,0,0,0.3)',
        }}
      >
        <div style={{ fontWeight: 'bold', marginBottom: '6px' }}>Overlays</div>

        <label style={{ display: 'block', marginBottom: '4px' }}>
          <input
            type="checkbox"
            checked={showFireStations}
            onChange={() => setShowFireStations(!showFireStations)}
          />
          {' '}Fire Stations
        </label>

        <label style={{ display: 'block', marginBottom: '4px' }}>
          <input
            type="checkbox"
            checked={showShelters}
            onChange={() => setShowShelters(!showShelters)}
          />
          {' '}Shelters
        </label>

        <label style={{ display: 'block', marginBottom: '4px' }}>
          <input
            type="checkbox"
            checked={showHydrants}
            onChange={() => setShowHydrants(!showHydrants)}
          />
          {' '}Fire Hydrants
        </label>

        <label style={{ display: 'block', marginBottom: '4px' }}>
          <input
            type="checkbox"
            checked={showHeatmap}
            onChange={() => setShowHeatmap(!showHeatmap)}
          />
          {' '}Heatmap
        </label>

        <label style={{ display: 'block', marginBottom: '4px' }}>
          <input
            type="checkbox"
            checked={showWeatherAlerts}
            onChange={() => setShowWeatherAlerts(!showWeatherAlerts)}
          />
          {' '}Weather Alerts
        </label>
      </div>

      {/* The actual map */}
      <div id="map" style={{ width: '100%', height: '100vh' }}></div>
    </div>
  );
};

export default FireStationsMap;
