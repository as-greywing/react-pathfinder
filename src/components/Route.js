import React, { useMemo } from "react";
import Source from "../mapbox/source";
import Layer from "../mapbox/layer";
import { splitCoords } from "../utils/GenerateFeature";

const generateMultiLineString = ({ path, name }) => ({
  type: "FeatureCollection",
  properties: {
    name,
  },
  features: [
    splitCoords({
      type: "Feature",
      properties: {},
      geometry: {
        type: "MultiLineString",
        coordinates: path,
      },
    }),
  ],
});

const Route = ({ path, name, styles }) => {
  const data = useMemo(
    () => generateMultiLineString({ path, name }),
    [path, name]
  );
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
