import { Position } from "@turf/helpers";
import { NodeId, Graph as NGraph, Link } from "ngraph.graph";

export interface GraphObject {
  graph: NGraph;
  vertices: Array<Position>;
}

export interface NodeData {
  x: number;
  y: number;
}

export interface Graph {
  mainGraph: GraphObject;
  extendedGraph: GraphObject;
}

export interface Route {
  path: Array<Array<Position>>
  distance: number
}

export interface LinkWithDescription extends Link {
  desc_: string | null;
}

interface FeatureDescription {
  desc_: string | null;
}

export interface NetworkLineString extends GeoJSON.LineString {
  properties: FeatureDescription;
}

export interface HashCoordinateObject {
  hash: NodeId;
  location: Position;
}
