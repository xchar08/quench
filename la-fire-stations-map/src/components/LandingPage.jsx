// src/components/LandingPage.jsx
import React from 'react';
import { Link } from 'react-router-dom';
import BackgroundParticles from './BackgroundParticles';

export default function LandingPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-gradient-to-br from-[#a6004d] to-[#8a003f] text-white relative overflow-hidden">
      <BackgroundParticles />
      <div className="max-w-3xl w-full space-y-8 relative z-10">
        <div className="flex items-center justify-center space-x-4">
          <span className="text-6xl" role="img" aria-label="Firetruck">🚒</span>
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight">Project Quench</h1>
        </div>
        <p className="text-xl md:text-2xl text-center text-pink-100">
          Advanced fire mitigation solutions for a safer tomorrow.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center space-y-4 sm:space-y-0 sm:space-x-4">
          <Link
            to="/map"
            className="px-8 py-3 text-lg font-semibold rounded-full bg-white text-[#a6004d] hover:bg-pink-100 transition duration-300 ease-in-out transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-pink-300"
          >
            Explore Map
          </Link>
          <a
            href="/about"
            className="px-8 py-3 text-lg font-semibold rounded-full border-2 border-white hover:bg-white hover:text-[#a6004d] transition duration-300 ease-in-out transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-pink-300"
          >
            Learn More
          </a>
        </div>
      </div>
      <footer className="absolute bottom-4 text-sm text-pink-200 z-10">
        © 2025 Project Quench. All rights reserved.
      </footer>
    </div>
  );
}
