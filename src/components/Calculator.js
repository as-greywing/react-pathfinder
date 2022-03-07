import { Form, Formik } from "formik";
import { useCallback, useEffect, useState } from "react";
import axios from "axios";
import localforage from "localforage";
import path from "ngraph.path";
import { distance, point } from "turf";

import Map from "./Map";
import InputField from "./InputField";

import PathFinder from "../libs/gpf";
import {
  geojsonToPath,
  getNearestNeighbour,
  processMeridianCut,
} from "../utils/Misc";
import { initialWaypoints } from "../constants";

const Finder = () => {
  const [network, setNetwork] = useState(null);

  const [result, setResult] = useState([]);
  const [resultStatus, setResultStatus] = useState("not-started");

  const [gwResult, setGwResult] = useState([]);
  const [gwResultStatus, setGwResultStatus] = useState("not-started");
  const [useGwRoute, setUseGwRoute] = useState(false);

  const [graph, setGraph] = useState(null);
  const [ngResult, setNgResult] = useState([]);
  const [ngResultStatus, setNgResultStatus] = useState("not-started");

  const [endTime, setEndTime] = useState(0);
  const [endTimeGw, setEndTimeGw] = useState(0);
  const [endTimeNg, setEndTimeNg] = useState(0);

  /**
   * Fetch the network json from the endpoint, if not from indexedDB
   * Currently making use of the 20km resolution network
   */
  useEffect(() => {
    async function fetch() {
      const hasNetwork = await localforage.getItem("network");
      if (!hasNetwork) {
        const { data } = await axios("http://localhost:3123/network/20");
        localforage.setItem("network", data);
        setNetwork(data);
      } else {
        setNetwork(hasNetwork);
      }
    }
    fetch();
  }, []);

  useEffect(() => {
    if (!network) return;
    setGraph(geojsonToPath(network));
  }, [network]);

  /**
   * Calculate the path using ngraph
   */
  const getNGPath = useCallback(
    (waypoints) => {
      if (!graph) return [];
      const aStarFunc = path.aStar(graph.graph, {
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
      });

      const paths = waypoints.reduce((acc, waypoint, index) => {
        if (index + 1 < waypoints.length) {
          const _coor1 = getNearestNeighbour(
            [waypoint.longitude, waypoint.latitude],
            graph.vertices
          );
          const _coor2 = getNearestNeighbour(
            [waypoints[index + 1].longitude, waypoints[index + 1].latitude],
            graph.vertices
          );
          // Check coordinates if the distance between the 2 longitudes are greater than 180.
          // const [coor1, coor2, changedIndex] = processMeridianCut(
          //   _coor1.split(","),
          //   _coor2.split(",")
          // );
          // console.log("changing", changedIndex);

          // const result = aStarFunc.find(coor1.join(","), coor2.join(","));
          const result = aStarFunc.find(_coor1, _coor2);
          if (result) {
            acc.push(
              result.map((eachNode) => [eachNode.data.x, eachNode.data.y])
            );
          }
        }
        return acc;
      }, []);

      if (paths.length) {
        setNgResult(paths);
        setNgResultStatus("calculated");
      } else {
        setNgResultStatus("No result..");
      }
    },
    [graph]
  );

  /**
   * Calculate the path using grey-wing's modified searoute endpoint
   */
  const getGwPath = async (waypoints) => {
    try {
      const promises = await Promise.all(
        waypoints.map(async (waypoint, index) => {
          if (index + 1 < waypoints.length) {
            const { data } = await axios.get(
              `http://localhost:3123/?res=5&suez=1&panama=1&nonIRTC=1&opos=${
                waypoint.longitude
              },${waypoint.latitude}&dpos=${waypoints[index + 1].longitude},${
                waypoints[index + 1].latitude
              }`
            );
            if (data.status === "ok") {
              return Promise.resolve(data.geom.coordinates);
            }
            return Promise.resolve(null);
          }
          return Promise.resolve(null);
        })
      );

      const paths = promises.reduce((acc, path, index) => {
        if (path) {
          acc.push(...path);
        }
        return acc;
      }, []);
      setGwResult(paths);
      setGwResultStatus("calculated");
    } catch (error) {
      console.log("error", error.message);
      setGwResultStatus(error.message);
    }
  };

  const getPath = async (waypoints, precision) => {
    return new Promise((res) => {
      const paths = waypoints.reduce((acc, waypoint, index) => {
        if (index + 1 < waypoints.length) {
          const pathFinder = new PathFinder(network, {
            precision,
          });
          const _coor1 = [waypoint.longitude, waypoint.latitude];
          const _coor2 = [
            waypoints[index + 1].longitude,
            waypoints[index + 1].latitude,
          ];
          // Check coordinates if the distance between the 2 longitudes are greater than 180.
          const [coor1, coor2, changedIndex] = processMeridianCut(
            _coor1,
            _coor2
          );

          const point1 = point(coor1);
          const point2 = point(coor2);
          const result = pathFinder.findPath(point1, point2);

          if (result) {
            acc.push([waypoints[index].longitude, waypoints[index].latitude]);
            acc.push(result.path);

            // In the situation where the routing crosses the meridian, we need to carry out 2 path calculations istead of 1.
            // TODO: tidy this up
            if (changedIndex !== undefined) {
              let lastCalculatedCoordinate =
                result.path[result.path.length - 1];
              let finalDestination = _coor2;
              if (changedIndex === 0) {
                lastCalculatedCoordinate = result.path[0];
                finalDestination = _coor1;
              }
              const modifiedStartCoordinate = [
                lastCalculatedCoordinate[0] + 360,
                lastCalculatedCoordinate[1],
              ];
              const point1 = point(modifiedStartCoordinate);
              const point2 = point(finalDestination);
              const secondResult = pathFinder.findPath(point1, point2);
              acc.push(secondResult.path);
            }
          }
        }
        return acc;
      }, []);
      if (paths.length) {
        paths.push([
          waypoints[waypoints.length - 1].longitude,
          waypoints[waypoints.length - 1].latitude,
        ]);
        res(paths);
      } else {
        res([]);
      }
    }).then((result) => {
      if (result.length) {
        setResult(result);
        setResultStatus("calculated");
      } else {
        setResult([]);
        setResultStatus("No result..");
      }
      return Promise.resolve();
    });
  };

  const handleSubmit = async ({ waypoints, precision }) => {
    if (useGwRoute) {
      setGwResultStatus("calculating");
      const startTimeGw = performance.now();
      await getGwPath(waypoints);
      const endTimeGw = performance.now();
      setEndTimeGw(Math.round(endTimeGw - startTimeGw));
    } else {
      setGwResultStatus("not calculating");
    }
    const startTime = performance.now();
    setResultStatus("calculating");
    await getPath(waypoints, precision);
    const endTime = performance.now();
    setEndTime(Math.round(endTime - startTime, 0));

    const startTimeNg = performance.now();
    setNgResultStatus("calculating");
    getNGPath(waypoints);
    const endTimeNg = performance.now();
    setEndTimeNg(Math.round(endTimeNg - startTimeNg, 0));

    return Promise.resolve();
  };

  return (
    <div className="d-flex h-100">
      <div className="map w-100 h-100">
        <Map
          network={network}
          paths={result}
          gwPaths={gwResult}
          ngPaths={ngResult}
        />
      </div>
      <div
        className="p-3 d-flex gap-2 flex-column h-100"
        style={{ overflow: "scroll" }}
      >
        <div className="card">
          <div className="card-body">
            <Formik
              initialValues={{
                precision: 0.0001,
                waypoints: initialWaypoints.example5,
              }}
              onSubmit={handleSubmit}
            >
              {({ values, setFieldValue, isSubmitting }) => {
                const handleAdd = (index) => {
                  return () => {
                    const updated = [
                      ...values.waypoints.slice(0, index + 1),
                      { longitude: "", latitude: "" },
                      ...values.waypoints.slice(index + 1),
                    ];
                    setFieldValue("waypoints", updated);
                  };
                };
                const handleRemove = (index) => {
                  return () => {
                    const updated = [
                      ...values.waypoints.slice(0, index),
                      ...values.waypoints.slice(index + 1),
                    ];
                    setFieldValue("waypoints", updated);
                  };
                };
                return (
                  <Form>
                    <label className="label">Precision</label>
                    <InputField
                      className="form-control mb-3"
                      name="precision"
                    />
                    <label className="label">Waypoints</label>
                    {values.waypoints.map((_, index) => (
                      <div className="d-flex gap-2 mb-3" key={index}>
                        <InputField name={`waypoints.${index}.longitude`} />
                        <InputField name={`waypoints.${index}.latitude`} />
                        <button
                          className="btn btn-md btn-primary"
                          type="button"
                          onClick={handleAdd(index)}
                        >
                          +
                        </button>
                        <button
                          className="btn btn-md btn-danger"
                          onClick={handleRemove(index)}
                          type="button"
                          disabled={values.waypoints.length === 1}
                        >
                          -
                        </button>
                      </div>
                    ))}
                    <button
                      type="submit"
                      className="btn btn-primary"
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? "Loading" : "Calculate "}
                    </button>
                  </Form>
                );
              }}
            </Formik>
          </div>
        </div>
        <div className="card">
          <div className="card-body">
            <p style={{ color: "#24ed6a" }}>
              Modified Sea Route
              <input
                className="ms-3"
                type="checkbox"
                name="useGw"
                value={useGwRoute}
                onChange={() => setUseGwRoute((e) => !e)}
              />
            </p>
            <p>
              {gwResultStatus}{" "}
              {gwResultStatus === "calculated" && `${endTimeGw}ms`}
            </p>
            <p style={{ color: "#f2eaa0" }}>Geojson Path Finder</p>
            {resultStatus} {resultStatus === "calculated" && `${endTime}ms`}
            <p></p>
            <p style={{ color: "#e8335a" }}>NGraph</p>
            {ngResultStatus}{" "}
            {ngResultStatus === "calculated" && `${endTimeNg}ms`}
            <p></p>
          </div>
        </div>
        <div className="card">
          <div className="card-body">
            {!result && <p>No results</p>}
            {result && (
              <pre className="mt-3 bg-dark text-white p-3 small">
                {JSON.stringify({ result }, null, 2)}
              </pre>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
export default Finder;
