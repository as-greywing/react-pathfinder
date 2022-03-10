import React, { useState, useContext, useEffect } from "react";
import axios from "axios";
import cx from "classnames";
import localforage from "localforage";

import { modifyGeoJSON } from "../utils/Misc";
import Source from "../mapbox/source";
import Layer from "../mapbox/layer";

import { CalculatorContext } from "../context/CalculatorContext";
import { NETWORK_RES } from "../constants";

// Building the network graph to be utilised by the calculator

const Network = () => {
  const {
    setNetwork,
    setNegativeExtNetwork,
    network,
    isPreparing,
    setIsPreparing,
    networkRes,
    showNetwork,
  } = useContext(CalculatorContext);

  const [refetch, setRefetch] = useState(false);
  const [activeNetwork, setActiveNetwork] = useState(null);

  /**
   * Fetch the network json from the endpoint, if not from indexedDB
   * Currently making use of the 20km resolution network
   */
  useEffect(() => {
    async function fetch() {
      setIsPreparing(true);
      const hasNetwork = await localforage.getItem(`network-${networkRes}`);
      if (!hasNetwork || refetch) {
        await Promise.all(
          NETWORK_RES.map(async (network) => {
            try {
              const { data } = await axios(
                `http://localhost:3123/network/${network}`
              );
              localforage.setItem(`network-${network}`, data);
              console.log("FETCHED:", network, "km");
            } catch (error) {
              console.log("Failed in fetching network for", network, "km");
            }
          })
        );
        const selectedNetwork = await localforage.getItem(
          `network-${networkRes}`
        );
        setActiveNetwork(selectedNetwork);
        if (refetch) {
          setRefetch(false);
        }
      } else {
        setActiveNetwork(hasNetwork);
      }
      setIsPreparing(false);
    }
    fetch();
  }, [refetch, setIsPreparing]); // eslint-disable-line

  useEffect(() => {
    if (!networkRes || !activeNetwork) return;
    async function swap() {
      setIsPreparing(true);
      const selectedNetwork = await localforage.getItem(
        `network-${networkRes}`
      );
      setNetwork(selectedNetwork);
      setNegativeExtNetwork(modifyGeoJSON(selectedNetwork));
      setIsPreparing(false);
    }
    swap();
  }, [
    networkRes,
    activeNetwork,
    setNegativeExtNetwork,
    setNetwork,
    setIsPreparing,
  ]);

  // useEffect(() => {
  //   if (!activeNetwork) return;
  //   setNetwork(activeNetwork);
  //   setNegativeExtNetwork(modifyGeoJSON(activeNetwork));
  // }, [activeNetwork]);

  const layerStyles = {
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
  };
  return (
    <>
      {showNetwork && (
        <Source id="network" data={network} type="geojson">
          <Layer {...layerStyles} />
        </Source>
      )}
      <button
        className={cx(
          "btn btn-outline-primary btn-sm",
          isPreparing ? "disabled" : undefined
        )}
        onClick={() => setRefetch(true)}
      >
        {isPreparing ? "Loading.." : "Refetch Network"}
      </button>
    </>
  );
};

export default Network;
