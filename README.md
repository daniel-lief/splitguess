# SplitGuess

A zero-backend, two-person GeoGuessr-style game:

- **Explorer:** movable Google Street View only during each round.
- **Guesser:** clickable world map only during each round.
- Both players independently run the same deterministic list of rounds.
- After time expires, both see the real location.
- Only the Guesser sees the guess and score, so there is no server-side/team communication at all.

## 1. Add a Google Maps API key

Edit `config.js`:

```js
GOOGLE_MAPS_API_KEY: "YOUR_KEY_HERE"
```

In Google Cloud:

1. Create/select a project.
2. Enable **Maps JavaScript API**.
3. Create an API key.
4. For production, enable billing.
5. Restrict the key by **HTTP referrer** to your deployed domain.
6. Add an **API restriction** allowing only Maps JavaScript API.

A browser-visible Maps JavaScript API key is expected; the important protection is restricting which websites and APIs are allowed to use it.

## 2. Choose rounds

Edit `ROUNDS` in `config.js`.

```js
{
  name: "Berkeley",
  lat: 37.8715,
  lng: -122.2730,
  heading: 90,
  pitch: 0,
}
```

Choose coordinates that are actually on/very near roads with Google Street View coverage. Google may snap the requested position to a nearby Street View panorama.

## 3. Change round duration / scoring

In `config.js`:

```js
ROUND_SECONDS: 30,
SCORE_DECAY_KM: 2000,
```

The scoring formula is intentionally simple and transparent:

```text
score = 5000 * e^(-distanceKm / SCORE_DECAY_KM)
```

A guess within 25 m receives 5000 points.

## 4. Run locally

Because the site is static, any basic local web server works.

Python:

```bash
python -m http.server 8000
```

Then open:

```text
http://localhost:8000
```

Add `http://localhost:8000/*` to your API key's HTTP referrer restrictions while testing.

## 5. Deploy

You can deploy the folder as-is to GitHub Pages, Netlify, Cloudflare Pages, Vercel, etc. No Node server or database is required.

## Competition workflow

1. Give everyone the same URL.
2. Each team uses two devices.
3. One player selects **Explorer**, the other selects **Guesser**.
4. Say “3, 2, 1, start” and both click **Start game**.
5. After each result, say “next” and both click **Next round**.
6. At the end, the Guesser reports the team's final score to the organizer.

## Why the Explorer does not show the team's score

With no backend or device-to-device communication, the Explorer has no way to know where the Guesser clicked. That is also what guarantees the Explorer cannot accidentally see the guess. The Guesser is therefore the authoritative scorekeeper.


### v4 Street View fix
The Explorer now keeps one persistent StreetViewPanorama instance for the whole game. Result maps are layered over it rather than deleting and rebuilding the Street View DOM between rounds.


## v5 Street View lifecycle fix
Explorer Street View is never hidden with CSS and never toggled invisible between rounds. The result map is an opaque overlay placed above the still-rendering panorama, preventing Google Street View from losing its rendering surface between rounds.
