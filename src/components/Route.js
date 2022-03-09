import React, { useCallback, useEffect, useMemo } from "react";
import Source from "../mapbox/source";
import Layer from "../mapbox/layer";
import { useMap } from "../mapbox/use-map";
import { generateMultiLineString } from "../utils/Misc";

const Route = ({ path, name, styles }) => {
  const { current: map } = useMap();
  const data = useMemo(
    () => generateMultiLineString({ path, name }),
    [path, name]
  );

  const handleMouseMove = useCallback(
    (e) => {
      map.getCanvas().style.cursor = "pointer";
    },
    [map]
  );

  const handleMouseLeave = useCallback(
    (e) => {
      map.getCanvas().style.cursor = "";
    },
    [map]
  );

  useEffect(() => {
    map.on("mousemove", name, handleMouseMove);
    map.on("mouseleave", name, handleMouseLeave);
    return () => {
      map.off("mousemove", name, handleMouseMove);
      map.off("mouseleave", name, handleMouseLeave);
    };
  }, [map]);

  const { paint, ...otherStyles } = styles;

  const layerStyle = {
    id: name,
    type: "line",
    paint: {
      "line-color": "#2c1ce6",
      "line-width": 2,
      "line-opacity": 0.5,
      ...paint,
    },
    layout: {
      "line-join": "round",
      "line-cap": "round",
    },
    ...otherStyles,
  };

  return (
    <Source id={name} type="geojson" data={data}>
      <Layer {...layerStyle} />
    </Source>
  );
};

export default Route;
