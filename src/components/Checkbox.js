import React from "react";

const Checkbox = ({ name, value, onChange, label = "enable", disabled }) => (
  <div className="form-check">
    <input
      className="form-check-input"
      type="checkbox"
      name={name}
      checked={value}
      onChange={() => onChange((e) => !e)}
      disabled={disabled}
    />
    <label
      className="form-check-label"
      htmlFor={name}
      onClick={() => onChange((e) => !e)}
    >
      {label}
    </label>
  </div>
);

export default Checkbox;
