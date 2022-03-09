import React from "react";
import { useState, useCallback, useMemo, useContext } from "react";

import { MapContext } from "./map";

export const MountedMapsContext = React.createContext(null);

export const MapProvider = (props) => {
  const [maps, setMaps] = useState({});

  const onMapMount = useCallback((map, id) => {
    setMaps((currMaps) => {
      if (id === "current") {
        throw new Error("'current' cannot be used as map id");
      }
      if (currMaps[id]) {
        throw new Error(`Multiple maps with the same id: ${id}`);
      }
      return { ...currMaps, [id]: map };
    });
  }, []);

  const onMapUnmount = useCallback((id) => {
    setMaps((currMaps) => {
      if (currMaps[id]) {
        const nextMaps = { ...currMaps };
        delete nextMaps[id];
        return nextMaps;
      }
      return currMaps;
    });
  }, []);

  return (
    <MountedMapsContext.Provider
      value={{
        maps,
        onMapMount,
        onMapUnmount,
      }}
    >
      {props.children}
    </MountedMapsContext.Provider>
  );
};

export function useMap() {
  const maps = useContext(MountedMapsContext)?.maps;
  const currentMap = useContext(MapContext);

  const mapsWithCurrent = useMemo(() => {
    return { ...maps, current: currentMap?.map };
  }, [maps, currentMap]);

  return mapsWithCurrent;
}
