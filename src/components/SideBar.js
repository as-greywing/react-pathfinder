import React from "react";
import Waypoints from "./Waypoints";
import Settings from "./Settings";
import GenericCard from "./Card";
import Network from "./Network";

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
          <Settings />
        </GenericCard>
      </div>
    </SideBarContainer>
  );
};

export default SideBar;
