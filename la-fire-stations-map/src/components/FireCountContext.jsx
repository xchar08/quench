// src/contexts/FireCountContext.jsx
import React, { createContext, useState } from 'react';

// Create the Context
export const FireCountContext = createContext();

// Create the Provider Component
export const FireCountProvider = ({ children }) => {
  const [activeFires, setActiveFires] = useState(0);
  const [extinguishedCount, setExtinguishedCount] = useState(0);

  // Function to increment extinguished fires
  const incrementExtinguished = () => {
    setExtinguishedCount((prev) => prev + 1);
    console.log(`Extinguished Fires incremented to ${extinguishedCount + 1}`);
  };

  // Function to decrement active fires
  const decrementActive = () => {
    setActiveFires((prev) => Math.max(prev - 1, 0));
    console.log(`Active Fires decremented to ${activeFires - 1}`);
  };

  // Function to set initial active fires
  const setInitialActiveFires = (count) => {
    setActiveFires(count);
    console.log(`Initial Active Fires set to ${count}`);
  };

  return (
    <FireCountContext.Provider
      value={{
        activeFires,
        extinguishedCount,
        incrementExtinguished,
        decrementActive,
        setInitialActiveFires,
      }}
    >
      {children}
    </FireCountContext.Provider>
  );
};
