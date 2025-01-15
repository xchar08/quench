// src/App.jsx
import React from 'react';
import { FireCountProvider } from './contexts/FireCountContext';
import FireStationsMap from './components/FireStationsMap';
// Import other components like Leaderboard here

function App() {
  return (
    <FireCountProvider>
      <FireStationsMap />
      {/* Include other components that need access to fire counts, e.g., <Leaderboard /> */}
    </FireCountProvider>
  );
}

export default App;
