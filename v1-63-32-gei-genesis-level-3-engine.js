/* V1.63.32 — Genesis Level 3: Reservoir / Dry Land Engine
   Dedicated Level 3 engine. Level 1, Level 2, the Simulator Wall, Academy
   state, Dam Gate state, and existing simulator score state remain external.
*/
(() => {
  "use strict";

  const STORAGE_KEY = "geiSimulatorLevel3V1";
  const GATE_KEY = "geiDamGateV1";
  const LEVEL2_RESULT_KEY = "geiSimulatorLevel2V1";
  const VERSION = "1.63.32";
  const SCORE = Object.freeze({ contain: 70, expose: 110, stabilize: 150 });
  const INITIAL = Object.freeze({ volume: 64, inflow: 6, outflow: 2 });
  const BASIN_CAPACITY = 78;
  const SAFE_VOLUME = Object.freeze({ low: 40, high: 48 });
  const SAFE_LAND = Object.freeze({ low: 52, high: 60 });
  const MIN_RESERVE = 30;
  const VOLUME_STEP = 4;
  const FLOW_STEP = 2;
  const FLOW_LIMITS = Object.freeze({ low: 0, high: 12 });
  const CORRECT_MARKERS = new Set(["north", "east", "south"]);
  const MARKER_LABELS = Object.freeze({
    north: "NORTH BANK",
    east: "EAST BANK",
    south: "SOUTH BANK",
    outside: "OUTSIDE RIDGE",
    channel: "CHANNEL CUT"
  });
  const DEFAULT_RESULT = Object.freeze({
    version: VERSION,
    completed: false,
    bestScore: 0,
    updatedAt: null
  });

  function isLevel3Route() {
    return window.location.search === "?level=3";
  }

  function isWallRoute() {
    return window.location.search === "";
  }

  function gateIsOpen() {
    try {
      const value = JSON.parse(localStorage.getItem(GATE_KEY) || "{}");
      return value && value.opened === true;
    } catch (_) {
      return false;
    }
  }

  function readResult() {
    try {
      const value = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
      if (!value || typeof value !== "object") return { ...DEFAULT_RESULT };
      return {
        version: VERSION,
        completed: value.completed === true,
        bestScore: Math.max(0, Math.floor(Number(value.bestScore) || 0)),
        updatedAt: value.updatedAt === null ? null : Number.isFinite(Number(value.updatedAt)) ? Number(value.updatedAt) : null
      };
    } catch (_) {
      return { ...DEFAULT_RESULT };
    }
  }

  function readLevel2Result() {
    try {
      const value = JSON.parse(localStorage.getItem(LEVEL2_RESULT_KEY) || "{}");
      return Boolean(value && typeof value === "object" && value.completed === true);
    } catch (_) {
      return false;
    }
  }

  function saveResult(score, previous) {
    const result = {
      version: VERSION,
      completed: true,
      bestScore: Math.max(previous.bestScore, score),
      updatedAt: Date.now()
    };
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(result));
    } catch (_) {}
    return result;
  }

  function clamp(value, low = 0, high = 100) {
    return Math.max(low, Math.min(high, value));
  }

  function markup(result) {
    return `
      <main class="gei-level3" id="gei-level3" aria-labelledby="gei-level3-title">
        <div class="gei-level3-shell">
          <header class="gei-level3-top">
            <div class="gei-level3-brand">
              <span class="gei-level3-mark" aria-hidden="true">R3</span>
              <div>
                <span class="gei-level3-kicker">GENESIS ENGINEERED INTERPRETATIONS</span>
                <strong>HYDRAULIC CONTROL ROOM</strong>
              </div>
            </div>
            <div class="gei-level3-top-actions">
              <button type="button" id="gei-level3-wall">SIMULATOR WALL</button>
              <button type="button" id="gei-level3-academy">ACADEMY</button>
            </div>
          </header>

          <section class="gei-level3-main">
            <article class="gei-level3-field" aria-labelledby="gei-level3-title">
              <div class="gei-level3-field-head">
                <div>
                  <span class="gei-level3-eyebrow">HYDRAULIC MISSION 03</span>
                  <h1 id="gei-level3-title">RESERVOIR / <span>DRY LAND</span></h1>
                  <p>Shape the basin, draw a visible shoreline and stabilize the exchange between stored water and exposed land.</p>
                </div>
                <div class="gei-level3-command-readout" aria-label="Level 3 score status">
                  <div><span>RUN SCORE</span><strong id="gei-level3-score">0</strong></div>
                  <div><span>BEST SCORE</span><strong id="gei-level3-best">${result.bestScore}</strong></div>
                </div>
              </div>

              <div class="gei-level3-telemetry" aria-label="Reservoir telemetry">
                <div class="gei-level3-telemetry-cell volume">
                  <span>RESERVOIR VOLUME</span>
                  <strong id="gei-level3-volume">64%</strong>
                  <div class="gei-level3-meter"><span id="gei-level3-volume-fill"></span></div>
                </div>
                <div class="gei-level3-telemetry-cell land">
                  <span>DRY-LAND EXPOSURE</span>
                  <strong id="gei-level3-land">36%</strong>
                  <div class="gei-level3-meter"><span id="gei-level3-land-fill"></span></div>
                </div>
                <div class="gei-level3-telemetry-cell capacity">
                  <span>CONTAINMENT RESERVE</span>
                  <strong id="gei-level3-reserve">—</strong>
                  <div class="gei-level3-meter"><span id="gei-level3-reserve-fill"></span></div>
                </div>
                <div class="gei-level3-telemetry-cell flow">
                  <span>FLOW BALANCE</span>
                  <strong id="gei-level3-balance">+4 UNITS</strong>
                  <small id="gei-level3-flow-detail">INFLOW 6 / OUTFLOW 2</small>
                </div>
              </div>

              <div class="gei-level3-reservoir-visual" aria-label="Reservoir and dry-land schematic">
                <div class="gei-level3-schematic-grid" aria-hidden="true"></div>
                <div class="gei-level3-sky-label">DAY 3 / BASIN FIELD</div>
                <div class="gei-level3-dry-land" aria-hidden="true"><span>DRY LAND</span></div>
                <div class="gei-level3-basin-ridge" aria-hidden="true"></div>
                <div class="gei-level3-water" id="gei-level3-water" aria-hidden="true"><span>RESERVOIR</span></div>
                <div class="gei-level3-waterline" id="gei-level3-waterline-visual" aria-hidden="true"><span>WATERLINE</span></div>
                <div class="gei-level3-contour north" aria-hidden="true"></div>
                <div class="gei-level3-contour east" aria-hidden="true"></div>
                <div class="gei-level3-contour south" aria-hidden="true"></div>
                <div class="gei-level3-overflow-flag" id="gei-level3-overflow-flag" aria-hidden="true">OVERFLOW</div>
                <div class="gei-level3-visual-label left">BASIN CAPACITY</div>
                <div class="gei-level3-visual-label right">EXPOSED FIELD</div>
              </div>

              <fieldset class="gei-level3-waterline-controls">
                <legend>WATERLINE CONTROL</legend>
                <label for="gei-level3-waterline-input">
                  <span>SET RESERVOIR VOLUME</span>
                  <output id="gei-level3-waterline-value" for="gei-level3-waterline-input">64%</output>
                </label>
                <input id="gei-level3-waterline-input" type="range" min="0" max="100" step="4" value="64" aria-label="Reservoir volume">
                <div class="gei-level3-control-row">
                  <button type="button" id="gei-level3-lower">LOWER WATERLINE</button>
                  <button type="button" id="gei-level3-raise">RAISE WATERLINE</button>
                </div>
              </fieldset>

              <div class="gei-level3-status" id="gei-level3-status" role="status" aria-live="polite">SELECT NORTH, EAST AND SOUTH BANKS TO SHAPE THE BASIN.</div>
            </article>

            <aside class="gei-level3-missions" aria-labelledby="gei-level3-missions-title">
              <div class="gei-level3-missions-head">
                <div>
                  <span>MISSION CONSOLE</span>
                  <h2 id="gei-level3-missions-title">Reservoir Protocol</h2>
                </div>
                <strong id="gei-level3-objective-count">0 / 3</strong>
              </div>

              <div class="gei-level3-objective-list">
                <article class="gei-level3-objective is-current" data-objective="contain">
                  <div class="gei-level3-objective-head"><span>01 / CONTAIN</span><b data-objective-status>CURRENT</b></div>
                  <h3>SHAPE THE BASIN</h3>
                  <p>Select the three banks that contain the reservoir. The order does not matter.</p>
                  <div class="gei-level3-marker-grid" role="group" aria-label="Basin contour markers">
                    <button type="button" data-basin-marker="north" aria-pressed="false">NORTH BANK</button>
                    <button type="button" data-basin-marker="east" aria-pressed="false">EAST BANK</button>
                    <button type="button" data-basin-marker="south" aria-pressed="false">SOUTH BANK</button>
                    <button type="button" data-basin-marker="outside" aria-pressed="false">OUTSIDE RIDGE</button>
                    <button type="button" data-basin-marker="channel" aria-pressed="false">CHANNEL CUT</button>
                  </div>
                </article>

                <article class="gei-level3-objective is-locked" data-objective="expose">
                  <div class="gei-level3-objective-head"><span>02 / EXPOSE</span><b data-objective-status>LOCKED</b></div>
                  <h3>DRAW THE DRY LINE</h3>
                  <p>Move the reservoir waterline until a stable, visible region of dry land is exposed.</p>
                  <button type="button" class="gei-level3-objective-action" id="gei-level3-confirm-exposure">CONFIRM DRY LINE</button>
                </article>

                <article class="gei-level3-objective is-locked" data-objective="stabilize">
                  <div class="gei-level3-objective-head"><span>03 / STABILIZE</span><b data-objective-status>LOCKED</b></div>
                  <h3>BALANCE THE RESERVOIR</h3>
                  <p>Match inflow and outflow while keeping the exposed field and containment reserve stable.</p>
                  <div class="gei-level3-flow-grid" role="group" aria-label="Reservoir flow controls">
                    <button type="button" id="gei-level3-inflow-down">DECREASE INFLOW</button>
                    <button type="button" id="gei-level3-inflow-up">INCREASE INFLOW</button>
                    <button type="button" id="gei-level3-outflow-down">DECREASE OUTFLOW</button>
                    <button type="button" id="gei-level3-outflow-up">INCREASE OUTFLOW</button>
                  </div>
                  <button type="button" class="gei-level3-objective-action stabilize" id="gei-level3-stabilize">STABILIZE RESERVOIR</button>
                </article>
              </div>
            </aside>
          </section>

          <footer class="gei-level3-footer">
            <span>LEVEL 3 SCORE IS SEPARATE FROM LEVEL 1, LEVEL 2 AND ACADEMY XP.</span>
            <strong id="gei-level3-footer-state">SYSTEM READY</strong>
            <button type="button" id="gei-level3-reset">RESET ATTEMPT</button>
          </footer>
        </div>

        <section class="gei-level3-complete" id="gei-level3-complete" hidden aria-labelledby="gei-level3-complete-title">
          <div class="gei-level3-complete-card">
            <div class="gei-level3-complete-mark" aria-hidden="true">LAND</div>
            <span class="gei-level3-complete-kicker">RESERVOIR BALANCE CONFIRMED</span>
            <h2 id="gei-level3-complete-title">LEVEL 3 COMPLETE</h2>
            <p>The basin contains its water, the dry land is exposed and the exchange is stable.</p>
            <strong id="gei-level3-final-score">330 SCORE</strong>
            <button type="button" id="gei-level3-return">RETURN TO SIMULATOR WALL</button>
          </div>
        </section>
      </main>`;
  }

  function mountWallEntry() {
    if (!isWallRoute() || !gateIsOpen() || !readLevel2Result()) return;
    if (document.getElementById("gei-level3-entry")) return;

    const footer = document.querySelector(".gei-simulator-bottom");
    const levelOne = document.getElementById("gei-simulator-enter");
    if (!footer || !levelOne) return;

    const entry = document.createElement("a");
    entry.id = "gei-level3-entry";
    entry.className = "gei-simulator-enter";
    entry.href = "simulator.html?level=3";
    entry.textContent = "ENTER LEVEL 3";
    entry.setAttribute("aria-label", "Enter Level 3 Reservoir and Dry Land");
    footer.insertBefore(entry, levelOne);
  }

  function initLevel3() {
    if (!isLevel3Route() || !gateIsOpen() || document.getElementById("gei-level3")) return;

    const previous = readResult();
    document.body.innerHTML = markup(previous);

    const root = document.getElementById("gei-level3");
    const state = {
      volume: INITIAL.volume,
      inflow: INITIAL.inflow,
      outflow: INITIAL.outflow,
      capacity: null,
      overflow: false,
      basinComplete: false,
      exposeComplete: false,
      stabilizeComplete: false,
      selectedMarkers: new Set(),
      awarded: new Set(),
      score: 0,
      levelComplete: false
    };

    const els = {
      score: document.getElementById("gei-level3-score"),
      best: document.getElementById("gei-level3-best"),
      volume: document.getElementById("gei-level3-volume"),
      land: document.getElementById("gei-level3-land"),
      reserve: document.getElementById("gei-level3-reserve"),
      balance: document.getElementById("gei-level3-balance"),
      flowDetail: document.getElementById("gei-level3-flow-detail"),
      volumeFill: document.getElementById("gei-level3-volume-fill"),
      landFill: document.getElementById("gei-level3-land-fill"),
      reserveFill: document.getElementById("gei-level3-reserve-fill"),
      water: document.getElementById("gei-level3-water"),
      waterlineVisual: document.getElementById("gei-level3-waterline-visual"),
      overflowFlag: document.getElementById("gei-level3-overflow-flag"),
      status: document.getElementById("gei-level3-status"),
      footerState: document.getElementById("gei-level3-footer-state"),
      count: document.getElementById("gei-level3-objective-count"),
      waterline: document.getElementById("gei-level3-waterline-input"),
      waterlineValue: document.getElementById("gei-level3-waterline-value"),
      confirmExposure: document.getElementById("gei-level3-confirm-exposure"),
      stabilize: document.getElementById("gei-level3-stabilize"),
      complete: document.getElementById("gei-level3-complete"),
      finalScore: document.getElementById("gei-level3-final-score")
    };

    const markerButtons = [...root.querySelectorAll("[data-basin-marker]")];
    const flowButtons = {
      inflowDown: document.getElementById("gei-level3-inflow-down"),
      inflowUp: document.getElementById("gei-level3-inflow-up"),
      outflowDown: document.getElementById("gei-level3-outflow-down"),
      outflowUp: document.getElementById("gei-level3-outflow-up")
    };

    function dryLand() {
      return 100 - state.volume;
    }

    function containmentReserve() {
      return state.capacity === null ? null : state.capacity - state.volume;
    }

    function flowBalance() {
      return state.inflow - state.outflow;
    }

    function exposureIsSafe() {
      const land = dryLand();
      const reserve = containmentReserve();
      return state.basinComplete &&
        !state.overflow &&
        state.volume >= SAFE_VOLUME.low &&
        state.volume <= SAFE_VOLUME.high &&
        land >= SAFE_LAND.low &&
        land <= SAFE_LAND.high &&
        reserve !== null &&
        reserve >= MIN_RESERVE;
    }

    function stabilizationIsSafe() {
      return exposureIsSafe() && flowBalance() === 0;
    }

    function setStatus(message, mode = "ready") {
      els.status.textContent = message;
      root.dataset.status = mode;
      els.footerState.textContent = mode === "overflow" ? "OVERFLOW RECOVERY" : mode === "complete" ? "SYSTEM STABILIZED" : message;
    }

    function award(name, value, message) {
      if (state.awarded.has(name)) return;
      state.awarded.add(name);
      state.score += value;
      setStatus(message, "success");
    }

    function triggerOverflow() {
      state.volume = 56;
      state.inflow = INITIAL.inflow;
      state.outflow = INITIAL.outflow;
      state.overflow = true;
      state.exposeComplete = false;
      state.stabilizeComplete = false;
      setStatus("OVERFLOW — RECOVERY REQUIRED. REDRAW THE WATERLINE.", "overflow");
    }

    function setVolume(nextVolume) {
      if (!state.basinComplete || state.levelComplete) return;
      state.volume = clamp(Number(nextVolume));
      if (state.capacity !== null && state.volume > state.capacity) {
        triggerOverflow();
      } else {
        state.overflow = false;
        setStatus("WATERLINE UPDATED — CHECK DRY-LAND EXPOSURE.", "active");
      }
      render();
    }

    function updateObjectiveCard(name, status, className) {
      const card = root.querySelector(`[data-objective="${name}"]`);
      if (!card) return;
      card.classList.remove("is-current", "is-locked", "is-complete");
      if (className) card.classList.add(className);
      const label = card.querySelector("[data-objective-status]");
      if (label) label.textContent = status;
    }

    function render() {
      const land = dryLand();
      const reserve = containmentReserve();
      const balance = flowBalance();
      const reserveDisplay = reserve === null ? "—" : `${reserve}%`;
      const balanceDisplay = `${balance > 0 ? "+" : ""}${balance} UNITS`;

      els.score.textContent = String(state.score);
      els.best.textContent = String(Math.max(previous.bestScore, state.score));
      els.volume.textContent = `${state.volume}%`;
      els.land.textContent = `${land}%`;
      els.reserve.textContent = reserveDisplay;
      els.balance.textContent = balanceDisplay;
      els.flowDetail.textContent = `INFLOW ${state.inflow} / OUTFLOW ${state.outflow}`;
      els.volumeFill.style.width = `${state.volume}%`;
      els.landFill.style.width = `${land}%`;
      els.reserveFill.style.width = `${reserve === null ? 0 : clamp(reserve)}%`;
      els.water.style.height = `${state.volume}%`;
      els.waterlineVisual.style.bottom = `${state.volume}%`;
      els.overflowFlag.textContent = state.overflow ? "OVERFLOW" : "CONTAINED";
      els.waterline.value = String(state.volume);
      els.waterlineValue.textContent = `${state.volume}%`;
      els.waterline.setAttribute("aria-valuetext", `${state.volume}% reservoir volume, ${land}% dry-land exposure`);
      els.count.textContent = `${[state.basinComplete, state.exposeComplete, state.stabilizeComplete].filter(Boolean).length} / 3`;

      markerButtons.forEach((button) => {
        const marker = button.dataset.basinMarker;
        const selected = state.selectedMarkers.has(marker);
        button.disabled = state.levelComplete || state.basinComplete || selected;
        button.setAttribute("aria-pressed", String(selected));
        button.classList.toggle("is-selected", selected);
      });

      updateObjectiveCard("contain", state.basinComplete ? "COMPLETE" : "CURRENT", state.basinComplete ? "is-complete" : "is-current");
      updateObjectiveCard("expose", state.exposeComplete ? "COMPLETE" : state.basinComplete ? "CURRENT" : "LOCKED", state.exposeComplete ? "is-complete" : state.basinComplete ? "is-current" : "is-locked");
      updateObjectiveCard("stabilize", state.stabilizeComplete ? "COMPLETE" : state.exposeComplete ? "CURRENT" : "LOCKED", state.stabilizeComplete ? "is-complete" : state.exposeComplete ? "is-current" : "is-locked");

      const volumeEnabled = state.basinComplete && !state.levelComplete;
      els.waterline.disabled = !volumeEnabled;
      document.getElementById("gei-level3-lower").disabled = !volumeEnabled;
      document.getElementById("gei-level3-raise").disabled = !volumeEnabled;
      els.confirmExposure.disabled = !state.basinComplete || state.exposeComplete || state.levelComplete;
      const flowEnabled = state.exposeComplete && !state.levelComplete;
      Object.values(flowButtons).forEach((button) => { button.disabled = !flowEnabled; });
      els.stabilize.disabled = !flowEnabled;
      root.classList.toggle("is-overflow", state.overflow);
      root.classList.toggle("is-complete", state.levelComplete);
    }

    function selectMarker(marker) {
      if (state.basinComplete || state.levelComplete) return;
      if (!CORRECT_MARKERS.has(marker)) {
        setStatus(`${MARKER_LABELS[marker]} IS OUTSIDE THE BASIN. NO PENALTY — SELECT A BANK MARKER.`, "guidance");
        render();
        return;
      }
      state.selectedMarkers.add(marker);
      if (state.selectedMarkers.size === CORRECT_MARKERS.size) {
        state.basinComplete = true;
        state.capacity = BASIN_CAPACITY;
        award("contain", SCORE.contain, "BASIN SHAPED — CAPACITY MAPPED AT 78%.");
      } else {
        setStatus(`${MARKER_LABELS[marker]} ACCEPTED — ${CORRECT_MARKERS.size - state.selectedMarkers.size} BANK MARKER${CORRECT_MARKERS.size - state.selectedMarkers.size === 1 ? "" : "S"} REMAIN.`, "active");
      }
      render();
    }

    function confirmExposure() {
      if (!state.basinComplete || state.exposeComplete || state.levelComplete) return;
      if (!exposureIsSafe()) {
        setStatus("DRY LINE DENIED — VOLUME 40–48%, DRY LAND 52–60%, RESERVE 30% MINIMUM.", "warning");
        render();
        return;
      }
      state.exposeComplete = true;
      award("expose", SCORE.expose, "DRY LINE CONFIRMED — FLOW BALANCE ONLINE.");
      render();
    }

    function adjustFlow(kind) {
      if (!state.exposeComplete || state.levelComplete) return;
      if (kind === "inflowDown") state.inflow = clamp(state.inflow - FLOW_STEP, FLOW_LIMITS.low, FLOW_LIMITS.high);
      if (kind === "inflowUp") state.inflow = clamp(state.inflow + FLOW_STEP, FLOW_LIMITS.low, FLOW_LIMITS.high);
      if (kind === "outflowDown") state.outflow = clamp(state.outflow - FLOW_STEP, FLOW_LIMITS.low, FLOW_LIMITS.high);
      if (kind === "outflowUp") state.outflow = clamp(state.outflow + FLOW_STEP, FLOW_LIMITS.low, FLOW_LIMITS.high);
      setStatus(flowBalance() === 0 ? "FLOW BALANCED — STABILIZE THE RESERVOIR." : "FLOW RESPONSE REGISTERED — MATCH INFLOW AND OUTFLOW.", flowBalance() === 0 ? "active" : "active");
      render();
    }

    function stabilize() {
      if (!state.exposeComplete || state.levelComplete) return;
      if (!stabilizationIsSafe()) {
        setStatus("STABILIZATION DENIED — MATCH FLOW AND KEEP THE WATERLINE IN THE SAFE BAND.", "warning");
        render();
        return;
      }
      state.stabilizeComplete = true;
      award("stabilize", SCORE.stabilize, "RESERVOIR STABILIZED — DRY LAND EXPOSED.");
      state.levelComplete = true;
      const saved = saveResult(state.score, previous);
      els.best.textContent = String(saved.bestScore);
      els.finalScore.textContent = `${state.score} SCORE`;
      els.complete.hidden = false;
      setStatus("SYSTEM STABILIZED — LEVEL 3 COMPLETE.", "complete");
      render();
    }

    function resetAttempt() {
      state.volume = INITIAL.volume;
      state.inflow = INITIAL.inflow;
      state.outflow = INITIAL.outflow;
      state.capacity = null;
      state.overflow = false;
      state.basinComplete = false;
      state.exposeComplete = false;
      state.stabilizeComplete = false;
      state.selectedMarkers.clear();
      state.awarded.clear();
      state.score = 0;
      state.levelComplete = false;
      els.complete.hidden = true;
      setStatus("ATTEMPT RESET — SELECT NORTH, EAST AND SOUTH BANKS.", "ready");
      render();
    }

    markerButtons.forEach((button) => button.addEventListener("click", () => selectMarker(button.dataset.basinMarker)));
    els.waterline.addEventListener("input", () => setVolume(Number(els.waterline.value)));
    document.getElementById("gei-level3-lower").addEventListener("click", () => setVolume(state.volume - VOLUME_STEP));
    document.getElementById("gei-level3-raise").addEventListener("click", () => setVolume(state.volume + VOLUME_STEP));
    els.confirmExposure.addEventListener("click", confirmExposure);
    flowButtons.inflowDown.addEventListener("click", () => adjustFlow("inflowDown"));
    flowButtons.inflowUp.addEventListener("click", () => adjustFlow("inflowUp"));
    flowButtons.outflowDown.addEventListener("click", () => adjustFlow("outflowDown"));
    flowButtons.outflowUp.addEventListener("click", () => adjustFlow("outflowUp"));
    els.stabilize.addEventListener("click", stabilize);
    document.getElementById("gei-level3-reset").addEventListener("click", resetAttempt);
    document.getElementById("gei-level3-wall").addEventListener("click", () => { window.location.href = "simulator.html"; });
    document.getElementById("gei-level3-academy").addEventListener("click", () => { window.location.href = "index.html#academy"; });
    document.getElementById("gei-level3-return").addEventListener("click", () => { window.location.href = "simulator.html"; });

    render();
  }

  function init() {
    if (isWallRoute()) {
      mountWallEntry();
      return;
    }
    initLevel3();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})();
