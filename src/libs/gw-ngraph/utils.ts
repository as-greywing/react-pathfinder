import { Position, point } from "@turf/helpers";
import distance from "@turf/distance";
import { Feature } from "geojson";
import { Node, NodeId } from "ngraph.graph";
import { PathFinderOptions } from "ngraph.path";
import { LinkWithDescription, NetworkLineString, NodeData } from "./types";

/**
 * This function cycles through the coordinates and checks if it should be shifted by 1 cycle (360 degree cycle)
 * If required, it will add a new feature with the new coordinates ontop of the existing feature.
 * @param {GeoJSON.FeatureCollection} originalFeatureCollection geojson collection
 * @returns geojson
 */

const expandFeaturesByOneCycle = (
  originalFeatureCollection: GeoJSON.FeatureCollection<NetworkLineString>
): GeoJSON.FeatureCollection<NetworkLineString> => {
  const features: Array<Feature<NetworkLineString>> = [];
  originalFeatureCollection.features.forEach(
    (feature: Feature<NetworkLineString>) => {
      if (feature.geometry && feature.geometry.coordinates) {
        let hasToAdd = false;
        // check if there are new features to add
        feature.geometry.coordinates.forEach((coord: Position) => {
          if (coord[0] >= 0) {
            hasToAdd = true;
          }
        });

        if (hasToAdd) {
          features.push({
            ...feature,
            geometry: {
              ...feature.geometry,
              coordinates: feature.geometry.coordinates.reduce(
                (acc: Array<Position>, coord: Position) => {
                  if (coord[0] >= 0) {
                    acc.push([coord[0] - 360, coord[1]]);
                  }
                  return acc;
                },
                []
              ),
            },
          });
        }
      }
      features.push(feature);
    }
  );
  return {
    ...originalFeatureCollection,
    features,
  };
};

const getLocationHash = (coordinate: Position): NodeId => coordinate.join(",");

const setOptions = (
  nonIRTC: boolean = false,
  useSuez: boolean = true,
  usePanama: boolean = true
): PathFinderOptions<NodeData, LinkWithDescription> => ({
  distance(fromNode, toNode, link): number {
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
  heuristic(fromNode, toNode): number {
    return distance(
      point([fromNode.data.x, fromNode.data.y]),
      point([toNode.data.x, toNode.data.y])
    );
  },
});

/**
 * This checks the starting and finishing coordinates then indicates if it has been changed
 * @param start
 * @param finish
 * @returns
 */
const processMeridianCrossing = (
  start: Position,
  finish: Position
): { coord: [Position, Position]; changed: boolean } => {
  let coord: [Position, Position] = [start, finish];
  let changed: boolean = false;
  // const longitudeDifference = start[0] - finish[0];
  // check direction of travel between start and finish for longitude

  if (start[0] >= 0 && finish[0] < 0) {
    changed = true;
    coord = [[start[0] - 360, start[1]], finish];
  } else if (start[0] < 0 && finish[0] > 0) {
    changed = true;
    coord = [start, [finish[0] - 360, finish[1]]];
  }

  // This was the old method - probably okay to remove.
  // check if the difference is greater than a hemisphere
  // if (longitudeDifference < -180) {
  //   console.log("3");
  //   changed = true;
  //   coord = [start, [finish[0] - 360, finish[1]]];
  // } else if (longitudeDifference > 180) {
  //   console.log("4");
  //   changed = true;
  //   coord = [[start[0] - 360, start[1]], finish];
  // }
  return { coord, changed };
};

const getNearestNeighbour = (
  coord: Position,
  vertices: Array<Position>
): Position => {
  const nearestNeighbour = vertices.reduce(
    (acc: { selected: Position; distance: number }, vertex: Position) => {
      const calcDistance = distance(point(vertex), point(coord));
      if (acc.selected === null) {
        return { selected: vertex, distance: calcDistance };
      } else {
        if (acc.distance >= calcDistance) {
          return { selected: vertex, distance: calcDistance };
        }
        return acc;
      }
    },
    {
      selected: null,
      distance: null,
    }
  );
  return nearestNeighbour.selected;
};

const breakMeridianPaths = (paths: Array<Position>): Array<Array<Position>> => {
  const firstArray: Array<Position> = [];
  const secondArray: Array<Position> = [];

  // Check if it crosses the meridian, but identifying the longitude changes from positive to negative or vice versa
  const crossesMeridian = paths.reduce((acc, node) => {
    if (node[0] < 0 && node[0] + 360 > 0) {
      return true;
    }
    return acc;
  }, false);

  if (!crossesMeridian) return [paths];

  const dirn = paths[0][0] - paths[1][0];
  if (dirn >= 0) {
    paths.reverse();
  }

  const isStartNegative = paths[0][0] < 0;
  let hasReachedfirstIntersection = false;
  paths.forEach((node, index) => {
    if (isStartNegative) {
      if (hasReachedfirstIntersection) {
        secondArray.push(node);
      } else {
        if (node[0] >= 0) {
          hasReachedfirstIntersection = true;
          // check if close to 0 or to 180
          if (180 - node[0] > 90) {
            // closer to zero
            if (node[0] === 0) {
              firstArray.push(node);
            } else {
              firstArray.push([0, node[1]]);
              secondArray.push([0, node[1]]);
            }
          } else {
            firstArray.push([-180, node[1]]);
            secondArray.push([180, node[1]]);
          }
          secondArray.push(node);
        } else {
          firstArray.push(node);
        }
      }
    } else {
      if (hasReachedfirstIntersection) {
        secondArray.push(node);
      } else {
        if (node[0] < 0) {
          hasReachedfirstIntersection = true;
          if (180 + node[0] > 90) {
            // closer to zero
            if (paths[index - 1][0] !== 0) {
              if (node[0] === 0) {
                secondArray.push([node[0], node[1]]);
              } else {
                firstArray.push([0, node[1]]);
                secondArray.push([0, node[1]]);
              }
            } else {
              secondArray.push([paths[index - 1][0], paths[index - 1][1]]);
            }
          } else {
            // closer to 180
            if (paths[index - 1][0] > 180) {
              secondArray.push([
                paths[index - 1][0] - 360,
                paths[index - 1][1],
              ]);
            } else {
              firstArray.push([-180, node[1]]);
              secondArray.push([180, node[1]]);
            }
          }
          secondArray.push(node);
        } else {
          firstArray.push(node);
        }
      }
    }
  });

  if (!secondArray.length) {
    return [firstArray];
  }
  return [firstArray, secondArray];
};

export {
  expandFeaturesByOneCycle,
  getLocationHash,
  setOptions,
  processMeridianCrossing,
  getNearestNeighbour,
  breakMeridianPaths,
};
