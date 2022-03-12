# Sea Route Calculator
Introducing, the Client-side Friendly Sea Route Calculator by Grey-Wing!

## Dependencies
This module requires the following libraries to work
```
yarn add ngraph.graph ngraph.path @turf/helpers @turf/distance
npm install ngraph.graph ngraph.path @turf/helpers @turf/distance
```

### ngraph
The underlying engine used to perform path finding makes use of [ngraph.graph](https://github.com/anvaka/ngraph.graph) to build the nodes and [ngraph.path](https://github.com/anvaka/ngraph.path) to calculate the shortest distance within the points of interest in the network.

## Instructions
### 1. Build the graph
Import a valid GeoJSON file (*it should be in the form of a json file unless your application can handle GeoJSON files*) as the basis to build the graph.
```
import buildGraph from 'gw-ngraph';
import network from './network.json';

const graph = buildGraph(network);
```

### 2. Define the parameters
When calculating the shortest path, the heuristic can be provided to optimise path selection.
This example is taken from [ngraph.path](https://github.com/anvaka/ngraph.path)
```
const options = { 
  distance(fromNode, toNode) {
    // In this case we have coordinates. Lets use them as
    // distance between two nodes:
    let dx = fromNode.data.x - toNode.data.x;
    let dy = fromNode.data.y - toNode.data.y;

    return Math.sqrt(dx * dx + dy * dy);
  },
  heuristic(fromNode, toNode) {
    // this is where we "guess" distance between two nodes.
    // In this particular case our guess is the same as our distance
    // function:
    let dx = fromNode.data.x - toNode.data.x;
    let dy = fromNode.data.y - toNode.data.y;

    return Math.sqrt(dx * dx + dy * dy);
  }
}
```

A template option with functionality to toggle parameters on whether the path should consider the usage of the IRTC Corridor, Suez Canal and Panama Canal is provided if it fits your use case.
```
import { setOptions } from 'gw-ngraph';

const options = setOptions(true, false, false); // Non-IRTC, Suez, Panama
```

### 3. Run Path Finder
You may calculate a route using a single pair of coordinates, or with multiple pairs.
Coordinates should be in the form of `[longitude, latitude]`.
```
import { find } from 'gw-ngraph'
// Single Pair

const coordinatePair = [[100, 10], [150, 40]];
const shortestRoute = find(graph, coordinatePair, options);

// Multiple Waypoints
import { findMany } from 'gw-ngraph';

const waypoints = [[100, 10], [150, 40], [-160, 30], [-40, 80]];
const shortestRoute = findMany(graph, waypoints, options);
```

### 4. Distance (Optional)
If required, you can change the units of distance using
```
const shortestRoute = findMany(graph, waypoints, 'miles);
```

## Notes
1. The current version makes use of `A*` by default. There is no configuration parameters to swap to the other 2 options, `A* Greedy` and `NBA*`
2. The sea route network graph is not provided. You are required to supply the relevant GeoJSON file.
3. This calculator includes the ability to calculate waypoints that crosses the meridian at 0 and 180 degrees.
4. Waypoints that cross at the 180 degree mark will be automatically broken into 2 paths. This facilitates the plotting of routes on Mapbox.
  ```
  {
    path: [[[170, 5], [180, 5], [-170, 5]]]
  }

  // becomes..

  {
    path: [[[170, 5], [180, 5]], [[-180, 5], [-170,5]]]
  }
  ```
5. The calculation of the distance of the shortest route is carried out using [@turf/distance](https://www.npmjs.com/package/@turf/distance) and will be in `kilometers` by default.