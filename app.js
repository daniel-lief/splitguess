(() => {
  const config = window.GAME_CONFIG;
  const app = document.getElementById("app");

  const state = {
    role: null,
    roundIndex: 0,
    totalScore: 0,
    guess: null,
    timerId: null,
    secondsLeft: config.ROUND_SECONDS,
    map: null,
    panorama: null,
    overlays: [],
    googleReady: false,
    roundEnded: false,
    explorerInitialized: false,
    streetViewService: null,
  };

  function clearTimer() {
    if (state.timerId) {
      clearInterval(state.timerId);
      state.timerId = null;
    }
  }

  function clearOverlays() {
    for (const overlay of state.overlays) overlay.setMap(null);
    state.overlays = [];
  }

  function currentRound() {
    return config.ROUNDS[state.roundIndex];
  }

  function roleName() {
    return state.role === "explorer" ? "Explorer" : "Guesser";
  }

  function escapeHtml(value) {
    return String(value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function renderLanding() {
    clearTimer();
    app.innerHTML = `
      <main class="shell center-screen">
        <section class="card">
          <div class="brand">SplitGuess</div>
          <h1>One world.<br>Two screens.</h1>
          <p>Choose your role. Both teammates use this same site on separate devices, then start at roughly the same time. There is no account, room, or server.</p>

          <div class="role-grid">
            <button class="role-card" data-role="explorer">
              <span class="role-title">🧭 Explorer</span>
              <span class="role-desc">You get full movable Street View during the timer. You never see or place the team's guess.</span>
            </button>
            <button class="role-card" data-role="guesser">
              <span class="role-title">📍 Guesser</span>
              <span class="role-desc">You get only a world map. Click anywhere to move your guess. You never see Street View.</span>
            </button>
          </div>

          <div class="action-row">
            <button id="startBtn" class="primary" disabled>Start game</button>
            <span class="note">${config.ROUNDS.length} rounds · ${config.ROUND_SECONDS}s each</span>
          </div>
        </section>
      </main>
    `;

    const cards = [...document.querySelectorAll(".role-card")];
    const start = document.getElementById("startBtn");
    cards.forEach(card => {
      card.addEventListener("click", () => {
        state.role = card.dataset.role;
        cards.forEach(c => c.classList.toggle("selected", c === card));
        start.disabled = false;
      });
    });
    start.addEventListener("click", startGame);
  }

  async function startGame() {
    if (!state.role) return;
    if (!config.GOOGLE_MAPS_API_KEY || config.GOOGLE_MAPS_API_KEY.includes("YOUR_GOOGLE")) {
      return renderApiKeyError();
    }

    state.roundIndex = 0;
    state.totalScore = 0;
    state.explorerInitialized = false;
    state.panorama = null;
    sessionStorage.setItem("splitguess-role", state.role);

    app.innerHTML = `<div class="loading shell"><div><h2>Loading Google Maps…</h2><p>Preparing ${roleName()} mode.</p></div></div>`;
    try {
      await loadGoogleMaps();
      await startRound();
    } catch (error) {
      console.error(error);
      renderGenericError(error);
    }
  }

  function loadGoogleMaps() {
    if (state.googleReady && window.google?.maps) return Promise.resolve();
    if (window.__splitGuessMapsPromise) return window.__splitGuessMapsPromise;

    window.__splitGuessMapsPromise = new Promise((resolve, reject) => {
      window.__splitGuessMapsLoaded = () => {
        state.googleReady = true;
        resolve();
        delete window.__splitGuessMapsLoaded;
      };
      const script = document.createElement("script");
      const params = new URLSearchParams({
        key: config.GOOGLE_MAPS_API_KEY,
        loading: "async",
        callback: "__splitGuessMapsLoaded",
        v: "weekly",
      });
      script.src = `https://maps.googleapis.com/maps/api/js?${params.toString()}`;
      script.async = true;
      script.onerror = () => reject(new Error("Google Maps failed to load. Check the API key, billing, and referrer restrictions."));
      document.head.appendChild(script);
    });
    return window.__splitGuessMapsPromise;
  }

  async function startRound() {
    clearTimer();
    state.guess = null;
    state.guessMarker = null;
    state.secondsLeft = config.ROUND_SECONDS;
    state.roundEnded = false;
    clearOverlays();

    if (state.role === "explorer") {
      if (!state.explorerInitialized || !state.panorama || !document.getElementById("pano")) {
        renderGameFrame();
        await initExplorerView();
        state.explorerInitialized = true;
      } else {
        await prepareExistingExplorerView();
      }
    } else {
      destroyCurrentViews();
      renderGameFrame();
      initGuesserMap();
    }
    startTimer();
  }

  function destroyCurrentViews() {
    if (state.panorama && state.role !== "explorer") {
      try { state.panorama.setVisible(false); } catch (_) {}
      state.panorama = null;
    }
    state.map = null;
  }

  function renderGameFrame() {
    app.innerHTML = `
      <main class="game shell">
        <header class="topbar">
          <div class="topbar-left">
            <span class="role-pill">${roleName()}</span>
            <span class="round-label">Round ${state.roundIndex + 1} / ${config.ROUNDS.length}</span>
          </div>
          <div class="topbar-right">
            ${state.role === "guesser" ? `<span class="score-box">Total <strong id="totalScore">${state.totalScore.toLocaleString()}</strong></span>` : ""}
            <span class="timer" id="timer">${state.secondsLeft}</span>
          </div>
        </header>
        <section class="stage" id="stage">
          <div id="${state.role === "explorer" ? "pano" : "map"}"></div>
          ${state.role === "guesser" ? `<div class="map-overlay" id="mapHint">Click anywhere to place your guess</div>` : ""}
        </section>
      </main>
    `;
  }

  async function findStreetViewPanorama(round) {
    if (!state.streetViewService) state.streetViewService = new google.maps.StreetViewService();

    const location = { lat: round.lat, lng: round.lng };
    const radii = [50, 150, 500];

    for (const radius of radii) {
      try {
        const response = await state.streetViewService.getPanorama({
          location,
          radius,
          preference: google.maps.StreetViewPreference.NEAREST,
          source: google.maps.StreetViewSource.OUTDOOR,
        });
        if (response?.data?.location?.pano) return response.data.location.pano;
      } catch (_) {
        // Try a wider radius below.
      }
    }

    // Some valid Google panoramas are not tagged OUTDOOR, so make one final
    // unrestricted lookup before declaring the round invalid.
    try {
      const response = await state.streetViewService.getPanorama({
        location,
        radius: 1000,
        preference: google.maps.StreetViewPreference.NEAREST,
      });
      if (response?.data?.location?.pano) return response.data.location.pano;
    } catch (_) {}

    throw new Error(`No Street View panorama found near Round ${state.roundIndex + 1}. Choose coordinates closer to a Street View road.`);
  }

  async function initExplorerView() {
    const r = currentRound();
    const panoEl = document.getElementById("pano");
    const panoId = await findStreetViewPanorama(r);

    await nextPaint();

    state.panorama = new google.maps.StreetViewPanorama(panoEl, {
      pano: panoId,
      pov: { heading: r.heading ?? 0, pitch: r.pitch ?? 0 },
      zoom: 1,
      addressControl: false,
      fullscreenControl: true,
      motionTracking: false,
      motionTrackingControl: false,
      showRoadLabels: true,
      linksControl: true,
      panControl: true,
      zoomControl: true,
      enableCloseButton: false,
      visible: true,
    });

    await nextPaint();
    google.maps.event.trigger(state.panorama, "resize");
  }

  async function prepareExistingExplorerView() {
    const r = currentRound();
    const stage = document.getElementById("stage");
    stage.querySelectorAll(".explorer-result-layer").forEach(el => el.remove());

    const roundLabel = document.querySelector(".round-label");
    if (roundLabel) roundLabel.textContent = `Round ${state.roundIndex + 1} / ${config.ROUNDS.length}`;

    const panoId = await findStreetViewPanorama(r);
    state.panorama.setPano(panoId);
    state.panorama.setPov({ heading: r.heading ?? 0, pitch: r.pitch ?? 0 });
    state.panorama.setZoom(1);

    await nextPaint();
    google.maps.event.trigger(state.panorama, "resize");
  }

  function nextPaint() {
    return new Promise(resolve => requestAnimationFrame(resolve));
  }

  function initGuesserMap() {
    state.map = new google.maps.Map(document.getElementById("map"), {
      center: { lat: 20, lng: 0 },
      zoom: 2,
      minZoom: 2,
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControl: true,
      clickableIcons: false,
      gestureHandling: "greedy",
    });

    state.map.addListener("click", event => {
      if (state.roundEnded) return;
      state.guess = { lat: event.latLng.lat(), lng: event.latLng.lng() };
      drawGuess(state.guess);
      document.getElementById("mapHint").textContent = "Guess placed — click elsewhere to move it";
    });
  }

  function drawGuess(position) {
    if (state.guessMarker) state.guessMarker.setMap(null);
    state.guessMarker = createPointMarker(position, "#2563eb", 4);
  }

  function createPointMarker(position, color, scale = 6) {
    const marker = new google.maps.Marker({
      map: state.map,
      position,
      clickable: false,
      icon: {
        path: google.maps.SymbolPath.CIRCLE,
        scale,
        fillColor: color,
        fillOpacity: 1,
        strokeColor: "#111827",
        strokeOpacity: 1,
        strokeWeight: 2.5,
      },
    });
    state.overlays.push(marker);
    return marker;
  }

  function startTimer() {
    updateTimerDisplay();
    state.timerId = setInterval(() => {
      state.secondsLeft -= 1;
      updateTimerDisplay();
      if (state.secondsLeft <= 0) endRound();
    }, 1000);
  }

  function updateTimerDisplay() {
    const el = document.getElementById("timer");
    if (!el) return;
    el.textContent = state.secondsLeft;
    el.classList.toggle("urgent", state.secondsLeft <= 5);
  }

  function endRound() {
    if (state.roundEnded) return;
    state.roundEnded = true;
    clearTimer();
    if (state.role === "guesser") showGuesserResult();
    else showExplorerResult();
  }

  function buildResultMap() {
    const r = currentRound();
    const stage = document.getElementById("stage");
    stage.innerHTML = `<div id="map"></div>`;
    state.map = new google.maps.Map(document.getElementById("map"), {
      center: { lat: r.lat, lng: r.lng },
      zoom: 5,
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControl: true,
      clickableIcons: false,
    });

    const actual = { lat: r.lat, lng: r.lng };
    createPointMarker(actual, "#16a34a", 4);
    return { stage, actual };
  }

  function showExplorerResult() {
    const r = currentRound();
    const stage = document.getElementById("stage");
    // Never hide or disable the panorama. The result layer simply covers it.
    // Keeping Street View continuously rendered avoids the black-screen bug
    // that occurs after display:none / setVisible(false) round transitions.
    const layer = document.createElement("div");
    layer.className = "explorer-result-layer";
    layer.innerHTML = `
      <div class="explorer-result-map" id="explorerResultMap"></div>
      <section class="result-panel">
        <div class="brand">Round complete</div>
        <h2>${escapeHtml(r.name || `Round ${state.roundIndex + 1}`)}</h2>
        <p>The green marker is the real location. Your teammate's guess stays private on their device.</p>
        <div class="action-row">
          <button id="nextBtn" class="primary">${isLastRound() ? "Finish" : "Next round"}</button>
        </div>
      </section>
    `;
    stage.appendChild(layer);

    state.map = new google.maps.Map(document.getElementById("explorerResultMap"), {
      center: { lat: r.lat, lng: r.lng },
      zoom: 5,
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControl: true,
      clickableIcons: false,
    });
    createPointMarker({ lat: r.lat, lng: r.lng }, "#16a34a", 4);

    document.getElementById("nextBtn").addEventListener("click", advanceRound);
  }

  function showGuesserResult() {
    const { stage, actual } = buildResultMap();
    const r = currentRound();
    let distance = null;
    let roundScore = 0;

    if (state.guess) {
      distance = haversineKm(state.guess, actual);
      roundScore = scoreForDistance(distance);
      state.totalScore += roundScore;

      createPointMarker(state.guess, "#2563eb", 4);
      const line = new google.maps.Polyline({
        map: state.map,
        path: [state.guess, actual],
        strokeOpacity: .75,
        strokeWeight: 2,
      });
      state.overlays.push(line);

      const bounds = new google.maps.LatLngBounds();
      bounds.extend(state.guess);
      bounds.extend(actual);
      state.map.fitBounds(bounds, 90);
    }

    stage.insertAdjacentHTML("beforeend", `
      <section class="result-panel">
        <div class="brand">Round complete</div>
        <h2>${escapeHtml(r.name || `Round ${state.roundIndex + 1}`)}</h2>
        <div class="result-grid">
          <div class="metric"><span class="metric-label">Distance</span><span class="metric-value">${distance === null ? "No guess" : formatDistance(distance)}</span></div>
          <div class="metric"><span class="metric-label">Round score</span><span class="metric-value">${roundScore.toLocaleString()}</span></div>
        </div>
        <p><strong style="color:#86efac">Green</strong> is the real location. <strong style="color:#93c5fd">Blue</strong> is your guess.</p>
        <div class="action-row">
          <button id="nextBtn" class="primary">${isLastRound() ? "See final score" : "Next round"}</button>
        </div>
      </section>
    `);
    document.getElementById("nextBtn").addEventListener("click", advanceRound);
  }

  function isLastRound() {
    return state.roundIndex >= config.ROUNDS.length - 1;
  }

  function advanceRound() {
    if (isLastRound()) return renderFinal();
    state.roundIndex += 1;
    startRound();
  }

  function renderFinal() {
    clearTimer();
    const guesserContent = `
      <div class="brand">Final score</div>
      <h1>${state.totalScore.toLocaleString()}</h1>
      <p>out of ${(config.ROUNDS.length * 5000).toLocaleString()} possible points. Use this number on the organizer's leaderboard.</p>
    `;
    const explorerContent = `
      <div class="brand">Game complete</div>
      <h1>Nice exploring.</h1>
      <p>Your teammate's device has the team's final score. Keeping it there is what lets this version stay completely serverless.</p>
    `;

    app.innerHTML = `
      <main class="shell center-screen">
        <section class="card">
          ${state.role === "guesser" ? guesserContent : explorerContent}
          <div class="action-row">
            <button id="playAgain" class="primary">Play again</button>
            <button id="changeRole" class="secondary">Change role</button>
          </div>
        </section>
      </main>
    `;
    document.getElementById("playAgain").addEventListener("click", () => {
      state.roundIndex = 0;
      state.totalScore = 0;
      state.explorerInitialized = false;
      state.panorama = null;
      startRound();
    });
    document.getElementById("changeRole").addEventListener("click", () => {
      state.role = null;
      renderLanding();
    });
  }

  function haversineKm(a, b) {
    const R = 6371.0088;
    const toRad = deg => deg * Math.PI / 180;
    const dLat = toRad(b.lat - a.lat);
    const dLng = toRad(b.lng - a.lng);
    const lat1 = toRad(a.lat);
    const lat2 = toRad(b.lat);
    const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(h));
  }

  function scoreForDistance(distanceKm) {
    if (distanceKm <= 0.025) return 5000;
    return Math.max(0, Math.min(5000, Math.round(5000 * Math.exp(-distanceKm / config.SCORE_DECAY_KM))));
  }

  function formatDistance(km) {
    if (km < 1) return `${Math.round(km * 1000)} m`;
    if (km < 100) return `${km.toFixed(1)} km`;
    return `${Math.round(km).toLocaleString()} km`;
  }

  function renderApiKeyError() {
    app.innerHTML = `
      <main class="shell error-box">
        <section class="card">
          <div class="brand">Setup required</div>
          <h2>Add your Google Maps API key</h2>
          <p>Open <code>config.js</code> and replace <code>YOUR_GOOGLE_MAPS_API_KEY</code>. Enable the Maps JavaScript API, enable billing for production use, and restrict the key to your deployed website.</p>
          <button id="backBtn" class="secondary">Back</button>
        </section>
      </main>
    `;
    document.getElementById("backBtn").addEventListener("click", renderLanding);
  }

  function renderGenericError(error) {
    app.innerHTML = `
      <main class="shell error-box">
        <section class="card">
          <div class="brand">Could not start</div>
          <h2>Google Maps did not load</h2>
          <p>${escapeHtml(error?.message || "Unknown error")}</p>
          <p class="note">Check your API key, Maps JavaScript API enablement, billing, and website referrer restrictions.</p>
          <button id="backBtn" class="secondary">Back</button>
        </section>
      </main>
    `;
    document.getElementById("backBtn").addEventListener("click", renderLanding);
  }

  renderLanding();
})();
