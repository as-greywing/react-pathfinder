import React from "react";
import { useEffect, useRef, useState } from "react";
import mapboxgl, { LngLatBounds } from "mapbox-gl";

// Style Imports
import "mapbox-gl/dist/mapbox-gl.css";
import generateFeatureCollection from "./GenerateFeature";

const accessToken =
  "pk.eyJ1IjoiZ3JleXdpbmctb3BlcmF0aW9ucyIsImEiOiJja3ZjN2RiaHgwOTgzMndudTRuMXRna25hIn0.98LQ0sAmH9ccltQv3bs4Pw";

mapboxgl.accessToken = accessToken;

const FlotillaMapElement = (props) => {
  return (
    <div className="position-relative" style={{ height: "100%" }}>
      <div className="position-absolute w-100 h-100" ref={props.mapContainer} />
    </div>
  );
};

const MemoizedFlotillaMapElement = React.memo(FlotillaMapElement);

function generateFlotillaMap({ map }) {
  map.on("load", async () => {
    const setPaths = (c) => {
      if (c && c.dataType === "source" && c.sourceId === "route") {
        map.off("sourcedata", setPaths);
      }
    };
    map.on("sourcedata", setPaths);
  });

  return {
    map: map,
    remove: () => {
      console.log("remove");
      map.remove();
    },
  };
}

const generateGeoJSON = (paths) => {
  return generateFeatureCollection({
    type: "Feature",
    properties: {},
    geometry: {
      type: "MultiLineString",
      coordinates: paths,
    },
  });
};

export default function FlotillaMap({ paths, gwPaths, network: networkMap }) {
  const mapContainer = useRef(null);
  const mapRef = useRef();

  const getMap = () => mapRef.current;

  const [mapLoaded, setMapLoaded] = useState(false);

  // render network map
  useEffect(() => {
    const map = getMap();
    if (map && mapLoaded) {
      if (map.map.getSource("network")) {
        map.map.getSource("network").setData(networkMap);
      } else {
        map.map.addSource("network", {
          type: "geojson",
          data: networkMap,
        });
      }
      if (map.map.getSource("network")) {
        if (map.map.getLayer("network")) {
          map.map.removeLayer("network");
        }
        map.map.addLayer({
          id: "network",
          source: "network",
          type: "line",
          paint: {
            "line-color": "#333333",
            "line-width": 1,
            "line-opacity": 0.2,
          },
          layout: {
            "line-join": "round",
            "line-cap": "round",
          },
        });
      } else {
        console.log("no source");
      }
    }
  }, [mapLoaded, networkMap]);

  // render geojson path result
  useEffect(() => {
    
    const map = getMap();
    if (map && mapLoaded) {
      if (paths.length) {
        if (map.map.getSource("paths")) {
          map.map.getSource("paths").setData(generateGeoJSON(paths));
        } else {
          map.map.addSource("paths", {
            type: "geojson",
            data: generateGeoJSON(paths),
          });
        }
        if (map.map.getSource("paths")) {
          if (map.map.getLayer("paths")) {
            map.map.removeLayer("paths");
          }
          map.map.addLayer({
            id: "paths",
            source: "paths",
            type: "line",
            paint: {
              "line-color": "#f2eaa0",
              "line-width": 4,
            },
            layout: {
              "line-join": "round",
              "line-cap": "round",
            },
          });
        } else {
          console.log("no source");
        }
      } else {
        if (map.map.getLayer("paths")) map.map.removeLayer("paths");
        if (map.map.getSource("paths")) map.map.removeSource("paths");
      }
    }
  }, [paths, mapLoaded]);

  // render grey wing searoute
  useEffect(() => {
    const map = getMap();
    if (map && mapLoaded) {
      if (gwPaths.length) {
        // const newData = generateGeoJSON(gwPaths);
        // console.log("adding Line GW", newData);

        if (map.map.getSource("gwPaths")) {
          map.map.getSource("gwPaths").setData(generateGeoJSON(gwPaths));
        } else {
          map.map.addSource("gwPaths", {
            type: "geojson",
            data: generateGeoJSON(gwPaths),
          });
        }
        if (map.map.getSource("gwPaths")) {
          if (map.map.getLayer("gwPaths")) {
            map.map.removeLayer("gwPaths");
          }
          map.map.addLayer({
            id: "gwPaths",
            source: "gwPaths",
            type: "line",
            paint: {
              "line-color": "#24ed6a",
              "line-width": 4,
            },
            layout: {
              "line-join": "round",
              "line-cap": "round",
            },
          });
        } else {
          console.log("no source");
        }
      } else {
        if (map.map.getSource("gwPaths")) map.map.removeSource("gwPaths");
        if (map.map.getLayer("gwPaths")) map.map.removeLayer("gwPaths");
      }
    }
  }, [gwPaths, mapLoaded]);

  useEffect(() => {
    let statusCheckInterval = window.setInterval(() => {
      let map = getMap();

      if (map && map.map) {
        const mapStatus = map.map.loaded();

        if (mapStatus !== mapLoaded) {
          setMapLoaded(map.map.loaded());
        }
      }
    }, 1000);

    return () => clearInterval(statusCheckInterval);
  }, [mapLoaded]);

  useEffect(() => {
    let map;

    if (!getMap() && mapContainer.current) {
      console.log("load");
      map = new mapboxgl.Map({
        container: mapContainer.current,
        style: "mapbox://styles/greywing-operations/ckvc7m1vlagg415qq2356iddy",
        bounds:
          new LngLatBounds([
            [188, 81],
            [-150, -71],
          ]) || undefined,
      });

      map.boxZoom.disable();
      map.dragRotate.disable();
      map.touchZoomRotate.disableRotation();

      mapRef.current = generateFlotillaMap({
        map,
      });
    }

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []); // eslint-disable-line

  // overlay the animation on the map and "grey out" the map using opacity until loading is complete
  return (
    <MemoizedFlotillaMapElement mapContainer={mapContainer} mapRef={mapRef} />
  );
}
