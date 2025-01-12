import React from "react";
import Navigation from "./Components/Navigation";

import "./App.css";
import PageOrdering from "./Pages/PageOrdering";

function App() {
  return (
    <div className="App">
      {
        <>
          <Navigation />
          <PageOrdering />
        </>
      }
    </div>
  );
}

export default App;
