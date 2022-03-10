import React, { useContext, useMemo } from "react";

import Route from "./Route";
import { CalculatorContext } from "../context/CalculatorContext";

const Routes = () => {
  const { result, gwResult, ngResult, useNgRoute, useGPFRoute, useGwRoute } =
    useContext(CalculatorContext);
  const allRoutes = useMemo(
    () =>
      [
        useGPFRoute && {
          name: "GPF",
          path: result,
          styles: {
            paint: {
              "line-color": "#2c1ce6",
            },
          },
        },
        useGwRoute && {
          name: "GW Sea Route",
          path: gwResult,
          styles: {
            paint: {
              "line-color": "#24ed6a",
            },
          },
        },
        useNgRoute && {
          name: "NGraph",
          path: ngResult,
          styles: {
            paint: {
              "line-color": "#e8335a",
              "line-dasharray": [4, 3],
            },
          },
        },
      ].filter(Boolean),
    [result, gwResult, ngResult, useNgRoute, useGPFRoute, useGwRoute]
  );
  return allRoutes.map((route) => <Route key={route.name} {...route} />);
};

export default Routes;
