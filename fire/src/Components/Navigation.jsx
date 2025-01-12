import React, { useState } from "react";
import { Link, NavLink } from "react-router-dom";
import AnchorLink from "react-anchor-link-smooth-scroll";

import "./Navigation.css";

const Navigation = () => {
  //const [menuOpen, setMenuOpen] = useState(false);

  return (
    // <nav>
    //   <Link to="/" className="title">
    //     Website
    //   </Link>
    //   <div className="menu" onClick={() => setMenuOpen(!menuOpen)}>
    //     <span></span>
    //     <span></span>
    //   </div>
    //   <ul className={menuOpen ? "open" : ""}>
    //     <li>
    //       <NavLink to="/">Home</NavLink>
    //     </li>
    //     <li>
    //       <NavLink to="/about">About</NavLink>
    //     </li>
    //     <li>
    //       <NavLink to="/contact">Contact</NavLink>
    //     </li>
    //   </ul>
    // </nav>
    <>
      <nav>
        Website Name
        <span></span>
        <span></span>
        <ul>
          <li>
            <AnchorLink href="#home">Home</AnchorLink>
          </li>
          <li>
            <AnchorLink href="#about">About</AnchorLink>
          </li>
          <li>
            <AnchorLink href="#contact">Contact</AnchorLink>
          </li>
        </ul>
      </nav>
    </>
  );
};

export default Navigation;
