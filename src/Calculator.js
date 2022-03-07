import * as turf from "turf-point";
import { Form, Formik, useField } from "formik";
import { useEffect, useState } from "react";
import axios from "axios";
import localforage from "localforage";
import PathFinder from "./geojson-path-finder";
import Map from "./Map";
import { processMeridianCut } from "./utils/Misc";

const initialWaypoints = {
  example1: [
    { longitude: 103.7, latitude: 1.33333 },
    { longitude: 106.718, latitude: 10.7587 },
  ],
  example2: [
    {
      longitude: 23.887878124569756,
      latitude: 57.02899934855821,
    },
    {
      longitude: 22.912279265021315,
      latitude: 40.60778596498325,
    },
    {
      longitude: -74.36706778626323,
      latitude: 11.115138670698153,
    },
  ],
  example3: [
    {
      longitude: 23.887878124569756,
      latitude: 57.02899934855821,
    },
    {
      longitude: 22.912279265021315,
      latitude: 40.60778596498325,
    },
    {
      longitude: -74.36706778626323,
      latitude: 11.115138670698153,
    },
    { longitude: 151.22303590060116, latitude: -33.85865171521903 },
  ],
  example4: [
    {
      longitude: 162.47096813346838,
      latitude: 56.18343589352472,
    },
    {
      longitude: -134.91796826786023,
      latitude: 58.432208961053355,
    },
  ],
  example5: [
    {
      longitude: 23.887878124569756,
      latitude: 57.02899934855821,
    },
    {
      longitude: 22.912279265021315,
      latitude: 40.60778596498325,
    },
    {
      longitude: -74.36706778626323,
      latitude: 11.115138670698153,
    },
    { longitude: 151.22303590060116, latitude: -33.85865171521903 },
    { longitude: 100.56384058167184, latitude: 13.698188331830577 },
  ],
};

const InputField = (props) => {
  const [field, meta] = useField(props);
  const isInvalid = meta.touched && meta.error;
  return (
    <>
      <input className="form-control" {...field} {...props} />
      {isInvalid && <p>{meta.error}</p>}
    </>
  );
};

const Finder = () => {
  const [result, setResult] = useState([]);
  const [gwResult, setGwResult] = useState([]);
  const [resultStatus, setResultStatus] = useState("not-started");
  const [gwResultStatus, setGwResultStatus] = useState("not-started");
  const [network, setNetwork] = useState(null);
  const [useGwRoute, setUseGwRoute] = useState(false);
  const [endTime, setEndTime] = useState(0);
  const [endTimeGw, setEndTimeGw] = useState(0);

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

          const point1 = turf(coor1);
          const point2 = turf(coor2);
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
              const point1 = turf(modifiedStartCoordinate);
              const point2 = turf(finalDestination);
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
    return Promise.resolve();
  };

  return (
    <div className="d-flex h-100">
      <div className="map w-100 h-100">
        <Map network={network} paths={result} gwPaths={gwResult} />
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
