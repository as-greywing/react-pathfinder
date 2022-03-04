"use strict";
import findPath from "./dijkstra";

var preprocess = require("./preprocessor"),
  compactor = require("./compactor");
// roundCoord = require("./round-coord");

function PathFinder(graph, options) {
  options = options || {};
  if (!graph.compactedVertices) {
    graph = preprocess(graph, options);
  }
  this._graph = graph;
  this._keyFn =
    options.keyFn ||
    function (c) {
      return c.join(",");
    };
  this._precision = options.precision || 1e-5;
  this._options = options;

  if (
    Object.keys(this._graph.compactedVertices).filter(function (k) {
      return k !== "edgeData";
    }).length === 0
  ) {
    throw new Error(
      "Compacted graph contains no forks (topology has no intersections)."
    );
  }
}

const getNearestNeighbour = ([longO, latO], vertices) => {
  const nearest = Object.keys(vertices).reduce((acc, vertex) => {
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

PathFinder.prototype = {
  findPath: function (a, b) {
    /**
     * Replaced the function here to get the nearest neighbour instead of finding the specific key
     */
    const start = getNearestNeighbour(
      a.geometry.coordinates,
      this._graph.vertices
    );
    const finish = getNearestNeighbour(
      b.geometry.coordinates,
      this._graph.vertices
    );
    // var start = this._keyFn(
    //     roundCoord(a.geometry.coordinates, this._precision)
    //   ),
    //   finish = this._keyFn(roundCoord(b.geometry.coordinates, this._precision));
    // We can't find a path if start or finish isn't in the
    // set of non-compacted vertices
    if (!this._graph.vertices[start] || !this._graph.vertices[finish]) {
      return null;
    }

    var phantomStart = this._createPhantom(start);
    var phantomEnd = this._createPhantom(finish);
    // console.log("phantom start", phantomStart, phantomEnd);

    var path = findPath(this._graph.compactedVertices, start, finish);
    if (path) {
      var weight = path[0];
      path = path[1];
      return {
        path: path
          .reduce(
            function buildPath(cs, v, i, vs) {
              if (i > 0) {
                cs = cs.concat(this._graph.compactedCoordinates[vs[i - 1]][v]);
              }

              return cs;
            }.bind(this),
            []
          )
          .concat([this._graph.sourceVertices[finish]]),
        weight: weight,
        edgeDatas: this._graph.compactedEdges
          ? path.reduce(
              function buildEdgeData(eds, v, i, vs) {
                if (i > 0) {
                  eds.push({
                    reducedEdge: this._graph.compactedEdges[vs[i - 1]][v],
                  });
                }

                return eds;
              }.bind(this),
              []
            )
          : undefined,
      };
    } else {
      return null;
    }

    // this._removePhantom(phantomStart);
    // this._removePhantom(phantomEnd);
  },

  serialize: function () {
    return this._graph;
  },

  _createPhantom: function (n) {
    if (this._graph.compactedVertices[n]) return null;

    var phantom = compactor.compactNode(
      n,
      this._graph.vertices,
      this._graph.compactedVertices,
      this._graph.sourceVertices,
      this._graph.edgeData,
      true,
      this._options
    );
    this._graph.compactedVertices[n] = phantom.edges;
    this._graph.compactedCoordinates[n] = phantom.coordinates;

    if (this._graph.compactedEdges) {
      this._graph.compactedEdges[n] = phantom.reducedEdges;
    }

    Object.keys(phantom.incomingEdges).forEach(
      function (neighbor) {
        this._graph.compactedVertices[neighbor][n] =
          phantom.incomingEdges[neighbor];
        this._graph.compactedCoordinates[neighbor][n] = [
          this._graph.sourceVertices[neighbor],
        ].concat(phantom.incomingCoordinates[neighbor].slice(0, -1));
        if (this._graph.compactedEdges) {
          this._graph.compactedEdges[neighbor][n] =
            phantom.reducedEdges[neighbor];
        }
      }.bind(this)
    );

    return n;
  },

  _removePhantom: function (n) {
    if (!n) return;

    Object.keys(this._graph.compactedVertices[n]).forEach(
      function (neighbor) {
        delete this._graph.compactedVertices[neighbor][n];
      }.bind(this)
    );
    Object.keys(this._graph.compactedCoordinates[n]).forEach(
      function (neighbor) {
        delete this._graph.compactedCoordinates[neighbor][n];
      }.bind(this)
    );
    if (this._graph.compactedEdges) {
      Object.keys(this._graph.compactedEdges[n]).forEach(
        function (neighbor) {
          delete this._graph.compactedEdges[neighbor][n];
        }.bind(this)
      );
    }

    delete this._graph.compactedVertices[n];
    delete this._graph.compactedCoordinates[n];

    if (this._graph.compactedEdges) {
      delete this._graph.compactedEdges[n];
    }
  },
};

export default PathFinder;
