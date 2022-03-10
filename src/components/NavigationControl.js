import React, { useEffect } from "react";
import { applyReactStyle } from "../utils/apply-react-style";
import useControl from "../mapbox/use-control";

function NavigationControl(props) {
  const ctrl = useControl(({ mapLib }) => new mapLib.NavigationControl(props), {
    position: props.position,
  });

  useEffect(() => {
    applyReactStyle(ctrl._container, props.style);
  }, [props.style, ctrl]);

  return null;
}

export default React.memo(NavigationControl);
