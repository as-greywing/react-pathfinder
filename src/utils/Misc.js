/**
 * 
 * @param {coordinates} coor1 
 * @param {coordinates} coor2 
 * @returns [coordinates, coordinates, index of changed coordinate]
 */
const processMeridianCut = (coor1, coor2) => {
  // check difference between start and finish for longitude
  const longitudeDifference = coor1[0] - coor2[0];
  if (longitudeDifference < -180) {
    // modify
    const mod_coor2 = [coor2[0] - 360, coor2[1]];
    return [coor1, mod_coor2, 1];
  }
  if (longitudeDifference > 180) {
    // modify
    const mod_coor1 = [coor1[0] - 360, coor1[1]];
    return [mod_coor1, coor2, 0];
  }
  return [coor1, coor2, undefined];
};

export { processMeridianCut };
