import { useField } from "formik";
import React, {
  useContext,
  useMemo,
  useEffect,
  useState,
  useCallback,
} from "react";
import { CalculatorContext } from "../context/CalculatorContext";
import Source from "../mapbox/source";
import Layer from "../mapbox/layer";
import { generatePointGeoJSON } from "../utils/Misc";
import { useMap } from "../mapbox/use-map";
import lighthouse from "../../node_modules/@mapbox/maki/icons/lighthouse.svg";
import Popup from "../mapbox/popup";

const WaypointMarkers = () => {
  const { current: map } = useMap();
  const [field, , helpers] = useField("waypoints");
  const { showWaypoints } = useContext(CalculatorContext);

  const [generatedId, setGeneratedId] = useState(null);
  const [popUpData, setPopUpData] = useState(null);

  useEffect(() => {
    let img = new Image(40, 40);
    img.onload = () => {
      if (!map.hasImage("maki-lighthouse")) {
        map.addImage("maki-lighthouse", img);
      }
    };
    img.src = lighthouse;
  }, [map]);

  const points = useMemo(() => {
    return field.value.map((each, index) => ({
      coord: [each.longitude, each.latitude],
      label: index + 1,
      id: [
        Math.round(each.longitude * 1000) / 1000,
        Math.round(each.latitude * 1000) / 1000,
      ].join(","),
    }));
  }, [field]);

  const data = useMemo(
    () => generatePointGeoJSON({ points, name: "waypoints" }),
    [points]
  );

  const handleRemove = useCallback(
    ({ data }) => {
      helpers.setValue(
        field.value.filter(
          (e) =>
            [e.longitude, e.latitude].join(",") !==
            [data.longitude, data.latitude].join(",")
        )
      );
      setPopUpData(null);
    },
    [helpers, field]
  );
  const handleMouseMove = useCallback(
    (e) => {
      map.getCanvas().style.cursor = "pointer";
      if (generatedId === undefined || generatedId === null) {
        setGeneratedId(e.features[0].id);
        setPopUpData({
          longitude: e.features[0].properties.longitude,
          latitude: e.features[0].properties.latitude,
          data: e.features[0].properties,
        });
        // map.setFeatureState(
        //   {
        //     source: "waypoints",
        //     id: e.features[0].id,
        //   },
        //   {
        //     hover: true,
        //   }
        // );
      }
    },
    [map, generatedId]
  );

  const handleMouseLeave = useCallback(() => {
    map.getCanvas().style.cursor = "";
    if (generatedId !== null && generatedId !== undefined) {
      // map.setFeatureState(
      //   {
      //     source: "waypoints",
      //     id: generatedId,
      //   },
      //   {
      //     hover: false,
      //   }
      // );
      setGeneratedId(null);
    }
  }, [generatedId, map]);

  useEffect(() => {
    map.on("mousemove", "waypoints", handleMouseMove);
    map.on("mouseleave", "waypoints", handleMouseLeave);
    return () => {
      map.off("mousemove", "waypoints", handleMouseMove);
      map.off("mouseleave", "waypoints", handleMouseLeave);
    };
  }, [map, handleMouseLeave, handleMouseMove]);

  const layerStyle = {
    id: "waypoints",
    source: "waypoints",
    type: "symbol",
    layout: {
      // "text-field": ["get", "id"],
      // "text-anchor": "top",
      "icon-image": "maki-lighthouse",
      "icon-anchor": "bottom",
    },
    // paint: {
    //   "text-opacity": [
    //     "case",
    //     ["boolean", ["feature-state", "hover"], false],
    //     1,
    //     0,
    //   ],
    // },
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
            <p>{`Waypoint ${popUpData.data.label}`}</p>
            <p>
              {`lng: ${Math.round(popUpData.data.longitude * 1000) / 1000}`}
              <br />
              {`lat: ${Math.round(popUpData.data.latitude * 1000) / 1000}`}
            </p>
            <button
              className="btn btn-danger btn-sm"
              onClick={() => handleRemove(popUpData)}
            >
              Remove
            </button>
          </div>
        </Popup>
      )}
      <Source id="waypoints" type="geojson" data={data} generateId>
        {showWaypoints && <Layer {...layerStyle} />}
      </Source>
    </>
  );
};

export default WaypointMarkers;
