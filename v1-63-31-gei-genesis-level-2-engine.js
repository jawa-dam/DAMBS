/* V1.63.31 — Genesis Level 2: Firmament / Dam Wall Engine
   Dedicated Level 2 engine. It does not modify the V1.63.29 Wall or
   V1.63.30 Level 1 engine, Academy XP, Dam Gate state or Level 1 score.
*/
(() => {
  "use strict";

  const STORAGE_KEY = "geiSimulatorLevel2V1";
  const GATE_KEY = "geiDamGateV1";
  const VERSION = "1.63.31";
  const SCORE = Object.freeze({ survey: 60, erect: 90, secure: 120 });
  const SAFE_PRESSURE = Object.freeze({ low: 50, high: 72 });
  const SAFE_ELEVATION = Object.freeze({ low: 70, high: 80 });
  const INITIAL = Object.freeze({ elevation: 0, pressure: 24, integrity: 100 });
  const SENSOR_NAMES = Object.freeze(["UPSTREAM", "SEAM", "DOWNSTREAM"]);
  const BRACE_NAMES = Object.freeze(["UPSTREAM BRACE", "CROWN BRACE", "DOWNSTREAM BRACE"]);
  const DEFAULT_RESULT = Object.freeze({
    version: VERSION,
    completed: false,
    bestScore: 0,
    updatedAt: null
  });

  function queryIsLevel2() {
    return new URLSearchParams(window.location.search).get("level") === "2";
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
      <main class="gei-level2" id="gei-level2" aria-labelledby="gei-level2-title">
        <div class="gei-level2-shell">
          <header class="gei-level2-top">
            <div class="gei-level2-brand">
              <span class="gei-level2-mark" aria-hidden="true">F2</span>
              <div>
                <span class="gei-level2-kicker">GENESIS ENGINEERED INTERPRETATIONS</span>
                <strong>HYDRAULIC CONTROL ROOM</strong>
              </div>
            </div>
            <div class="gei-level2-top-actions">
              <button type="button" id="gei-level2-wall">SIMULATOR WALL</button>
              <button type="button" id="gei-level2-academy">ACADEMY</button>
            </div>
          </header>

          <section class="gei-level2-main">
            <article class="gei-level2-field" aria-labelledby="gei-level2-title">
              <div class="gei-level2-field-head">
                <div>
                  <span class="gei-level2-eyebrow">HYDRAULIC MISSION 02</span>
                  <h1 id="gei-level2-title">FIRMAMENT / <span>DAM WALL</span></h1>
                  <p>Establish the separating structure between waters, then secure it under controlled pressure.</p>
                </div>
                <div class="gei-level2-command-readout" aria-label="Level 2 score status">
                  <div><span>RUN SCORE</span><strong id="gei-level2-score">0</strong></div>
                  <div><span>BEST SCORE</span><strong id="gei-level2-best">${result.bestScore}</strong></div>
                </div>
              </div>

              <div class="gei-level2-telemetry" aria-label="Structural telemetry">
                <div class="gei-level2-telemetry-cell elevation">
                  <span>WALL ELEVATION</span>
                  <strong id="gei-level2-elevation">0%</strong>
                  <div class="gei-level2-meter"><span id="gei-level2-elevation-fill"></span></div>
                </div>
                <div class="gei-level2-telemetry-cell pressure">
                  <span>DIFFERENTIAL PRESSURE</span>
                  <strong id="gei-level2-pressure">24%</strong>
                  <div class="gei-level2-meter"><span id="gei-level2-pressure-fill"></span></div>
                </div>
                <div class="gei-level2-telemetry-cell integrity">
                  <span>STRUCTURAL INTEGRITY</span>
                  <strong id="gei-level2-integrity">100%</strong>
                  <div class="gei-level2-meter"><span id="gei-level2-integrity-fill"></span></div>
                </div>
              </div>

              <div class="gei-level2-schematic" aria-label="Firmament hydraulic schematic">
                <div class="gei-level2-schematic-grid" aria-hidden="true"></div>
                <div class="gei-level2-reservoir upstream" aria-hidden="true"><span>UPSTREAM</span></div>
                <div class="gei-level2-reservoir downstream" aria-hidden="true"><span>DOWNSTREAM</span></div>
                <div class="gei-level2-pressure-line" aria-hidden="true"></div>
                <div class="gei-level2-wall-structure" id="gei-level2-wall-structure" aria-hidden="true">
                  <span class="brace left"></span><span class="brace crown"></span><span class="brace right"></span>
                  <span class="wall-leaf"></span>
                </div>
                <div class="gei-level2-seam-marker" aria-hidden="true"><span>SEAM</span></div>
                <div class="gei-level2-schematic-label source">SOURCE FIELD</div>
                <div class="gei-level2-schematic-label target">SEPARATION FIELD</div>
              </div>

              <fieldset class="gei-level2-actuators">
                <legend>WALL ACTUATORS</legend>
                <div class="gei-level2-actuator-grid">
                  <button type="button" id="gei-level2-lower">LOWER WALL</button>
                  <button type="button" id="gei-level2-bleed">BLEED PRESSURE</button>
                  <button type="button" id="gei-level2-admit">ADMIT PRESSURE</button>
                  <button type="button" id="gei-level2-raise">RAISE WALL</button>
                </div>
              </fieldset>

              <div class="gei-level2-status" id="gei-level2-status" role="status" aria-live="polite">SAMPLE UPSTREAM TO BEGIN THE SURVEY.</div>
            </article>

            <aside class="gei-level2-missions" aria-labelledby="gei-level2-missions-title">
              <div class="gei-level2-missions-head">
                <div>
                  <span>MISSION CONSOLE</span>
                  <h2 id="gei-level2-missions-title">Firmament Protocol</h2>
                </div>
                <strong id="gei-level2-objective-count">0 / 3</strong>
              </div>

              <div class="gei-level2-objective-list">
                <article class="gei-level2-objective is-current" data-objective="survey">
                  <div class="gei-level2-objective-head"><span>01 / SURVEY</span><b data-objective-status>CURRENT</b></div>
                  <h3>MAP THE SEAM</h3>
                  <p>Sample the upstream water, the separation seam and the downstream field in order.</p>
                  <div class="gei-level2-sensor-grid" role="group" aria-label="Ordered seam sensors">
                    <button type="button" data-sensor-index="0" aria-pressed="false">UPSTREAM</button>
                    <button type="button" data-sensor-index="1" aria-pressed="false">SEAM</button>
                    <button type="button" data-sensor-index="2" aria-pressed="false">DOWNSTREAM</button>
                  </div>
                </article>

                <article class="gei-level2-objective is-locked" data-objective="erect">
                  <div class="gei-level2-objective-head"><span>02 / ERECT</span><b data-objective-status>LOCKED</b></div>
                  <h3>RAISE THE FIRMAMENT</h3>
                  <p>Build the wall into its safe elevation while keeping differential pressure inside the operating band.</p>
                  <button type="button" class="gei-level2-objective-action" id="gei-level2-confirm-height">CONFIRM WALL HEIGHT</button>
                </article>

                <article class="gei-level2-objective is-locked" data-objective="secure">
                  <div class="gei-level2-objective-head"><span>03 / SECURE</span><b data-objective-status>LOCKED</b></div>
                  <h3>LOCK THE SEPARATION</h3>
                  <p>Engage all three structural braces, then lock the separating wall while the system is stable.</p>
                  <div class="gei-level2-brace-grid" role="group" aria-label="Structural braces">
                    <button type="button" data-brace-index="0" aria-pressed="false">UPSTREAM BRACE</button>
                    <button type="button" data-brace-index="1" aria-pressed="false">CROWN BRACE</button>
                    <button type="button" data-brace-index="2" aria-pressed="false">DOWNSTREAM BRACE</button>
                  </div>
                  <button type="button" class="gei-level2-objective-action lock" id="gei-level2-lock">LOCK THE SEPARATION</button>
                </article>
              </div>
            </aside>
          </section>

          <footer class="gei-level2-footer">
            <span>LEVEL 2 SCORE IS SEPARATE FROM ACADEMY XP.</span>
            <strong id="gei-level2-footer-state">SYSTEM READY</strong>
            <button type="button" id="gei-level2-reset">RESET ATTEMPT</button>
          </footer>
        </div>

        <section class="gei-level2-complete" id="gei-level2-complete" hidden aria-labelledby="gei-level2-complete-title">
          <div class="gei-level2-complete-card">
            <div class="gei-level2-complete-mark" aria-hidden="true">FLOW</div>
            <span class="gei-level2-complete-kicker">STRUCTURAL SEPARATION CONFIRMED</span>
            <h2 id="gei-level2-complete-title">LEVEL 2 COMPLETE</h2>
            <p>The firmament is elevated, braced and holding the separation between waters.</p>
            <strong id="gei-level2-final-score">270 SCORE</strong>
            <button type="button" id="gei-level2-return">RETURN TO SIMULATOR WALL</button>
          </div>
        </section>
      </main>`;
  }

  function init() {
    if (!queryIsLevel2() || !gateIsOpen() || document.getElementById("gei-level2")) return;

    const previous = readResult();
    document.body.innerHTML = markup(previous);

    const root = document.getElementById("gei-level2");
    const state = {
      ...INITIAL,
      surveyIndex: 0,
      surveyComplete: false,
      erectComplete: false,
      secureComplete: false,
      awarded: new Set(),
      braces: new Set(),
      score: 0,
      breached: false,
      levelComplete: false
    };

    const els = {
      score: document.getElementById("gei-level2-score"),
      best: document.getElementById("gei-level2-best"),
      elevation: document.getElementById("gei-level2-elevation"),
      pressure: document.getElementById("gei-level2-pressure"),
      integrity: document.getElementById("gei-level2-integrity"),
      elevationFill: document.getElementById("gei-level2-elevation-fill"),
      pressureFill: document.getElementById("gei-level2-pressure-fill"),
      integrityFill: document.getElementById("gei-level2-integrity-fill"),
      wallStructure: document.getElementById("gei-level2-wall-structure"),
      status: document.getElementById("gei-level2-status"),
      footerState: document.getElementById("gei-level2-footer-state"),
      count: document.getElementById("gei-level2-objective-count"),
      confirmHeight: document.getElementById("gei-level2-confirm-height"),
      lock: document.getElementById("gei-level2-lock"),
      complete: document.getElementById("gei-level2-complete"),
      finalScore: document.getElementById("gei-level2-final-score")
    };

    const objective = (name) => root.querySelector(`[data-objective="${name}"]`);
    const sensors = [...root.querySelectorAll("[data-sensor-index]")];
    const braces = [...root.querySelectorAll("[data-brace-index]")];
    const braceVisuals = [...root.querySelectorAll(".gei-level2-wall-structure .brace")];
    const actuatorIds = ["gei-level2-lower", "gei-level2-bleed", "gei-level2-admit", "gei-level2-raise"];

    function withinSafeRange() {
      return state.pressure >= SAFE_PRESSURE.low &&
        state.pressure <= SAFE_PRESSURE.high &&
        state.elevation >= SAFE_ELEVATION.low &&
        state.elevation <= SAFE_ELEVATION.high &&
        state.integrity >= 75;
    }

    function setStatus(message, mode = "ready") {
      els.status.textContent = message;
      root.dataset.status = mode;
      els.footerState.textContent = mode === "breach" ? "BREACH RECOVERY" : mode === "complete" ? "SYSTEM SECURED" : message;
    }

    function award(name, value, message) {
      if (state.awarded.has(name)) return;
      state.awarded.add(name);
      state.score += value;
      setStatus(message, "success");
    }

    function breach() {
      state.elevation = INITIAL.elevation;
      state.pressure = INITIAL.pressure;
      state.integrity = INITIAL.integrity;
      state.erectComplete = false;
      state.secureComplete = false;
      state.braces.clear();
      state.breached = true;
      setStatus("WALL BREACH — SURVEY RETAINED. REBUILD FROM 0% ELEVATION.", "breach");
    }

    function applySystemChange(nextElevation, nextPressure) {
      state.elevation = clamp(nextElevation);
      state.pressure = clamp(nextPressure);
      state.breached = false;
      if (state.pressure > SAFE_PRESSURE.high) {
        state.integrity = clamp(state.integrity - 10);
      }
      if (state.pressure >= 86 || state.integrity < 50) breach();
    }

    function updateObjectiveCard(name, status, className) {
      const card = objective(name);
      if (!card) return;
      card.classList.remove("is-current", "is-locked", "is-complete", "is-breach");
      if (className) card.classList.add(className);
      const label = card.querySelector("[data-objective-status]");
      if (label) label.textContent = status;
    }

    function render() {
      state.elevation = clamp(state.elevation);
      state.pressure = clamp(state.pressure);
      state.integrity = clamp(state.integrity);

      els.score.textContent = String(state.score);
      els.best.textContent = String(Math.max(previous.bestScore, state.score));
      els.elevation.textContent = `${state.elevation}%`;
      els.pressure.textContent = `${state.pressure}%`;
      els.integrity.textContent = `${state.integrity}%`;
      els.elevationFill.style.width = `${state.elevation}%`;
      els.pressureFill.style.width = `${state.pressure}%`;
      els.integrityFill.style.width = `${state.integrity}%`;
      els.wallStructure.style.setProperty("--level2-wall-height", `${Math.max(12, state.elevation)}%`);
      els.wallStructure.style.setProperty("--level2-integrity", `${state.integrity}%`);
      els.count.textContent = `${[state.surveyComplete, state.erectComplete, state.secureComplete].filter(Boolean).length} / 3`;

      sensors.forEach((button, index) => {
        const sampled = index < state.surveyIndex;
        button.setAttribute("aria-pressed", String(sampled));
        button.classList.toggle("is-sampled", sampled);
      });

      updateObjectiveCard("survey", state.surveyComplete ? "COMPLETE" : "CURRENT", state.surveyComplete ? "is-complete" : "is-current");
      updateObjectiveCard("erect", state.erectComplete ? "COMPLETE" : state.surveyComplete ? "CURRENT" : "LOCKED", state.erectComplete ? "is-complete" : state.surveyComplete ? "is-current" : "is-locked");
      updateObjectiveCard("secure", state.secureComplete ? "COMPLETE" : state.erectComplete ? "CURRENT" : "LOCKED", state.secureComplete ? "is-complete" : state.erectComplete ? "is-current" : "is-locked");

      const buildEnabled = state.surveyComplete && !state.levelComplete;
      actuatorIds.forEach((id) => { document.getElementById(id).disabled = !buildEnabled; });
      els.confirmHeight.disabled = !state.surveyComplete || state.erectComplete || state.levelComplete;
      braces.forEach((button, index) => {
        const engaged = state.braces.has(index);
        button.disabled = !state.erectComplete || state.levelComplete || engaged;
        button.setAttribute("aria-pressed", String(engaged));
        button.classList.toggle("is-engaged", engaged);
        braceVisuals[index]?.classList.toggle("is-engaged", engaged);
      });
      els.lock.disabled = !state.erectComplete || state.levelComplete;
      root.classList.toggle("is-breached", state.breached);
      root.classList.toggle("is-complete", state.levelComplete);
    }

    function sample(index) {
      if (state.surveyComplete) return;
      if (index !== state.surveyIndex) {
        const next = SENSOR_NAMES[state.surveyIndex] || SENSOR_NAMES[0];
        setStatus(`SAMPLE ${next} NEXT. THE SENSOR ORDER IS UPSTREAM → SEAM → DOWNSTREAM.`, "guidance");
        render();
        return;
      }
      state.surveyIndex += 1;
      if (state.surveyIndex === SENSOR_NAMES.length) {
        state.surveyComplete = true;
        award("survey", SCORE.survey, "SEAM MAP COMPLETE — WALL ACTUATORS ONLINE.");
      } else {
        setStatus(`${SENSOR_NAMES[index]} SAMPLED — NEXT SENSOR: ${SENSOR_NAMES[state.surveyIndex]}.`, "active");
      }
      render();
    }

    function adjust(kind) {
      if (!state.surveyComplete || state.levelComplete) return;
      if (kind === "raise") applySystemChange(state.elevation + 10, state.pressure + 6);
      if (kind === "lower") applySystemChange(state.elevation - 10, state.pressure - 6);
      if (kind === "admit") applySystemChange(state.elevation, state.pressure + 5);
      if (kind === "bleed") applySystemChange(state.elevation, state.pressure - 5);
      if (!state.breached) {
        setStatus(state.pressure > SAFE_PRESSURE.high ? "PRESSURE HIGH — BLEED PRESSURE BEFORE CONFIRMING." : "WALL ACTUATOR RESPONSE REGISTERED.", state.pressure > SAFE_PRESSURE.high ? "warning" : "active");
      }
      render();
    }

    function confirmHeight() {
      if (!state.surveyComplete || state.erectComplete || state.levelComplete) return;
      if (!withinSafeRange()) {
        setStatus("HEIGHT CONFIRMATION DENIED — ELEVATION 70–80%, PRESSURE 50–72%, INTEGRITY 75% MINIMUM.", "warning");
        render();
        return;
      }
      state.erectComplete = true;
      award("erect", SCORE.erect, "FIRMAMENT ELEVATED — STRUCTURAL BRACES ONLINE.");
      render();
    }

    function engageBrace(index) {
      if (!state.erectComplete || state.levelComplete) return;
      state.braces.add(index);
      setStatus(`${BRACE_NAMES[index]} ENGAGED — ${3 - state.braces.size} BRACE${3 - state.braces.size === 1 ? "" : "S"} REMAINING.`, "active");
      render();
    }

    function lockSeparation() {
      if (!state.erectComplete || state.levelComplete) return;
      if (state.braces.size !== 3) {
        setStatus("LOCK DENIED — ENGAGE UPSTREAM, CROWN AND DOWNSTREAM BRACES.", "warning");
        render();
        return;
      }
      if (!withinSafeRange()) {
        setStatus("LOCK DENIED — RETURN PRESSURE AND ELEVATION TO THE SAFE OPERATING BAND.", "warning");
        render();
        return;
      }
      state.secureComplete = true;
      award("secure", SCORE.secure, "SEPARATION LOCKED — FIRMAMENT STABLE.");
      state.levelComplete = true;
      const saved = saveResult(state.score, previous);
      els.best.textContent = String(saved.bestScore);
      els.finalScore.textContent = `${state.score} SCORE`;
      els.complete.hidden = false;
      setStatus("SYSTEM SECURED — LEVEL 2 COMPLETE.", "complete");
      render();
    }

    function resetAttempt() {
      state.elevation = INITIAL.elevation;
      state.pressure = INITIAL.pressure;
      state.integrity = INITIAL.integrity;
      state.surveyIndex = 0;
      state.surveyComplete = false;
      state.erectComplete = false;
      state.secureComplete = false;
      state.awarded.clear();
      state.braces.clear();
      state.score = 0;
      state.breached = false;
      state.levelComplete = false;
      els.complete.hidden = true;
      setStatus("ATTEMPT RESET — SAMPLE UPSTREAM TO BEGIN THE SURVEY.", "ready");
      render();
    }

    sensors.forEach((button) => button.addEventListener("click", () => sample(Number(button.dataset.sensorIndex))));
    braces.forEach((button) => button.addEventListener("click", () => engageBrace(Number(button.dataset.braceIndex))));
    document.getElementById("gei-level2-lower").addEventListener("click", () => adjust("lower"));
    document.getElementById("gei-level2-bleed").addEventListener("click", () => adjust("bleed"));
    document.getElementById("gei-level2-admit").addEventListener("click", () => adjust("admit"));
    document.getElementById("gei-level2-raise").addEventListener("click", () => adjust("raise"));
    els.confirmHeight.addEventListener("click", confirmHeight);
    els.lock.addEventListener("click", lockSeparation);
    document.getElementById("gei-level2-reset").addEventListener("click", resetAttempt);
    document.getElementById("gei-level2-wall").addEventListener("click", () => { window.location.href = "simulator.html"; });
    document.getElementById("gei-level2-academy").addEventListener("click", () => { window.location.href = "index.html#academy"; });
    document.getElementById("gei-level2-return").addEventListener("click", () => { window.location.href = "simulator.html"; });

    render();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})();
