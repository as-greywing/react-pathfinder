import { point, Position } from '@turf/helpers';
import distance from '@turf/distance';
import { DistanceUnits, Graph, Route } from './types';
import path, { PathFinderOptions } from 'ngraph.path';
import { Link, Node } from 'ngraph.graph';
import {
  breakMeridianPaths,
  getNearestNeighbour,
  processMeridianCrossing,
} from './utils';

const singleRouteCalculator = (
  graph: Graph,
  waypoints: [Position, Position],
  options: PathFinderOptions<Node, Link>,
  units: DistanceUnits = 'kilometers'
): Route | boolean => {
  const [_start, _finish] = waypoints;
  // 1. Process the start and finish points in the event that it crosses the 180 degree meridian
  const {
    coord: [start, finish],
    changed,
    direction,
  } = processMeridianCrossing(_start, _finish);

  // 2. Identify the graph to be used based on the direction in step 1
  let useGraph = graph.mainGraph;

  if (changed && direction === 'LTR') {
    useGraph = graph.positiveGraph;
  }

  if (changed && direction === 'RTL') {
    useGraph = graph.negativeGraph;
  }

  // 3. Identify the nearest coordinate within the vertice
  const nearestStart = getNearestNeighbour(start, useGraph.vertices);
  const nearestFinish = getNearestNeighbour(finish, useGraph.vertices);

  // If the nearest neighbour cannot be found stop the calculation
  if (!nearestStart || !nearestFinish) return false;

  // 4. Select the path finding algorithm to use
  const aStarFunc = path.aStar(useGraph.graph, options);

  // 5. Run the algorithm with the start and finish points
  const nodes: Array<Node> = aStarFunc.find(
    nearestStart.join(','),
    nearestFinish.join(',')
  );
  const paths: Array<Position> = nodes.map((node) => [
    node.data.x,
    node.data.y,
  ]);

  // 6. Check if the calculated route has to be broken apart for proper display on the map
  const correctedPaths: Array<Array<Position>> = breakMeridianPaths(
    paths,
    direction
  );

  const totalDistance: number = correctedPaths.reduce((acc, groupPath) => {
    const groupPathLength = groupPath.reduce((innerAcc, path, index) => {
      if (index === 0) {
        return innerAcc;
      } else {
        return (
          innerAcc +
          distance(point(path), point(groupPath[index - 1]), {
            units,
          })
        );
      }
    }, 0);
    return acc + groupPathLength;
  }, 0);

  return {
    path: correctedPaths,
    distance: totalDistance,
  };
};

export default singleRouteCalculator;
