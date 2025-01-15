// src/components/FireStationsMap.jsx
import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { Loader } from '@googlemaps/js-api-loader';
import Papa from 'papaparse';
import * as tf from '@tensorflow/tfjs';

// IMAGE IMPORTS (adjust paths for your setup)
import hydrantpng from '../assets/firehydrant.png';
import firetruckPng from '../assets/firetruck.png';
import shelterPng from '../assets/shelter.png';
import firestationPng from '../assets/firestation.png';
import spinningCatGif from '../assets/spinningcat.gif';

// Chatbot images
import chatbotImg1 from '../assets/chatbot/bot1.png';
import chatbotImg2 from '../assets/chatbot/bot2.png';

// ENV (from your .env)
const googleMapsApiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
const mapId = import.meta.env.VITE_GOOGLE_MAPS_MAP_ID;

/**
 * createCirclePolygonGeoJson:
 *  Generates a ring of lat/lng points forming a circle => used for "avoid_polygons".
 */
function createCirclePolygonGeoJson(lat, lng, radiusKm = 10, sides = 36) {
  // ~1 deg latitude ~ 111 km
  const degRadius = radiusKm / 111;
  const coords = [];
  for (let i = 0; i < sides; i++) {
    const angle = (2 * Math.PI * i) / sides;
    const dx = degRadius * Math.cos(angle);
    const dy = degRadius * Math.sin(angle);
    coords.push([lng + dx, lat + dy]);
  }
  coords.push(coords[0]); // close ring
  return coords;
}

/** 
 * QUIRKY INSURANCE CHATBOT (Burnie) using server-side proxy for Nebius AI
 */
function QuirkyInsuranceChatbot() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content:
        "Hello! I'm Burnie, your 2025 CA wildfire insurance & safety chatbot! Ask me about: \n- How to pack a go-bag \n- How to file insurance claims for lost property",
    },
  ]);
  const [userInput, setUserInput] = useState('');
  const [botImageIndex, setBotImageIndex] = useState(0);

  const chatbotImages = [chatbotImg1, chatbotImg2];

  const handleSend = async () => {
    if (!userInput.trim()) return;
    const userMsg = userInput;
    setUserInput('');
    const updated = [...messages, { role: 'user', content: userMsg }];
    setMessages(updated);
    setBotImageIndex((prev) => (prev + 1) % 2);

    try {
      const response = await fetch('/api/nebius-proxy', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          max_tokens: 150,
          temperature: 0.7,
          model: 'meta-llama/Meta-Llama-3.1-70B-Instruct',
          messages: [
            {
              role: 'system',
              content:
                'You are Burnie, a quirky 2025 CA wildfire insurance & safety chatbot with puns & disclaimers.',
            },
            {
              role: 'user',
              content: userMsg,
            },
          ],
        }),
      });

      const aiResult = await response.json();
      const aiContent = aiResult.choices[0].message.content;
      setMessages((prev) => [...prev, { role: 'assistant', content: aiContent }]);
    } catch (err) {
      console.error('Nebius AI error:', err);
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: 'Burnie had trouble connecting to Nebius. Sorry!' },
      ]);
    }
  };

  return (
    <div className="absolute bottom-4 left-4 z-[9999] font-sans">
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="bg-orange-500 hover:bg-orange-600 text-white rounded-md px-4 py-2 font-bold shadow-lg transition-colors"
        >
          Chat with Burnie
        </button>
      )}

      {isOpen && (
        <div className="flex flex-col w-80 h-96 bg-white rounded-lg shadow-lg overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-orange-400 to-orange-600 text-white px-4 py-3 flex items-center relative">
            <img
              src={chatbotImages[botImageIndex]}
              alt="Burnie"
              className="w-8 h-8 rounded-full mr-2"
            />
            <div className="font-bold text-sm">Burnie - Wildfire Chat</div>
            <button
              onClick={() => setIsOpen(false)}
              className="absolute right-3 top-2 text-white text-xl leading-none"
            >
              &times;
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto bg-gray-50 p-2">
            {messages.map((msg, i) => {
              const isBurnie = msg.role === 'assistant' || msg.role === 'system';
              return (
                <div
                  key={i}
                  className={`my-2 flex flex-col ${isBurnie ? 'items-start' : 'items-end'}`}
                >
                  <div
                    className={`max-w-[70%] px-3 py-2 rounded-lg shadow text-sm ${
                      isBurnie ? 'bg-orange-100 text-orange-900' : 'bg-gray-200 text-gray-800'
                    }`}
                  >
                    <span className="font-semibold block mb-1">{isBurnie ? 'Burnie' : 'You'}</span>
                    <span className="whitespace-pre-line break-words">{msg.content}</span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Input */}
          <div className="border-t border-gray-200 p-2 bg-white flex items-center">
            <input
              type="text"
              value={userInput}
              onChange={(e) => setUserInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSend();
              }}
              placeholder="Ask away..."
              className="flex-1 border border-gray-300 rounded px-2 py-1 mr-2 focus:outline-none focus:ring-2 focus:ring-orange-400"
            />
            <button
              onClick={handleSend}
              className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-1 rounded font-bold transition-colors"
            >
              Send
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * FIRESTATIONSMAP
 * - NASA FIRMS => heatmap (toggle on/off)
 * - NOAA => polygons + spinning cat (toggle on/off)
 * - Fire Stations, Shelters, Hydrants => toggles
 * - Deploy trucks (with firetruck animation)
 * - Find Nearest Shelter => Avoid top 50 brightest fires
 * - TF model
 * - GraphHopper calls => /api/graphhopper-route
 */
const FireStationsMap = () => {
  const [loading, setLoading] = useState(true);
  const [map, setMap] = useState(null);

  // Data
  const [fireStations, setFireStations] = useState([]);
  const [shelters, setShelters] = useState([]);
  const [hydrants, setHydrants] = useState([]);
  const [fireLocations, setFireLocations] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [alertsLoading, setAlertsLoading] = useState(true);

  // Scoreboard
  const [distanceTraveled, setDistanceTraveled] = useState(null);
  const [extinguishedCount, setExtinguishedCount] = useState(0);
  const [activeFires, setActiveFires] = useState(0);

  // Toggles
  const [showFireStations, setShowFireStations] = useState(true);
  const [showShelters, setShowShelters] = useState(true);
  const [showHydrants, setShowHydrants] = useState(true);
  const [showFires, setShowFires] = useState(true);      // toggle NASA FIRMS heatmap
  const [showAlerts, setShowAlerts] = useState(true);    // toggle NOAA Alerts

  // TF model
  const [model, setModel] = useState(null);

  // Refs
  const geocoderRef = useRef(null);
  const heatmapRef = useRef(null);
  const fireStationMarkersRef = useRef([]);
  const shelterMarkersRef = useRef([]);
  const hydrantMarkersRef = useRef([]);
  const alertsRef = useRef([]);          // store NOAA polygons
  const dangerMarkersRef = useRef([]);   // store spinning cat markers
  const truckMarkersRef = useRef([]);
  const [pathPolyline, setPathPolyline] = useState(null);

  // ActiveFires => manually managed
  useEffect(() => {
    setActiveFires(fireLocations.length);
  }, [fireLocations]);

  // ============== TF MODEL (dummy) ==============
  useEffect(() => {
    const trainModel = async () => {
      try {
        const m = tf.sequential();
        m.add(tf.layers.dense({ units: 16, inputShape: [3], activation: 'relu' }));
        m.add(tf.layers.dense({ units: 16, activation: 'relu' }));
        m.add(tf.layers.dense({ units: 2, activation: 'softmax' }));
        m.compile({ optimizer: 'adam', loss: 'categoricalCrossentropy', metrics: ['accuracy'] });

        const xs = tf.randomNormal([60, 3]);
        const ys = tf.oneHot(tf.randomUniform([60], 0, 2, 'int32'), 2);

        await m.fit(xs, ys, {
          epochs: 5,
          validationSplit: 0.1,
          callbacks: {
            onEpochEnd: (ep, logs) => {
              console.log(`Epoch ${ep}: loss=${logs.loss.toFixed(3)}, acc=${logs.acc.toFixed(3)}`);
            },
          },
        });
        setModel(m);
        console.log('Dummy model trained successfully.');
      } catch (err) {
        console.error('Error training TF model:', err);
      }
    };
    trainModel();
  }, []);

  // ============== MAP INIT ==============
  useEffect(() => {
    if (!googleMapsApiKey) {
      console.error('No Google Maps API key found.');
      setLoading(false);
      return;
    }
    const loader = new Loader({
      apiKey: googleMapsApiKey,
      version: 'weekly',
      libraries: ['marker', 'visualization'],
      mapId: mapId || undefined,
    });

    loader
      .load()
      .then((google) => {
        const newMap = new google.maps.Map(document.getElementById('map'), {
          center: { lat: 34.0522, lng: -118.2437 },
          zoom: 9,
        });
        setMap(newMap);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Error loading Google Maps:', err);
        setLoading(false);
      });
  }, []);

  // Geocoder
  useEffect(() => {
    if (map && window.google) {
      geocoderRef.current = new window.google.maps.Geocoder();
    }
  }, [map]);

  // NOAA Summaries => optional
  const summarizeText = async (text) => {
    // skip or use Nebius
    return text || '';
  };

  // NOAA
  useEffect(() => {
    const fetchNOAAAlerts = async () => {
      try {
        setAlertsLoading(true);
        const resp = await axios.get('https://api.weather.gov/alerts/active?area=CA');
        const severe = resp.data.features.filter((f) => {
          const sev = f.properties.severity;
          return sev === 'Severe' || sev === 'Warning' || sev === 'Advisory' || sev === 'Watch';
        });
        for (let a of severe) {
          const summary = await summarizeText(a.properties.description || '');
          a.properties.summary = summary;
        }
        setAlerts(severe);
        setAlertsLoading(false);
      } catch (err) {
        console.error('Error fetching NOAA alerts:', err);
        setAlertsLoading(false);
      }
    };
    fetchNOAAAlerts();
  }, []);

  const getAlertColor = (severity) => {
    switch (severity) {
      case 'Severe': return 'red';
      case 'Warning': return 'orange';
      case 'Watch': return 'blue';
      case 'Advisory': return 'yellow';
      default: return 'green';
    }
  };

  const getPolygonCentroid = (coords) => {
    let latSum = 0, lngSum = 0;
    coords.forEach(([ln, la]) => {
      latSum += la;
      lngSum += ln;
    });
    return { lat: latSum / coords.length, lng: lngSum / coords.length };
  };

  // Draw NOAA polygons + cat markers
  useEffect(() => {
    const drawNOAAAlerts = async () => {
      if (!map || !window.google || alertsLoading || !alerts.length) return;

      // Clear old polygons/markers
      alertsRef.current.forEach((p) => p.setMap(null));
      dangerMarkersRef.current.forEach((m) => m.setMap(null));
      alertsRef.current = [];
      dangerMarkersRef.current = [];

      alerts.forEach((alert) => {
        const sev = alert.properties.severity || 'Unknown';
        const color = getAlertColor(sev);
        const zones = alert.properties.affectedZones;
        if (zones && zones.length > 0) {
          zones.forEach(async (zoneUrl) => {
            try {
              const resp = await axios.get(zoneUrl);
              const zoneData = resp.data;
              if (
                zoneData.geometry &&
                zoneData.geometry.type === 'Polygon' &&
                zoneData.geometry.coordinates
              ) {
                const coords = zoneData.geometry.coordinates[0];
                const polygonPath = coords.map(([ln, la]) => ({ lat: la, lng: ln }));

                const polygon = new window.google.maps.Polygon({
                  paths: polygonPath,
                  strokeColor: color,
                  strokeOpacity: 0.2,
                  strokeWeight: 2,
                  fillColor: color,
                  fillOpacity: 0.1,
                  map: showAlerts ? map : null,
                });

                const infoText = alert.properties.summary || alert.properties.description || '';
                const infoWindow = new window.google.maps.InfoWindow({
                  content: `<div><p style="color:${color}">${alert.properties.headline || 'Hazard Alert'}</p><p>${infoText}</p></div>`,
                });
                polygon.addListener('click', (e) => {
                  infoWindow.setPosition(e.latLng);
                  infoWindow.open(map);
                });
                alertsRef.current.push(polygon);

                // Create a custom overlay class for the cat gif
                class CatOverlay extends window.google.maps.OverlayView {
                  constructor(bounds, paths) {
                    super();
                    this.bounds = bounds;
                    this.paths = paths;
                  }

                  onAdd() {
                    const div = document.createElement('div');
                    div.style.position = 'absolute';
                    div.style.overflow = 'hidden';

                    // Create SVG for clipping
                    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
                    svg.setAttribute('style', 'position: absolute; width: 100%; height: 100%;');

                    // Create clipPath
                    const clipPath = document.createElementNS('http://www.w3.org/2000/svg', 'clipPath');
                    clipPath.setAttribute('id', `clip-${Math.random().toString(36).substr(2, 9)}`);

                    // Create polygon for clipping
                    const clipPolygon = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');

                    // Create image that fills the div
                    const img = document.createElement('img');
                    img.src = spinningCatGif;
                    img.style.width = '100%';
                    img.style.height = '100%';
                    img.style.objectFit = 'cover';
                    img.style.clipPath = `url(#${clipPath.getAttribute('id')})`;

                    clipPath.appendChild(clipPolygon);
                    svg.appendChild(clipPath);
                    div.appendChild(svg);
                    div.appendChild(img);

                    this.div = div;
                    const panes = this.getPanes();
                    panes.overlayLayer.appendChild(div);
                  }

                  draw() {
                    const overlayProjection = this.getProjection();

                    // Convert bounds to pixel coordinates
                    const sw = overlayProjection.fromLatLngToDivPixel(this.bounds.getSouthWest());
                    const ne = overlayProjection.fromLatLngToDivPixel(this.bounds.getNorthEast());

                    const div = this.div;
                    div.style.left = sw.x + 'px';
                    div.style.top = ne.y + 'px';
                    div.style.width = (ne.x - sw.x) + 'px';
                    div.style.height = (sw.y - ne.y) + 'px';

                    // Update clip path points
                    const points = this.paths.map(path => {
                      const pixel = overlayProjection.fromLatLngToDivPixel(path);
                      return `${pixel.x - sw.x},${pixel.y - ne.y}`;
                    }).join(' ');

                    const clipPolygon = div.querySelector('polygon');
                    clipPolygon.setAttribute('points', points);
                  }

                  onRemove() {
                    if (this.div) {
                      this.div.parentNode.removeChild(this.div);
                      this.div = null;
                    }
                  }
                }

                // Store polygon bounds and paths
                const bounds = new window.google.maps.LatLngBounds();
                polygonPath.forEach(path => bounds.extend(path));

                // Add click listeners
                polygon.addListener('click', (e) => {
                  // Show info window
                  infoWindow.setPosition(e.latLng);
                  infoWindow.open(map);

                  if (showAlerts) {
                    // Remove any existing overlays
                    dangerMarkersRef.current.forEach(overlay => overlay.setMap(null));

                    // Create and add new overlay
                    const catOverlay = new CatOverlay(bounds, polygonPath);
                    catOverlay.setMap(map);

                    // Store reference to current overlay
                    dangerMarkersRef.current = [catOverlay];
                  }
                });

                // Add listener to hide overlay when info window closes
                infoWindow.addListener('closeclick', () => {
                  dangerMarkersRef.current.forEach(overlay => overlay.setMap(null));
                  dangerMarkersRef.current = [];
                });
              }
            } catch (er) {
              console.error('Error fetching NOAA zone data:', er);
            }
          });
        }
      });
    };

    drawNOAAAlerts();
  }, [map, alerts, alertsLoading, showAlerts]);

  // NASA FIRMS => fetch fires
  const csvToJson = (csv) => {
    const parsed = Papa.parse(csv, {
      header: true,
      skipEmptyLines: true,
      dynamicTyping: true,
    });
    return parsed.data.map((fire, index) => ({
      id: index, // Assign a unique ID to each fire
      latitude: parseFloat(fire.latitude),
      longitude: parseFloat(fire.longitude),
      bright_ti4: parseFloat(fire.bright_ti4),
    }));
  };
  useEffect(() => {
    const fetchFires = async () => {
      try {
        const resp = await fetch(
          'https://firms.modaps.eosdis.nasa.gov/api/area/csv/d3ff7053e821cf760bf415e628a9dce7/VIIRS_SNPP_NRT/-124,32,-113,42/10/2025-01-01'
        );
        const text = await resp.text();
        const fires = csvToJson(text) || [];
        setFireLocations(Array.isArray(fires) ? fires : []);
      } catch (err) {
        console.error('Error fetching NASA FIRMS data:', err);
        setFireLocations([]);
      }
    };
    fetchFires();
  }, []);

  // Fire Stations
  useEffect(() => {
    const fetchStations = async () => {
      try {
        const resp = await axios.get('https://data.lacity.org/resource/rnb4-daiw.json');
        setFireStations(resp.data || []);
      } catch (err) {
        console.error('Error fetching LA Fire Stations:', err);
        setFireStations([]);
      }
    };
    fetchStations();
  }, []);

  // Shelters => from local Node server
  useEffect(() => {
    const fetchShelters = async () => {
      try {
        const resp = await axios.get('http://localhost:5000/api/shelters');
        setShelters(resp.data || []);
      } catch (err) {
        console.error('Error fetching shelters:', err);
        setShelters([]);
      }
    };
    fetchShelters();
  }, []);

  // Hydrants => local JSON
  useEffect(() => {
    const fetchHydrants = async () => {
      try {
        const resp = await fetch('/data/Hydrants.json');
        const jData = await resp.json();
        if (jData && jData.features) {
          const arr = jData.features.map((feat) => ({
            objectId: feat.attributes?.OBJECTID,
            sizeCode: feat.attributes?.SIZE_CODE,
            latitude: feat.geometry?.y,
            longitude: feat.geometry?.x,
          }));
          setHydrants(arr);
        } else {
          setHydrants([]);
        }
      } catch (err) {
        console.error('Error fetching hydrants:', err);
        setHydrants([]);
      }
    };
    fetchHydrants();
  }, []);

  // Fire Stations => Markers
  useEffect(() => {
    if (!map || !window.google || !fireStations.length) return;
    fireStationMarkersRef.current.forEach((m) => m.setMap(null));
    fireStationMarkersRef.current = [];

    fireStations.forEach((station) => {
      const { the_geom, shp_addr, address } = station;
      if (!the_geom || !the_geom.coordinates) return;
      const [lng, lat] = the_geom.coordinates;
      const latNum = parseFloat(lat), lngNum = parseFloat(lng);
      if (isNaN(latNum) || isNaN(lngNum)) return;

      const marker = new window.google.maps.Marker({
        position: { lat: latNum, lng: lngNum },
        icon: {
          url: firestationPng,
          scaledSize: new window.google.maps.Size(30, 30),
        },
        title: shp_addr || 'Fire Station',
        map: showFireStations ? map : null,
      });

      const infoWindow = new window.google.maps.InfoWindow({
        content: `<div><h2>${shp_addr}</h2><p>${address}</p></div>`,
      });
      marker.addListener('click', () => infoWindow.open(map, marker));
      fireStationMarkersRef.current.push(marker);
    });
  }, [map, fireStations, showFireStations]);

  // Shelters => Markers
  useEffect(() => {
    if (!map || !window.google || !shelters.length) return;
    shelterMarkersRef.current.forEach((m) => m.setMap(null));
    shelterMarkersRef.current = [];

    shelters.forEach((sh) => {
      const { latitude, longitude, name, streetAddress, city, state, zip } = sh;
      if (!latitude || !longitude) return;
      const latNum = parseFloat(latitude), lngNum = parseFloat(longitude);
      if (isNaN(latNum) || isNaN(lngNum)) return;

      const marker = new window.google.maps.Marker({
        position: { lat: latNum, lng: lngNum },
        icon: {
          url: shelterPng,
          scaledSize: new window.google.maps.Size(28, 28),
        },
        title: name || 'Shelter',
        map: showShelters ? map : null,
      });

      const infoWindow = new window.google.maps.InfoWindow({
        content: `<div>
          <h3>${name}</h3>
          <p>${streetAddress}, ${city}, ${state} ${zip}</p>
        </div>`,
      });
      marker.addListener('click', () => infoWindow.open(map, marker));
      shelterMarkersRef.current.push(marker);
    });
  }, [map, shelters, showShelters]);

  // Hydrants => Markers
  useEffect(() => {
    if (!map || !window.google || !hydrants.length) return;
    hydrantMarkersRef.current.forEach((m) => m.setMap(null));
    hydrantMarkersRef.current = [];

    hydrants.forEach((hyd) => {
      const latNum = parseFloat(hyd.latitude), lngNum = parseFloat(hyd.longitude);
      if (isNaN(latNum) || isNaN(lngNum)) return;

      const marker = new window.google.maps.Marker({
        position: { lat: latNum, lng: lngNum },
        icon: {
          url: hydrantpng,
          scaledSize: new window.google.maps.Size(8, 10),
        },
        title: hyd.sizeCode || 'Hydrant',
        map: showHydrants ? map : null,
      });
      hydrantMarkersRef.current.push(marker);
    });
  }, [map, hydrants, showHydrants]);

  // NASA => Heatmap
  useEffect(() => {
    if (!map || !window.google) return;

    if (heatmapRef.current) {
      heatmapRef.current.setMap(null);
    }
    if (!showFires || !fireLocations.length) {
      return;
    }

    const points = fireLocations
      .map((f) => {
        if (isNaN(f.latitude) || isNaN(f.longitude)) return null;
        return {
          location: new window.google.maps.LatLng(f.latitude, f.longitude),
          weight: f.bright_ti4 || 1,
        };
      })
      .filter(Boolean);

    heatmapRef.current = new window.google.maps.visualization.HeatmapLayer({
      data: points,
      map: showFires ? map : null,
      radius: 30,
    });
  }, [map, fireLocations, showFires]);

  // NOAA => Toggling polygons/cats
  useEffect(() => {
    if (!map || !window.google) return;
    if (!alertsRef.current.length && !dangerMarkersRef.current.length) return;

    alertsRef.current.forEach((poly) => poly.setMap(showAlerts ? map : null));
    dangerMarkersRef.current.forEach((cat) => cat.setMap(showAlerts ? map : null));
  }, [map, showAlerts]);

  // Fire Extinguish
  const removeFire = (fireId) => {
    setFireLocations((old) => old.filter((f) => f.id !== fireId));
    setExtinguishedCount((prev) => prev + 1);
    setActiveFires((prev) => prev - 1);
  };
  const handleFireExtinguish = (fire) => {
    let val = fire.bright_ti4 || 0;
    if (val > 330) val -= 200;
    else if (val > 300) val -= 150;
    else val -= 100;
    if (val < 0) val = 0;
    fire.bright_ti4 = val;

    if (val < 50) {
      removeFire(fire.id);
    } else {
      setFireLocations((old) => [...old]);
    }
  };

  // Animate truck marker along coords
  const animateTruckSprite = (pathCoords, fire) => {
    if (!map || !window.google || !pathCoords.length) return;

    const marker = new window.google.maps.Marker({
      position: pathCoords[0],
      map,
      icon: {
        url: firetruckPng,
        scaledSize: new window.google.maps.Size(35, 35),
      },
    });
    truckMarkersRef.current.push(marker);

    let idx = 0;
    const interval = setInterval(() => {
      idx++;
      if (idx >= pathCoords.length) {
        clearInterval(interval);
        handleFireExtinguish(fire);
        marker.setMap(null);
        setActiveFires((prev) => prev - 1);
        setExtinguishedCount((prev) => prev + 1);
      } else {
        marker.setPosition(pathCoords[idx]);
      }
    }, 100);
  };

  const postRouteToServer = async (bodyData) => {
    const url = 'http://localhost:5000/api/graphhopper-route';
    const resp = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(bodyData),
    });
    if (!resp.ok) {
      throw new Error(`GraphHopper proxy error: ${resp.status} - ${resp.statusText}`);
    }
    return resp.json();
  };

  const fetchRouteAvoidingFires = async (origin, dest) => {
    if (!fireLocations || !fireLocations.length) {
      console.warn('No fires => no avoids. Returning direct route...');
      return postRouteToServer({
        points: [
          [origin.lng, origin.lat],
          [dest.lng, dest.lat],
        ],
        vehicle: 'car',
        points_encoded: false,
      });
    }
    const sorted = [...fireLocations].sort((a, b) => (b.bright_ti4 || 0) - (a.bright_ti4 || 0));
    const topFires = sorted.slice(0, 50);
    const circles = topFires.map((f) =>
      createCirclePolygonGeoJson(f.latitude, f.longitude, 10, 36)
    );
    const multiPolygon = {
      type: 'MultiPolygon',
      coordinates: circles.map((c) => [c]),
    };

    const bodyData = {
      points: [
        [origin.lng, origin.lat],
        [dest.lng, dest.lat],
      ],
      vehicle: 'car',
      points_encoded: false,
      avoid_polygons: multiPolygon,
    };
    return postRouteToServer(bodyData);
  };

  const fetchRouteSimple = async (origin, dest) => {
    const bodyData = {
      points: [
        [origin.lng, origin.lat],
        [dest.lng, dest.lat],
      ],
      vehicle: 'car',
      points_encoded: false,
    };
    return postRouteToServer(bodyData);
  };

  const handleSearch = async () => {
    if (!geocoderRef.current) return;
    setDistanceTraveled(null);

    const addrEl = document.getElementById('address-input');
    if (!addrEl) return;
    const address = addrEl.value.trim();
    if (!address) {
      alert('Please enter an address.');
      return;
    }

    geocoderRef.current.geocode({ address }, async (results, status) => {
      if (status === 'OK' && results[0]) {
        const loc = results[0].geometry.location;
        const userLat = loc.lat();
        const userLng = loc.lng();

        let nearest = null;
        let minDist = Infinity;
        for (let s of shelters) {
          const lat = parseFloat(s.latitude), lng = parseFloat(s.longitude);
          if (isNaN(lat) || isNaN(lng)) continue;
          const dist = Math.sqrt((userLat - lat) ** 2 + (userLng - lng) ** 2);
          if (dist < minDist) {
            minDist = dist;
            nearest = { lat, lng };
          }
        }
        if (!nearest) {
          alert('No shelter found.');
          return;
        }

        try {
          const routeData = await fetchRouteAvoidingFires(
            { lat: userLat, lng: userLng },
            nearest
          );
          if (routeData.paths && routeData.paths.length > 0) {
            const pathObj = routeData.paths[0];
            const coords = pathObj.points.coordinates.map(([ln, la]) => ({
              lat: la,
              lng: ln,
            }));
            if (pathPolyline) pathPolyline.setMap(null);

            const newPolyline = new window.google.maps.Polyline({
              path: coords,
              geodesic: true,
              strokeColor: '#00BFFF',
              strokeOpacity: 0.8,
              strokeWeight: 5,
              map,
            });
            setPathPolyline(newPolyline);

            if (pathObj.distance) setDistanceTraveled(pathObj.distance);
            map.setCenter(coords[0]);
            map.setZoom(10);
          } else {
            alert('No route found. Possibly due to limited avoids.');
          }
        } catch (err) {
          console.error('Error fetching route:', err);
          alert(`Error fetching route: ${err.message}`);
        }
      } else {
        alert('Geocode was not successful: ' + status);
      }
    });
  };

  const simulateTruckDeployment = async () => {
    if (!map || !window.google) return;

    truckMarkersRef.current.forEach((mk) => mk.setMap(null));
    truckMarkersRef.current = [];

    const sorted = [...fireLocations].sort((a, b) => (b.bright_ti4 || 0) - (a.bright_ti4 || 0));

    for (let station of fireStations) {
      const { the_geom } = station;
      if (!the_geom || !the_geom.coordinates) continue;
      const [lng, lat] = the_geom.coordinates;
      const stLat = parseFloat(lat), stLng = parseFloat(lng);
      if (isNaN(stLat) || isNaN(stLng)) continue;

      let bestFire = null, bestScore = -Infinity;
      for (let fire of sorted) {
        if (fire.assigned) continue;
        const dist = Math.sqrt((stLat - fire.latitude) ** 2 + (stLng - fire.longitude) ** 2);
        const brightness = fire.bright_ti4 || 1;
        const score = brightness / (dist + 0.01);
        if (score > bestScore) {
          bestScore = score;
          bestFire = fire;
        }
      }
      if (bestFire) {
        bestFire.assigned = true;
        const origin = { lat: stLat, lng: stLng };
        const destination = { lat: bestFire.latitude, lng: bestFire.longitude };

        try {
          const routeData = await fetchRouteSimple(origin, destination);
          if (routeData.paths && routeData.paths.length > 0) {
            const coords = routeData.paths[0].points.coordinates.map(([ln, la]) => ({
              lat: la,
              lng: ln,
            }));
            new window.google.maps.Polyline({
              path: coords,
              geodesic: true,
              strokeColor: '#FF0000',
              strokeOpacity: 0.8,
              strokeWeight: 4,
              map,
            });
            animateTruckSprite(coords, bestFire);
          }
        } catch (err) {
          console.error('Error route for truck:', err);
        }
      }
    }
  };

  return (
    <div className="relative w-full h-screen font-sans">
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-80 z-50">
          <div className="text-xl font-semibold">Loading Map...</div>
        </div>
      )}

      {/* Control Panel */}
      <div className="absolute top-4 left-4 z-50 bg-white bg-opacity-95 p-4 rounded-xl shadow-lg w-80 space-y-3">
        <input
          id="address-input"
          type="text"
          placeholder="Enter your address"
          className="w-full border border-gray-300 rounded px-2 py-1"
        />

        <div className="flex space-x-2">
          <button
            onClick={handleSearch}
            className="flex-1 bg-blue-500 hover:bg-blue-600 text-white py-2 rounded font-bold transition-colors"
          >
            Find Nearest Shelter
          </button>
          <button
            onClick={simulateTruckDeployment}
            className="flex-1 bg-red-500 hover:bg-red-600 text-white py-2 rounded font-bold transition-colors"
          >
            Deploy Trucks
          </button>
        </div>

        {/* Scoreboard */}
        <div className="text-gray-800 font-bold space-y-1">
          <div>
            Distance Traveled:
            {distanceTraveled == null
              ? ' N/A'
              : distanceTraveled < 1000
              ? ` ${distanceTraveled.toFixed(1)} m`
              : ` ${(distanceTraveled / 1000).toFixed(2)} km`}
          </div>
          <div>Starting # of Fires: {activeFires}</div>
          <div>Extinguished Fires: {extinguishedCount}</div>
        </div>

        {/* Toggles */}
        <div className="space-y-1 pt-2 pb-2">
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={showFireStations}
              onChange={(e) => setShowFireStations(e.target.checked)}
            />
            <span>Show Fire Stations</span>
          </label>
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={showShelters}
              onChange={(e) => setShowShelters(e.target.checked)}
            />
            <span>Show Shelters</span>
          </label>
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={showHydrants}
              onChange={(e) => setShowHydrants(e.target.checked)}
            />
            <span>Show Hydrants</span>
          </label>

          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={showFires}
              onChange={(e) => setShowFires(e.target.checked)}
            />
            <span>Show Fire Heatmap</span>
          </label>
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={showAlerts}
              onChange={(e) => setShowAlerts(e.target.checked)}
            />
            <span>Show NOAA Alerts</span>
          </label>
        </div>

        {/* Info Icon with Hover */}
        <div className="relative group">
          <div className="cursor-help text-gray-500 hover:text-gray-700">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
              <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
            </svg>
          </div>
          <div className="absolute bottom-full right-0 mb-2 hidden group-hover:block w-64 bg-black bg-opacity-75 text-white text-sm rounded-lg p-2">
            <p className="mb-1"><strong>Data Sources:</strong></p>
            <ul className="list-disc list-inside">
              <li>Fire Stations: LA City Data</li>
              <li>Active Fires: NASA FIRMS</li>
              <li>Weather Alerts: NOAA NWS</li>
              <li>Routing: GraphHopper</li>
            </ul>
          </div>
        </div>
      </div>

      {/* The Map */}
      <div id="map" className="w-full h-full" />

      {/* Quirky Chatbot */}
      <QuirkyInsuranceChatbot />
    </div>
  );
};

export default FireStationsMap;
