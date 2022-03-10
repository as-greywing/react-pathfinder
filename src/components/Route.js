import React, { useCallback, useEffect, useMemo, useState } from "react";
import Source from "../mapbox/source";
import Layer from "../mapbox/layer";
import { useMap } from "../mapbox/use-map";
import { generateMultiLineString } from "../utils/Misc";

const Route = ({ path, name, styles }) => {
  const { current: map } = useMap();
  const [generatedId, setGeneratedId] = useState(null);
  const data = useMemo(
    () => generateMultiLineString({ path, name }),
    [path, name]
  );

  const handleMouseMove = useCallback(
    (e) => {
      map.getCanvas().style.cursor = "pointer";
      if (generatedId === undefined || generatedId === null) {
        setGeneratedId(e.features[0].id);
        map.setFeatureState(
          {
            source: name,
            id: e.features[0].id,
          },
          {
            hover: true,
          }
        );
      }
    },
    [map, generatedId]
  );

  const handleMouseLeave = useCallback(
    (e) => {
      map.getCanvas().style.cursor = "";
      if (generatedId !== null && generatedId !== undefined) {
        map.setFeatureState(
          {
            source: name,
            id: generatedId,
          },
          {
            hover: false,
          }
        );
        setGeneratedId(null);
      }
    },
    [map, generatedId]
  );

  useEffect(() => {
    map.on("mousemove", name, handleMouseMove);
    map.on("mouseleave", name, handleMouseLeave);
    return () => {
      map.off("mousemove", name, handleMouseMove);
      map.off("mouseleave", name, handleMouseLeave);
    };
  }, [map, handleMouseLeave, handleMouseMove]);

  const { paint, ...otherStyles } = styles;

  const layerStyle = {
    id: name,
    source: name,
    type: "line",
    paint: {
      "line-color": "#2c1ce6",
      "line-width": [
        "case",
        ["boolean", ["feature-state", "hover"], false],
        4,
        2,
      ],
      "line-opacity": [
        "case",
        ["boolean", ["feature-state", "hover"], false],
        1,
        0.5,
      ],
      ...paint,
    },
    layout: {
      "line-join": "round",
      "line-cap": "round",
    },
    ...otherStyles,
  };

  return (
    <Source id={name} type="geojson" data={data} generateId>
      <Layer {...layerStyle} />
    </Source>
  );
};

export default Route;
