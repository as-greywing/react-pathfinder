import React, { useEffect, useCallback } from "react";
import { useField } from "formik";
import { useMap } from "../mapbox/use-map";

const WaypointAdder = () => {
  const { current: map } = useMap();
  const [field, , helpers] = useField("waypoints");

  const onMapClick = useCallback(
    (e) => {
      const result = map.queryRenderedFeatures(e.point, {
        layers: ["waypoints"],
      });
      if (!result.length) {
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
      }
    },
    [field, helpers]
  );

  useEffect(() => {
    map.on("click", onMapClick);
    return () => {
      map.off("click", onMapClick);
    };
  }, [onMapClick]);

  return null;
};

export default WaypointAdder;
