/* V1.63.33 — Genesis Level 4: Sluice Engine
   Dedicated Level 4 engine. The Simulator Wall, Levels 1–3, Academy state,
   Dam Gate state, and existing simulator score state remain external.
*/
(() => {
  "use strict";

  const STORAGE_KEY = "geiSimulatorLevel4V1";
  const GATE_KEY = "geiDamGateV1";
  const LEVEL3_RESULT_KEY = "geiSimulatorLevel3V1";
  const VERSION = "1.63.33";
  const SCORE = Object.freeze({ prime: 80, sequence: 120, settle: 160 });
  const INITIAL = Object.freeze({ gate: 0, upstream: 72, downstream: 18 });
  const RECOVERY = Object.freeze({ gate: 0, upstream: 72, downstream: 42 });
  const PRIME_STEP = 4;
  const TRIM_STEP = 2;
  const GATE_STEPS = Object.freeze([20, 40, 60, 80]);
  const OVERLOAD_THRESHOLD = 68;
  const PRIME_RANGE = Object.freeze({
    upstream: Object.freeze({ low: 64, high: 76 }),
    downstream: Object.freeze({ low: 36, high: 48 }),
    head: Object.freeze({ low: 24, high: 36 })
  });
  const STAGED_RANGE = Object.freeze({
    head: Object.freeze({ low: 18, high: 32 }),
    flow: Object.freeze({ low: 4, high: 16 })
  });
  const FINAL_RANGE = Object.freeze({
    upstream: Object.freeze({ low: 60, high: 68 }),
    downstream: Object.freeze({ low: 52, high: 60 }),
    head: Object.freeze({ low: 8, high: 14 }),
    flow: Object.freeze({ low: 8, high: 12 })
  });
  const STAGE_PROFILES = Object.freeze({
    20: Object.freeze({ upstream: 68, downstream: 44 }),
    40: Object.freeze({ upstream: 66, downstream: 44 }),
    60: Object.freeze({ upstream: 64, downstream: 44 }),
    80: Object.freeze({ upstream: 64, downstream: 46 })
  });
  const DEFAULT_RESULT = Object.freeze({
    version: VERSION,
    completed: false,
    bestScore: 0,
    updatedAt: null
  });

  function isLevel4Route() {
    return window.location.search === "?level=4";
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

  function level3IsComplete() {
    try {
      const value = JSON.parse(localStorage.getItem(LEVEL3_RESULT_KEY) || "{}");
      return Boolean(value && typeof value === "object" && value.completed === true);
    } catch (_) {
      return false;
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

  function telemetry(state) {
    const head = state.upstream - state.downstream;
    const flow = Math.max(0, Math.round((state.gate * head) / 100));
    return { head, flow };
  }

  function primeIsSafe(state) {
    const { head } = telemetry(state);
    return state.gate === 0 &&
      inRange(state.upstream, PRIME_RANGE.upstream) &&
      inRange(state.downstream, PRIME_RANGE.downstream) &&
      inRange(head, PRIME_RANGE.head);
  }

  function stagedIsSafe(state) {
    const { head, flow } = telemetry(state);
    return state.gate >= 20 &&
      state.gate <= 80 &&
      inRange(head, STAGED_RANGE.head) &&
      inRange(flow, STAGED_RANGE.flow) &&
      state.downstream < OVERLOAD_THRESHOLD;
  }

  function finalIsSafe(state) {
    const { head, flow } = telemetry(state);
    return state.primeComplete &&
      state.sequenceComplete &&
      state.gate === 80 &&
      inRange(state.upstream, FINAL_RANGE.upstream) &&
      inRange(state.downstream, FINAL_RANGE.downstream) &&
      inRange(head, FINAL_RANGE.head) &&
      inRange(flow, FINAL_RANGE.flow) &&
      state.downstream < OVERLOAD_THRESHOLD &&
      !state.uncontrolledRelease;
  }

  function responseFor(state) {
    const { head, flow } = telemetry(state);
    if (state.downstream >= OVERLOAD_THRESHOLD) return "OVERLOAD";
    if (finalIsSafe(state)) return "STABLE";
    if (state.gate > 0 && (state.pendingGate !== null || state.sequence.length > 0)) return "TRANSITION";
    if (state.gate === 0) return "READY";
    return inRange(head, STAGED_RANGE.head) && inRange(flow, STAGED_RANGE.flow) ? "STAGED" : "CHECK";
  }

  function markup(result) {
    return `
      <main class="gei-level4" id="gei-level4" aria-labelledby="gei-level4-title">
        <div class="gei-level4-shell">
          <header class="gei-level4-top">
            <div class="gei-level4-brand">
              <span class="gei-level4-mark" aria-hidden="true">S4</span>
              <div>
                <span class="gei-level4-kicker">GENESIS ENGINEERED INTERPRETATIONS</span>
                <strong>HYDRAULIC CONTROL ROOM</strong>
              </div>
            </div>
            <div class="gei-level4-top-actions">
              <button type="button" id="gei-level4-wall">SIMULATOR WALL</button>
              <button type="button" id="gei-level4-academy">ACADEMY</button>
            </div>
          </header>

          <section class="gei-level4-main">
            <article class="gei-level4-field" aria-labelledby="gei-level4-title">
              <div class="gei-level4-field-head">
                <div>
                  <span class="gei-level4-eyebrow">HYDRAULIC MISSION 04</span>
                  <h1 id="gei-level4-title">SLUICE / <span>CONTROLLED FLOW</span></h1>
                  <p>Match the head, stage the gate and settle the transfer without an uncontrolled release.</p>
                </div>
                <div class="gei-level4-command-readout" aria-label="Level 4 score status">
                  <div><span>RUN SCORE</span><strong id="gei-level4-score">0</strong></div>
                  <div><span>BEST SCORE</span><strong id="gei-level4-best">${result.bestScore}</strong></div>
                </div>
              </div>

              <div class="gei-level4-telemetry" aria-label="Hydraulic telemetry">
                <div class="gei-level4-telemetry-cell gate">
                  <span>GATE POSITION</span>
                  <strong id="gei-level4-gate">0%</strong>
                  <div class="gei-level4-meter"><span id="gei-level4-gate-fill"></span></div>
                </div>
                <div class="gei-level4-telemetry-cell upstream">
                  <span>UPSTREAM LEVEL</span>
                  <strong id="gei-level4-upstream">72%</strong>
                  <div class="gei-level4-meter"><span id="gei-level4-upstream-fill"></span></div>
                </div>
                <div class="gei-level4-telemetry-cell downstream">
                  <span>DOWNSTREAM LEVEL</span>
                  <strong id="gei-level4-downstream">18%</strong>
                  <div class="gei-level4-meter"><span id="gei-level4-downstream-fill"></span></div>
                </div>
                <div class="gei-level4-telemetry-cell head">
                  <span>HEAD DIFFERENCE</span>
                  <strong id="gei-level4-head">54 UNITS</strong>
                  <small>UPSTREAM − DOWNSTREAM</small>
                </div>
                <div class="gei-level4-telemetry-cell flow">
                  <span>FLOW RATE</span>
                  <strong id="gei-level4-flow">0 UNITS</strong>
                  <small id="gei-level4-flow-formula">GATE × HEAD / 100</small>
                </div>
                <div class="gei-level4-telemetry-cell state">
                  <span>SLUICE STATE</span>
                  <strong id="gei-level4-sluice">LOCKED</strong>
                  <small id="gei-level4-downstream-response">DOWNSTREAM READY</small>
                </div>
              </div>

              <div class="gei-level4-schematic" aria-label="Sluice gate schematic">
                <div class="gei-level4-schematic-grid" aria-hidden="true"></div>
                <div class="gei-level4-reservoir gei-level4-reservoir-upstream" aria-hidden="true"><span>UPSTREAM</span></div>
                <div class="gei-level4-reservoir gei-level4-reservoir-downstream" aria-hidden="true"><span>DOWNSTREAM</span></div>
                <div class="gei-level4-head-line" id="gei-level4-head-line" aria-hidden="true"></div>
                <div class="gei-level4-gate-channel" aria-hidden="true"><span class="gei-level4-gate-leaf" id="gei-level4-gate-leaf"></span><span class="gei-level4-gate-track"></span></div>
                <div class="gei-level4-flow-arrows" id="gei-level4-flow-arrows" aria-hidden="true">→ → →</div>
                <div class="gei-level4-schematic-label left">HEAD FIELD</div>
                <div class="gei-level4-schematic-label right">RECEIVING FIELD</div>
                <div class="gei-level4-gate-readout" id="gei-level4-gate-visual-label">GATE 0% / CLOSED</div>
              </div>

              <fieldset class="gei-level4-control-panel gei-level4-prime-controls">
                <legend>PRIME CONTROLS</legend>
                <div class="gei-level4-control-grid">
                  <button type="button" id="gei-level4-downstream-up">RAISE DOWNSTREAM BUFFER</button>
                  <button type="button" id="gei-level4-downstream-down">LOWER DOWNSTREAM BUFFER</button>
                  <button type="button" id="gei-level4-upstream-up">RAISE UPSTREAM HEAD</button>
                  <button type="button" id="gei-level4-upstream-down">LOWER UPSTREAM HEAD</button>
                  <button type="button" class="primary" id="gei-level4-arm">ARM SLUICE</button>
                </div>
              </fieldset>

              <div class="gei-level4-status" id="gei-level4-status" role="status" aria-live="polite">MATCH THE HEAD, THEN ARM THE SLUICE.</div>
            </article>

            <aside class="gei-level4-missions" aria-labelledby="gei-level4-missions-title">
              <div class="gei-level4-missions-head">
                <div>
                  <span>MISSION CONSOLE</span>
                  <h2 id="gei-level4-missions-title">Sluice Protocol</h2>
                </div>
                <strong id="gei-level4-objective-count">0 / 3</strong>
              </div>

              <div class="gei-level4-objective-list">
                <article class="gei-level4-objective is-current" data-objective="prime">
                  <div class="gei-level4-objective-head"><span>01 / PRIME <b>+80</b></span><strong data-objective-status>CURRENT</strong></div>
                  <h3>MATCH THE HEAD</h3>
                  <p>Hold upstream at 64–76%, downstream at 36–48% and head difference at 24–36 units with the gate closed.</p>
                  <span class="gei-level4-objective-note">SAFE BAND / GATE 0%</span>
                </article>

                <article class="gei-level4-objective is-locked" data-objective="sequence">
                  <div class="gei-level4-objective-head"><span>02 / SEQUENCE <b>+120</b></span><strong data-objective-status>LOCKED</strong></div>
                  <h3>STEP THE GATE</h3>
                  <p>Advance and confirm every notch in order: 0% → 20% → 40% → 60% → 80%.</p>
                  <div class="gei-level4-sequence-readout" aria-label="Gate sequence">
                    <span data-sequence-step="0" class="is-confirmed">0%</span>
                    <span data-sequence-step="20">20%</span>
                    <span data-sequence-step="40">40%</span>
                    <span data-sequence-step="60">60%</span>
                    <span data-sequence-step="80">80%</span>
                  </div>
                  <div class="gei-level4-action-row">
                    <button type="button" id="gei-level4-advance">ADVANCE ONE NOTCH</button>
                    <button type="button" id="gei-level4-confirm-gate">CONFIRM GATE POSITION</button>
                  </div>
                </article>

                <article class="gei-level4-objective is-locked" data-objective="settle">
                  <div class="gei-level4-objective-head"><span>03 / SETTLE <b>+160</b></span><strong data-objective-status>LOCKED</strong></div>
                  <h3>LAND THE FLOW</h3>
                  <p>Use fine trim to land upstream 60–68%, downstream 52–60%, head 8–14 units and flow 8–12 units.</p>
                  <div class="gei-level4-trim-grid" role="group" aria-label="Fine hydraulic trim controls">
                    <button type="button" id="gei-level4-upstream-trim-down">LOWER UPSTREAM TRIM</button>
                    <button type="button" id="gei-level4-upstream-trim-up">RAISE UPSTREAM TRIM</button>
                    <button type="button" id="gei-level4-downstream-trim-up">RAISE DOWNSTREAM TRIM</button>
                    <button type="button" id="gei-level4-downstream-trim-down">LOWER DOWNSTREAM TRIM</button>
                  </div>
                  <button type="button" class="primary" id="gei-level4-confirm-stable">CONFIRM STABLE TRANSFER</button>
                </article>
              </div>
            </aside>
          </section>

          <footer class="gei-level4-footer">
            <span>LEVEL 4 SCORE IS SEPARATE FROM LEVELS 1–3 AND ACADEMY XP.</span>
            <strong id="gei-level4-footer-state">SYSTEM READY</strong>
            <button type="button" id="gei-level4-reset">RESET ATTEMPT</button>
          </footer>
        </div>

        <section class="gei-level4-complete" id="gei-level4-complete" hidden aria-labelledby="gei-level4-complete-title">
          <div class="gei-level4-complete-card">
            <div class="gei-level4-complete-mark" aria-hidden="true">FLOW</div>
            <span class="gei-level4-complete-kicker">CONTROLLED TRANSFER CONFIRMED</span>
            <h2 id="gei-level4-complete-title">LEVEL 4 COMPLETE</h2>
            <p>The sluice moved through every notch, the head settled and the receiving field is stable.</p>
            <strong id="gei-level4-final-score">360 SCORE</strong>
            <button type="button" id="gei-level4-return">RETURN TO SIMULATOR WALL</button>
          </div>
        </section>
      </main>`;
  }

  function mountWallEntry() {
    if (!isWallRoute() || !gateIsOpen() || !level3IsComplete()) return;
    if (document.getElementById("gei-level4-entry")) return;

    const footer = document.querySelector(".gei-simulator-bottom");
    const level3 = document.getElementById("gei-level3-entry");
    const levelOne = document.getElementById("gei-simulator-enter");
    if (!footer || !levelOne) return;

    const entry = document.createElement("a");
    entry.id = "gei-level4-entry";
    entry.className = "gei-simulator-enter";
    entry.href = "simulator.html?level=4";
    entry.textContent = "ENTER LEVEL 4";
    entry.setAttribute("aria-label", "Enter Level 4 Sluice and Controlled Flow");
    footer.insertBefore(entry, level3 || levelOne);
  }

  function initLevel4() {
    if (!isLevel4Route() || !gateIsOpen() || document.getElementById("gei-level4")) return;

    const previous = readResult();
    let bestScore = previous.bestScore;
    document.body.innerHTML = markup(previous);

    const root = document.getElementById("gei-level4");
    const state = {
      gate: INITIAL.gate,
      upstream: INITIAL.upstream,
      downstream: INITIAL.downstream,
      pendingGate: null,
      confirmedGate: 0,
      sequence: [],
      primeComplete: false,
      sequenceComplete: false,
      settleComplete: false,
      uncontrolledRelease: false,
      sluiceArmed: false,
      awarded: new Set(),
      score: 0,
      levelComplete: false
    };

    const els = {
      score: document.getElementById("gei-level4-score"),
      best: document.getElementById("gei-level4-best"),
      gate: document.getElementById("gei-level4-gate"),
      upstream: document.getElementById("gei-level4-upstream"),
      downstream: document.getElementById("gei-level4-downstream"),
      head: document.getElementById("gei-level4-head"),
      flow: document.getElementById("gei-level4-flow"),
      sluice: document.getElementById("gei-level4-sluice"),
      response: document.getElementById("gei-level4-downstream-response"),
      gateFill: document.getElementById("gei-level4-gate-fill"),
      upstreamFill: document.getElementById("gei-level4-upstream-fill"),
      downstreamFill: document.getElementById("gei-level4-downstream-fill"),
      gateLeaf: document.getElementById("gei-level4-gate-leaf"),
      gateVisualLabel: document.getElementById("gei-level4-gate-visual-label"),
      flowArrows: document.getElementById("gei-level4-flow-arrows"),
      status: document.getElementById("gei-level4-status"),
      footerState: document.getElementById("gei-level4-footer-state"),
      count: document.getElementById("gei-level4-objective-count"),
      complete: document.getElementById("gei-level4-complete"),
      finalScore: document.getElementById("gei-level4-final-score")
    };

    const primeButtons = [
      document.getElementById("gei-level4-downstream-up"),
      document.getElementById("gei-level4-downstream-down"),
      document.getElementById("gei-level4-upstream-up"),
      document.getElementById("gei-level4-upstream-down")
    ];
    const trimButtons = [
      document.getElementById("gei-level4-upstream-trim-down"),
      document.getElementById("gei-level4-upstream-trim-up"),
      document.getElementById("gei-level4-downstream-trim-up"),
      document.getElementById("gei-level4-downstream-trim-down")
    ];

    function setStatus(message, mode = "ready") {
      els.status.textContent = message;
      root.dataset.status = mode;
      els.footerState.textContent = mode === "complete" ? "SYSTEM STABILIZED" : mode === "danger" ? "GATE-SHOCK RECOVERY" : message;
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

    function renderSequence() {
      root.querySelectorAll("[data-sequence-step]").forEach((step) => {
        const value = Number(step.dataset.sequenceStep);
        step.classList.toggle("is-confirmed", value === 0 || state.sequence.includes(value));
        step.classList.toggle("is-pending", value === state.pendingGate);
        step.setAttribute("aria-label", `${value}% gate ${state.sequence.includes(value) || value === 0 ? "confirmed" : value === state.pendingGate ? "pending confirmation" : "waiting"}`);
      });
    }

    function render() {
      const { head, flow } = telemetry(state);
      const response = responseFor(state);
      els.score.textContent = String(state.score);
      els.best.textContent = String(Math.max(bestScore, state.score));
      els.gate.textContent = `${state.gate}%`;
      els.upstream.textContent = `${state.upstream}%`;
      els.downstream.textContent = `${state.downstream}%`;
      els.head.textContent = `${head} UNITS`;
      els.flow.textContent = `${flow} UNITS`;
      els.sluice.textContent = state.levelComplete ? "STABLE" : state.sluiceArmed ? (state.gate === 0 ? "ARMED" : "STAGED") : "LOCKED";
      els.response.textContent = `DOWNSTREAM ${response}`;
      els.gateFill.style.width = `${state.gate}%`;
      els.upstreamFill.style.width = `${clamp(state.upstream)}%`;
      els.downstreamFill.style.width = `${clamp(state.downstream)}%`;
      els.gateLeaf.style.height = `${Math.max(8, 100 - state.gate)}%`;
      els.gateVisualLabel.textContent = `GATE ${state.gate}% / ${state.gate === 0 ? "CLOSED" : state.gate === 80 ? "STAGED" : "MOVING"}`;
      els.flowArrows.classList.toggle("is-active", flow > 0);
      els.count.textContent = `${[state.primeComplete, state.sequenceComplete, state.settleComplete].filter(Boolean).length} / 3`;

      updateObjectiveCard("prime", state.primeComplete ? "COMPLETE" : "CURRENT", state.primeComplete ? "is-complete" : "is-current");
      updateObjectiveCard("sequence", state.sequenceComplete ? "COMPLETE" : state.primeComplete ? "CURRENT" : "LOCKED", state.sequenceComplete ? "is-complete" : state.primeComplete ? "is-current" : "is-locked");
      updateObjectiveCard("settle", state.settleComplete ? "COMPLETE" : state.sequenceComplete ? "CURRENT" : "LOCKED", state.settleComplete ? "is-complete" : state.sequenceComplete ? "is-current" : "is-locked");

      const primeEnabled = !state.primeComplete && !state.levelComplete;
      primeButtons.forEach((button) => { button.disabled = !primeEnabled; });
      document.getElementById("gei-level4-arm").disabled = state.primeComplete || state.levelComplete;
      const sequenceEnabled = state.primeComplete && !state.sequenceComplete && !state.levelComplete;
      document.getElementById("gei-level4-advance").disabled = !sequenceEnabled;
      document.getElementById("gei-level4-confirm-gate").disabled = !sequenceEnabled || state.pendingGate === null;
      const trimEnabled = state.sequenceComplete && !state.levelComplete;
      trimButtons.forEach((button) => { button.disabled = !trimEnabled; });
      document.getElementById("gei-level4-confirm-stable").disabled = !trimEnabled;
      root.classList.toggle("is-danger", state.uncontrolledRelease);
      root.classList.toggle("is-complete", state.levelComplete);
      renderSequence();
    }

    function adjustPrime(kind) {
      if (state.primeComplete || state.levelComplete) return;
      if (kind === "downstreamUp") state.downstream = clamp(state.downstream + PRIME_STEP);
      if (kind === "downstreamDown") state.downstream = clamp(state.downstream - PRIME_STEP);
      if (kind === "upstreamUp") state.upstream = clamp(state.upstream + PRIME_STEP);
      if (kind === "upstreamDown") state.upstream = clamp(state.upstream - PRIME_STEP);
      setStatus("HEAD UPDATED — CHECK THE PRIME SAFE BAND.", "active");
      render();
    }

    function armSluice() {
      if (state.primeComplete || state.levelComplete) return;
      if (!primeIsSafe(state)) {
        setStatus("PRIME DENIED — GATE 0%, UPSTREAM 64–76%, DOWNSTREAM 36–48%, HEAD 24–36.", "warning");
        render();
        return;
      }
      state.primeComplete = true;
      state.sluiceArmed = true;
      award("prime", SCORE.prime, "PRIME CONFIRMED — SLUICE ARMED. STEP THE GATE IN ORDER.");
      render();
    }

    function gateShock() {
      state.gate = RECOVERY.gate;
      state.upstream = RECOVERY.upstream;
      state.downstream = RECOVERY.downstream;
      state.pendingGate = null;
      state.confirmedGate = 0;
      state.sequence = [];
      state.sequenceComplete = false;
      state.settleComplete = false;
      state.uncontrolledRelease = true;
      state.sluiceArmed = true;
      setStatus("UNCONTROLLED RELEASE — GATE RECLOSED. RE-PRIME THE HEAD.", "danger");
      render();
    }

    function advanceGate() {
      if (!state.primeComplete || state.sequenceComplete || state.levelComplete) return;
      if (state.pendingGate !== null || state.confirmedGate !== state.sequence[state.sequence.length - 1] && state.sequence.length > 0) {
        gateShock();
        return;
      }
      const expected = GATE_STEPS[state.sequence.length];
      if (!expected || state.confirmedGate !== (state.sequence.length ? state.sequence[state.sequence.length - 1] : 0)) {
        gateShock();
        return;
      }
      const profile = STAGE_PROFILES[expected];
      if (!profile) {
        gateShock();
        return;
      }
      const projected = { ...state, gate: expected, upstream: profile.upstream, downstream: profile.downstream };
      if (!stagedIsSafe(projected)) {
        gateShock();
        return;
      }
      state.gate = expected;
      state.pendingGate = expected;
      state.upstream = profile.upstream;
      state.downstream = profile.downstream;
      state.uncontrolledRelease = false;
      setStatus(`GATE ${expected}% — HYDRAULIC RESPONSE UPDATED. CONFIRM THIS POSITION.`, "active");
      render();
    }

    function confirmGate() {
      if (!state.primeComplete || state.sequenceComplete || state.levelComplete) return;
      if (state.pendingGate === null) {
        setStatus("NO NEW GATE POSITION — ADVANCE ONE NOTCH IN ORDER.", "guidance");
        render();
        return;
      }
      if (!stagedIsSafe(state) || state.pendingGate !== GATE_STEPS[state.sequence.length]) {
        gateShock();
        return;
      }
      state.confirmedGate = state.pendingGate;
      state.sequence.push(state.pendingGate);
      state.pendingGate = null;
      if (state.confirmedGate === 80) {
        state.sequenceComplete = true;
        award("sequence", SCORE.sequence, "SEQUENCE CONFIRMED — USE FINE TRIM TO SETTLE THE FLOW.");
      } else {
        setStatus(`GATE ${state.confirmedGate}% CONFIRMED — ADVANCE TO THE NEXT NOTCH.`, "success");
      }
      render();
    }

    function adjustTrim(kind) {
      if (!state.sequenceComplete || state.levelComplete) return;
      if (kind === "upstreamDown") state.upstream = clamp(state.upstream - TRIM_STEP);
      if (kind === "upstreamUp") state.upstream = clamp(state.upstream + TRIM_STEP);
      if (kind === "downstreamUp") state.downstream = clamp(state.downstream + TRIM_STEP);
      if (kind === "downstreamDown") state.downstream = clamp(state.downstream - TRIM_STEP);
      state.uncontrolledRelease = false;
      setStatus("FINE TRIM UPDATED — CHECK HEAD, FLOW AND DOWNSTREAM RESPONSE.", "active");
      render();
    }

    function confirmStable() {
      if (!state.sequenceComplete || state.levelComplete) return;
      if (!finalIsSafe(state)) {
        setStatus("STABILIZATION DENIED — LAND UPSTREAM 60–68%, DOWNSTREAM 52–60%, HEAD 8–14, FLOW 8–12.", "warning");
        render();
        return;
      }
      state.settleComplete = true;
      state.levelComplete = true;
      const saved = saveResult(state.score + SCORE.settle, bestScore);
      bestScore = saved.bestScore;
      award("settle", SCORE.settle, "STABLE TRANSFER CONFIRMED — LEVEL 4 COMPLETE.");
      els.finalScore.textContent = `${state.score} SCORE`;
      els.complete.hidden = false;
      setStatus("STABLE TRANSFER CONFIRMED — LEVEL 4 COMPLETE.", "complete");
      render();
    }

    function resetAttempt() {
      state.gate = INITIAL.gate;
      state.upstream = INITIAL.upstream;
      state.downstream = INITIAL.downstream;
      state.pendingGate = null;
      state.confirmedGate = 0;
      state.sequence = [];
      state.primeComplete = false;
      state.sequenceComplete = false;
      state.settleComplete = false;
      state.uncontrolledRelease = false;
      state.sluiceArmed = false;
      state.awarded.clear();
      state.score = 0;
      state.levelComplete = false;
      els.complete.hidden = true;
      setStatus("ATTEMPT RESET — MATCH THE HEAD, THEN ARM THE SLUICE.", "ready");
      render();
    }

    primeButtons[0].addEventListener("click", () => adjustPrime("downstreamUp"));
    primeButtons[1].addEventListener("click", () => adjustPrime("downstreamDown"));
    primeButtons[2].addEventListener("click", () => adjustPrime("upstreamUp"));
    primeButtons[3].addEventListener("click", () => adjustPrime("upstreamDown"));
    document.getElementById("gei-level4-arm").addEventListener("click", armSluice);
    document.getElementById("gei-level4-advance").addEventListener("click", advanceGate);
    document.getElementById("gei-level4-confirm-gate").addEventListener("click", confirmGate);
    trimButtons[0].addEventListener("click", () => adjustTrim("upstreamDown"));
    trimButtons[1].addEventListener("click", () => adjustTrim("upstreamUp"));
    trimButtons[2].addEventListener("click", () => adjustTrim("downstreamUp"));
    trimButtons[3].addEventListener("click", () => adjustTrim("downstreamDown"));
    document.getElementById("gei-level4-confirm-stable").addEventListener("click", confirmStable);
    document.getElementById("gei-level4-reset").addEventListener("click", resetAttempt);
    document.getElementById("gei-level4-wall").addEventListener("click", () => { window.location.href = "simulator.html"; });
    document.getElementById("gei-level4-academy").addEventListener("click", () => { window.location.href = "index.html#academy"; });
    document.getElementById("gei-level4-return").addEventListener("click", () => { window.location.href = "simulator.html"; });

    render();
  }

  function init() {
    if (isWallRoute()) {
      mountWallEntry();
      return;
    }
    initLevel4();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})();
