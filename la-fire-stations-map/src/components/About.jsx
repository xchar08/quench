import React from 'react';
import BackgroundParticles from './BackgroundParticles';

function About() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-gradient-to-br from-[#a6004d] to-[#8a003f] text-white relative overflow-hidden">
      <BackgroundParticles />
      <div className="max-w-3xl w-full space-y-8 relative z-10">
        <div className="flex items-center justify-center space-x-4">
          <span className="text-5xl" role="img" aria-label="Fire Extinguisher">🧯</span>
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight">About Project Quench</h1>
        </div>
        <p className="text-xl text-center text-pink-100">
          Project Quench is at the forefront of fire mitigation technology, leveraging advanced AI and real-time data to protect communities.
        </p>
        <div className="space-y-6">
          <section>
            <h2 className="text-2xl font-semibold mb-2">Our Mission</h2>
            <p className="text-pink-100">
              To revolutionize fire prevention and response, ensuring safer communities through innovative technology and data-driven solutions.
            </p>
          </section>
          <section>
            <h2 className="text-2xl font-semibold mb-2">Key Features</h2>
            <ul className="list-disc list-inside text-pink-100">
              <li>Real-time fire tracking and prediction</li>
              <li>AI-powered resource allocation</li>
              <li>Interactive mapping of fire stations and hydrants</li>
              <li>Community alert system</li>
            </ul>
          </section>
          <section>
            <h2 className="text-2xl font-semibold mb-2">Our Team</h2>
            <p className="text-pink-100">
              Project Quench is developed by a dedicated team of fire safety experts, data scientists, and software engineers committed to making a difference.
            </p>
          </section>
        </div>
      </div>
      <footer className="absolute bottom-4 text-sm text-pink-200 z-10">
        © 2025 Project Quench. All rights reserved.
      </footer>
    </div>
  );
}

export default About;
