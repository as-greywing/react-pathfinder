import { Position } from "@turf/helpers";
import createGraph, { Graph as NGraph, NodeId } from "ngraph.graph";
import {
  Graph,
  GraphObject,
  HashCoordinateObject,
  NetworkLineString,
} from "./types";
import { alterFeatureCoordinates, getLocationHash } from "./utils";

const Grapher = (
  features: Array<GeoJSON.Feature<NetworkLineString>>
): GraphObject => {
  const graph: NGraph = createGraph();
  const coordHashObject: Array<HashCoordinateObject> = [];

  features.forEach((feature) => {
    if (feature.geometry && feature.geometry.coordinates) {
      feature.geometry.coordinates.forEach((coord: Position, index) => {
        // Add to coordinates
        coordHashObject.push({
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

  const uniqueHashes: Array<NodeId> = Array.from(
    new Set(coordHashObject.map((coord) => coord.hash))
  );
  console.log(`Got ${uniqueHashes.length} unique coordinates.`);

  const vertices: Array<Position> = [];
  // Add coords (unique hashes) to graph
  uniqueHashes.forEach((hash) => {
    const coord: Position = String(hash).split(",").map(Number);
    graph.addNode(hash, { x: coord[0], y: coord[1] });
    vertices.push(coord);
  });

  return {
    graph,
    vertices,
  };
};

const BuildGraph = (
  network: GeoJSON.FeatureCollection<NetworkLineString>
): Graph => {
  /**
   * An extended Graph is required to perform calculations when crossing the meridian
   */
  const mainGraph: GraphObject = Grapher(network.features);
  const positiveNetwork = alterFeatureCoordinates(network, "LTR");
  const positiveGraph: GraphObject = Grapher(positiveNetwork.features);

  const negativeNetwork = alterFeatureCoordinates(network, "RTL");
  const negativeGraph: GraphObject = Grapher(negativeNetwork.features);

  return {
    mainGraph,
    positiveGraph,
    negativeGraph,
  };
};

export default BuildGraph;
