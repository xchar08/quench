// frontend/src/components/DeploymentMap.jsx
import React, { useEffect, useState } from "react";
import { GoogleMap, LoadScript, Marker, Polyline } from "@react-google-maps/api";

const mapContainerStyle = { width: "100%", height: "600px" };
const center = { lat: 36.7783, lng: -119.4179 }; // Center of California

const DeploymentMap = () => {
  const [stations, setStations] = useState([]);
  const [hydrants, setHydrants] = useState([]);
  const [wildfires, setWildfires] = useState([]);
  const [optimalRoute, setOptimalRoute] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetch(`${import.meta.env.VITE_BACKEND_API_URL}/optimal-deployment`)
      .then((res) => {
        if (!res.ok) {
          throw new Error(`HTTP error! Status: ${res.status}`);
        }
        return res.json();
      })
      .then((data) => {
        if (data.error) {
          setError(data.error);
        } else {
          setStations(data.stations || []);
          setHydrants(data.hydrants || []);
          setWildfires(data.wildfires || []);
          setOptimalRoute(data.route || []);
        }
      })
      .catch((err) => {
        console.error("Failed to fetch deployment data:", err);
        setError(err.message);
      });
  }, []);

  return (
    <div>
      {error && (
        <div className="bg-red-500 text-white p-2 mb-4 rounded">
          Error: {error}
        </div>
      )}
      <LoadScript googleMapsApiKey={import.meta.env.VITE_GOOGLE_MAPS_API_KEY}>
        <GoogleMap mapContainerStyle={mapContainerStyle} center={center} zoom={6}>
          {/* Markers for fire stations */}
          {stations.map((pos, index) => (
            <Marker key={`station-${index}`} position={pos} label="S" />
          ))}

          {/* Markers for hydrants */}
          {hydrants.map((pos, index) => (
            <Marker key={`hydrant-${index}`} position={pos} label="H" />
          ))}

          {/* Markers for wildfires */}
          {wildfires.map((pos, index) => (
            <Marker key={`wildfire-${index}`} position={pos} label="W" />
          ))}

          {/* Draw the optimal route as a polyline */}
          {optimalRoute.length > 1 && (
            <Polyline
              path={optimalRoute}
              options={{ strokeColor: "#FF0000", strokeWeight: 2 }}
            />
          )}
        </GoogleMap>
      </LoadScript>
    </div>
  );
};

export default DeploymentMap;
