// src/App.jsx
import React from 'react';
import { BrowserRouter as Router, Route, Routes, Link } from 'react-router-dom';
import FireStationsMap from './components/FireStationsMap';
import ErrorBoundary from './ErrorBoundary';

function App() {
  return (
    <Router>
      <ErrorBoundary>
        <div className="flex flex-col h-screen">
          <nav className="bg-orange-500 p-4">
            <ul className="flex space-x-4">
              <li>
                <Link to="/" className="text-white hover:text-orange-200">Home</Link>
              </li>
              <li>
                <Link to="/map" className="text-white hover:text-orange-200">Fire Map</Link>
              </li>
              <li>
                <Link to="/about" className="text-white hover:text-orange-200">About</Link>
              </li>
            </ul>
          </nav>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/map" element={<FireStationsMap />} />
            <Route path="/about" element={<About />} />
          </Routes>
        </div>
      </ErrorBoundary>
    </Router>
  );
}

function Home() {
  return <div className="p-4">Welcome to Project Quench</div>;
}

function About() {
  return <div className="p-4">About Project Quench</div>;
}

export default App;
