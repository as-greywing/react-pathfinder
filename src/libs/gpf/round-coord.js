module.exports = function roundCoord(c, precision) {
  if (precision === 0) return c;
  return [
    Math.round(c[0] / precision) * precision,
    Math.round(c[1] / precision) * precision,
  ];
};
