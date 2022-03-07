import createGraph from "ngraph.graph";
import { distance, point } from "turf";

/**
 * This function checks if there's an intersection between two coordinates between the meridian at -180 and 180 degree.
 * TODO: this might be wrong -____- but it seems to work.
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

/**
 * This function cycles through the coordinates and checks if it should be shifted by 1 360 degree cycle.
 * If required, it will add a new feature with the new coordinates ontop of the existing feature.
 * @param {geojson} originalFeatureCollection 
 * @param {boolean} isPositive 
 * @returns geojson
 */
const modifyGeoJSON = (originalFeatureCollection, isPositive) => {
  const features = [];
  originalFeatureCollection.features.forEach((feature) => {
    if (feature.geometry && feature.geometry.coordinates) {
      let hasToAddPositive = false;
      let hasToAddNegative = false;

      // check if there are new features to add
      feature.geometry.coordinates.forEach((coord) => {
        if (isPositive) {
          if (coord[0] < 0) {
            hasToAddPositive = true;
          }
        } else {
          if (coord[0] >= 0) {
            hasToAddNegative = true;
          }
        }
      });

      if (hasToAddNegative) {
        features.push({
          ...feature,
          geometry: {
            ...feature.geometry,
            coordinates: feature.geometry.coordinates.reduce((acc, coord) => {
              if (coord[0] >= 0) {
                acc.push([coord[0] - 360, coord[1]]);
              }
              return acc;
            }, []),
          },
        });
      }
      if (hasToAddPositive) {
        features.push({
          ...feature,
          geometry: {
            ...feature.geometry,
            coordinates: feature.geometry.coordinates.reduce((acc, coord) => {
              if (coord[0] < 0) {
                acc.push([coord[0] + 360, coord[1]]);
              }
              return acc;
            }, []),
          },
        });
      }
    }
    features.push(feature);
  });
  return {
    ...originalFeatureCollection,
    features,
  };
};

const geojsonToGraph = (networkGeoJSON) => {
  // console.log("Receiving network,", networkGeoJSON);
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
          graph.addLink(
            getLocationHash(feature.geometry.coordinates[index]),
            getLocationHash(feature.geometry.coordinates[index - 1])
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

const aStarOption = {
  distance(fromNode, toNode) {
    return distance(
      point([fromNode.data.x, fromNode.data.y]),
      point([toNode.data.x, toNode.data.y])
    );
  },
  heuristic(fromNode, toNode) {
    return distance(
      point([fromNode.data.x, fromNode.data.y]),
      point([toNode.data.x, toNode.data.y])
    );
  },
};

export {
  processMeridianCut,
  geojsonToGraph,
  getNearestNeighbour,
  modifyGeoJSON,
  aStarOption,
};
