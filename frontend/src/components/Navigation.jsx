// frontend/src/components/Navigation.jsx
import React, { useState } from "react";
import AnchorLink from "react-anchor-link-smooth-scroll";

const Navigation = () => {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <nav className="bg-gray-900 text-white p-4 sticky top-0 z-50">
      <div className="flex justify-between items-center">
        <div className="text-2xl font-bold">Fire Mitigation</div>
        {/* Hamburger menu for mobile */}
        <button
          className="md:hidden focus:outline-none"
          onClick={() => setMenuOpen(!menuOpen)}
        >
          <span className="block w-6 h-1 bg-white mb-1"></span>
          <span className="block w-6 h-1 bg-white mb-1"></span>
          <span className="block w-6 h-1 bg-white"></span>
        </button>
      </div>
      {/* Navigation Links */}
      <ul
        className={`mt-2 md:mt-0 md:flex md:space-x-4 ${
          menuOpen ? "block" : "hidden"
        } md:block`}
      >
        <li>
          <AnchorLink
            href="#home"
            className="block px-2 py-1 rounded hover:bg-blue-800"
            onClick={() => setMenuOpen(false)}
          >
            Home
          </AnchorLink>
        </li>
        <li>
          <AnchorLink
            href="#about"
            className="block px-2 py-1 rounded hover:bg-blue-800"
            onClick={() => setMenuOpen(false)}
          >
            About
          </AnchorLink>
        </li>
        <li>
          <AnchorLink
            href="#contact"
            className="block px-2 py-1 rounded hover:bg-blue-800"
            onClick={() => setMenuOpen(false)}
          >
            Contact
          </AnchorLink>
        </li>
        <li>
          <AnchorLink
            href="#deployment"
            className="block px-2 py-1 rounded hover:bg-blue-800"
            onClick={() => setMenuOpen(false)}
          >
            Deployment Plan
          </AnchorLink>
        </li>
      </ul>
    </nav>
  );
};

export default Navigation;
