import React, { useContext, useMemo } from "react";

import Route from "./Route";
import { CalculatorContext } from "../context/CalculatorContext";

const Routes = () => {
  const { result, gwResult, ngResult } = useContext(CalculatorContext);
  const allRoutes = useMemo(
    () => [
      {
        name: "GPF",
        path: result,
        styles: {
          paint: {
            "line-color": "#2c1ce6",
            "line-width": 4,
          },
        },
      },
      {
        name: "GW Sea Route",
        path: gwResult,
        styles: {
          paint: {
            "line-color": "#24ed6a",
            "line-width": 4,
          },
        },
      },
      {
        name: "NGraph",
        path: ngResult,
        styles: {
          paint: {
            "line-color": "#e8335a",
            "line-width": 4,
            "line-dasharray": [4, 3],
          },
        },
      },
    ],
    [result, gwResult, ngResult]
  );
  return allRoutes.map((route, index) => <Route key={index} {...route} />);
};

export default Routes;
