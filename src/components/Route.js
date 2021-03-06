import React, { useCallback, useEffect, useMemo, useState } from "react";
import Source from "../mapbox/source";
import Layer from "../mapbox/layer";
import { useMap } from "../mapbox/use-map";
import { generateMultiLineStringV2 } from "../utils/Misc";
import Popup from "../mapbox/popup";

const Route = ({ path, name, styles }) => {
  const { current: map } = useMap();
  const [generatedId, setGeneratedId] = useState(null);
  const [popUpData, setPopUpData] = useState(null);
  const data = useMemo(() => {
    const generated = generateMultiLineStringV2({ path, name });
    return generated;
  }, [path, name]);

  const handleMouseMove = useCallback(
    (e) => {
      map.getCanvas().style.cursor = "pointer";
      if (generatedId === undefined || generatedId === null) {
        setGeneratedId(e.features[0].id);
        setPopUpData({
          longitude: e.lngLat.lng,
          latitude: e.lngLat.lat,
          data: e.features[0].properties.distance || "N/A",
        });
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
    [map, generatedId, name]
  );

  const handleMouseLeave = useCallback(
    (e) => {
      map.getCanvas().style.cursor = "";
      if (generatedId !== null && generatedId !== undefined) {
        setPopUpData(null);
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
    [map, generatedId, name]
  );

  useEffect(() => {
    map.on("mousemove", name, handleMouseMove);
    map.on("mouseleave", name, handleMouseLeave);
    return () => {
      map.off("mousemove", name, handleMouseMove);
      map.off("mouseleave", name, handleMouseLeave);
    };
  }, [map, name, handleMouseLeave, handleMouseMove]);

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
    <>
      {popUpData && (
        <Popup
          onClose={() => setPopUpData(null)}
          longitude={popUpData.longitude}
          latitude={popUpData.latitude}
        >
          <div className="p-1">
            <p>{`Segment Distance (${name})`}</p>
            <p className="mb-0">{`${popUpData.data} km`}</p>
          </div>
        </Popup>
      )}
      <Source id={name} type="geojson" data={data} generateId>
        <Layer {...layerStyle} />
      </Source>
    </>
  );
};

export default Route;
