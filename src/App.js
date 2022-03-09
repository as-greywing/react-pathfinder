import React from "react";

// import Calculator from "./components/Calculator";
import SideBar from "./components/SideBar";
import Map from "./mapbox/map";
import NavigationControl from "./components/NavigationControl";
import { CalculatorProvider } from "./context/CalculatorContext";

import "mapbox-gl/dist/mapbox-gl.css";
import "bootstrap/dist/css/bootstrap.min.css";
import "./App.css";
import Routes from "./components/Routes";

const accessToken = process.env.REACT_APP_MAP_ACCESS_TOKEN;

function App() {
  return (
    <div className="vw-100 vh-100">
      <Map
        id="main-map"
        initialViewState={{
          latitude: 40,
          longitude: -100,
          zoom: 1,
          bearing: 0,
          pitch: 0,
        }}
        mapStyle="mapbox://styles/greywing-operations/ckvc7m1vlagg415qq2356iddy"
        mapboxAccessToken={accessToken}
      >
        <NavigationControl position="top-left" />
        <CalculatorProvider>
          <Routes />
          <SideBar />
        </CalculatorProvider>
      </Map>
    </div>
  );
}

export default App;
