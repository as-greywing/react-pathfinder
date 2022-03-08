import { Form, Formik } from "formik";
import { useCallback, useEffect, useMemo, useState } from "react";
import axios from "axios";
import localforage from "localforage";
import path from "ngraph.path";
import { point } from "turf";
import * as Yup from "yup";

import Map from "./Map";
import InputField from "./InputField";

import PathFinder from "../libs/gpf";
import {
  aStarOption,
  geojsonToGraph,
  getNearestNeighbour,
  modifyGeoJSON,
  processMeridianCut,
} from "../utils/Misc";
import { initialWaypoints } from "../constants";

const HIDE_RESULTS = true;

const BADGE_COLORS = {
  "not-started": "primary",
  calculated: "success",
  "No result..": "danger",
  "not calculating": "info",
};

const CalculationToggler = ({ name, value, onChange }) => (
  <div className="form-check">
    <input
      className="me-3 form-check-input"
      type="checkbox"
      name={name}
      checked={value}
      onChange={() => onChange((e) => !e)}
    />
    <label
      className="form-check-label"
      htmlFor={name}
      onClick={() => onChange((e) => !e)}
    >
      Check to enable calculation
    </label>
  </div>
);

const Finder = () => {
  const [network, setNetwork] = useState(null);
  const [negativeExtNetwork, setNegativeExtNetwork] = useState(null);

  const [result, setResult] = useState([]);
  const [resultStatus, setResultStatus] = useState("not-started");
  const [useGPFRoute, setUseGPFRoute] = useState(true);

  const [gwResult, setGwResult] = useState([]);
  const [gwResultStatus, setGwResultStatus] = useState("not-started");
  const [useGwRoute, setUseGwRoute] = useState(false);

  const [ngResult, setNgResult] = useState([]);
  const [ngResultStatus, setNgResultStatus] = useState("not-started");
  const [useNgRoute, setUseNgRoute] = useState(false);

  const [endTime, setEndTime] = useState(0);
  const [endTimeGw, setEndTimeGw] = useState(0);
  const [endTimeNg, setEndTimeNg] = useState(0);

  const [precision, setPrecision] = useState(0.0001);

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
        setNegativeExtNetwork(modifyGeoJSON(hasNetwork, false));
      }
    }
    fetch();
  }, []);

  const graph = useMemo(() => {
    if (!network) return null;
    return geojsonToGraph(network);
  }, [network]);

  const negativeGraph = useMemo(() => {
    if (!negativeExtNetwork) return null;
    return geojsonToGraph(negativeExtNetwork);
  }, [negativeExtNetwork]);

  const pathFinder = useMemo(() => {
    if (!network) return null;
    return new PathFinder(network, { precision });
  }, [network, precision]);

  /**
   * Calculate the path using ngraph
   */
  const getNGPath = useCallback(
    (waypoints) => {
      if (!graph) return [];
      if (!negativeGraph) return [];
      const aStarFunc = path.aStar(graph.graph, aStarOption);
      const aStarFuncNegative = path.aStar(negativeGraph.graph, aStarOption);

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
          const [coor1, coor2, changedIndex] = processMeridianCut(
            _coor1.split(","),
            _coor2.split(",")
          );

          if (changedIndex !== undefined) {
            const result = aStarFuncNegative.find(
              coor1.join(","),
              coor2.join(",")
            );

            const firstArray = [];
            const secondArray = [];
            let firstIntersection = true;

            let orderedArray = result.sort((a, b) => Number(b) - Number(a));
            if (changedIndex === 1) {
              orderedArray.reverse();
            }
            orderedArray.forEach((node) => {
              if (Number(node.data.x) <= -180) {
                if (firstIntersection) {
                  firstArray.push([node.data.x, node.data.y]);
                  firstIntersection = false;
                }
                secondArray.push([Number(node.data.x) + 360, node.data.y]);
              } else {
                firstArray.push([node.data.x, node.data.y]);
              }
            });
            if (result) {
              acc.push(firstArray);
              acc.push(secondArray);
            }
          } else {
            const result = aStarFunc.find(_coor1, _coor2);
            if (result) {
              // console.log("skip")
              acc.push(
                result.map((eachNode) => [eachNode.data.x, eachNode.data.y])
              );
            }
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
    [graph, negativeGraph]
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

  const getPath = async (waypoints) => {
    return new Promise((res) => {
      if (pathFinder) {
        const paths = waypoints.reduce((acc, waypoint, index) => {
          if (index + 1 < waypoints.length) {
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
          res(paths);
        } else {
          res([]);
        }
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

  const handleSubmit = async ({ waypoints }) => {
    if (useGwRoute) {
      setGwResultStatus("calculating");
      const startTimeGw = performance.now();
      await getGwPath(waypoints);
      const endTimeGw = performance.now();
      setEndTimeGw(Math.round(endTimeGw - startTimeGw));
    } else {
      setGwResult([]);
      setGwResultStatus("not calculating");
    }
    if (useGPFRoute) {
      setResultStatus("calculating");
      const startTime = performance.now();
      await getPath(waypoints);
      const endTime = performance.now();
      setEndTime(Math.round(endTime - startTime, 0));
    } else {
      setResult([]);
      setResultStatus("not calculating");
    }
    if (useNgRoute) {
      setNgResultStatus("calculating");
      const startTimeNg = performance.now();
      getNGPath(waypoints);
      const endTimeNg = performance.now();
      setEndTimeNg(Math.round(endTimeNg - startTimeNg, 0));
    } else {
      setNgResult([]);
      setNgResultStatus("not calculating");
    }

    return Promise.resolve();
  };

  return (
    <Formik
      initialValues={{
        waypoints: initialWaypoints.example2,
      }}
      validationSchema={Yup.object({
        waypoints: Yup.array()
          .of(
            Yup.object().shape({
              latitude: Yup.number().required(),
              longitude: Yup.number().required(),
            })
          )
          .min(2),
      })}
      onSubmit={handleSubmit}
    >
      {({ values, setFieldValue, errors, isSubmitting }) => {
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
              <h2>Inputs</h2>
              <div className="card">
                <div className="card-body">
                  <Form>
                    <label className="label">Waypoints</label>
                    <p className="text-muted">
                      Include at least 2 waypoints.
                      <br />
                      (longitude, latitude)
                    </p>
                    {values.waypoints.map((_, index) => (
                      <div className="d-flex gap-2 mb-3" key={index}>
                        <InputField
                          disableError
                          name={`waypoints.${index}.longitude`}
                        />
                        <InputField
                          disableError
                          name={`waypoints.${index}.latitude`}
                        />
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
                    {errors.waypoints && (
                      <p className="text-danger">
                        {JSON.stringify(errors.waypoints)}
                      </p>
                    )}
                    <button
                      type="submit"
                      className="btn btn-primary"
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? "Loading" : "Calculate "}
                    </button>
                    <p className="mt-3 mb-0">
                      PRO TIP: click anywhere on the map to add a new waypoint.
                    </p>
                  </Form>
                </div>
              </div>
              <h2>Calculation Options</h2>
              <div className="card">
                <div className="card-body">
                  <p className="h3" style={{ color: "#24ed6a" }}>
                    Modified Sea Route
                  </p>
                  <CalculationToggler
                    name="useGw"
                    value={useGwRoute}
                    onChange={setUseGwRoute}
                  />
                  <div className="d-flex justify-content-between align-items-start mt-3">
                    <div className={`badge bg-${BADGE_COLORS[gwResultStatus]}`}>
                      {gwResultStatus}
                    </div>
                    <p>{gwResultStatus === "calculated" && `${endTimeGw}ms`}</p>
                  </div>
                </div>
              </div>
              <div className="card">
                <div className="card-body">
                  <p className="h3" style={{ color: "#2c1ce6" }}>
                    Geojson Path Finder
                  </p>
                  <CalculationToggler
                    name="useGPF"
                    value={useGPFRoute}
                    onChange={setUseGPFRoute}
                  />
                  <div className="d-flex align-items-center justify-content-center">
                    <label className="label me-3">Precision</label>
                    {/* This is currently disabled as it causes a network graph rebuild immediately on change */}
                    <input
                      className="form-control"
                      type="number"
                      value={precision}
                      onChange={(e) => setPrecision(e.target.value)}
                      disabled
                    />
                  </div>
                  <div className="d-flex justify-content-between align-items-start mt-3">
                    <div className={`badge bg-${BADGE_COLORS[resultStatus]}`}>
                      {resultStatus}
                    </div>
                    <p>{resultStatus === "calculated" && `${endTime}ms`}</p>
                  </div>
                </div>
              </div>
              <div className="card">
                <div className="card-body">
                  <p className="h3" style={{ color: "#e8335a" }}>
                    NGraph
                  </p>
                  <CalculationToggler
                    name="useNg"
                    value={useNgRoute}
                    onChange={setUseNgRoute}
                  />
                  <div className="d-flex justify-content-between align-items-start mt-3">
                    <div
                      className={`badge bg-${BADGE_COLORS[ngResultStatus]} `}
                    >
                      {ngResultStatus}
                    </div>
                    <p>{ngResultStatus === "calculated" && `${endTimeNg}ms`}</p>
                  </div>
                </div>
              </div>
              {!HIDE_RESULTS && (
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
              )}
            </div>
          </div>
        );
      }}
    </Formik>
  );
};
export default Finder;
