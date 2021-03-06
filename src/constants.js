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
  example6: [
    { longitude: 150.9, latitude: -37.3 },
    { longitude: -83.73, latitude: 23.365 },
  ],
  example7: [
    { longitude: 49.195349593117186, latitude: 30.573621044811162 },
    { longitude: 35.04184720904641, latitude: 32.75313700832591 },
  ],
  example8: [
    { longitude: -54.3264428301202, latitude: 48.396361717360094 },
    { longitude: 145.60691273994445, latitude: -38.010501111228045 },
  ],
};

const BADGE_COLORS = {
  "not-started": "primary",
  calculated: "success",
  "No result..": "danger",
  "not calculating": "info",
};
const NETWORK_RES = [5, 10, 20, 50, 100];

export { initialWaypoints, BADGE_COLORS, NETWORK_RES };
