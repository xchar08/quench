// src/App.jsx
import React from 'react';
import { BrowserRouter as Router, Route, Routes, Link } from 'react-router-dom';
import FireStationsMap from './components/FireStationsMap';
import LandingPage from './components/LandingPage';
import About from './components/About'; // Import the new About component
import ErrorBoundary from './ErrorBoundary';

function App() {
  return (
    <Router>
      <ErrorBoundary>
        <div className="flex flex-col h-screen">
          <nav className="bg-[#a6004d] p-4">
            <ul className="flex space-x-4">
              <li>
                <Link to="/" className="text-white hover:text-pink-200">Home</Link>
              </li>
              <li>
                <Link to="/map" className="text-white hover:text-pink-200">Fire Map</Link>
              </li>
              <li>
                <Link to="/about" className="text-white hover:text-pink-200">About</Link>
              </li>
            </ul>
          </nav>
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/map" element={<FireStationsMap />} />
            <Route path="/about" element={<About />} />
          </Routes>
        </div>
      </ErrorBoundary>
    </Router>
  );
}

export default App;
