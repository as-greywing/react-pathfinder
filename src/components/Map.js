import React, { useCallback, useMemo } from "react";
import { useEffect, useRef, useState } from "react";
import mapboxgl, { LngLatBounds } from "mapbox-gl";

// Style Imports
import "mapbox-gl/dist/mapbox-gl.css";
import generateFeatureCollection from "../utils/GenerateFeature";
import { useField } from "formik";

const accessToken = process.env.REACT_APP_MAP_ACCESS_TOKEN;

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
  // map.on("sourcedata", (e) => {
  //   console.log(e);
  // });
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

export default function FlotillaMap({
  paths,
  gwPaths,
  ngPaths,
  network: networkMap,
}) {
  const mapContainer = useRef(null);
  const mapRef = useRef();
  const [field, , helpers] = useField("waypoints");

  const getMap = () => mapRef.current;

  const [mapLoaded, setMapLoaded] = useState(false);

  const onMapClick = useCallback(
    (e) => {
      const newPoint = {
        longitude: e.lngLat.lng,
        latitude: e.lngLat.lat,
      };
      if (newPoint.longitude > 180) {
        newPoint.longitude = newPoint.longitude - 360;
      }
      if (newPoint.longitude < -180) {
        newPoint.longitude = newPoint.longitude + 360;
      }
      const updatedWaypoints = [...field.value, newPoint];
      helpers.setValue(updatedWaypoints);
    },
    [field, helpers]
  );

  useEffect(() => {
    const map = getMap();
    if (mapLoaded && map) {
      map.map.on("click", onMapClick);
    }
    return () => {
      if (mapLoaded && map) {
        map.map.off("click", onMapClick);
      }
    };
  }, [mapLoaded, onMapClick]);

  const waypointData = useMemo(() => {
    return {
      type: "FeatureCollection",
      features: field.value.map((waypoint, index) => ({
        type: "Feature",
        id: [waypoint.longitude, waypoint.latitude].join(","),
        properties: {
          label: `waypoint-${index + 1}`,
        },
        geometry: {
          type: "Point",
          coordinates: [waypoint.longitude, waypoint.latitude],
        },
      })),
    };
  }, [field]);

  // render waypoints
  useEffect(() => {
    const map = getMap();
    if (mapLoaded && map) {
      if (map.map.getSource("waypoints")) {
        map.map.getSource("waypoints").setData(waypointData);
      } else {
        map.map.addSource("waypoints", {
          type: "geojson",
          data: waypointData,
        });
      }
      if (!map.map.getLayer("waypoints")) {
        map.map.addLayer({
          id: "waypoints",
          source: "waypoints",
          type: "symbol",
          layout: {
            "text-field": ["get", "label"],
          },
        });
      }
    }
  }, [waypointData, mapLoaded]);

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
      if (!map.map.getLayer("network")) {
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
      }
    }
  }, [mapLoaded, networkMap]);

  // render geojson path result
  useEffect(() => {
    const map = getMap();
    if (map && mapLoaded) {
      if (map.map.getSource("paths")) {
        map.map.getSource("paths").setData(generateGeoJSON(paths));
      } else {
        map.map.addSource("paths", {
          type: "geojson",
          data: generateGeoJSON(paths),
        });
      }
      if (!map.map.getLayer("paths")) {
        map.map.addLayer({
          id: "paths",
          source: "paths",
          type: "line",
          paint: {
            "line-color": "#2c1ce6",
            "line-width": 4,
          },
          layout: {
            "line-join": "round",
            "line-cap": "round",
          },
        });
      }
    }
  }, [paths, mapLoaded]);

  // render grey wing searoute
  useEffect(() => {
    const map = getMap();
    if (map && mapLoaded) {
      if (map.map.getSource("gwPaths")) {
        map.map.getSource("gwPaths").setData(generateGeoJSON(gwPaths));
      } else {
        map.map.addSource("gwPaths", {
          type: "geojson",
          data: generateGeoJSON(gwPaths),
        });
      }
      if (!map.map.getLayer("gwPaths")) {
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
      }
    }
  }, [gwPaths, mapLoaded]);

  // render Ngraph path
  useEffect(() => {
    const map = getMap();
    if (map && mapLoaded) {
      if (map.map.getSource("ngPaths")) {
        map.map.getSource("ngPaths").setData(generateGeoJSON(ngPaths));
      } else {
        map.map.addSource("ngPaths", {
          type: "geojson",
          data: generateGeoJSON(ngPaths),
        });
      }
      if (!map.map.getLayer("ngPaths")) {
        map.map.addLayer({
          id: "ngPaths",
          source: "ngPaths",
          type: "line",
          paint: {
            "line-color": "#e8335a",
            "line-width": 4,
          },
          layout: {
            "line-join": "round",
            "line-cap": "round",
          },
        });
      }
    }
  }, [ngPaths, mapLoaded]);

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
        console.log("removing");
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
