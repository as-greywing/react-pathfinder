import { Position, point } from "@turf/helpers";
import distance from "@turf/distance";
import { Feature } from "geojson";
import { NodeId } from "ngraph.graph";
import { PathFinderOptions } from "ngraph.path";
import {
  CycleDirection,
  LinkWithDescription,
  NetworkLineString,
  NodeData,
} from "./types";

/**
 * This function cycles through the coordinates and checks if it should be shifted by 1 cycle (360 degree cycle)
 * If required, it will add a new feature with the new coordinates ontop of the existing feature.
 * @param {GeoJSON.FeatureCollection} originalFeatureCollection geojson collection
 * @returns geojson
 */

const alterFeatureCoordinates = (
  originalFeatureCollection: GeoJSON.FeatureCollection<NetworkLineString>,
  direction: CycleDirection = "LTR"
): GeoJSON.FeatureCollection<NetworkLineString> => {
  const features: Array<Feature<NetworkLineString>> = [];
  // console.log("original", direction, originalFeatureCollection);
  originalFeatureCollection.features.forEach((feature) => {
    features.push({
      ...feature,
      geometry: {
        ...feature.geometry,
        coordinates: feature.geometry.coordinates.map((coord) => {
          if (direction === "LTR") {
            if (coord[0] < 0) {
              return [coord[0] + 360, coord[1]];
            }
            return coord;
          } else if (direction === "RTL") {
            if (coord[0] > 0) {
              return [coord[0] - 360, coord[1]];
            }
            return coord;
          } else {
            console.error("THIS SHOULDN'T HAPPEN!");
            return coord;
          }
        }),
      },
    });
  });
  // originalFeatureCollection.features.forEach(
  //   (feature: Feature<NetworkLineString>) => {
  //     if (feature.geometry && feature.geometry.coordinates) {
  //       features.push({
  //         ...feature,
  //         geometry: {
  //           ...feature.geometry,
  //           coordinates: feature.geometry.coordinates.reduce(
  //             (acc: Array<Position>, coord: Position) => {
  //               if (direction === "LTR") {
  //                 if (coord[0] < 0) {
  //                   acc.push([coord[0] + 360, coord[1]]);
  //                 } else {
  //                   acc.push(coord);
  //                 }
  //               } else if (direction === "RTL") {
  //                 if (coord[0] > 0) {
  //                   acc.push([coord[0] - 360, coord[1]]);
  //                 } else {
  //                   acc.push(coord);
  //                 }
  //               } else {
  //                 console.error("THIS SHOULDN'T HAPPEN!");
  //               }
  //               return acc;
  //             },
  //             []
  //           ),
  //         },
  //       });
  //     }
  //     features.push(feature);
  //   }
  // );
  // return originalFeatureCollection;
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
): {
  coord: [Position, Position];
  changed: boolean;
  direction?: CycleDirection;
} => {
  let coord: [Position, Position] = [start, finish];
  let changed: boolean = false;
  let direction: CycleDirection = undefined;

  if (start[0] >= 0 && finish[0] >= 0) {
    // do nothing
  } else if (start[0] <= 0 && finish[0] <= 0) {
    // do nothing
  } else if (start[0] >= 0 && finish[0] <= 0) {
    changed = true;
    coord = [start, [finish[0] + 360, finish[1]]];
    direction = "LTR";
  } else if (start[0] <= 0 && finish[0] >= 0) {
    changed = true;
    coord = [start, [finish[0] - 360, finish[1]]];
    direction = "RTL";
  }
  return { coord, changed, direction };
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

const breakMeridianPaths = (
  paths: Array<Position>,
  direction?: CycleDirection
): Array<Array<Position>> => {
  // If the path doesn't make use of modified graphs, skip!
  if (!direction) return [paths];
  const breakPoints: Array<number> = [];
  const reformattedPositions: Array<Position> = paths.reduce(
    (acc: Array<Position>, node: Position, index: number) => {
      if (node[0] <= -180) {
        acc.push([node[0] + 360, node[1]]);
        if (node[0] + 360 === 180) {
          breakPoints.push(index + 1);
          acc.push(node);
        }
      } else if (node[0] >= 180) {
        acc.push([node[0] - 360, node[1]]);
        if (node[0] - 360 === -180) {
          breakPoints.push(index + 1);
          acc.push(node);
        }
      } else {
        acc.push(node);
      }
      return acc;
    },
    []
  );

  const finalPath: Array<Array<Position>> = [];

  // Where breakpoints have been identified, split the array - particularly at 180 degree meridian
  if (breakPoints.length) {
    do {
      const check = reformattedPositions.splice(0, breakPoints.shift());
      finalPath.push(check);
    } while (breakPoints.length);
    finalPath.push(reformattedPositions);
  } else {
    finalPath.push(reformattedPositions);
  }
  return finalPath;
};

export {
  alterFeatureCoordinates,
  getLocationHash,
  setOptions,
  processMeridianCrossing,
  getNearestNeighbour,
  breakMeridianPaths,
};
