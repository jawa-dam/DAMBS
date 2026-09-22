/* V1.63.34 — Genesis Level 5: Waterwheel Engine
   Dedicated Level 5 engine. Levels 1–4, the Simulator Wall, Academy state,
   Dam Gate state, and existing simulator score state remain external.
*/
(() => {
  "use strict";

  const STORAGE_KEY = "geiSimulatorLevel5V1";
  const GATE_KEY = "geiDamGateV1";
  const LEVEL4_RESULT_KEY = "geiSimulatorLevel4V1";
  const VERSION = "1.63.34";
  const SCORE = Object.freeze({ align: 70, drive: 130, work: 190 });
  const INITIAL = Object.freeze({ head: 40, flow: 0, load: 0 });
  const HEAD_STEP = 2;
  const FLOW_STEP = 4;
  const LOAD_STEP = 5;
  const HEAD_LIMITS = Object.freeze({ low: 28, high: 52 });
  const ALIGN_HEAD = Object.freeze({ low: 36, high: 44 });
  const OVERSPEED_RPM = 64;
  const DRIVE_BAND = Object.freeze({
    head: Object.freeze({ low: 36, high: 44 }),
    flow: Object.freeze({ low: 18, high: 24 }),
    load: Object.freeze({ low: 20, high: 30 }),
    rpm: Object.freeze({ low: 42, high: 58 }),
    output: Object.freeze({ low: 8, high: 18 })
  });
  const WORK_BAND = Object.freeze({
    head: Object.freeze({ low: 36, high: 44 }),
    flow: Object.freeze({ low: 20, high: 24 }),
    load: Object.freeze({ low: 55, high: 65 }),
    rpm: Object.freeze({ low: 38, high: 50 }),
    output: Object.freeze({ low: 21, high: 31 })
  });
  const DEFAULT_RESULT = Object.freeze({
    version: VERSION,
    completed: false,
    bestScore: 0,
    updatedAt: null
  });

  function isLevel5Route() {
    return window.location.search === "?level=5";
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

  function level4IsComplete() {
    try {
      const value = JSON.parse(localStorage.getItem(LEVEL4_RESULT_KEY) || "{}");
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

  function clamp(value, low = 0, high = 100) {
    return Math.max(low, Math.min(high, value));
  }

  function inRange(value, range) {
    return value >= range.low && value <= range.high;
  }

  function derive(state) {
    const hydraulicDrive = Math.round((state.flow * state.head) / 16);
    const loadDrag = Math.round(state.load * 0.12);
    const rpm = state.engaged ? Math.max(0, hydraulicDrive - loadDrag) : 0;
    const output = state.engaged ? Math.round((rpm * state.load) / 100) : 0;
    return { hydraulicDrive, loadDrag, rpm, output };
  }

  function driveIsSafe(state, telemetry) {
    return state.aligned &&
      state.engaged &&
      inRange(state.head, DRIVE_BAND.head) &&
      inRange(state.flow, DRIVE_BAND.flow) &&
      inRange(state.load, DRIVE_BAND.load) &&
      inRange(telemetry.rpm, DRIVE_BAND.rpm) &&
      inRange(telemetry.output, DRIVE_BAND.output);
  }

  function workIsSafe(state, telemetry) {
    return state.driveComplete &&
      state.aligned &&
      state.engaged &&
      inRange(state.head, WORK_BAND.head) &&
      inRange(state.flow, WORK_BAND.flow) &&
      inRange(state.load, WORK_BAND.load) &&
      inRange(telemetry.rpm, WORK_BAND.rpm) &&
      inRange(telemetry.output, WORK_BAND.output);
  }

  function stabilityFor(state, telemetry) {
    if (state.tripped) return "RECOVERY";
    if (state.engaged && telemetry.rpm > OVERSPEED_RPM) return "OVERSPEED";
    if (state.engaged && state.flow > 0 && (state.flow < 16 || state.head < 32)) return "STARVED";
    if (state.engaged && state.load > 72 && telemetry.rpm < 36) return "OVERLOADED";
    if (workIsSafe(state, telemetry)) return "STABLE";
    if (driveIsSafe(state, telemetry)) return "BALANCED";
    if (state.engaged) return "TURNING";
    return "READY";
  }

  function markup(result) {
    return `
      <main class="gei-level5" id="gei-level5" aria-labelledby="gei-level5-title">
        <div class="gei-level5-shell">
          <header class="gei-level5-top">
            <div class="gei-level5-brand">
              <span class="gei-level5-mark" aria-hidden="true">W5</span>
              <div>
                <span class="gei-level5-kicker">GENESIS ENGINEERED INTERPRETATIONS</span>
                <strong>HYDRAULIC CONTROL ROOM</strong>
              </div>
            </div>
            <div class="gei-level5-top-actions">
              <button type="button" id="gei-level5-wall">SIMULATOR WALL</button>
              <button type="button" id="gei-level5-academy">ACADEMY</button>
            </div>
          </header>

          <section class="gei-level5-main">
            <article class="gei-level5-field" aria-labelledby="gei-level5-title">
              <div class="gei-level5-field-head">
                <div>
                  <span class="gei-level5-eyebrow">HYDRAULIC MISSION 05</span>
                  <h1 id="gei-level5-title">WATERWHEEL / <span>USEFUL WORK</span></h1>
                  <p>Turn controlled water into mechanical motion, then carry a productive load without overspeed.</p>
                </div>
                <div class="gei-level5-command-readout" aria-label="Level 5 score status">
                  <div><span>RUN SCORE</span><strong id="gei-level5-score">0</strong></div>
                  <div><span>BEST SCORE</span><strong id="gei-level5-best">${result.bestScore}</strong></div>
                </div>
              </div>

              <div class="gei-level5-telemetry" aria-label="Waterwheel telemetry">
                <div class="gei-level5-telemetry-cell head">
                  <span>HYDRAULIC HEAD</span>
                  <strong id="gei-level5-head">40 UNITS</strong>
                  <small>AVAILABLE WATER DROP</small>
                </div>
                <div class="gei-level5-telemetry-cell flow">
                  <span>WATER FLOW</span>
                  <strong id="gei-level5-flow">0 UNITS</strong>
                  <small>INLET VANE OPENING</small>
                </div>
                <div class="gei-level5-telemetry-cell speed">
                  <span>WHEEL RPM</span>
                  <strong id="gei-level5-rpm">0 RPM</strong>
                  <small>MECHANICAL MOTION</small>
                </div>
                <div class="gei-level5-telemetry-cell load">
                  <span>WHEEL LOAD</span>
                  <strong id="gei-level5-load">0%</strong>
                  <div class="gei-level5-meter"><span id="gei-level5-load-fill"></span></div>
                </div>
                <div class="gei-level5-telemetry-cell output">
                  <span>MECHANICAL OUTPUT</span>
                  <strong id="gei-level5-output">0 UNITS</strong>
                  <small>USEFUL WORK TRANSFER</small>
                </div>
                <div class="gei-level5-telemetry-cell state">
                  <span>WHEEL STATE</span>
                  <strong id="gei-level5-wheel-state">PARKED</strong>
                  <small id="gei-level5-stability">SYSTEM READY</small>
                </div>
              </div>

              <div class="gei-level5-wheel-visual" aria-label="Waterwheel mechanical schematic">
                <div class="gei-level5-schematic-grid" aria-hidden="true"></div>
                <div class="gei-level5-water-channel gei-level5-water-channel-left" aria-hidden="true"><span>WATER IN</span></div>
                <div class="gei-level5-water-channel gei-level5-water-channel-right" aria-hidden="true"><span>RELEASE</span></div>
                <div class="gei-level5-wheel-housing" aria-hidden="true">
                  <div class="gei-level5-wheel" id="gei-level5-wheel">
                    <span class="gei-level5-spoke spoke-one"></span>
                    <span class="gei-level5-spoke spoke-two"></span>
                    <span class="gei-level5-spoke spoke-three"></span>
                    <span class="gei-level5-spoke spoke-four"></span>
                    <span class="gei-level5-wheel-hub"></span>
                  </div>
                </div>
                <div class="gei-level5-output-shaft" id="gei-level5-output-shaft" aria-hidden="true"><span>WORK SHAFT</span></div>
                <div class="gei-level5-load-belt" aria-hidden="true"><span>LOAD</span></div>
                <div class="gei-level5-visual-label left">WATER INPUT</div>
                <div class="gei-level5-visual-label center" id="gei-level5-wheel-readout">WHEEL PARKED / 0 RPM</div>
                <div class="gei-level5-visual-label right">USEFUL WORK</div>
              </div>

              <fieldset class="gei-level5-control-panel gei-level5-head-controls">
                <legend>HEAD CHANNEL</legend>
                <div class="gei-level5-control-grid">
                  <button type="button" id="gei-level5-head-down">LOWER HEAD CHANNEL</button>
                  <button type="button" id="gei-level5-head-up">RAISE HEAD CHANNEL</button>
                </div>
              </fieldset>

              <fieldset class="gei-level5-control-panel gei-level5-wheel-controls">
                <legend>WHEEL DRIVE</legend>
                <div class="gei-level5-control-grid">
                  <button type="button" id="gei-level5-align">ALIGN WHEEL</button>
                  <button type="button" id="gei-level5-engage">ENGAGE WHEEL</button>
                  <button type="button" id="gei-level5-flow-down">CLOSE INLET VANE</button>
                  <button type="button" id="gei-level5-flow-up">OPEN INLET VANE</button>
                </div>
              </fieldset>

              <fieldset class="gei-level5-control-panel gei-level5-load-controls">
                <legend>MECHANICAL LOAD</legend>
                <div class="gei-level5-control-grid">
                  <button type="button" id="gei-level5-load-down">DECREASE WHEEL LOAD</button>
                  <button type="button" id="gei-level5-load-up">INCREASE WHEEL LOAD</button>
                </div>
              </fieldset>

              <div class="gei-level5-status" id="gei-level5-status" role="status" aria-live="polite">ALIGN THE PARKED WHEEL BEFORE ADMITTING WATER.</div>
            </article>

            <aside class="gei-level5-missions" aria-labelledby="gei-level5-missions-title">
              <div class="gei-level5-missions-head">
                <div>
                  <span>MISSION CONSOLE</span>
                  <h2 id="gei-level5-missions-title">Waterwheel Protocol</h2>
                </div>
                <strong id="gei-level5-objective-count">0 / 3</strong>
              </div>

              <div class="gei-level5-objective-list">
                <article class="gei-level5-objective is-current" data-objective="align">
                  <div class="gei-level5-objective-head"><span>01 / ALIGN <b>+70</b></span><strong data-objective-status>CURRENT</strong></div>
                  <h3>SEAT THE WHEEL</h3>
                  <p>Keep the wheel parked, flow at zero, load at zero and head inside the bearing-safe band, then align the wheel.</p>
                  <span class="gei-level5-objective-note">PARKED / HEAD 36–44 / FLOW 0</span>
                </article>

                <article class="gei-level5-objective is-locked" data-objective="drive">
                  <div class="gei-level5-objective-head"><span>02 / DRIVE <b>+130</b></span><strong data-objective-status>LOCKED</strong></div>
                  <h3>CATCH THE WHEEL</h3>
                  <p>Engage the wheel, admit water and introduce a moderate load until mechanical transfer is positive and balanced.</p>
                  <span class="gei-level5-objective-note">RPM 42–58 / LOAD 20–30 / OUTPUT 8–18</span>
                  <button type="button" class="primary" id="gei-level5-confirm-drive">CONFIRM DRIVE TRANSFER</button>
                </article>

                <article class="gei-level5-objective is-locked" data-objective="work">
                  <div class="gei-level5-objective-head"><span>03 / WORK <b>+190</b></span><strong data-objective-status>LOCKED</strong></div>
                  <h3>CARRY USEFUL LOAD</h3>
                  <p>Increase the mechanical load while keeping the wheel productive, stable and below the overspeed threshold.</p>
                  <span class="gei-level5-objective-note">RPM 38–50 / LOAD 55–65 / OUTPUT 21–31</span>
                  <button type="button" class="primary" id="gei-level5-confirm-work">CONFIRM USEFUL WORK</button>
                </article>
              </div>
            </aside>
          </section>

          <footer class="gei-level5-footer">
            <span>LEVEL 5 SCORE IS SEPARATE FROM LEVELS 1–4 AND ACADEMY XP.</span>
            <strong id="gei-level5-footer-state">SYSTEM READY</strong>
            <button type="button" id="gei-level5-reset">RESET ATTEMPT</button>
          </footer>
        </div>

        <section class="gei-level5-complete" id="gei-level5-complete" hidden aria-labelledby="gei-level5-complete-title">
          <div class="gei-level5-complete-card">
            <div class="gei-level5-complete-mark" aria-hidden="true">WORK</div>
            <span class="gei-level5-complete-kicker">MECHANICAL TRANSFER CONFIRMED</span>
            <h2 id="gei-level5-complete-title">LEVEL 5 COMPLETE</h2>
            <p>Controlled water is now motion, and motion is carrying useful work.</p>
            <strong id="gei-level5-final-score">390 SCORE</strong>
            <button type="button" id="gei-level5-return">RETURN TO SIMULATOR WALL</button>
          </div>
        </section>
      </main>`;
  }

  function mountWallEntry() {
    if (!isWallRoute() || !gateIsOpen() || !level4IsComplete()) return;
    if (document.getElementById("gei-level5-entry")) return;

    const footer = document.querySelector(".gei-simulator-bottom");
    const level4 = document.getElementById("gei-level4-entry");
    const levelOne = document.getElementById("gei-simulator-enter");
    if (!footer || !levelOne) return;

    const entry = document.createElement("a");
    entry.id = "gei-level5-entry";
    entry.className = "gei-simulator-enter";
    entry.href = "simulator.html?level=5";
    entry.textContent = "ENTER LEVEL 5";
    entry.setAttribute("aria-label", "Enter Level 5 Waterwheel and Useful Work");
    footer.insertBefore(entry, level4 || levelOne);
  }

  function initLevel5() {
    if (!isLevel5Route() || !gateIsOpen() || !level4IsComplete() || document.getElementById("gei-level5")) return;

    const previous = readResult();
    let bestScore = previous.bestScore;
    document.body.innerHTML = markup(previous);

    const root = document.getElementById("gei-level5");
    const state = {
      head: INITIAL.head,
      flow: INITIAL.flow,
      load: INITIAL.load,
      aligned: false,
      engaged: false,
      wheelState: "PARKED",
      tripped: false,
      alignComplete: false,
      driveComplete: false,
      workComplete: false,
      awarded: new Set(),
      score: 0,
      levelComplete: false
    };

    const els = {
      score: document.getElementById("gei-level5-score"),
      best: document.getElementById("gei-level5-best"),
      head: document.getElementById("gei-level5-head"),
      flow: document.getElementById("gei-level5-flow"),
      rpm: document.getElementById("gei-level5-rpm"),
      load: document.getElementById("gei-level5-load"),
      output: document.getElementById("gei-level5-output"),
      loadFill: document.getElementById("gei-level5-load-fill"),
      wheelState: document.getElementById("gei-level5-wheel-state"),
      stability: document.getElementById("gei-level5-stability"),
      wheel: document.getElementById("gei-level5-wheel"),
      shaft: document.getElementById("gei-level5-output-shaft"),
      wheelReadout: document.getElementById("gei-level5-wheel-readout"),
      status: document.getElementById("gei-level5-status"),
      footerState: document.getElementById("gei-level5-footer-state"),
      count: document.getElementById("gei-level5-objective-count"),
      complete: document.getElementById("gei-level5-complete"),
      finalScore: document.getElementById("gei-level5-final-score")
    };

    function setStatus(message, mode = "ready") {
      els.status.textContent = message;
      root.dataset.status = mode;
      els.footerState.textContent = mode === "complete" ? "USEFUL WORK STABILIZED" : mode === "danger" ? "OVERSPEED RECOVERY" : message;
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
      const stability = stabilityFor(state, telemetry);
      els.score.textContent = String(state.score);
      els.best.textContent = String(Math.max(bestScore, state.score));
      els.head.textContent = `${state.head} UNITS`;
      els.flow.textContent = `${state.flow} UNITS`;
      els.rpm.textContent = `${telemetry.rpm} RPM`;
      els.load.textContent = `${state.load}%`;
      els.output.textContent = `${telemetry.output} UNITS`;
      els.loadFill.style.width = `${clamp(state.load)}%`;
      els.wheelState.textContent = state.wheelState;
      els.stability.textContent = `SYSTEM ${stability}`;
      els.wheelReadout.textContent = `WHEEL ${state.wheelState} / ${telemetry.rpm} RPM`;
      els.wheel.style.setProperty("--wheel-rpm", String(telemetry.rpm));
      els.wheel.classList.toggle("is-turning", state.engaged && telemetry.rpm > 0);
      els.wheel.classList.toggle("is-tripped", state.tripped);
      els.shaft.classList.toggle("is-working", state.workComplete || telemetry.output > 0);
      els.count.textContent = `${[state.alignComplete, state.driveComplete, state.workComplete].filter(Boolean).length} / 3`;

      updateObjectiveCard("align", state.alignComplete ? "COMPLETE" : "CURRENT", state.alignComplete ? "is-complete" : "is-current");
      updateObjectiveCard("drive", state.driveComplete ? "COMPLETE" : state.alignComplete ? "CURRENT" : "LOCKED", state.driveComplete ? "is-complete" : state.alignComplete ? "is-current" : "is-locked");
      updateObjectiveCard("work", state.workComplete ? "COMPLETE" : state.driveComplete ? "CURRENT" : "LOCKED", state.workComplete ? "is-complete" : state.driveComplete ? "is-current" : "is-locked");

      const headEnabled = !state.levelComplete && !state.workComplete;
      document.getElementById("gei-level5-head-down").disabled = !headEnabled;
      document.getElementById("gei-level5-head-up").disabled = !headEnabled;
      document.getElementById("gei-level5-align").disabled = state.alignComplete || state.levelComplete;
      document.getElementById("gei-level5-engage").disabled = !state.alignComplete || state.levelComplete || state.engaged;
      document.getElementById("gei-level5-flow-down").disabled = !state.engaged || state.levelComplete;
      document.getElementById("gei-level5-flow-up").disabled = !state.engaged || state.levelComplete;
      document.getElementById("gei-level5-load-down").disabled = !state.engaged || state.levelComplete;
      document.getElementById("gei-level5-load-up").disabled = !state.engaged || state.levelComplete;
      document.getElementById("gei-level5-confirm-drive").disabled = !state.alignComplete || state.driveComplete || state.levelComplete;
      document.getElementById("gei-level5-confirm-work").disabled = !state.driveComplete || state.workComplete || state.levelComplete;
      root.classList.toggle("is-tripped", state.tripped);
      root.classList.toggle("is-complete", state.levelComplete);
    }

    function triggerOverspeed() {
      const driveWasComplete = state.driveComplete;
      state.head = INITIAL.head;
      state.flow = INITIAL.flow;
      state.load = INITIAL.load;
      state.engaged = false;
      state.aligned = true;
      state.tripped = true;
      state.driveComplete = driveWasComplete;
      state.workComplete = false;
      state.levelComplete = false;
      state.wheelState = "TRIPPED";
      setStatus("OVERSPEED TRIP — WHEEL DISENGAGED. RE-ESTABLISH SAFE DRIVE.", "danger");
      render();
    }

    function commitChange(change, message) {
      const projected = { ...state, ...change };
      const projectedTelemetry = derive(projected);
      if (projected.engaged && projectedTelemetry.rpm > OVERSPEED_RPM) {
        triggerOverspeed();
        return;
      }
      Object.assign(state, change);
      state.tripped = false;
      if (state.engaged && !state.workComplete) state.wheelState = state.driveComplete ? "TRANSFERRING" : "TURNING";
      setStatus(message, "active");
      render();
    }

    function adjustHead(direction) {
      if (state.levelComplete || state.workComplete) return;
      const next = clamp(state.head + direction * HEAD_STEP, HEAD_LIMITS.low, HEAD_LIMITS.high);
      commitChange({ head: next }, "HEAD CHANNEL UPDATED — CHECK WHEEL SPEED AND OUTPUT.");
    }

    function alignWheel() {
      if (state.alignComplete || state.levelComplete) return;
      const telemetry = derive(state);
      if (state.engaged || state.flow !== 0 || state.load !== 0 || telemetry.rpm !== 0 || !inRange(state.head, ALIGN_HEAD)) {
        setStatus("ALIGNMENT DENIED — PARK THE WHEEL, ZERO FLOW AND LOAD, THEN HOLD HEAD 36–44.", "warning");
        render();
        return;
      }
      state.aligned = true;
      state.alignComplete = true;
      state.wheelState = "ALIGNED";
      award("align", SCORE.align, "WHEEL ALIGNED — ENGAGE THE WHEEL TO BEGIN MECHANICAL MOTION.");
      render();
    }

    function engageWheel() {
      if (!state.alignComplete || state.levelComplete || state.engaged) return;
      state.engaged = true;
      state.tripped = false;
      state.wheelState = "TURNING";
      setStatus("WHEEL ENGAGED — ADMIT WATER AND WATCH RPM RESPOND.", "active");
      render();
    }

    function adjustFlow(direction) {
      if (!state.engaged || state.levelComplete) {
        setStatus("FLOW DENIED — ALIGN AND ENGAGE THE WHEEL FIRST.", "guidance");
        render();
        return;
      }
      const next = clamp(state.flow + direction * FLOW_STEP, 0, 40);
      commitChange({ flow: next }, "INLET VANE UPDATED — WHEEL MOTION RESPONDING.");
    }

    function adjustLoad(direction) {
      if (!state.engaged || state.levelComplete) {
        setStatus("LOAD DENIED — ENGAGE THE WHEEL BEFORE APPLYING MECHANICAL RESISTANCE.", "guidance");
        render();
        return;
      }
      const next = clamp(state.load + direction * LOAD_STEP, 0, 100);
      commitChange({ load: next }, "WHEEL LOAD UPDATED — COMPARE RPM WITH USEFUL OUTPUT.");
    }

    function confirmDrive() {
      if (!state.alignComplete || state.driveComplete || state.levelComplete) return;
      const telemetry = derive(state);
      if (!driveIsSafe(state, telemetry) || stabilityFor(state, telemetry) !== "BALANCED") {
        setStatus("DRIVE DENIED — ENGAGE THE WHEEL, THEN LAND FLOW 18–24, LOAD 20–30, RPM 42–58 AND OUTPUT 8–18.", "warning");
        render();
        return;
      }
      state.driveComplete = true;
      state.wheelState = "TRANSFERRING";
      award("drive", SCORE.drive, "DRIVE TRANSFER CONFIRMED — CARRY A USEFUL LOAD.");
      render();
    }

    function confirmWork() {
      if (!state.driveComplete || state.workComplete || state.levelComplete) return;
      const telemetry = derive(state);
      if (!workIsSafe(state, telemetry) || stabilityFor(state, telemetry) !== "STABLE") {
        setStatus("WORK DENIED — LAND HEAD 36–44, FLOW 20–24, LOAD 55–65, RPM 38–50 AND OUTPUT 21–31.", "warning");
        render();
        return;
      }
      const saved = saveResult(state.score + SCORE.work, bestScore);
      bestScore = saved.bestScore;
      state.workComplete = true;
      state.levelComplete = true;
      state.wheelState = "WORKING";
      award("work", SCORE.work, "USEFUL WORK CONFIRMED — LEVEL 5 COMPLETE.");
      els.finalScore.textContent = `${state.score} SCORE`;
      els.complete.hidden = false;
      setStatus("USEFUL WORK CONFIRMED — LEVEL 5 COMPLETE.", "complete");
      render();
    }

    function resetAttempt() {
      state.head = INITIAL.head;
      state.flow = INITIAL.flow;
      state.load = INITIAL.load;
      state.aligned = false;
      state.engaged = false;
      state.wheelState = "PARKED";
      state.tripped = false;
      state.alignComplete = false;
      state.driveComplete = false;
      state.workComplete = false;
      state.awarded.clear();
      state.score = 0;
      state.levelComplete = false;
      els.complete.hidden = true;
      setStatus("ATTEMPT RESET — ALIGN THE PARKED WHEEL BEFORE ADMITTING WATER.", "ready");
      render();
    }

    document.getElementById("gei-level5-head-down").addEventListener("click", () => adjustHead(-1));
    document.getElementById("gei-level5-head-up").addEventListener("click", () => adjustHead(1));
    document.getElementById("gei-level5-align").addEventListener("click", alignWheel);
    document.getElementById("gei-level5-engage").addEventListener("click", engageWheel);
    document.getElementById("gei-level5-flow-down").addEventListener("click", () => adjustFlow(-1));
    document.getElementById("gei-level5-flow-up").addEventListener("click", () => adjustFlow(1));
    document.getElementById("gei-level5-load-down").addEventListener("click", () => adjustLoad(-1));
    document.getElementById("gei-level5-load-up").addEventListener("click", () => adjustLoad(1));
    document.getElementById("gei-level5-confirm-drive").addEventListener("click", confirmDrive);
    document.getElementById("gei-level5-confirm-work").addEventListener("click", confirmWork);
    document.getElementById("gei-level5-reset").addEventListener("click", resetAttempt);
    document.getElementById("gei-level5-wall").addEventListener("click", () => { window.location.href = "simulator.html"; });
    document.getElementById("gei-level5-academy").addEventListener("click", () => { window.location.href = "index.html#academy"; });
    document.getElementById("gei-level5-return").addEventListener("click", () => { window.location.href = "simulator.html"; });

    render();
  }

  function init() {
    if (isWallRoute()) {
      mountWallEntry();
      return;
    }
    initLevel5();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})();
