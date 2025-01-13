import React from 'react';
import Navigation from './components/Navigation';
import DeploymentMap from './components/DeploymentMap';

function App() {
  return (
    <div>
      <Navigation />
      <section id="home" className="p-4">
        <h2 className="text-xl font-bold">Home</h2>
        <p>Welcome to the Fire Mitigation application.</p>
      </section>
      <section id="about" className="p-4">
        <h2 className="text-xl font-bold">About</h2>
        <p>About our solutions and strategies.</p>
      </section>
      <section id="contact" className="p-4">
        <h2 className="text-xl font-bold">Contact</h2>
        <p>Get in touch with us.</p>
      </section>
      <section id="deployment" className="p-4">
        <h2 className="text-xl font-bold mb-4">Optimal Deployment Plan</h2>
        <DeploymentMap />
      </section>
    </div>
  );
}

export default App;
