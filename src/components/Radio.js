import React, { useState } from "react";
import { uniqueId } from "lodash";

const Radio = ({ name, value, onChange, label = "enable", disabled }) => {
  const [id] = useState(uniqueId());
  return (
    <div className="form-check">
      <input
        className="form-check-input"
        type="radio"
        name={name}
        checked={value}
        onChange={() => onChange(name)}
        disabled={disabled}
        id={id}
      />
      <label
        className="form-check-label"
        htmlFor={id}
        onChange={() => onChange(name)}
      >
        {label}
      </label>
    </div>
  );
};

export default Radio;
