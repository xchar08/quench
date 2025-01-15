// src/components/BackgroundParticles.jsx
import React from "react";

function BackgroundParticles() {
  const particles = Array.from({ length: 30 });

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {particles.map((_, index) => (
        <div
          key={index}
          className="absolute text-4xl opacity-0 animate-fire"
          style={{
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
            animationDuration: `${Math.random() * 5 + 5}s`,
            animationDelay: `${Math.random() * 5}s`,
            transform: `scale(${Math.random() * 0.5 + 0.5})`,
          }}
        >
          🔥
        </div>
      ))}
    </div>
  );
}

export default BackgroundParticles;
