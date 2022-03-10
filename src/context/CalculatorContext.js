import React, { createContext, useState } from "react";

export const CalculatorContext = createContext(null);

export const CalculatorProvider = (props) => {
  const [network, setNetwork] = useState(null);
  const [negativeExtNetwork, setNegativeExtNetwork] = useState(null);

  const [result, setResult] = useState([]);
  const [resultStatus, setResultStatus] = useState("not-started");
  const [useGPFRoute, setUseGPFRoute] = useState(true);

  const [gwResult, setGwResult] = useState([]);
  const [gwResultStatus, setGwResultStatus] = useState("not-started");
  const [useGwRoute, setUseGwRoute] = useState(false);

  const [ngResult, setNgResult] = useState([]);
  const [ngResultStatus, setNgResultStatus] = useState("not-started");
  const [useNgRoute, setUseNgRoute] = useState(false);

  const [endTime, setEndTime] = useState(0);
  const [endTimeGw, setEndTimeGw] = useState(0);
  const [endTimeNg, setEndTimeNg] = useState(0);

  const [precision, setPrecision] = useState(0.0001);

  const [nonIRTC, setNonIRTC] = useState(false);
  const [usePanama, setUsePanama] = useState(true);
  const [useSuez, setUseSuez] = useState(true);

  const [showWaypoints, setShowWaypoints] = useState(true);

  return (
    <CalculatorContext.Provider
      value={{
        network,
        setNetwork,
        negativeExtNetwork,
        setNegativeExtNetwork,
        result,
        setResult,
        resultStatus,
        setResultStatus,
        useGPFRoute,
        setUseGPFRoute,
        gwResult,
        setGwResult,
        gwResultStatus,
        setGwResultStatus,
        useGwRoute,
        setUseGwRoute,
        ngResult,
        setNgResult,
        ngResultStatus,
        setNgResultStatus,
        useNgRoute,
        setUseNgRoute,
        endTime,
        setEndTime,
        endTimeGw,
        setEndTimeGw,
        endTimeNg,
        setEndTimeNg,
        precision,
        setPrecision,
        nonIRTC,
        setNonIRTC,
        usePanama,
        setUsePanama,
        useSuez,
        setUseSuez,
        showWaypoints,
        setShowWaypoints,
      }}
    >
      {props.children}
    </CalculatorContext.Provider>
  );
};
