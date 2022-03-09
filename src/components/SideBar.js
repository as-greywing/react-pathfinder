import React from "react";
import Waypoints from "./Waypoints";
import Settings from "./Settings";
import GenericCard from "./Card";

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
      <div className="p-1 d-flex flex-grow-1 gap-2 flex-column">{children}</div>
    </div>
  );
};

const SideBar = () => {
  return (
    <SideBarContainer>
      <GenericCard
        style={{ flex: "1 1 50%", height: "100%", overflowX: "auto" }}
      >
        <Waypoints />
      </GenericCard>
      <GenericCard
        style={{ flex: "1 1 50%", height: "100%", overflowX: "auto" }}
      >
        <Settings />
      </GenericCard>
    </SideBarContainer>
  );
};

export default SideBar;
