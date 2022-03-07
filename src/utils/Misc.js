import createGraph from "ngraph.graph";

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

const getLocationHash = (coords) => coords.join(",");

const getNearestNeighbour = ([longO, latO], vertices) => {
  const nearest = vertices.reduce((acc, vertex) => {
    const [long, lat] = vertex.split(",");
    const distance = Math.pow(long - longO, 2) + Math.pow(lat - latO, 2);
    if (acc === null) {
      return [vertex, distance];
    } else {
      if (acc[1] >= distance) {
        return [vertex, distance];
      }
      return acc;
    }
  }, null);
  return nearest[0];
};

const geojsonToPath = (networkGeoJSON) => {
  console.log("Receiving network,", networkGeoJSON);
  const { features } = networkGeoJSON;
  const graph = createGraph();
  const coords = [];

  features.forEach((feature) => {
    if (feature.geometry && feature.geometry.coordinates) {
      feature.geometry.coordinates.forEach((coord, index) => {
        // Add to coordinates
        coords.push({
          location: coord,
          hash: getLocationHash(coord),
        });
        // Create edges
        if (index > 0) {
          graph.addLink(
            getLocationHash(feature.geometry.coordinates[index - 1]),
            getLocationHash(feature.geometry.coordinates[index])
          );
        }
      });
    }
  });

  const uniqueHashes = Array.from(new Set(coords.map((coord) => coord.hash)));
  console.log(`Got ${uniqueHashes.length} unique coordinates.`);

  // Add coords (unique hashes) to graph
  uniqueHashes.forEach((hash) => {
    const coord = hash.split(",");
    graph.addNode(hash, { x: coord[0], y: coord[1] });
  });

  return {
    graph,
    vertices: uniqueHashes,
  };
};

export { processMeridianCut, geojsonToPath, getNearestNeighbour };
