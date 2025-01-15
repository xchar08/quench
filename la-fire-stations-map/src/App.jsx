// src/App.jsx
import React from 'react';
import FireStationsMap from './components/FireStationsMap';
import ErrorBoundary from './ErrorBoundary';

function App() {
  return (
    <ErrorBoundary>
      <FireStationsMap />
    </ErrorBoundary>
  );
}

export default App;
