import React, { useContext } from "react";
import Waypoints from "./Waypoints";
import Settings from "./Settings";
import GenericCard from "./Card";
import Network from "./Network";
import { CalculatorContext } from "src/context/CalculatorContext";

const SideBarContainer = ({ children }) => {
  return (
    <div
      className="position-fixed d-flex"
      style={{
        right: 0,
        top: 0,
        bottom: 0,
        width: 350,
      }}
    >
      <div className="d-flex flex-grow-1 flex-column">{children}</div>
    </div>
  );
};

const SideBar = () => {
  const { isPreparing } = useContext(CalculatorContext);
  return (
    <SideBarContainer>
      <div className="p-1" style={{ height: "50vh" }}>
        <Waypoints />
      </div>
      <div className="p-1" style={{ height: "50vh" }}>
        <GenericCard
          style={{ height: "100%" }}
          bodyStyle={{ height: "calc(100% - 48px)", overflowY: "auto" }}
          footer={<Network />}
        >
          {isPreparing && (
            <div
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                height: "100%",
                background: "white",
                borderRadius: "0.25rem",
                opacity: 0.8,
              }}
            />
          )}
          <Settings />
        </GenericCard>
      </div>
    </SideBarContainer>
  );
};

export default SideBar;
