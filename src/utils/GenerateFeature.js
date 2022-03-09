import splitGeoJSON from "geojson-antimeridian-cut";

/*
 * This function remaps the coordinates property of the geoJSON so that
 * paths crossing the meridian are adjusted in order to work with Mapbox
 *
 * https://github.com/mapbox/mapbox-gl-js/issues/3250#issuecomment-294887678
 *
 * @param   {Array} coords    array of coordinates that need to be remapped
 * @returns {Array}           remapped array of coords
 */

export function splitCoords(v) {
  try {
    const res = splitGeoJSON(v);
    res.coordinates = res.coordinates.map((arr) =>
      arr.filter(
        (v) => v[0] !== null && !isNaN(v[0]) && v[1] !== null && !isNaN(v[1])
      )
    );
    return res;
  } catch (e) {
    return v;
  }
}

export default function generateFeatureCollection(feature) {
  return {
    type: "FeatureCollection",
    features: [splitCoords(feature)],
  };
}
