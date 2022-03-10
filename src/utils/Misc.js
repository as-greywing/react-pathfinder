import createGraph from "ngraph.graph";
import { distance, point } from "turf";
import { splitCoords } from "./GenerateFeature";

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
          if (feature.properties.desc_) {
            graph.addLink(
              getLocationHash(feature.geometry.coordinates[index - 1]),
              getLocationHash(feature.geometry.coordinates[index]),
              {
                desc_: feature.properties.desc_,
              }
            );
            graph.addLink(
              getLocationHash(feature.geometry.coordinates[index]),
              getLocationHash(feature.geometry.coordinates[index - 1]),
              {
                desc_: feature.properties.desc_,
              }
            );
          } else {
            graph.addLink(
              getLocationHash(feature.geometry.coordinates[index - 1]),
              getLocationHash(feature.geometry.coordinates[index])
            );
            graph.addLink(
              getLocationHash(feature.geometry.coordinates[index]),
              getLocationHash(feature.geometry.coordinates[index - 1])
            );
          }
        }
      });
    }
  });

  const uniqueHashes = Array.from(new Set(coords.map((coord) => coord.hash)));
  console.log(`Got ${uniqueHashes.length} unique coordinates.`);

  // Add coords (unique hashes) to graph
  uniqueHashes.forEach((hash) => {
    const coord = hash.split(",");
    if (coord[2]) {
      graph.addNode(hash, { x: coord[0], y: coord[1], desc_: coord[2] });
    } else {
      graph.addNode(hash, { x: coord[0], y: coord[1] });
    }
  });

  return {
    graph,
    vertices: uniqueHashes,
  };
};

const aStarOption = (nonIRTC = false, useSuez = true, usePanama = true) => ({
  distance(fromNode, toNode, link) {
    if (nonIRTC) {
      if (link.data?.desc_ === "irtc") {
        return Number.MAX_SAFE_INTEGER;
      }
    }
    if (!useSuez) {
      if (link.data?.desc_ === "suez") {
        return Number.MAX_SAFE_INTEGER;
      }
    }
    if (!usePanama) {
      if (link.data?.desc_ === "panama") {
        return Number.MAX_SAFE_INTEGER;
      }
    }
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
});

const calcDistance = (segment) => {
  return Math.round(
    segment.reduce((acc, each, index) => {
      if (index !== segment.length - 1) {
        acc += distance(
          point([each[0], each[1]]),
          point([segment[index + 1][0], segment[index + 1][1]])
        );
      }
      return acc;
    }, 0),
    0
  );
};

const generateMultiLineStringV2 = ({ path, name, ...props }) => ({
  type: "FeatureCollection",
  properties: {
    name,
    ...props,
  },
  features: path.map((segment) => ({
    type: "Feature",
    properties: {
      distance: calcDistance(segment),
    },
    geometry: {
      type: "LineString",
      coordinates: splitCoords(segment),
    },
  })),
});

const generateMultiLineString = ({ path, name, ...props }) => ({
  type: "FeatureCollection",
  properties: {
    name,
    ...props,
  },
  features: [
    splitCoords({
      type: "Feature",
      properties: {},
      geometry: {
        type: "MultiLineString",
        coordinates: path,
      },
    }),
  ],
});

const generatePointGeoJSON = ({ points, name, ...props }) => ({
  type: "FeatureCollection",
  properties: {
    name,
    ...props,
  },
  features: points.map(({ coord, ...pointProps }) => ({
    type: "Feature",
    properties: { longitude: coord[0], latitude: coord[1], ...pointProps },
    geometry: {
      type: "Point",
      coordinates: coord,
    },
  })),
});

export {
  generateMultiLineString,
  generateMultiLineStringV2,
  generatePointGeoJSON,
  processMeridianCut,
  geojsonToGraph,
  getNearestNeighbour,
  modifyGeoJSON,
  aStarOption,
};
