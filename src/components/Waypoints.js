import { useCallback, useMemo, useContext } from "react";
import { Form, Formik, useFormikContext } from "formik";
import axios from "axios";
import { point, distance } from "turf";
import * as Yup from "yup";

import InputField from "./InputField";
import { initialWaypoints } from "../constants";
import PathFinder from "../libs/gpf";
import { processMeridianCut } from "../utils/Misc";
import { CalculatorContext } from "../context/CalculatorContext";
import WaypointAdder from "./WaypointAdder";
import WaypointMarkers from "./WaypointMarkers";
import Checkbox from "./Checkbox";
import newGrapher, { findMany, setOptions } from "../libs/gw-ngraph";

const Waypoints = () => {
  const {
    useGwRoute,
    useGPFRoute,
    precision,
    useNgRoute,
    nonIRTC,
    usePanama,
    useSuez,
    network,
    setNgResult,
    setNgResultStatus,
    setGwResult,
    setGwResultStatus,
    setResult,
    setResultStatus,
    setEndTime,
    setEndTimeGw,
    setEndTimeNg,
  } = useContext(CalculatorContext);

  const newGraph = useMemo(() => {
    if (!network) return null;
    return newGrapher(network);
  }, [network]);

  const pathFinder = useMemo(() => {
    if (!network) return null;
    return new PathFinder(network, {
      precision,
      weightFn: (a, b, props) => {
        if (nonIRTC) {
          if (props.desc_ === "irtc") {
            return Number.MAX_SAFE_INTEGER;
          }
        }
        if (!useSuez) {
          if (props.desc_ === "suez") {
            return Number.MAX_SAFE_INTEGER;
          }
        }
        if (!usePanama) {
          if (props.desc_ === "panama") {
            return Number.MAX_SAFE_INTEGER;
          }
        }
        return distance(point([a[0], a[1]]), point([b[0], b[1]]));
      },
    });
  }, [network, precision, nonIRTC, useSuez, usePanama]);

  /**
   * Calculate the path using ngraph
   */
  const getNGPath = useCallback(
    (waypoints) => {
      if (!newGraph) return [];
      const aStarOptions = setOptions(nonIRTC, useSuez, usePanama);
      const allWaypoints = waypoints.map((each) => [
        each.longitude,
        each.latitude,
      ]);
      const finalRoute = findMany(newGraph, allWaypoints, aStarOptions);

      if (finalRoute.distance) {
        setNgResult(finalRoute.path);
        setNgResultStatus("calculated");
      } else {
        setNgResultStatus("No result..");
      }
    },
    [nonIRTC, usePanama, useSuez, setNgResult, setNgResultStatus, newGraph]
  );

  /**
   * Calculate the path using grey-wing's modified searoute endpoint
   */
  const getGwPath = useCallback(
    async (waypoints) => {
      try {
        const promises = await Promise.all(
          waypoints.map(async (waypoint, index) => {
            if (index + 1 < waypoints.length) {
              const { data } = await axios.get(
                `http://localhost:3123/?res=5&suez=${useSuez ? 1 : 0}&panama=${
                  usePanama ? 1 : 0
                }&nonIRTC=${!nonIRTC ? 1 : 0}&opos=${waypoint.longitude},${
                  waypoint.latitude
                }&dpos=${waypoints[index + 1].longitude},${
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
    },
    [usePanama, useSuez, nonIRTC, setGwResult, setGwResultStatus]
  );

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
        waypoints: initialWaypoints.example5,
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
      <Form style={{ height: "100%" }}>
        <WaypointAdder />
        <WaypointMarkers />
        <WaypointsForm />
      </Form>
    </Formik>
  );
};

const WaypointsForm = () => {
  const { setFieldValue, values, errors, isSubmitting } = useFormikContext();
  const { showWaypoints, setShowWaypoints, isPreparing } =
    useContext(CalculatorContext);
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
    <div className="card position-relative" style={{ height: "100%" }}>
      {isPreparing && (
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            height: "100%",
            background: "white",
            borderRadius: "0.25rem",
            opacity: 0.8,
          }}
        />
      )}
      <div
        className="card-body"
        style={{ height: "calc(100% - 48px)", overflowY: "auto" }}
      >
        <label className="label d-flex justify-content-between">
          <span className="fw-bold">Waypoints</span>
          <Checkbox
            value={showWaypoints}
            onChange={setShowWaypoints}
            name="showWaypoints"
            label="show"
          />
        </label>
        <p className="text-muted">
          Include at least 2 waypoints.
          <br />
          (longitude, latitude)
        </p>
        {!values.waypoints.length && (
          <div className="d-flex gap-2 mb-3">
            <button
              className="btn btn-md btn-primary"
              type="button"
              onClick={handleAdd(0)}
            >
              Add a new waypoint
            </button>
          </div>
        )}
        {values.waypoints.map((_, index) => (
          <div className="d-flex gap-2 mb-3" key={index}>
            <InputField disableError name={`waypoints.${index}.longitude`} />
            <InputField disableError name={`waypoints.${index}.latitude`} />
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
          <p className="text-danger">{JSON.stringify(errors.waypoints)}</p>
        )}
        <p className="mt-3 mb-0">
          PRO TIP: click anywhere on the map to add a new waypoint.
        </p>
      </div>
      <div className="card-footer">
        <button
          type="submit"
          className="btn btn-primary btn-sm"
          disabled={isSubmitting || isPreparing}
        >
          {isSubmitting ? "Loading" : "Calculate "}
        </button>
      </div>
    </div>
  );
};

export default Waypoints;
