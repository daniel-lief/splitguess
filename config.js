// SplitGuess configuration
// 1) Create a Google Maps JavaScript API key.
// 2) Restrict it to your deployed domain (HTTP referrer restriction).
// 3) Restrict the key to the Maps JavaScript API.
// 4) Replace the placeholder below.

window.GAME_CONFIG = {
  GOOGLE_MAPS_API_KEY: "AIzaSyDfYfbgGrAdGzYcasuFg95l_gNn5UCMPSk",

  ROUND_SECONDS: 30,

  // Custom world-scale scoring curve:
  // score = 5000 * e^(-distanceKm / SCORE_DECAY_KM)
  SCORE_DECAY_KM: 2000,

  // Put locations on roads with Street View coverage.
  // heading: 0=north, 90=east, 180=south, 270=west.
  // pitch: 0=level, positive=up, negative=down.
  ROUNDS: [
    {
      name: "Round 1",
      lat: 48.85837,
      lng: 2.294481,
      heading: 35,
      pitch: 0,
    },
    {
      name: "Round 2",
      lat: 40.7580,
      lng: -73.9855,
      heading: 15,
      pitch: 0,
    },
    {
      name: "Round 3",
      lat: -33.8568,
      lng: 151.2153,
      heading: 120,
      pitch: 0,
    },
    {
      name: "Round 4",
      lat: 35.6595,
      lng: 139.7005,
      heading: 210,
      pitch: 0,
    },
    {
      name: "Round 5",
      lat: 51.5007,
      lng: -0.1246,
      heading: 300,
      pitch: 0,
    },
    {
      name: "Round 6",
      lat: 40.0497,
      lng: -87.7870,
      heading: 300,
      pitch: 0,
    },
    {
      name: "Round 7",
      lat: -3.1931,
      lng: 104.4987,
      heading: 300,
      pitch: 0,
    },
    {
      name: "Round 8",
      lat: 47.6042,
      lng: 15.8137,
      heading: 300,
      pitch: 0,
    },
    {
      name: "Round 9",
      lat: 41.6780,
      lng: 22.1310,
      heading: 300,
      pitch: 0,
    },
    {
      name: "Round 10",
      lat: -19.6015,
      lng: -46.7174,
      heading: 300,
      pitch: 0,
    },
    {
      name: "Round 11",
      lat: 17.3284,
      lng: 102.7712,
      heading: 300,
      pitch: 0,
    },
    {
      name: "Round 12",
      lat: 58.5116,
      lng: 25.8519,
      heading: 300,
      pitch: 0,
    },
    {
      name: "Round 13",
      lat: 54.2800,
      lng: -110.1804,
      heading: 300,
      pitch: 0,
    },
    {
      name: "Round 14",
      lat: -6.8301,
      lng: -78.1594,
      heading: 300,
      pitch: 0,
    },
    {
      name: "Round 15",
      lat: 6.9402,
      lng: 79.9147,
      heading: 300,
      pitch: 0,
    },
    {
      name: "Round 16",
      lat: -23.1929,
      lng: 46.0601,
      heading: 300,
      pitch: 0,
    },
    {
      name: "Round 17",
      lat: -33.9120,
      lng: 18.3900,
      heading: 300,
      pitch: 0,
    },
    {
      name: "Round 18",
      lat: 43.7339,
      lng: 7.4292,
      heading: 300,
      pitch: 0,
    },
    {
      name: "Round 19",
      lat: 79.8141,
      lng: 11.9067,
      heading: 300,
      pitch: 0,
    },
    {
      name: "Round 20",
      lat: 53.1262,
      lng: 157.7346,
      heading: 300,
      pitch: 0,
    },
  ],
};
