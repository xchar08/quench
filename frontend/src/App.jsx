import React from 'react';
import Navigation from './components/Navigation';

function App() {
  return (
    <div>
      <Navigation />
      <section id="home" className="p-4">
        <h2 className="text-xl font-bold">Home Section</h2>
        <p>Welcome to the Fire Mitigation application.</p>
      </section>
      <section id="about" className="p-4">
        <h2 className="text-xl font-bold">About Section</h2>
        <p>About our solutions and strategies.</p>
      </section>
      <section id="contact" className="p-4">
        <h2 className="text-xl font-bold">Contact Section</h2>
        <p>Get in touch with us.</p>
      </section>
    </div>
  );
}

export default App;
