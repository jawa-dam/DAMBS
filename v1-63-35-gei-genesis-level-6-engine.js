/* V1.63.35 — Genesis Level 6: Beast System Engine
   Final simulator level. Level 6 couples reservoir, tailwater, head, sluice,
   flow, wheel speed, load, output and downstream response in one deterministic
   operating model. The engine owns only its Level 6 result key.
*/
(() => {
  "use strict";

  const STORAGE_KEY = "geiSimulatorLevel6V1";
  const GATE_KEY = "geiDamGateV1";
  const LEVEL5_RESULT_KEY = "geiSimulatorLevel5V1";
  const VERSION = "1.63.35";
  const SCORE = Object.freeze({ synchronize: 90, integrate: 150, master: 210 });
  const INITIAL = Object.freeze({ reservoir: 72, tailwater: 32, sluice: 0, load: 0 });
  const RESERVOIR_STEP = 2;
  const TAILWATER_STEP = 2;
  const SLUICE_STEP = 5;
  const LOAD_STEP = 5;
  const RESERVOIR_LIMITS = Object.freeze({ low: 60, high: 80 });
  const TAILWATER_LIMITS = Object.freeze({ low: 28, high: 46 });
  const CASCADE_RPM = 64;
  const HYDRAULIC_STRESS_HEAD = 38;
  const HYDRAULIC_STRESS_SLUICE = 75;
  const SYNCHRONIZE_BAND = Object.freeze({
    reservoir: Object.freeze({ low: 68, high: 74 }),
    tailwater: Object.freeze({ low: 38, high: 42 }),
    head: Object.freeze({ low: 30, high: 34 })
  });
  const INTEGRATE_BAND = Object.freeze({
    flow: Object.freeze({ low: 14, high: 18 }),
    load: Object.freeze({ low: 20, high: 40 }),
    rpm: Object.freeze({ low: 30, high: 50 }),
    output: Object.freeze({ low: 8, high: 20 })
  });
  const MASTER_BAND = Object.freeze({
    reservoir: Object.freeze({ low: 68, high: 74 }),
    tailwater: Object.freeze({ low: 38, high: 42 }),
    head: Object.freeze({ low: 30, high: 34 }),
    sluice: Object.freeze({ low: 45, high: 55 }),
    flow: Object.freeze({ low: 14, high: 18 }),
    load: Object.freeze({ low: 55, high: 65 }),
    rpm: Object.freeze({ low: 30, high: 38 }),
    output: Object.freeze({ low: 18, high: 26 }),
    downstream: Object.freeze({ low: 9, high: 16 })
  });
  const DEFAULT_RESULT = Object.freeze({
    version: VERSION,
    completed: false,
    bestScore: 0,
    updatedAt: null
  });

  function isLevel6Route() {
    return window.location.search === "?level=6";
  }

  function isWallRoute() {
    return window.location.search === "";
  }

  function gateIsOpen() {
    try {
      const value = JSON.parse(localStorage.getItem(GATE_KEY) || "{}");
      return Boolean(value && value.opened === true);
    } catch (_) {
      return false;
    }
  }

  function level5IsComplete() {
    try {
      const value = JSON.parse(localStorage.getItem(LEVEL5_RESULT_KEY) || "{}");
      return Boolean(value && typeof value === "object" && value.completed === true);
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

  function saveResult(score, bestScore) {
    const result = {
      version: VERSION,
      completed: true,
      bestScore: Math.max(bestScore, score),
      updatedAt: Date.now()
    };
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(result));
    } catch (_) {}
    return result;
  }

  function clamp(value, low, high) {
    return Math.max(low, Math.min(high, value));
  }

  function inRange(value, range) {
    return value >= range.low && value <= range.high;
  }

  /* Approved coupled equations. Every displayed operating value is derived here. */
  function derive(state) {
    const head = Math.max(0, state.reservoir - state.tailwater);
    const flow = Math.round((state.sluice / 100) * head);
    const hydraulicDrive = Math.round((flow * head) / 12);
    const loadDrag = Math.round(state.load * 0.20);
    const rpm = state.engaged ? Math.max(0, hydraulicDrive - loadDrag) : 0;
    const output = state.engaged ? Math.round((rpm * state.load) / 100) : 0;
    const downstreamResponse = Math.max(0, flow * 2 - output);
    return { head, flow, hydraulicDrive, loadDrag, rpm, output, downstreamResponse };
  }

  function componentScore(value, target, weight) {
    return Math.max(0, 100 - Math.abs(value - target) * weight);
  }

  function stabilityIndex(state, telemetry) {
    if (state.tripped) return 0;
    const scores = [
      componentScore(telemetry.head, 32, 10),
      componentScore(telemetry.flow, 16, 12),
      componentScore(telemetry.rpm, 34, 5),
      componentScore(state.load, 60, 2),
      componentScore(telemetry.output, 22, 5),
      componentScore(telemetry.downstreamResponse, 12, 6)
    ];
    return Math.round(scores.reduce((total, value) => total + value, 0) / scores.length);
  }

  function synchronizedIsSafe(state, telemetry) {
    return !state.engaged &&
      state.sluice === 0 &&
      state.load === 0 &&
      inRange(state.reservoir, SYNCHRONIZE_BAND.reservoir) &&
      inRange(state.tailwater, SYNCHRONIZE_BAND.tailwater) &&
      inRange(telemetry.head, SYNCHRONIZE_BAND.head);
  }

  function integratedIsSafe(state, telemetry, index) {
    return state.synchronized &&
      state.engaged &&
      inRange(telemetry.flow, INTEGRATE_BAND.flow) &&
      inRange(state.load, INTEGRATE_BAND.load) &&
      inRange(telemetry.rpm, INTEGRATE_BAND.rpm) &&
      inRange(telemetry.output, INTEGRATE_BAND.output) &&
      index >= 50;
  }

  function masterEnvelopeIsSafe(state, telemetry, index) {
    return state.engaged &&
      inRange(state.reservoir, MASTER_BAND.reservoir) &&
      inRange(state.tailwater, MASTER_BAND.tailwater) &&
      inRange(telemetry.head, MASTER_BAND.head) &&
      inRange(state.sluice, MASTER_BAND.sluice) &&
      inRange(telemetry.flow, MASTER_BAND.flow) &&
      inRange(state.load, MASTER_BAND.load) &&
      inRange(telemetry.rpm, MASTER_BAND.rpm) &&
      inRange(telemetry.output, MASTER_BAND.output) &&
      inRange(telemetry.downstreamResponse, MASTER_BAND.downstream) &&
      index >= 50;
  }

  function operatingLabels(state, telemetry, index) {
    if (state.tripped) return { stability: "TRIPPED", system: "RECOVERY" };
    if (!state.engaged) return { stability: state.synchronized ? "READY" : "IDLE", system: "IDLE" };
    if (masterEnvelopeIsSafe(state, telemetry, index)) return { stability: "STABLE", system: "WORKING" };
    if (integratedIsSafe(state, telemetry, index)) return { stability: "BALANCED", system: "WORKING" };
    return { stability: index >= 50 ? "BALANCING" : "UNSTABLE", system: "WORKING" };
  }

  function cascadeRequired(state, telemetry) {
    return state.engaged &&
      telemetry.rpm > CASCADE_RPM &&
      (telemetry.head >= HYDRAULIC_STRESS_HEAD || state.sluice >= HYDRAULIC_STRESS_SLUICE);
  }

  function markup(result) {
    return `
      <main class="gei-level6" id="gei-level6" aria-labelledby="gei-level6-title">
        <div class="gei-level6-shell">
          <header class="gei-level6-top">
            <div class="gei-level6-brand">
              <span class="gei-level6-mark" aria-hidden="true">B6</span>
              <div>
                <span class="gei-level6-kicker">GENESIS ENGINEERED INTERPRETATIONS</span>
                <strong>BEAST SYSTEM CONTROL</strong>
              </div>
            </div>
            <div class="gei-level6-top-actions">
              <button type="button" id="gei-level6-wall">SIMULATOR WALL</button>
              <button type="button" id="gei-level6-academy">ACADEMY</button>
            </div>
          </header>

          <section class="gei-level6-main">
            <article class="gei-level6-field" aria-labelledby="gei-level6-title">
              <div class="gei-level6-field-head">
                <div>
                  <span class="gei-level6-eyebrow">HYDRAULIC MISSION 06</span>
                  <h1 id="gei-level6-title">BEAST SYSTEM / <span>MASTER CONTROL</span></h1>
                  <p>Synchronize the reservoir, integrate the wheel and hold the complete hydraulic machine inside its final working envelope.</p>
                </div>
                <div class="gei-level6-command-readout" aria-label="Level 6 score status">
                  <div><span>RUN SCORE</span><strong id="gei-level6-score">0</strong></div>
                  <div><span>BEST SCORE</span><strong id="gei-level6-best">${result.bestScore}</strong></div>
                </div>
              </div>

              <div class="gei-level6-telemetry" aria-label="Beast System telemetry">
                <div class="gei-level6-telemetry-cell reservoir"><span>RESERVOIR</span><strong id="gei-level6-reservoir">72%</strong><small>UPSTREAM STORE</small></div>
                <div class="gei-level6-telemetry-cell tailwater"><span>TAILWATER</span><strong id="gei-level6-tailwater">32%</strong><small>DOWNSTREAM LEVEL</small></div>
                <div class="gei-level6-telemetry-cell head"><span>HEAD</span><strong id="gei-level6-head">40</strong><small>DERIVED DIFFERENTIAL</small></div>
                <div class="gei-level6-telemetry-cell sluice"><span>SLUICE</span><strong id="gei-level6-sluice">0%</strong><small>GATE POSITION</small></div>
                <div class="gei-level6-telemetry-cell flow"><span>FLOW</span><strong id="gei-level6-flow">0</strong><small>WATER TRANSFER</small></div>
                <div class="gei-level6-telemetry-cell rpm"><span>RPM</span><strong id="gei-level6-rpm">0</strong><small>BEAST SPEED</small></div>
                <div class="gei-level6-telemetry-cell load"><span>LOAD</span><strong id="gei-level6-load">0%</strong><small>MECHANICAL DEMAND</small></div>
                <div class="gei-level6-telemetry-cell output"><span>OUTPUT</span><strong id="gei-level6-output">0</strong><small>USEFUL WORK</small></div>
                <div class="gei-level6-telemetry-cell downstream"><span>DOWNSTREAM RESPONSE</span><strong id="gei-level6-downstream-response">0</strong><small>RELEASE BALANCE</small></div>
                <div class="gei-level6-telemetry-cell stability-index"><span>STABILITY INDEX</span><strong id="gei-level6-stability-index">8</strong><small>COUPLED HEALTH</small></div>
                <div class="gei-level6-telemetry-cell stability"><span>STABILITY</span><strong id="gei-level6-stability">IDLE</strong><small>OPERATING QUALITY</small></div>
                <div class="gei-level6-telemetry-cell system"><span>SYSTEM STATE</span><strong id="gei-level6-system-state">IDLE</strong><small>CONTROL MODE</small></div>
                <div class="gei-level6-telemetry-cell engagement"><span>WHEEL ENGAGEMENT</span><strong id="gei-level6-engagement">DISENGAGED</strong><small>MECHANICAL COUPLING</small></div>
              </div>

              <div class="gei-level6-beast-visual" aria-label="Beast System schematic">
                <div class="gei-level6-schematic-grid" aria-hidden="true"></div>
                <div class="gei-level6-reservoir-tank" aria-hidden="true"><span>RESERVOIR</span><i></i></div>
                <div class="gei-level6-pipe gei-level6-pipe-top" aria-hidden="true"><i></i></div>
                <div class="gei-level6-beast-core" id="gei-level6-beast-core" aria-hidden="true"><span class="core-ring"></span><span class="core-mark">B</span></div>
                <div class="gei-level6-pipe gei-level6-pipe-bottom" aria-hidden="true"><i></i></div>
                <div class="gei-level6-workhouse" aria-hidden="true"><span>OUTPUT</span><i></i></div>
                <div class="gei-level6-visual-label left">INPUT</div>
                <div class="gei-level6-visual-label center" id="gei-level6-beast-readout">BEAST IDLE / 0 RPM</div>
                <div class="gei-level6-visual-label right">WORKING SYSTEM</div>
              </div>

              <fieldset class="gei-level6-control-panel gei-level6-water-controls">
                <legend>WATER BALANCE</legend>
                <div class="gei-level6-control-grid">
                  <button type="button" id="gei-level6-reservoir-down">LOWER RESERVOIR</button>
                  <button type="button" id="gei-level6-reservoir-up">RAISE RESERVOIR</button>
                  <button type="button" id="gei-level6-tailwater-down">LOWER TAILWATER</button>
                  <button type="button" id="gei-level6-tailwater-up">RAISE TAILWATER</button>
                </div>
              </fieldset>

              <fieldset class="gei-level6-control-panel gei-level6-machine-controls">
                <legend>MACHINE COUPLING</legend>
                <div class="gei-level6-control-grid">
                  <button type="button" id="gei-level6-sluice-down">CLOSE SLUICE</button>
                  <button type="button" id="gei-level6-sluice-up">OPEN SLUICE</button>
                  <button type="button" id="gei-level6-load-down">DECREASE LOAD</button>
                  <button type="button" id="gei-level6-load-up">INCREASE LOAD</button>
                  <button type="button" id="gei-level6-engage">ENGAGE BEAST SYSTEM</button>
                </div>
              </fieldset>

              <div class="gei-level6-status" id="gei-level6-status" role="status" aria-live="polite">SYNCHRONIZE RESERVOIR AND TAILWATER BEFORE ENGAGING THE SYSTEM.</div>
            </article>

            <aside class="gei-level6-missions" aria-labelledby="gei-level6-missions-title">
              <div class="gei-level6-missions-head">
                <div>
                  <span>FINAL MISSION CONSOLE</span>
                  <h2 id="gei-level6-missions-title">Beast System Protocol</h2>
                </div>
                <strong id="gei-level6-objective-count">0 / 3</strong>
              </div>

              <div class="gei-level6-objective-list">
                <article class="gei-level6-objective is-current" data-objective="synchronize">
                  <div class="gei-level6-objective-head"><span>01 / SYNCHRONIZE <b>+90</b></span><strong data-objective-status>CURRENT</strong></div>
                  <h3>SYNC THE WATER LEVELS</h3>
                  <p>Bring reservoir, tailwater and derived head into the safe handoff band with the sluice and load parked.</p>
                  <span class="gei-level6-objective-note">RESERVOIR 68–74 / TAILWATER 38–42 / HEAD 30–34</span>
                  <button type="button" class="primary" id="gei-level6-synchronize">CONFIRM SYNCHRONIZE</button>
                </article>

                <article class="gei-level6-objective is-locked" data-objective="integrate">
                  <div class="gei-level6-objective-head"><span>02 / INTEGRATE <b>+150</b></span><strong data-objective-status>LOCKED</strong></div>
                  <h3>COUPLE WATER TO WORK</h3>
                  <p>Engage the Beast System and tune flow, load, RPM and output together. No telemetry value stands alone.</p>
                  <span class="gei-level6-objective-note">FLOW 14–18 / LOAD 20–40 / RPM 30–50 / OUTPUT 8–20</span>
                  <button type="button" class="primary" id="gei-level6-confirm-integrate">CONFIRM INTEGRATE</button>
                </article>

                <article class="gei-level6-objective is-locked" data-objective="master">
                  <div class="gei-level6-objective-head"><span>03 / MASTER THE SYSTEM <b>+210</b></span><strong data-objective-status>LOCKED</strong></div>
                  <h3>HOLD THE FINAL ENVELOPE</h3>
                  <p>Keep every coupled value inside the final operating envelope while the system is working and stable.</p>
                  <span class="gei-level6-objective-note">HEAD 30–34 / FLOW 14–18 / RPM 30–38 / RESPONSE 9–16</span>
                  <button type="button" class="primary" id="gei-level6-confirm-master">CONFIRM MASTER THE SYSTEM</button>
                </article>
              </div>
            </aside>
          </section>

          <footer class="gei-level6-footer">
            <span>FINAL SIMULATOR LEVEL • SCORE IS SEPARATE FROM ACADEMY XP.</span>
            <strong id="gei-level6-footer-state">SYSTEM IDLE</strong>
            <button type="button" id="gei-level6-reset">RESET ATTEMPT</button>
          </footer>
        </div>

        <section class="gei-level6-complete" id="gei-level6-complete" hidden aria-labelledby="gei-level6-complete-title">
          <div class="gei-level6-complete-card">
            <div class="gei-level6-complete-mark" aria-hidden="true">B6</div>
            <span class="gei-level6-complete-kicker">BEAST SYSTEM MASTERED</span>
            <h2 id="gei-level6-complete-title">ALL SIX SIMULATOR LEVELS COMPLETE</h2>
            <p>The final hydraulic system is synchronized, integrated and working inside its stable operating envelope.</p>
            <strong id="gei-level6-final-score">450 SCORE</strong>
            <button type="button" id="gei-level6-return">RETURN TO SIMULATOR WALL</button>
          </div>
        </section>
      </main>`;
  }

  function mountWallEntry() {
    if (!isWallRoute() || !gateIsOpen() || !level5IsComplete()) return;
    if (document.getElementById("gei-level6-entry")) return;

    const footer = document.querySelector(".gei-simulator-bottom");
    const level5 = document.getElementById("gei-level5-entry");
    const level4 = document.getElementById("gei-level4-entry");
    const levelOne = document.getElementById("gei-simulator-enter");
    if (!footer || !levelOne) return;

    const entry = document.createElement("a");
    entry.id = "gei-level6-entry";
    entry.className = "gei-simulator-enter";
    entry.href = "simulator.html?level=6";
    entry.textContent = "ENTER LEVEL 6";
    entry.setAttribute("aria-label", "Enter Level 6 Beast System Control");
    footer.insertBefore(entry, level5 ? level5.nextSibling : level4 || levelOne);
  }

  function initLevel6() {
    if (!isLevel6Route() || !gateIsOpen() || !level5IsComplete() || document.getElementById("gei-level6")) return;

    const previous = readResult();
    let bestScore = previous.bestScore;
    document.body.innerHTML = markup(previous);

    const root = document.getElementById("gei-level6");
    const state = {
      reservoir: INITIAL.reservoir,
      tailwater: INITIAL.tailwater,
      sluice: INITIAL.sluice,
      load: INITIAL.load,
      engaged: false,
      synchronized: false,
      integrated: false,
      mastered: false,
      tripped: false,
      downstreamProgress: 0,
      awarded: new Set(),
      score: 0,
      levelComplete: false
    };

    const els = {
      score: document.getElementById("gei-level6-score"),
      best: document.getElementById("gei-level6-best"),
      reservoir: document.getElementById("gei-level6-reservoir"),
      tailwater: document.getElementById("gei-level6-tailwater"),
      head: document.getElementById("gei-level6-head"),
      sluice: document.getElementById("gei-level6-sluice"),
      flow: document.getElementById("gei-level6-flow"),
      rpm: document.getElementById("gei-level6-rpm"),
      load: document.getElementById("gei-level6-load"),
      output: document.getElementById("gei-level6-output"),
      downstream: document.getElementById("gei-level6-downstream-response"),
      stabilityIndex: document.getElementById("gei-level6-stability-index"),
      stability: document.getElementById("gei-level6-stability"),
      system: document.getElementById("gei-level6-system-state"),
      engagement: document.getElementById("gei-level6-engagement"),
      status: document.getElementById("gei-level6-status"),
      footerState: document.getElementById("gei-level6-footer-state"),
      count: document.getElementById("gei-level6-objective-count"),
      core: document.getElementById("gei-level6-beast-core"),
      readout: document.getElementById("gei-level6-beast-readout"),
      complete: document.getElementById("gei-level6-complete"),
      finalScore: document.getElementById("gei-level6-final-score")
    };

    function setStatus(message, mode = "ready") {
      els.status.textContent = message;
      root.dataset.status = mode;
      els.footerState.textContent = mode === "complete" ? "SYSTEM MASTERED" : mode === "danger" ? "CASCADE RECOVERY" : message;
    }

    function award(name, value, message) {
      if (state.awarded.has(name)) return;
      state.awarded.add(name);
      state.score += value;
      setStatus(message, "success");
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
      const telemetry = derive(state);
      const index = stabilityIndex(state, telemetry);
      const labels = operatingLabels(state, telemetry, index);
      els.score.textContent = String(state.score);
      els.best.textContent = String(Math.max(bestScore, state.score));
      els.reservoir.textContent = `${state.reservoir}%`;
      els.tailwater.textContent = `${state.tailwater}%`;
      els.head.textContent = String(telemetry.head);
      els.sluice.textContent = `${state.sluice}%`;
      els.flow.textContent = String(telemetry.flow);
      els.rpm.textContent = String(telemetry.rpm);
      els.load.textContent = `${state.load}%`;
      els.output.textContent = String(telemetry.output);
      els.downstream.textContent = String(telemetry.downstreamResponse);
      els.stabilityIndex.textContent = String(index);
      els.stability.textContent = labels.stability;
      els.system.textContent = labels.system;
      els.engagement.textContent = state.engaged ? "ENGAGED" : "DISENGAGED";
      els.readout.textContent = `BEAST ${labels.system} / ${telemetry.rpm} RPM`;
      root.dataset.engaged = state.engaged ? "true" : "false";
      els.core.classList.toggle("is-working", labels.system === "WORKING");
      els.core.classList.toggle("is-tripped", state.tripped);
      els.count.textContent = `${[state.synchronized, state.integrated, state.mastered].filter(Boolean).length} / 3`;

      updateObjectiveCard("synchronize", state.synchronized ? "COMPLETE" : "CURRENT", state.synchronized ? "is-complete" : "is-current");
      updateObjectiveCard("integrate", state.integrated ? "COMPLETE" : state.synchronized ? "CURRENT" : "LOCKED", state.integrated ? "is-complete" : state.synchronized ? "is-current" : "is-locked");
      updateObjectiveCard("master", state.mastered ? "COMPLETE" : state.integrated ? "CURRENT" : "LOCKED", state.mastered ? "is-complete" : state.integrated ? "is-current" : "is-locked");

      const waterEnabled = !state.levelComplete && !state.engaged;
      const machineEnabled = !state.levelComplete;
      document.getElementById("gei-level6-reservoir-down").disabled = !waterEnabled;
      document.getElementById("gei-level6-reservoir-up").disabled = !waterEnabled;
      document.getElementById("gei-level6-tailwater-down").disabled = !waterEnabled;
      document.getElementById("gei-level6-tailwater-up").disabled = !waterEnabled;
      document.getElementById("gei-level6-sluice-down").disabled = !machineEnabled;
      document.getElementById("gei-level6-sluice-up").disabled = !machineEnabled;
      document.getElementById("gei-level6-load-down").disabled = !state.engaged || !machineEnabled;
      document.getElementById("gei-level6-load-up").disabled = !state.engaged || !machineEnabled;
      document.getElementById("gei-level6-engage").disabled = !state.synchronized || state.engaged || state.levelComplete;
      document.getElementById("gei-level6-synchronize").disabled = state.synchronized || state.levelComplete;
      document.getElementById("gei-level6-confirm-integrate").disabled = !state.synchronized || state.integrated || state.levelComplete;
      document.getElementById("gei-level6-confirm-master").disabled = !state.integrated || state.mastered || state.levelComplete;
      root.classList.toggle("is-working", labels.system === "WORKING");
      root.classList.toggle("is-tripped", state.tripped);
      root.classList.toggle("is-complete", state.levelComplete);
    }

    function triggerCascade() {
      state.sluice = 0;
      state.load = 0;
      state.engaged = false;
      state.tripped = true;
      state.mastered = false;
      state.levelComplete = false;
      state.downstreamProgress = 0;
      setStatus("CASCADE TRIP — SLUICE CLOSED. DISENGAGE AND REBUILD THE WORKING SYSTEM.", "danger");
      render();
    }

    function commitChange(change, message) {
      const projected = { ...state, ...change };
      const projectedTelemetry = derive(projected);
      if (cascadeRequired(projected, projectedTelemetry)) {
        triggerCascade();
        return;
      }
      Object.assign(state, change);
      state.tripped = false;
      state.downstreamProgress = projectedTelemetry.downstreamResponse;
      setStatus(message, "active");
      render();
    }

    function adjustReservoir(direction) {
      if (state.levelComplete || state.engaged) return;
      const next = clamp(state.reservoir + direction * RESERVOIR_STEP, RESERVOIR_LIMITS.low, RESERVOIR_LIMITS.high);
      commitChange({ reservoir: next }, "RESERVOIR UPDATED — RECHECK DERIVED HEAD.");
    }

    function adjustTailwater(direction) {
      if (state.levelComplete || state.engaged) return;
      const next = clamp(state.tailwater + direction * TAILWATER_STEP, TAILWATER_LIMITS.low, TAILWATER_LIMITS.high);
      commitChange({ tailwater: next }, "TAILWATER UPDATED — RECHECK DERIVED HEAD.");
    }

    function adjustSluice(direction) {
      if (state.levelComplete) return;
      const next = clamp(state.sluice + direction * SLUICE_STEP, 0, 100);
      commitChange({ sluice: next }, "SLUICE POSITION UPDATED — FLOW AND RPM ARE COUPLED.");
    }

    function adjustLoad(direction) {
      if (!state.engaged || state.levelComplete) {
        setStatus("LOAD DENIED — ENGAGE THE SYNCHRONIZED BEAST SYSTEM FIRST.", "guidance");
        render();
        return;
      }
      const next = clamp(state.load + direction * LOAD_STEP, 0, 100);
      commitChange({ load: next }, "LOAD UPDATED — OUTPUT AND DOWNSTREAM RESPONSE REBALANCING.");
    }

    function synchronize() {
      if (state.synchronized || state.levelComplete) return;
      const telemetry = derive(state);
      if (!synchronizedIsSafe(state, telemetry)) {
        setStatus("SYNCHRONIZE DENIED — PARK THE SLUICE AND LOAD, THEN LAND RESERVOIR 68–74, TAILWATER 38–42 AND HEAD 30–34.", "warning");
        render();
        return;
      }
      state.synchronized = true;
      state.downstreamProgress = 0;
      state.awarded.add("synchronize");
      state.score += SCORE.synchronize;
      state.tripped = false;
      state.engaged = false;
      setStatus("SYNCHRONIZED — ENGAGE THE BEAST SYSTEM TO BEGIN COUPLING.", "success");
      render();
    }

    function engage() {
      if (!state.synchronized || state.engaged || state.levelComplete) return;
      const projected = { ...state, engaged: true, tripped: false };
      const projectedTelemetry = derive(projected);
      if (cascadeRequired(projected, projectedTelemetry)) {
        triggerCascade();
        return;
      }
      state.engaged = true;
      state.tripped = false;
      setStatus("BEAST SYSTEM ENGAGED — ADMIT CONTROLLED FLOW.", "active");
      render();
    }

    function confirmIntegrate() {
      if (!state.synchronized || state.integrated || state.levelComplete) return;
      const telemetry = derive(state);
      const index = stabilityIndex(state, telemetry);
      if (!integratedIsSafe(state, telemetry, index)) {
        setStatus("INTEGRATE DENIED — COUPLE FLOW 14–18, LOAD 20–40, RPM 30–50, OUTPUT 8–20 AND INDEX 50 OR HIGHER.", "warning");
        render();
        return;
      }
      state.integrated = true;
      state.awarded.add("integrate");
      state.score += SCORE.integrate;
      setStatus("INTEGRATED — CARRY THE BEAST SYSTEM INTO ITS FINAL ENVELOPE.", "success");
      render();
    }

    function confirmMaster() {
      if (!state.integrated || state.mastered || state.levelComplete) return;
      const telemetry = derive(state);
      const index = stabilityIndex(state, telemetry);
      const labels = operatingLabels(state, telemetry, index);
      if (!masterEnvelopeIsSafe(state, telemetry, index) || labels.stability !== "STABLE" || labels.system !== "WORKING") {
        setStatus("MASTER DENIED — HOLD EVERY FINAL OPERATING VALUE, STABILITY INDEX 50 OR HIGHER, STABLE AND WORKING.", "warning");
        render();
        return;
      }
      const saved = saveResult(state.score + SCORE.master, bestScore);
      bestScore = saved.bestScore;
      state.mastered = true;
      state.levelComplete = true;
      state.awarded.add("master");
      state.score += SCORE.master;
      els.finalScore.textContent = `${state.score} SCORE`;
      els.complete.hidden = false;
      setStatus("BEAST SYSTEM MASTERED — ALL SIX SIMULATOR LEVELS COMPLETE.", "complete");
      render();
    }

    function resetAttempt() {
      state.reservoir = INITIAL.reservoir;
      state.tailwater = INITIAL.tailwater;
      state.sluice = INITIAL.sluice;
      state.load = INITIAL.load;
      state.engaged = false;
      state.synchronized = false;
      state.integrated = false;
      state.mastered = false;
      state.tripped = false;
      state.downstreamProgress = 0;
      state.awarded.clear();
      state.score = 0;
      state.levelComplete = false;
      els.complete.hidden = true;
      setStatus("ATTEMPT RESET — SYNCHRONIZE RESERVOIR AND TAILWATER.", "ready");
      render();
    }

    document.getElementById("gei-level6-reservoir-down").addEventListener("click", () => adjustReservoir(-1));
    document.getElementById("gei-level6-reservoir-up").addEventListener("click", () => adjustReservoir(1));
    document.getElementById("gei-level6-tailwater-down").addEventListener("click", () => adjustTailwater(-1));
    document.getElementById("gei-level6-tailwater-up").addEventListener("click", () => adjustTailwater(1));
    document.getElementById("gei-level6-sluice-down").addEventListener("click", () => adjustSluice(-1));
    document.getElementById("gei-level6-sluice-up").addEventListener("click", () => adjustSluice(1));
    document.getElementById("gei-level6-load-down").addEventListener("click", () => adjustLoad(-1));
    document.getElementById("gei-level6-load-up").addEventListener("click", () => adjustLoad(1));
    document.getElementById("gei-level6-engage").addEventListener("click", engage);
    document.getElementById("gei-level6-synchronize").addEventListener("click", synchronize);
    document.getElementById("gei-level6-confirm-integrate").addEventListener("click", confirmIntegrate);
    document.getElementById("gei-level6-confirm-master").addEventListener("click", confirmMaster);
    document.getElementById("gei-level6-reset").addEventListener("click", resetAttempt);
    document.getElementById("gei-level6-wall").addEventListener("click", () => { window.location.href = "simulator.html"; });
    document.getElementById("gei-level6-academy").addEventListener("click", () => { window.location.href = "index.html#academy"; });
    document.getElementById("gei-level6-return").addEventListener("click", () => { window.location.href = "simulator.html"; });

    render();
  }

  function init() {
    if (isWallRoute()) {
      mountWallEntry();
      return;
    }
    initLevel6();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})();
