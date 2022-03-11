import { Position } from "@turf/helpers";
import { Graph, Route } from "./types";
import path, { PathFinderOptions } from "ngraph.path";
import { Link, Node } from "ngraph.graph";
import {
  breakMeridianPaths,
  getNearestNeighbour,
  processMeridianCrossing,
} from "./utils";

const singleRouteCalculator = (
  graph: Graph,
  waypoints: [Position, Position],
  options?: PathFinderOptions<Node, Link>
): Route => {
  const [_start, _finish] = waypoints;
  // 1. Checks if the start and finish points has the potential to cross the meridian
  const {
    coord: [start, finish],
    changed,
  } = processMeridianCrossing(_start, _finish);

  // 2. Identify the nearest coordinate within the vertice
  let nearestStart: Position, nearestFinish: Position;

  let useGraph = changed ? graph.extendedGraph : graph.mainGraph;

  nearestStart = getNearestNeighbour(start, useGraph.vertices);
  nearestFinish = getNearestNeighbour(finish, useGraph.vertices);
  const aStarFunc = path.aStar(useGraph.graph, options);

  const nodes: Array<Node> = aStarFunc.find(
    nearestStart.join(","),
    nearestFinish.join(",")
  );
  const paths: Array<Position> = nodes.map((node) => [
    node.data.x,
    node.data.y,
  ]);
  const correctedPaths: Array<Array<Position>> = breakMeridianPaths(paths);
  return {
    path: correctedPaths,
    distance: 0,
  };
};

export default singleRouteCalculator;
