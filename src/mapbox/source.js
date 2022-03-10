import * as React from "react";
import { useContext, useEffect, useMemo, useState, useRef } from "react";
import { cloneElement } from "react";
import { MapContext } from "./map";
import assert from "../utils/assert";
import { deepEqual } from "../utils/deep-equal";

let sourceCounter = 0;

function createSource(map, id, props) {
  // @ts-ignore
  if (map.style && map.style._loaded) {
    const options = { ...props };
    delete options.id;
    delete options.children;
    // @ts-ignore
    map.addSource(id, options);
    return map.getSource(id);
  }
  return null;
}

/* eslint-disable complexity */
function updateSource(source, props, prevProps) {
  assert(props.id === prevProps.id, "source id changed");
  assert(props.type === prevProps.type, "source type changed");

  let changedKey = "";
  let changedKeyCount = 0;

  for (const key in props) {
    if (
      key !== "children" &&
      key !== "id" &&
      !deepEqual(prevProps[key], props[key])
    ) {
      changedKey = key;
      changedKeyCount++;
    }
  }

  if (!changedKeyCount) {
    return;
  }

  const type = props.type;

  if (type === "geojson") {
    source.setData(props.data);
  } else if (type === "image") {
    source.updateImage({ url: props.url, coordinates: props.coordinates });
  } else if (
    (type === "canvas" || type === "video") &&
    changedKeyCount === 1 &&
    changedKey === "coordinates"
  ) {
    source.setCoordinates(props.coordinates);
  } else if (type === "vector" && "setUrl" in source) {
    // Added in 1.12.0:
    // vectorTileSource.setTiles
    // vectorTileSource.setUrl
    switch (changedKey) {
      case "url":
        source.setUrl(props.url);
        break;
      case "tiles":
        source.setTiles(props.tiles);
        break;
      default:
    }
  } else {
    // eslint-disable-next-line
    console.warn(`Unable to update <Source> prop: ${changedKey}`);
  }
}
/* eslint-enable complexity */

function Source(props) {
  const map = useContext(MapContext).map.getMap();
  const propsRef = useRef(props);
  const [, setStyleLoaded] = useState(0);

  const id = useMemo(() => props.id || `jsx-source-${sourceCounter++}`, []); // eslint-disable-line

  useEffect(() => {
    if (map) {
      const forceUpdate = () => setStyleLoaded((version) => version + 1);
      map.on("styledata", forceUpdate);
      forceUpdate();

      return () => {
        map.off("styledata", forceUpdate);
        // Parent effects are destroyed before child ones, see
        // https://github.com/facebook/react/issues/16728
        // Source can only be removed after all child layers are removed
        setTimeout(() => {
          if (map.style && map.style._loaded && map.getSource(id)) {
            map.removeSource(id);
          }
        }, 0);
      };
    }
    return undefined;
  }, [map, id]);

  // @ts-ignore
  let source = map && map.style && map.getSource(id);
  if (source) {
    updateSource(source, props, propsRef.current);
  } else {
    source = createSource(map, id, props);
  }
  propsRef.current = props;

  return (
    (source &&
      React.Children.map(
        props.children,
        (child) =>
          child &&
          cloneElement(child, {
            source: id,
          })
      )) ||
    null
  );
}

export default Source;
