import React, { useContext } from "react";

import Checkbox from "./Checkbox";
import { BADGE_COLORS } from "../constants";
import { CalculatorContext } from "../context/CalculatorContext";

const Settings = () => {
  const {
    useGwRoute,
    setUseGwRoute,
    gwResultStatus,
    endTimeGw,
    endTime,
    endTimeNg,
    useGPFRoute,
    setUseGPFRoute,
    resultStatus,
    precision,
    setPrecision,
    useNgRoute,
    setUseNgRoute,
    ngResultStatus,
    nonIRTC,
    setNonIRTC,
    usePanama,
    setUsePanama,
    useSuez,
    setUseSuez,
  } = useContext(CalculatorContext);

  return (
    <div>
      <label className="label fw-bold">Settings</label>
      <div className="my-3 d-flex gap-2">
        <Checkbox
          name="nonIRTC"
          value={!nonIRTC}
          onChange={setNonIRTC}
          label="Use IRTC"
        />
        <Checkbox
          name="usePanama"
          value={usePanama}
          onChange={setUsePanama}
          label="Panama"
        />
        <Checkbox
          name="useSuez"
          value={useSuez}
          onChange={setUseSuez}
          label="Suez"
        />
      </div>
      <hr />
      <div className="my-3">
        <p
          className="h6 d-flex gap-2 align-items-start"
          style={{ color: "#24ed6a" }}
        >
          Modified Sea Route
          <span className={`ms-auto badge bg-${BADGE_COLORS[gwResultStatus]}`}>
            {gwResultStatus}
          </span>
          <span className="badge bg-dark">
            {gwResultStatus === "calculated" && `${endTimeGw}ms`}
          </span>
        </p>
        <Checkbox name="useGw" value={useGwRoute} onChange={setUseGwRoute} />
      </div>
      <hr />
      <div className="my-3">
        <p
          className="h6 d-flex gap-2 align-items-start"
          style={{ color: "#2c1ce6" }}
        >
          Geojson Path Finder
          <span className={`ms-auto badge bg-${BADGE_COLORS[resultStatus]}`}>
            {resultStatus}
          </span>
          <span className="badge bg-dark">
            {resultStatus === "calculated" && `${endTime}ms`}
          </span>
        </p>
        <Checkbox name="useGPF" value={useGPFRoute} onChange={setUseGPFRoute} />
        <div className="d-flex align-items-center justify-content-center">
          <label className="label me-3">Precision</label>
          {/* This is currently disabled as it causes a network graph rebuild immediately on change */}
          <input
            className="form-control"
            type="number"
            value={precision}
            onChange={(e) => setPrecision(e.target.value)}
            disabled
          />
        </div>
      </div>
      <hr />
      <div className="my-3">
        <p
          className="h6 d-flex gap-2 align-items-start"
          style={{ color: "#e8335a" }}
        >
          NGraph
          <span className={`ms-auto badge bg-${BADGE_COLORS[ngResultStatus]} `}>
            {ngResultStatus}
          </span>
          <span className="badge bg-dark">
            {ngResultStatus === "calculated" && `${endTimeNg}ms`}
          </span>
        </p>
        <Checkbox name="useNg" value={useNgRoute} onChange={setUseNgRoute} />
      </div>
    </div>
  );
};

export default Settings;
