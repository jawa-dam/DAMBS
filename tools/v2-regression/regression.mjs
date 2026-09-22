/* YallToo Visual Remix V2 — Protected-Logic Regression Harness
   ------------------------------------------------------------------
   Proves the V2 visual remix never changes protected behaviour:
   six-day progression, XP (666 max), objective mastery, badges, learner
   identity, Dam Gate, 666 XP consumption, Simulator unlock, and Level 1–6 gameplay.

   Usage:
     node regression.mjs            run all checks
     node regression.mjs --bless    re-record the frozen contract manifest

   Requires: npm install   (jsdom, css-tree)
*/
import { JSDOM, VirtualConsole } from "jsdom";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import * as cssTree from "css-tree";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "..", "..");
const MANIFEST = path.join(HERE, "contract.manifest.json");
const BLESS = process.argv.includes("--bless");

let pass = 0, fail = 0;
const failures = [];
const warnings = [];

function check(name, cond, detail = "") {
  if (cond) { pass += 1; console.log(`  PASS  ${name}`); }
  else { fail += 1; failures.push(name); console.log(`  FAIL  ${name}${detail ? "  -> " + detail : ""}`); }
}
function section(t) { console.log(`\n── ${t} ${"─".repeat(Math.max(0, 66 - t.length))}`); }

/* ------------------------------------------------------------------ *
 * Source scanning — derive the frozen contract from the repo itself
 * ------------------------------------------------------------------ */
function repoSources() {
  const files = fs.readdirSync(ROOT)
    .filter((f) => /\.(js|html|css)$/.test(f) && !f.startsWith("."))
    .sort();
  return files.map((f) => ({ f, s: fs.readFileSync(path.join(ROOT, f), "utf8") }));
}

function deriveContract() {
  const srcs = repoSources();
  const all = srcs.map((x) => x.s).join("\n");

  const storageKeys = new Set();
  for (const m of all.matchAll(/(?:localStorage|sessionStorage)\s*\.\s*(?:getItem|setItem|removeItem)\s*\(\s*["']([^"']+)["']/g)) storageKeys.add(m[1]);
  for (const m of all.matchAll(/(?:const|let|var)\s+[A-Z0-9_]*KEY[A-Z0-9_]*\s*=\s*["']([^"']+)["']/g)) storageKeys.add(m[1]);

  const events = new Set();
  for (const m of all.matchAll(/["'](gei:[a-z0-9-]+)["']/g)) events.add(m[1]);

  const globals = new Set();
  for (const m of all.matchAll(/window\.(GEI_[A-Z0-9_]+|GEIAchievementSound)\s*=/g)) globals.add(m[1]);

  const pageAssets = {};
  for (const f of fs.readdirSync(ROOT).filter((x) => x.endsWith(".html")).sort()) {
    const s = fs.readFileSync(path.join(ROOT, f), "utf8");
    pageAssets[f] = [...s.matchAll(/<(?:link|script)[^>]+(?:href|src)="([^"]+\.(?:css|js))"/g)].map((m) => m[1]);
  }

  const internalUrls = new Set();
  for (const m of all.matchAll(/["']((?:day-\d|index|simulator|dam-release)\.html[^"'\s]*)["']/g)) internalUrls.add(m[1]);

  const externalUrls = new Set();
  for (const m of all.matchAll(/https?:\/\/[^"'`\s)]+/g)) externalUrls.add(m[0]);

  return {
    storageKeys: [...storageKeys].sort(),
    events: [...events].sort(),
    globals: [...globals].sort(),
    pageAssets,
    internalUrls: [...internalUrls].sort(),
    externalUrls: [...externalUrls].sort(),
  };
}

/* ------------------------------------------------------------------ *
 * jsdom page loader
 * ------------------------------------------------------------------ */
function loadPage(file, query = "", seed = null) {
  const html = fs.readFileSync(path.join(ROOT, file), "utf8");
  const errors = [];
  const vc = new VirtualConsole();
  vc.on("jsdomError", (e) => errors.push(String(e && (e.stack || e.message || e))));
  vc.on("error", (...a) => errors.push("console.error: " + a.join(" ")));

  const dom = new JSDOM(html, {
    url: "http://localhost/" + file + query,
    runScripts: "outside-only",
    pretendToBeVisual: true,
    virtualConsole: vc,
  });
  const w = dom.window;
  w.matchMedia = (q) => ({
    matches: /reduce/.test(q), media: q,
    addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {},
  });
  w.AudioContext = undefined;
  w.webkitAudioContext = undefined;

  // Seed storage BEFORE any page script evaluates: the simulator scripts read
  // geiDamGateV1 at load time, so a later write would be ignored.
  if (typeof seed === "function") seed(w);

  const loadErrors = [];
  for (const m of html.matchAll(/<script src="([^"]+)"[^>]*><\/script>/g)) {
    const rel = m[1];
    const p = path.join(ROOT, rel);
    if (!fs.existsSync(p)) { loadErrors.push(`${rel}: missing on disk`); continue; }
    try { w.eval(fs.readFileSync(p, "utf8")); }
    catch (e) { loadErrors.push(`${rel}: ${e.message}`); }
  }
  w.eval('document.dispatchEvent(new Event("DOMContentLoaded"))');
  return { w, d: w.document, errors, loadErrors, dom };
}

const seedOpenGate = (w) => {
  w.localStorage.setItem("geiDamGateV1", JSON.stringify({ version: "1.63.28", unlocked: true, opened: true, xpConsumed: 666 }));
};

const seedOpenGateWithLevel2 = (w) => {
  seedOpenGate(w);
  w.localStorage.setItem("geiSimulatorLevel2V1", JSON.stringify({ version: "1.63.31", completed: true, bestScore: 270, updatedAt: 123 }));
};

const seedOpenGateWithLevel3 = (w) => {
  seedOpenGateWithLevel2(w);
  w.localStorage.setItem("geiSimulatorLevel3V1", JSON.stringify({ version: "1.63.32", completed: true, bestScore: 330, updatedAt: 123 }));
};

const seedOpenGateWithLevel4 = (w) => {
  seedOpenGateWithLevel3(w);
  w.localStorage.setItem("geiSimulatorLevel4V1", JSON.stringify({ version: "1.63.33", completed: true, bestScore: 360, updatedAt: 123 }));
};

const seedOpenGateWithLevel5 = (w) => {
  seedOpenGateWithLevel4(w);
  w.localStorage.setItem("geiSimulatorLevel5V1", JSON.stringify({ version: "1.63.34", completed: true, bestScore: 390, updatedAt: 123 }));
};

/* ------------------------------------------------------------------ *
 * 1. FROZEN CONTRACT
 * ------------------------------------------------------------------ */
section("1. FROZEN CONTRACT (keys, events, globals, assets, URLs)");
const contract = deriveContract();

if (BLESS) {
  fs.writeFileSync(MANIFEST, JSON.stringify(contract, null, 2) + "\n");
  console.log(`  BLESSED contract -> ${path.relative(ROOT, MANIFEST)}`);
  console.log(`  ${contract.storageKeys.length} storage keys, ${contract.events.length} events, ${contract.globals.length} globals`);
} else if (!fs.existsSync(MANIFEST)) {
  console.log("  no manifest; run with --bless first");
  process.exit(2);
}

if (!BLESS) {
  const base = JSON.parse(fs.readFileSync(MANIFEST, "utf8"));
  const diff = (a, b) => ({ missing: a.filter((x) => !b.includes(x)), added: b.filter((x) => !a.includes(x)) });

  const sk = diff(base.storageKeys, contract.storageKeys);
  check(`localStorage keys unchanged (${base.storageKeys.length})`, !sk.missing.length && !sk.added.length,
    `missing=${sk.missing.join(",")} added=${sk.added.join(",")}`);

  const ev = diff(base.events, contract.events);
  check(`CustomEvent names unchanged (${base.events.length})`, !ev.missing.length && !ev.added.length,
    `missing=${ev.missing.join(",")} added=${ev.added.join(",")}`);

  const gl = diff(base.globals, contract.globals);
  check(`window.GEI_* singletons unchanged (${base.globals.length})`, !gl.missing.length && !gl.added.length,
    `missing=${gl.missing.join(",")} added=${gl.added.join(",")}`);

  const iu = diff(base.internalUrls, contract.internalUrls);
  check(`internal URLs unchanged (${base.internalUrls.length})`, !iu.missing.length,
    `missing=${iu.missing.join(",")}`);

  const xu = diff(base.externalUrls, contract.externalUrls);
  check(`external links/assets preserved (${base.externalUrls.length})`, !xu.missing.length,
    `missing=${xu.missing.join(",")}`);

  for (const page of Object.keys(base.pageAssets)) {
    const before = base.pageAssets[page] || [];
    const after = contract.pageAssets[page] || [];
    const gone = before.filter((a) => !after.includes(a));
    check(`${page}: no page asset removed`, gone.length === 0, `removed=${gone.join(",")}`);
  }

  // Hard-coded protected constants must still be present in source.
  const read = (f) => fs.readFileSync(path.join(ROOT, f), "utf8");
  const progressSrc = read("progress.js");
  check("progress.js MAX_XP = 666", /MAX_XP\s*=\s*666/.test(progressSrc));
  check("v1-49 XP_PER_OBJECTIVE = 37", /XP_PER_OBJECTIVE\s*=\s*37/.test(read("v1-49-day-objective-mastery.js")));
  check("gei-day-page.js THRESHOLD = 90", /THRESHOLD\s*=\s*90/.test(read("gei-day-page.js")));
  check("gei-day-page.js OBJECTIVES_REQUIRED = 3", /OBJECTIVES_REQUIRED\s*=\s*3/.test(read("gei-day-page.js")));
  check("v1-63-28 COST = 666", /COST\s*=\s*666/.test(read("v1-63-28-gei-dam-gate-ceremony.js")));
  check("v1-63-30 Level1 band 62-78", /targetLow\s*:\s*62\s*,\s*targetHigh\s*:\s*78/.test(read("v1-63-30-gei-genesis-game-engine.js")));

  const level2Source = read("v1-63-31-gei-genesis-level-2-engine.js");
  check("Level 2 uses only geiSimulatorLevel2V1 for its result", /geiSimulatorLevel2V1/.test(level2Source) && !/geiSimulatorScoreV1|geiAcademyProgressV1/.test(level2Source));
  check("Level 2 version is 1.63.31", /VERSION\s*=\s*\"1\.63\.31\"/.test(level2Source));
  check("Level 2 objective scores are exactly 60, 90, 120", /survey:\s*60,\s*erect:\s*90,\s*secure:\s*120/.test(level2Source));
  check("Level 2 total is 270", /270 SCORE/.test(level2Source));
  check("Level 2 has no polling or recurring sync", !/setInterval|setTimeout/.test(level2Source));
  check("Level 2 has no Level 3 route", !/level=3|LEVEL 3/i.test(level2Source));

  const level3Source = read("v1-63-32-gei-genesis-level-3-engine.js");
  check("Level 3 uses only geiSimulatorLevel3V1 for its result", /geiSimulatorLevel3V1/.test(level3Source) && !/localStorage\.setItem\(\s*[\"'](?:geiSimulatorScoreV1|geiSimulatorLevel2V1|geiAcademyProgressV1|geiDayCompletionV1|geiDamGateV1)/.test(level3Source));
  check("Level 3 version is 1.63.32", /VERSION\s*=\s*\"1\.63\.32\"/.test(level3Source));
  check("Level 3 objective scores are exactly 70, 110, 150", /contain:\s*70,\s*expose:\s*110,\s*stabilize:\s*150/.test(level3Source));
  check("Level 3 total is 330", /330 SCORE/.test(level3Source));
  check("Level 3 initial state is 64 / 6 / 2", /INITIAL = Object\.freeze\(\{ volume: 64, inflow: 6, outflow: 2 \}\)/.test(level3Source));
  check("Level 3 basin capacity is 78", /BASIN_CAPACITY = 78/.test(level3Source));
  check("Level 3 water and flow steps are 4 and 2", /VOLUME_STEP = 4/.test(level3Source) && /FLOW_STEP = 2/.test(level3Source));
  check("Level 3 has no new globals or CustomEvents", !/window\.GEI_|CustomEvent/.test(level3Source));
  check("Level 3 has no polling, timers or MutationObserver", !/setInterval|setTimeout|MutationObserver/.test(level3Source));
  check("Level 3 has no Level 4 route", !/level=4|LEVEL 4/i.test(level3Source));
}

/* ------------------------------------------------------------------ *
 * 2. INDEX BOOT
 * ------------------------------------------------------------------ */
section("2. index.html boot");
const idx = loadPage("index.html");
for (const g of ["GEI_PROGRESS", "GEI_DAM_GATE", "GEI_DAM_GATE_CEREMONY", "GEI_BADGES", "GEI_IDENTITY", "GEI_MASCOT", "GEI_SONIC_FX", "GEI_ACADEMY_STATE"]) {
  check(`window.${g} present`, Boolean(idx.w[g]));
}
check("no script failed to evaluate", idx.loadErrors.length === 0, idx.loadErrors.join(" | "));
check("6 academy day cards rendered", idx.d.querySelectorAll("#screen-academy .academy-day-card").length === 6,
  `found ${idx.d.querySelectorAll("#screen-academy .academy-day-card").length}`);
check("dam gate section rendered", Boolean(idx.d.getElementById("gei-dam-gate")));
check("5 nav items rendered", idx.d.querySelectorAll("#bottom-navigation [data-nav-id]").length === 5);

/* ------------------------------------------------------------------ *
 * 2b. DYNAMIC CHILD-SCRIPT INJECTION (fixed in V2.0.2)
 * ------------------------------------------------------------------ */
section("2b. Child-script injection");
check("no DOMStringMap SyntaxError anywhere on index.html",
  !idx.errors.some((e) => /not a valid property name/.test(e)),
  idx.errors.filter((e) => /not a valid property name/.test(e)).join(" | "));

const CHILD_SCRIPTS = [
  ["adaptive",           "adam-adaptive.js"],
  ["mastery-milestones", "adam-mastery-milestones.js"],
  ["v132-celebration",   "adam-mastery-celebration.js"],
  ["v134-rewards",       "adam-reward-unlock.js"],
];
for (const [marker, src] of CHILD_SCRIPTS) {
  const el = idx.d.querySelector(`script[data-gei-${marker}]`);
  check(`script[data-gei-${marker}] injected`, Boolean(el), "missing");
  check(`  ... points at ${src}`, el?.getAttribute("src") === src, `src=${el?.getAttribute("src")}`);
}
// adam-context.js is statically linked in index.html, so its guard must skip it.
check("adam-context.js not double-injected", idx.d.querySelectorAll('script[src="adam-context.js"]').length === 1,
  `count=${idx.d.querySelectorAll('script[src="adam-context.js"]').length}`);

for (const [marker, href] of [["v132-celebration", "adam-mastery-celebration.css"], ["v134-rewards", "adam-reward-unlock.css"]]) {
  const el = idx.d.querySelector(`link[data-gei-${marker}]`);
  check(`link[data-gei-${marker}] injected`, Boolean(el), "missing");
  check(`  ... points at ${href}`, el?.getAttribute("href") === href, `href=${el?.getAttribute("href")}`);
}

// The de-duplication guard must still match what loadChildScript now writes.
const dupBefore = idx.d.querySelectorAll("script[data-gei-mastery-milestones]").length;
idx.w.eval('document.dispatchEvent(new Event("DOMContentLoaded"))');
const dupAfter = idx.d.querySelectorAll("script[data-gei-mastery-milestones]").length;
check("de-dupe guard holds on re-init", dupBefore === 1 && dupAfter === 1, `before=${dupBefore} after=${dupAfter}`);

// jsdom does not fetch dynamically-appended scripts, so execute the three restored
// modules by hand to prove they survive real initialisation.
const restoredErrorsBefore = idx.errors.length;
let restoredThrew = null;
for (const [, src] of CHILD_SCRIPTS.slice(1)) {
  try { idx.w.eval(fs.readFileSync(path.join(ROOT, src), "utf8")); }
  catch (e) { restoredThrew = `${src}: ${e.message}`; }
  idx.w.eval('document.dispatchEvent(new Event("DOMContentLoaded"))');
}
check("restored Adam modules evaluate without throwing", restoredThrew === null, restoredThrew || "");
const restoredNewErrors = [...new Set(idx.errors.slice(restoredErrorsBefore))];
check("restored Adam modules add no new runtime error", restoredNewErrors.length === 0, restoredNewErrors.join(" | "));

/* ------------------------------------------------------------------ *
 * 2c. VIDEO LAB REFLECTION / SAVED NOTES (restored in V2.0.9)
 * ------------------------------------------------------------------ */
section("2c. Video Lab intelligence");
const vli = idx.d.querySelector(".gei-video-intelligence");
check(".gei-video-intelligence mounted", Boolean(vli), "section never inserted");
check("  ... sits before .gei-video-connection",
  vli?.nextElementSibling?.classList.contains("gei-video-connection") === true,
  `next=${vli?.nextElementSibling?.className}`);
check("#gei-video-observation textarea present", Boolean(idx.d.querySelector("#gei-video-observation")));
check("#gei-video-question textarea present", Boolean(idx.d.querySelector("#gei-video-question")));
check("#gei-video-save button present", Boolean(idx.d.querySelector("#gei-video-save")));
check("window.GEI_VIDEO_INTELLIGENCE exposed", Boolean(idx.w.GEI_VIDEO_INTELLIGENCE));
check("  ... reports version 1.63.16", idx.w.GEI_VIDEO_INTELLIGENCE?.version === "1.63.16",
  `version=${idx.w.GEI_VIDEO_INTELLIGENCE?.version}`);

// Saved-notes round trip: type -> save -> read straight back out of localStorage.
const obsEl = idx.d.querySelector("#gei-video-observation");
const qEl = idx.d.querySelector("#gei-video-question");
if (obsEl && qEl && idx.d.querySelector("#gei-video-save")) {
  obsEl.value = "Water is separated before land appears.";
  qEl.value = "Where did the water come from?";
  idx.d.querySelector("#gei-video-save").click();
  const stored = JSON.parse(idx.w.localStorage.getItem("geiVideoLabIntelligenceV1") || "{}");
  const rec = stored["8mYq2A_fgTA"] || {};
  check("notes persist to geiVideoLabIntelligenceV1",
    rec.observations === "Water is separated before land appears." && rec.questions === "Where did the water come from?",
    JSON.stringify(rec));
  check("  ... timestamped on save", typeof rec.updatedAt === "string" && rec.updatedAt.length > 0,
    `updatedAt=${rec.updatedAt}`);
  check("save button reports NOTES SAVED",
    vli?.querySelector(".gei-video-save-status")?.textContent === "NOTES SAVED",
    `status=${vli?.querySelector(".gei-video-save-status")?.textContent}`);
  // Re-init must restore the saved text into the fields, not blank them.
  idx.w.GEI_VIDEO_INTELLIGENCE.getState();
  check("GEI_VIDEO_INTELLIGENCE.getState() reads the saved notes back",
    idx.w.GEI_VIDEO_INTELLIGENCE.getState().observations === "Water is separated before land appears.",
    JSON.stringify(idx.w.GEI_VIDEO_INTELLIGENCE.getState()));
}

/* ------------------------------------------------------------------ *
 * 3. DAY UNLOCK CHAIN
 * ------------------------------------------------------------------ */
section("3. Day 1 -> Day 6 unlock chain");
const st0 = idx.w.GEI_PROGRESS.getState();
check("starts at 0 XP", st0.xp === 0, `xp=${st0.xp}`);
check("starts with 0 days complete", st0.completed.length === 0, JSON.stringify(st0.completed));
check("Day 1 unlocked from empty state", idx.d.querySelector('.academy-day-card[data-day="1"]').getAttribute("aria-disabled") === "false");
check("Day 2 locked before Day 1", idx.d.querySelector('.academy-day-card[data-day="2"]').getAttribute("aria-disabled") === "true");

/* ------------------------------------------------------------------ *
 * 4. XP: 18 objectives x 37 = 666, capped
 * ------------------------------------------------------------------ */
section("4. XP engine");
let awarded = 0;
for (let d = 1; d <= 6; d += 1) {
  for (let i = 0; i < 3; i += 1) {
    if (idx.w.GEI_PROGRESS.addXP(37, "objective-mastery")) awarded += 1;
  }
}
check("18 objective awards succeeded", awarded === 18, `awarded=${awarded}`);
check("XP total is exactly 666", idx.w.GEI_PROGRESS.getState().xp === 666, `xp=${idx.w.GEI_PROGRESS.getState().xp}`);
check("addXP refuses beyond 666 cap", idx.w.GEI_PROGRESS.addXP(37, "overflow") === false);
check("XP still 666 after overflow attempt", idx.w.GEI_PROGRESS.getState().xp === 666);

/* ------------------------------------------------------------------ *
 * 5. DAM GATE
 * ------------------------------------------------------------------ */
section("5. Dam Gate eligibility + ceremony");
function markDay(w, d) {
  const c = JSON.parse(w.localStorage.getItem("geiDayCompletionV1") || "{}");
  c[d] = { completed: true, completedAt: new Date().toISOString(), audioPercent: 100 };
  w.localStorage.setItem("geiDayCompletionV1", JSON.stringify(c));
  const m = JSON.parse(w.localStorage.getItem("geiAdamObjectiveMasteryV1") || "{}");
  m.mastered = [...new Set([...(m.mastered || []), ...[0, 1, 2].map((i) => `${d}-${i}`)])];
  w.localStorage.setItem("geiAdamObjectiveMasteryV1", JSON.stringify(m));
}
for (let d = 1; d <= 6; d += 1) markDay(idx.w, d);
// blueprint-master needs 6 days AND xp>=666 to hold at the same moment. Sync here,
// while both are true -- opening the gate consumes the 666 XP and the badge can never
// be earned again afterwards. That ordering is shipped V1.63 behaviour, preserved as-is.
idx.w.GEI_BADGES.sync();
const badgeSnapshotAtGate = idx.w.GEI_BADGES.getState().earned.slice();
idx.w.GEI_DAM_GATE.sync();
const gate = idx.w.GEI_DAM_GATE.getState();
check("6/6 days recognised", gate.completedCount === 6, `days=${gate.completedCount}`);
check("gate eligible at 6 days + 666 XP", gate.eligible === true);
check("gate auto-unlocked", gate.unlocked === true);
const wrap = idx.d.getElementById("gei-dam-gate-action-wrap");
check("OPEN THE DAM revealed after unlock", Boolean(wrap) && wrap.hidden === false);
check("OPEN THE DAM enabled", idx.d.getElementById("gei-dam-gate-open").disabled === false);

idx.d.getElementById("gei-dam-gate-open").click();
check("ceremony dialog opens", Boolean(idx.d.getElementById("gei-gate-ceremony")));
check("ceremony states 666 XP cost", /666\s*XP/.test(idx.d.getElementById("gei-gate-ceremony").textContent));

const ledgerBefore = idx.w.localStorage.getItem("geiDayCompletionV1");
const masteryBefore = idx.w.localStorage.getItem("geiAdamObjectiveMasteryV1");
idx.d.getElementById("gei-gate-open-confirm").click();

check("666 XP consumed", idx.w.GEI_PROGRESS.getState().xp === 0, `xp=${idx.w.GEI_PROGRESS.getState().xp}`);
const dg = JSON.parse(idx.w.localStorage.getItem("geiDamGateV1") || "{}");
check("geiDamGateV1.opened === true", dg.opened === true);
check("geiDamGateV1.xpConsumed === 666", dg.xpConsumed === 666, `xpConsumed=${dg.xpConsumed}`);
check("six-day completion ledger preserved", idx.w.localStorage.getItem("geiDayCompletionV1") === ledgerBefore);
check("objective mastery preserved", idx.w.localStorage.getItem("geiAdamObjectiveMasteryV1") === masteryBefore);
check("success panel shown", Boolean(idx.d.getElementById("gei-gate-success")));
check("ENTER THE SIMULATOR WALL present", Boolean(idx.d.getElementById("gei-gate-simulator-link")));
check("ceremony is one-time (isOpened)", idx.w.GEI_DAM_GATE_CEREMONY.isOpened() === true);

/* ------------------------------------------------------------------ *
 * 6. BADGES
 * ------------------------------------------------------------------ */
section("6. Badge engine");
const badges = idx.w.GEI_BADGES.getBadges();
check("12 badge definitions", badges.length === 12, `count=${badges.length}`);
const ids = badges.map((b) => b.id);
check("6 mastery badges", ["day-1", "day-2", "day-3", "day-4", "day-5", "day-6"].every((x) => ids.includes(x)));
check("3 streak badges", ["streak-2", "streak-3", "streak-5"].every((x) => ids.includes(x)));
check("3 achievement badges", ["first-spark", "six-day-flow", "blueprint-master"].every((x) => ids.includes(x)));
const earned = idx.w.GEI_BADGES.getState().earned;
check("day badges earned after 6-day completion", ["day-1", "day-2", "day-3", "day-4", "day-5", "day-6"].every((x) => earned.includes(x)),
  `earned=${earned.join(",")}`);
check("first-spark earned (mastery >= 1)", earned.includes("first-spark"));
check("six-day-flow earned", earned.includes("six-day-flow"));
check("blueprint-master earned while 6 days + 666 XP coexist", badgeSnapshotAtGate.includes("blueprint-master"),
  `earned=${badgeSnapshotAtGate.join(",")}`);
check("badge earnings survive the 666 XP consumption", ["six-day-flow", "blueprint-master"].every((x) => earned.includes(x)),
  `afterGate=${earned.join(",")}`);
check("streak-5 NOT earned without a real streak", !earned.includes("streak-5"));
check("badge state persisted to geiBadgeStateV1", Boolean(idx.w.localStorage.getItem("geiBadgeStateV1")));

/* ------------------------------------------------------------------ *
 * 7. LEARNER IDENTITY
 * ------------------------------------------------------------------ */
section("7. Learner identity (Dam Name + avatar)");
check("GEI_IDENTITY.getDamName available", typeof idx.w.GEI_IDENTITY.getDamName === "function");
check("7 avatars available", Object.keys(idx.w.GEI_IDENTITY.avatars).length === 7,
  `count=${Object.keys(idx.w.GEI_IDENTITY.avatars).length}`);
check("default avatar is adam", idx.w.GEI_IDENTITY.getAvatar() === "adam");
check("rejects 2-char dam name", idx.w.GEI_IDENTITY.setDamName("ab") === false || !/^[A-Za-z0-9_-]{3,20}$/.test("ab"));
check("accepts valid dam name", (idx.w.GEI_IDENTITY.setDamName("WaterArchitect"), idx.w.GEI_IDENTITY.getDamName() === "WaterArchitect"),
  `got=${idx.w.GEI_IDENTITY.getDamName()}`);
check("identity persisted to geiDamNameIdentityV1", /WaterArchitect/.test(idx.w.localStorage.getItem("geiDamNameIdentityV1") || ""));

/* ------------------------------------------------------------------ *
 * 8. DAY PAGE COMPLETION GATE
 * ------------------------------------------------------------------ */
section("8. Day page: audio >=90% AND 3 objectives");
const day1 = loadPage("day-1.html");
check("day-1 scripts evaluated", day1.loadErrors.length === 0, day1.loadErrors.join(" | "));
check("objective mastery root rendered", Boolean(day1.d.querySelector(".v1-49-day-objective-mastery")));
check("complete button starts disabled", day1.d.getElementById("day-complete").disabled === true);
check("status explains audio requirement", /at least 90%/.test(day1.d.getElementById("completion-status").textContent));

// audio to 95%, no mastery yet
day1.w.localStorage.setItem("geiDayAudioProgressV1", JSON.stringify({ 1: 95 }));
day1.w.dispatchEvent(new day1.w.CustomEvent("gei:objective-mastery-updated", { detail: { day: 1 } }));
check("still disabled with audio but 0/3 objectives", day1.d.getElementById("day-complete").disabled === true);
check("status names the objective requirement", /OBJECTIVE MASTERY: 0\/3/.test(day1.d.getElementById("completion-status").textContent));

// audio 80%, all 3 objectives -> must stay locked
day1.w.localStorage.setItem("geiDayAudioProgressV1", JSON.stringify({ 1: 80 }));
day1.w.localStorage.setItem("geiAdamObjectiveMasteryV1", JSON.stringify({ mastered: ["1-0", "1-1", "1-2"] }));
day1.w.dispatchEvent(new day1.w.CustomEvent("gei:objective-mastery-updated", { detail: { day: 1 } }));
check("still disabled at 80% audio with 3/3 objectives", day1.d.getElementById("day-complete").disabled === true);

// audio 95% + 3/3 -> unlocks
day1.w.localStorage.setItem("geiDayAudioProgressV1", JSON.stringify({ 1: 95 }));
day1.w.dispatchEvent(new day1.w.CustomEvent("gei:objective-mastery-updated", { detail: { day: 1 } }));
check("unlocks at 95% audio + 3/3 objectives", day1.d.getElementById("day-complete").disabled === false);
check("status reports +111 XP", /\+111 XP/.test(day1.d.getElementById("completion-status").textContent));

day1.d.getElementById("day-complete").click();
const comp1 = JSON.parse(day1.w.localStorage.getItem("geiDayCompletionV1") || "{}");
check("completion written to geiDayCompletionV1", comp1?.[1]?.completed === true);
check("completion records audioPercent", Number(comp1?.[1]?.audioPercent) === 95, `audioPercent=${comp1?.[1]?.audioPercent}`);
check("button becomes COMPLETE and disabled", day1.d.getElementById("day-complete").disabled === true);

// objective XP idempotency via ledger
// reconcileObjectiveXP() runs only at init, so mastery must already be in storage
// when day-2.html evaluates.
const day2 = loadPage("day-2.html", "", (w) => {
  w.localStorage.setItem("geiAdamObjectiveMasteryV1", JSON.stringify({ mastered: ["2-0"] }));
});
const xpAfter = JSON.parse(day2.w.localStorage.getItem("geiAcademyProgressV1") || "{}").xp || 0;
const xpBefore = 0;
check("reconcile awards 37 XP for a newly mastered objective", xpAfter - xpBefore === 37, `delta=${xpAfter - xpBefore}`);
const ledger = JSON.parse(day2.w.localStorage.getItem("geiObjectiveXPRewardsV1") || "{}");
check("XP ledger records the award", ledger["2-0"]?.amount === 37);

/* ------------------------------------------------------------------ *
 * 9. SIMULATOR WALL GATE
 * ------------------------------------------------------------------ */
section("9. Simulator Wall gating");
const wallLocked = loadPage("simulator.html");
check("wall scripts evaluated", wallLocked.loadErrors.length === 0, wallLocked.loadErrors.join(" | "));
check("locked panel visible when gate closed", wallLocked.d.getElementById("gei-simulator-locked").hidden === false);
check("ENTER LEVEL 1 disabled when gate closed", wallLocked.d.getElementById("gei-simulator-enter").disabled === true);
check("gate state reads GATE LOCKED", wallLocked.d.getElementById("sim-gate-state").textContent === "GATE LOCKED");
check("6 hydraulic stages listed", wallLocked.d.querySelectorAll(".gei-simulator-stage").length === 6);

const wallOpen = loadPage("simulator.html", "", seedOpenGate);
check("locked panel hidden when gate open", wallOpen.d.getElementById("gei-simulator-locked").hidden === true);
check("ENTER LEVEL 1 enabled when gate open", wallOpen.d.getElementById("gei-simulator-enter").disabled === false);
check("gate state reads GATE OPEN", wallOpen.d.getElementById("sim-gate-state").textContent === "GATE OPEN");
check("incomplete Level 2 keeps ENTER LEVEL 3 hidden", !wallOpen.d.getElementById("gei-level3-entry"));

const wallAfterLevel2 = loadPage("simulator.html", "", seedOpenGateWithLevel2);
check("completed Level 2 exposes ENTER LEVEL 3", wallAfterLevel2.d.getElementById("gei-level3-entry")?.textContent === "ENTER LEVEL 3");
check("ENTER LEVEL 3 target is simulator.html?level=3", wallAfterLevel2.d.getElementById("gei-level3-entry")?.getAttribute("href") === "simulator.html?level=3");
check("incomplete Level 3 keeps ENTER LEVEL 4 hidden", !wallAfterLevel2.d.getElementById("gei-level4-entry") && !wallAfterLevel2.d.querySelector('[href*="level=4"]'));

/* ------------------------------------------------------------------ *
 * 10. LEVEL 1 GAMEPLAY
 * ------------------------------------------------------------------ */
section("10. Level 1 — Water & Light");
const game = loadPage("simulator.html", "?level=1", seedOpenGate);
check("game engine rendered", Boolean(game.d.getElementById("gei-game")));
const G = (id) => game.d.getElementById(id);
check("pressure starts at 0%", G("game-pressure-value").textContent === "0%");
check("score starts at 0", G("game-score").textContent === "0");
check("objectives start 0 / 3", G("game-objective-count").textContent === "0 / 3");

G("game-more").click();
check("+ INCREASE steps pressure by 8", G("game-pressure-value").textContent === "8%", G("game-pressure-value").textContent);
for (let i = 0; i < 7; i += 1) G("game-more").click();
check("8 presses reach 64% (inside 62-78 band)", G("game-pressure-value").textContent === "64%", G("game-pressure-value").textContent);
check("target zone marked is-hit inside band", G("game-target").classList.contains("is-hit"));

game.d.querySelector('[data-action="observe"]').click();
check("objective 1 OBSERVE awards +50", G("game-score").textContent === "50", G("game-score").textContent);
game.d.querySelector('[data-action="separate"]').click();
check("objective 2 SEPARATE awards +75 (total 125)", G("game-score").textContent === "125", G("game-score").textContent);
game.d.querySelector('[data-action="release"]').click();
check("objective 3 RELEASE awards +100 (total 225)", G("game-score").textContent === "225", G("game-score").textContent);
check("objective counter 3 / 3", G("game-objective-count").textContent === "3 / 3");
check("LEVEL 1 COMPLETE panel shown", G("game-complete").hidden === false);
check("final score rendered", /225 SCORE/.test(G("game-final-score").textContent), G("game-final-score").textContent);

const saved = JSON.parse(game.w.localStorage.getItem("geiSimulatorScoreV1") || "{}");
check("score persisted to geiSimulatorScoreV1", saved.score === 225, `score=${saved.score}`);
check("score version stamped 1.63.30", saved.version === "1.63.30", `version=${saved.version}`);
check("simulator score is separate from Academy XP", !("xp" in saved));
check("Academy XP untouched by gameplay", (JSON.parse(game.w.localStorage.getItem("geiAcademyProgressV1") || "{}").xp || 0) === 0);

// band enforcement: reduce below the band and confirm SEPARATE refuses
const game2 = loadPage("simulator.html", "?level=1", seedOpenGate);
const G2 = (id) => game2.d.getElementById(id);
for (let i = 0; i < 7; i += 1) G2("game-more").click();   // 56% — below band
game2.d.querySelector('[data-action="separate"]').click();
check("SEPARATE refuses at 56% (below 62)", G2("game-score").textContent === "0", G2("game-score").textContent);
check("message asks for 62-78%", /62/.test(G2("game-message").textContent), G2("game-message").textContent);
G2("game-more").click();                                    // 64% — in band
game2.d.querySelector('[data-action="separate"]').click();
check("SEPARATE succeeds at 64%", G2("game-score").textContent === "75", G2("game-score").textContent);

// Navigation targets: jsdom cannot navigate, so the attempted URL surfaces as a jsdomError.
// jsdom cannot navigate and refuses to stub the unforgeable location.href, so navigation
// is verified two ways: the click provably attempts a navigation, and the shipped handler's
// own source carries the expected URL.
function navTarget(file, query, clickId) {
  const p = loadPage(file, query, seedOpenGate);
  const el = p.d.getElementById(clickId);
  if (!el) return { attempted: false, handler: "(element missing)" };
  const before = p.errors.length;
  el.click();
  const attempted = p.errors.slice(before).some((e) => /Not implemented: navigation/.test(e));
  return { attempted, handler: String(el.onclick || el.getAttribute("onclick") || "") };
}

const nextNav = navTarget("simulator.html", "?level=1", "game-next");
check("NEXT LEVEL handler targets simulator.html?level=2", /simulator\.html\?level=2/.test(nextNav.handler), nextNav.handler.slice(0, 110));
check("NEXT LEVEL actually attempts navigation", nextNav.attempted);

const enterNav = navTarget("simulator.html", "", "gei-simulator-enter");
check("ENTER LEVEL 1 handler targets simulator.html?level=1", /simulator\.html\?level=1/.test(enterNav.handler), enterNav.handler.slice(0, 110));
check("ENTER LEVEL 1 actually attempts navigation", enterNav.attempted);
check("ENTER LEVEL 1 also fires gei:simulator-level-requested", /gei:simulator-level-requested/.test(enterNav.handler));

const academyNav = navTarget("simulator.html", "", "gei-simulator-academy");
check("Simulator ACADEMY button targets index.html#academy", /index\.html#academy/.test(academyNav.handler), academyNav.handler.slice(0, 110));

// Day page next/prev links are plain anchors -- assert hrefs directly.
for (const [file, expected] of [["day-1.html", "day-2.html"], ["day-2.html", "day-3.html"], ["day-3.html", "day-4.html"], ["day-4.html", "day-5.html"], ["day-5.html", "day-6.html"]]) {
  const html = fs.readFileSync(path.join(ROOT, file), "utf8");
  check(`${file} forward link -> ${expected}`, html.includes(`class="next" href="${expected}"`));
}
check("day-6.html returns to Academy", fs.readFileSync(path.join(ROOT, "day-6.html"), "utf8").includes('index.html#academy'));
for (let d = 1; d <= 6; d += 1) {
  check(`day-${d}.html has an Academy back link`, fs.readFileSync(path.join(ROOT, `day-${d}.html`), "utf8").includes('index.html#academy'));
}

/* ------------------------------------------------------------------ *
 * 10b. LEVEL 2 — FIRMAMENT / DAM WALL
 * ------------------------------------------------------------------ */
section("10b. Level 2 — Firmament / Dam Wall");
const level2Locked = loadPage("simulator.html", "?level=2");
check("Level 2 guard leaves the Wall intact when gate is closed", !level2Locked.d.getElementById("gei-level2"));
check("Level 2 closed-gate scripts evaluate", level2Locked.loadErrors.length === 0, level2Locked.loadErrors.join(" | "));

const level2 = loadPage("simulator.html", "?level=2", seedOpenGate);
const L2 = (id) => level2.d.getElementById(id);
check("Level 2 engine renders only for ?level=2", Boolean(L2("gei-level2")) && !L2("gei-game"));
check("Level 2 scripts evaluate without errors", level2.loadErrors.length === 0, level2.loadErrors.join(" | "));
check("Level 2 starts at 0% elevation, 24% pressure, 100% integrity",
  L2("gei-level2-elevation")?.textContent === "0%" &&
  L2("gei-level2-pressure")?.textContent === "24%" &&
  L2("gei-level2-integrity")?.textContent === "100%");
check("Level 2 starts at score 0", L2("gei-level2-score")?.textContent === "0");
check("Level 2 does not persist state before successful completion", level2.w.localStorage.getItem("geiSimulatorLevel2V1") === null);
check("Level 2 status is aria-live polite", L2("gei-level2-status")?.getAttribute("aria-live") === "polite");
check("Level 2 exposes exactly three objectives", level2.d.querySelectorAll("[data-objective]").length === 3);
check("Level 2 has no Level 3 link", !level2.d.querySelector('[href*="level=3"]'));

const sensor = (index) => level2.d.querySelector(`[data-sensor-index="${index}"]`);
const brace = (index) => level2.d.querySelector(`[data-brace-index="${index}"]`);
sensor(1).click();
check("SURVEY rejects out-of-order SEAM sample", L2("gei-level2-score")?.textContent === "0" && /UPSTREAM NEXT/.test(L2("gei-level2-status")?.textContent || ""));
sensor(0).click();
sensor(1).click();
sensor(2).click();
check("SURVEY ordered UPSTREAM → SEAM → DOWNSTREAM awards +60", L2("gei-level2-score")?.textContent === "60");
check("SURVEY completion unlocks wall actuators", L2("gei-level2-raise")?.disabled === false);

for (let i = 0; i < 7; i += 1) L2("gei-level2-raise").click();
check("ERECT controls reach 70% elevation", L2("gei-level2-elevation")?.textContent === "70%");
check("ERECT controls reach 66% pressure", L2("gei-level2-pressure")?.textContent === "66%");
L2("gei-level2-confirm-height").click();
check("ERECT safe confirmation awards +90", L2("gei-level2-score")?.textContent === "150");
check("ERECT completion is marked complete", level2.d.querySelector('[data-objective="erect"] [data-objective-status]')?.textContent === "COMPLETE");

brace(0).click();
brace(1).click();
brace(2).click();
check("SECURE requires and engages all three braces", level2.d.querySelectorAll("[data-brace-index].is-engaged").length === 3);
L2("gei-level2-lock").click();
check("SECURE lock awards +120 for exactly 270 total", L2("gei-level2-score")?.textContent === "270");
check("Level 2 completion panel appears", L2("gei-level2-complete")?.hidden === false);
check("completion action says RETURN TO SIMULATOR WALL", L2("gei-level2-return")?.textContent === "RETURN TO SIMULATOR WALL");
const level2Saved = JSON.parse(level2.w.localStorage.getItem("geiSimulatorLevel2V1") || "{}");
check("Level 2 completion persists its result schema", level2Saved.version === "1.63.31" && level2Saved.completed === true && level2Saved.bestScore === 270 && Number.isFinite(level2Saved.updatedAt));
check("Level 2 result has exactly version/completed/bestScore/updatedAt", JSON.stringify(Object.keys(level2Saved).sort()) === JSON.stringify(["bestScore", "completed", "updatedAt", "version"]));
check("Level 2 does not write Level 1 score or Academy XP", !level2.w.localStorage.getItem("geiSimulatorScoreV1") && !level2.w.localStorage.getItem("geiAcademyProgressV1"));
check("Level 2 runtime has no errors", level2.errors.length === 0, level2.errors.join(" | "));

const level2Breach = loadPage("simulator.html", "?level=2", seedOpenGate);
const B2 = (id) => level2Breach.d.getElementById(id);
for (const i of [0, 1, 2]) level2Breach.d.querySelector(`[data-sensor-index="${i}"]`).click();
for (let i = 0; i < 11; i += 1) B2("gei-level2-raise").click();
check("breach threshold resets elevation to 0%", B2("gei-level2-elevation")?.textContent === "0%");
check("breach threshold resets pressure to 24%", B2("gei-level2-pressure")?.textContent === "24%");
check("breach threshold restores integrity to 100%", B2("gei-level2-integrity")?.textContent === "100%");
check("breach preserves SURVEY score and completion", B2("gei-level2-score")?.textContent === "60" && level2Breach.d.querySelector('[data-objective="survey"] [data-objective-status]')?.textContent === "COMPLETE");
check("breach reopens ERECT with explicit recovery status", level2Breach.d.querySelector('[data-objective="erect"] [data-objective-status]')?.textContent === "CURRENT" && /BREACH RECOVERY/.test(B2("gei-level2-footer-state")?.textContent || ""));

const level2Best = loadPage("simulator.html", "?level=2", (w) => {
  seedOpenGate(w);
  w.localStorage.setItem("geiSimulatorLevel2V1", JSON.stringify({ version: "1.63.31", completed: true, bestScore: 999, updatedAt: 123 }));
});
const LB = (id) => level2Best.d.getElementById(id);
check("Level 2 displays the previous best score", LB("gei-level2-best")?.textContent === "999");
for (const i of [0, 1, 2]) level2Best.d.querySelector(`[data-sensor-index="${i}"]`).click();
for (let i = 0; i < 7; i += 1) LB("gei-level2-raise").click();
LB("gei-level2-confirm-height").click();
for (const i of [0, 1, 2]) level2Best.d.querySelector(`[data-brace-index="${i}"]`).click();
LB("gei-level2-lock").click();
check("Level 2 persists maximum previous/current score", JSON.parse(level2Best.w.localStorage.getItem("geiSimulatorLevel2V1") || "{}").bestScore === 999);

/* Independent Level 1 verification after all Level 2 interactions. */
const level1AfterLevel2 = loadPage("simulator.html", "?level=1", seedOpenGate);
check("independent post-Level-2 boot still renders Level 1", Boolean(level1AfterLevel2.d.getElementById("gei-game")) && !level1AfterLevel2.d.getElementById("gei-level2"));
check("independent post-Level-2 Level 1 starts at 0%", level1AfterLevel2.d.getElementById("game-pressure-value")?.textContent === "0%");
level1AfterLevel2.d.getElementById("game-more")?.click();
check("independent post-Level-2 Level 1 still responds at +8%", level1AfterLevel2.d.getElementById("game-pressure-value")?.textContent === "8%");
check("independent post-Level-2 Level 1 scripts evaluate", level1AfterLevel2.loadErrors.length === 0, level1AfterLevel2.loadErrors.join(" | "));

/* ------------------------------------------------------------------ *
 * 10c. LEVEL 3 — RESERVOIR / DRY LAND
 * ------------------------------------------------------------------ */
section("10c. Level 3 — Reservoir / Dry Land");
const level3Locked = loadPage("simulator.html", "?level=3");
check("Level 3 gate guard leaves the Wall intact when gate is closed", !level3Locked.d.getElementById("gei-level3") && Boolean(level3Locked.d.getElementById("gei-simulator-wall")));
check("Level 3 closed-gate scripts evaluate", level3Locked.loadErrors.length === 0, level3Locked.loadErrors.join(" | "));
check("Level 3 does not write state while blocked", level3Locked.w.localStorage.getItem("geiSimulatorLevel3V1") === null);

const level3 = loadPage("simulator.html", "?level=3", seedOpenGate);
const L3 = (id) => level3.d.getElementById(id);
check("Level 3 engine renders only for ?level=3", Boolean(L3("gei-level3")) && !L3("gei-game") && !L3("gei-level2"));
check("Level 3 scripts evaluate without errors", level3.loadErrors.length === 0, level3.loadErrors.join(" | "));
check("Level 3 starts at 64% volume and 36% dry land", L3("gei-level3-volume")?.textContent === "64%" && L3("gei-level3-land")?.textContent === "36%");
check("Level 3 starts at inflow 6 and outflow 2", L3("gei-level3-flow-detail")?.textContent === "INFLOW 6 / OUTFLOW 2");
check("Level 3 starts with +4 unit flow imbalance", L3("gei-level3-balance")?.textContent === "+4 UNITS");
check("Level 3 basin capacity starts unmapped", L3("gei-level3-reserve")?.textContent === "—");
check("Level 3 status is aria-live polite", L3("gei-level3-status")?.getAttribute("aria-live") === "polite");
check("Level 3 exposes exactly three objectives", level3.d.querySelectorAll("[data-objective]").length === 3);
check("Level 3 has no Level 4 link", !level3.d.querySelector('[href*="level=4"]'));

level3.d.querySelector('[data-basin-marker="outside"]').click();
check("incorrect basin marker gives guidance without penalty", L3("gei-level3-score")?.textContent === "0" && /NO PENALTY/.test(L3("gei-level3-status")?.textContent || ""));
for (const marker of ["south", "east", "north"]) level3.d.querySelector(`[data-basin-marker="${marker}"]`).click();
check("CONTAIN accepts the three correct markers in any order", L3("gei-level3-score")?.textContent === "70" && level3.d.querySelector('[data-objective="contain"] [data-objective-status]')?.textContent === "COMPLETE");
check("CONTAIN maps basin capacity to exactly 78%", L3("gei-level3-reserve")?.textContent === "14%");
check("CONTAIN unlocks waterline controls", L3("gei-level3-lower")?.disabled === false && L3("gei-level3-waterline-input")?.disabled === false);

L3("gei-level3-lower").click();
check("waterline adjustment changes volume by exactly 4", L3("gei-level3-volume")?.textContent === "60%" && L3("gei-level3-land")?.textContent === "40%");
L3("gei-level3-confirm-exposure").click();
check("invalid EXPOSE confirmation awards nothing", L3("gei-level3-score")?.textContent === "70" && /DRY LINE DENIED/.test(L3("gei-level3-status")?.textContent || ""));
for (let i = 0; i < 3; i += 1) L3("gei-level3-lower").click();
check("safe reservoir range is exactly 40–48%", L3("gei-level3-volume")?.textContent === "48%");
check("safe dry-land range is exactly 52–60%", L3("gei-level3-land")?.textContent === "52%");
check("safe containment reserve reaches exactly 30%", L3("gei-level3-reserve")?.textContent === "30%");
L3("gei-level3-confirm-exposure").click();
check("EXPOSE awards exactly 110", L3("gei-level3-score")?.textContent === "180");
check("EXPOSE unlocks flow controls", L3("gei-level3-inflow-up")?.disabled === false);
L3("gei-level3-stabilize").click();
check("invalid STABILIZE awards nothing", L3("gei-level3-score")?.textContent === "180" && /STABILIZATION DENIED/.test(L3("gei-level3-status")?.textContent || ""));
L3("gei-level3-inflow-up").click();
check("inflow control changes by exactly 2", L3("gei-level3-flow-detail")?.textContent === "INFLOW 8 / OUTFLOW 2");
L3("gei-level3-inflow-down").click();
L3("gei-level3-outflow-up").click();
L3("gei-level3-outflow-up").click();
check("flow controls reach exact inflow/outflow equality", L3("gei-level3-flow-detail")?.textContent === "INFLOW 6 / OUTFLOW 6" && L3("gei-level3-balance")?.textContent === "0 UNITS");
L3("gei-level3-stabilize").click();
check("STABILIZE awards exactly 150 for a 330 total", L3("gei-level3-score")?.textContent === "330");
check("Level 3 completion panel appears at exactly 330", L3("gei-level3-complete")?.hidden === false && L3("gei-level3-final-score")?.textContent === "330 SCORE");
check("Level 3 completion action returns to Simulator Wall", L3("gei-level3-return")?.textContent === "RETURN TO SIMULATOR WALL");
const level3Saved = JSON.parse(level3.w.localStorage.getItem("geiSimulatorLevel3V1") || "{}");
check("Level 3 persists only after Objective 3", level3Saved.version === "1.63.32" && level3Saved.completed === true && level3Saved.bestScore === 330 && Number.isFinite(level3Saved.updatedAt));
check("Level 3 result has exactly version/completed/bestScore/updatedAt", JSON.stringify(Object.keys(level3Saved).sort()) === JSON.stringify(["bestScore", "completed", "updatedAt", "version"]));
check("Level 3 does not write Level 1 score or Academy XP", !level3.w.localStorage.getItem("geiSimulatorScoreV1") && !level3.w.localStorage.getItem("geiAcademyProgressV1"));
check("Level 3 creates no new global", !level3.w.GEI_LEVEL3 && !level3.w.GEI_SIMULATOR_LEVEL3);
check("Level 3 runtime has no errors", level3.errors.length === 0, level3.errors.join(" | "));

const level3Overflow = loadPage("simulator.html", "?level=3", seedOpenGate);
const O3 = (id) => level3Overflow.d.getElementById(id);
for (const marker of ["north", "east", "south"]) level3Overflow.d.querySelector(`[data-basin-marker="${marker}"]`).click();
const overflowInput = O3("gei-level3-waterline-input");
overflowInput.value = "80";
overflowInput.dispatchEvent(new level3Overflow.w.Event("input", { bubbles: true }));
check("overflow triggers when volume exceeds capacity", O3("gei-level3-volume")?.textContent === "56%" && /OVERFLOW/.test(O3("gei-level3-status")?.textContent || ""));
check("overflow recovery resets volume to exactly 56%", O3("gei-level3-volume")?.textContent === "56%");
check("overflow recovery resets inflow and outflow", O3("gei-level3-flow-detail")?.textContent === "INFLOW 6 / OUTFLOW 2");
check("overflow resets Objectives 2 and 3", level3Overflow.d.querySelector('[data-objective="expose"] [data-objective-status]')?.textContent === "CURRENT" && level3Overflow.d.querySelector('[data-objective="stabilize"] [data-objective-status]')?.textContent === "LOCKED");
check("overflow preserves Objective 1 and its +70 score", O3("gei-level3-score")?.textContent === "70" && level3Overflow.d.querySelector('[data-objective="contain"] [data-objective-status]')?.textContent === "COMPLETE");
check("overflow does not persist an incomplete run", level3Overflow.w.localStorage.getItem("geiSimulatorLevel3V1") === null);

const level3Best = loadPage("simulator.html", "?level=3", (w) => {
  seedOpenGate(w);
  w.localStorage.setItem("geiSimulatorLevel3V1", JSON.stringify({ version: "1.63.32", completed: true, bestScore: 999, updatedAt: 123 }));
});
const B3 = (id) => level3Best.d.getElementById(id);
for (const marker of ["north", "east", "south"]) level3Best.d.querySelector(`[data-basin-marker="${marker}"]`).click();
for (let i = 0; i < 4; i += 1) B3("gei-level3-lower").click();
B3("gei-level3-confirm-exposure").click();
B3("gei-level3-outflow-up").click();
B3("gei-level3-outflow-up").click();
B3("gei-level3-stabilize").click();
check("Level 3 bestScore uses maximum previous/current score", JSON.parse(level3Best.w.localStorage.getItem("geiSimulatorLevel3V1") || "{}").bestScore === 999);
B3("gei-level3-reset").click();
const level3AfterReset = JSON.parse(level3Best.w.localStorage.getItem("geiSimulatorLevel3V1") || "{}");
check("Level 3 reset clears transient score but preserves persisted best", B3("gei-level3-score")?.textContent === "0" && level3AfterReset.completed === true && level3AfterReset.bestScore === 999);

const level3Isolation = loadPage("simulator.html", "?level=3", (w) => {
  seedOpenGate(w);
  w.localStorage.setItem("geiSimulatorScoreV1", JSON.stringify({ version: "1.63.30", score: 225, updatedAt: 11 }));
  w.localStorage.setItem("geiSimulatorLevel2V1", JSON.stringify({ version: "1.63.31", completed: true, bestScore: 270, updatedAt: 12 }));
  w.localStorage.setItem("geiAcademyProgressV1", JSON.stringify({ completed: [1, 2, 3], xp: 333 }));
  w.localStorage.setItem("geiDayCompletionV1", JSON.stringify({ 1: { completed: true } }));
});
const protectedStateBefore = Object.fromEntries(["geiSimulatorScoreV1", "geiSimulatorLevel2V1", "geiAcademyProgressV1", "geiDayCompletionV1", "geiDamGateV1"].map((key) => [key, level3Isolation.w.localStorage.getItem(key)]));
const I3 = (id) => level3Isolation.d.getElementById(id);
for (const marker of ["north", "east", "south"]) level3Isolation.d.querySelector(`[data-basin-marker="${marker}"]`).click();
for (let i = 0; i < 4; i += 1) I3("gei-level3-lower").click();
I3("gei-level3-confirm-exposure").click();
I3("gei-level3-outflow-up").click();
I3("gei-level3-outflow-up").click();
I3("gei-level3-stabilize").click();
const protectedStateAfter = Object.fromEntries(Object.keys(protectedStateBefore).map((key) => [key, level3Isolation.w.localStorage.getItem(key)]));
check("Level 3 leaves all protected storage contracts unchanged", JSON.stringify(protectedStateAfter) === JSON.stringify(protectedStateBefore));

/* Independent Level 1, Level 2 and Wall verification after all Level 3 interactions. */
const level1AfterLevel3 = loadPage("simulator.html", "?level=1", seedOpenGate);
const L1After3 = (id) => level1AfterLevel3.d.getElementById(id);
for (let i = 0; i < 8; i += 1) L1After3("game-more").click();
level1AfterLevel3.d.querySelector('[data-action="observe"]').click();
level1AfterLevel3.d.querySelector('[data-action="separate"]').click();
level1AfterLevel3.d.querySelector('[data-action="release"]').click();
check("independent post-Level-3 Level 1 remains intact", L1After3("game-score")?.textContent === "225" && !level1AfterLevel3.d.getElementById("gei-level3"));
check("independent post-Level-3 Level 1 scripts evaluate", level1AfterLevel3.loadErrors.length === 0, level1AfterLevel3.loadErrors.join(" | "));

const level2AfterLevel3 = loadPage("simulator.html", "?level=2", seedOpenGate);
const L2After3 = (id) => level2AfterLevel3.d.getElementById(id);
for (const index of [0, 1, 2]) level2AfterLevel3.d.querySelector(`[data-sensor-index="${index}"]`).click();
for (let i = 0; i < 7; i += 1) L2After3("gei-level2-raise").click();
L2After3("gei-level2-confirm-height").click();
for (const index of [0, 1, 2]) level2AfterLevel3.d.querySelector(`[data-brace-index="${index}"]`).click();
L2After3("gei-level2-lock").click();
check("independent post-Level-3 Level 2 remains intact", L2After3("gei-level2-score")?.textContent === "270" && !level2AfterLevel3.d.getElementById("gei-level3"));
check("independent post-Level-3 Level 2 scripts evaluate", level2AfterLevel3.loadErrors.length === 0, level2AfterLevel3.loadErrors.join(" | "));

const wallAfterLevel3 = loadPage("simulator.html", "", seedOpenGateWithLevel2);
check("Simulator Wall remains intact after Level 3 testing", Boolean(wallAfterLevel3.d.getElementById("gei-simulator-wall")) && wallAfterLevel3.d.getElementById("gei-level3-entry")?.getAttribute("href") === "simulator.html?level=3");
check("Wall after Level 3 testing has no Level 4 route", !wallAfterLevel3.d.querySelector('[href*="level=4"]'));

/* ------------------------------------------------------------------ *
 * 10d. LEVEL 4 — SLUICE / CONTROLLED FLOW
 * ------------------------------------------------------------------ */
section("10d. Level 4 — Sluice / Controlled Flow");
const level4Source = fs.readFileSync(path.join(ROOT, "v1-63-33-gei-genesis-level-4-engine.js"), "utf8");
const level4CssAcceptancePath = path.join(ROOT, "v2-gei-simulator-level4.css");
const level4CssAcceptance = fs.existsSync(level4CssAcceptancePath) ? fs.readFileSync(level4CssAcceptancePath, "utf8") : "";

const level4Locked = loadPage("simulator.html", "?level=4");
check("1. Gate closed blocks Level 4", !level4Locked.d.getElementById("gei-level4") && Boolean(level4Locked.d.getElementById("gei-simulator-wall")) && level4Locked.w.localStorage.getItem("geiSimulatorLevel4V1") === null);

const level4 = loadPage("simulator.html", "?level=4", seedOpenGate);
const L4 = (id) => level4.d.getElementById(id);
check("2. Gate open allows Level 4", Boolean(L4("gei-level4")) && /window\.location\.search\s*===\s*[\"']\?level=4[\"']/.test(level4Source) && /opened === true/.test(level4Source));
check("10. Initial Level 4 state is exact", L4("gei-level4-gate")?.textContent === "0%" && L4("gei-level4-upstream")?.textContent === "72%" && L4("gei-level4-downstream")?.textContent === "18%" && L4("gei-level4-head")?.textContent === "54 UNITS" && L4("gei-level4-flow")?.textContent === "0 UNITS" && L4("gei-level4-sluice")?.textContent === "LOCKED" && L4("gei-level4-downstream-response")?.textContent === "DOWNSTREAM READY");

const handoffIncomplete = loadPage("simulator.html", "", seedOpenGateWithLevel2);
check("3. Level 3 incomplete hides ENTER LEVEL 4", !handoffIncomplete.d.getElementById("gei-level4-entry") && !handoffIncomplete.d.querySelector('[href*="level=4"]'));
const handoffComplete = loadPage("simulator.html", "", seedOpenGateWithLevel3);
check("4. Level 3 completed shows ENTER LEVEL 4", handoffComplete.d.getElementById("gei-level4-entry")?.textContent === "ENTER LEVEL 4");
check("5. Exact Level 4 handoff target is simulator.html?level=4", handoffComplete.d.getElementById("gei-level4-entry")?.getAttribute("href") === "simulator.html?level=4");
check("6. Level 4 exposes no later-stage link", !level4Source.includes("level=6") && !handoffComplete.d.querySelector('[href*="level=6"]'));

L4("gei-level4-arm").click();
check("12. Invalid PRIME confirmation gives no score", L4("gei-level4-score")?.textContent === "0" && /PRIME DENIED/.test(L4("gei-level4-status")?.textContent || ""));
for (let i = 0; i < 6; i += 1) L4("gei-level4-downstream-up").click();
check("11. PRIME safe ranges are enforced", L4("gei-level4-gate")?.textContent === "0%" && L4("gei-level4-upstream")?.textContent === "72%" && L4("gei-level4-downstream")?.textContent === "42%" && L4("gei-level4-head")?.textContent === "30 UNITS");
L4("gei-level4-arm").click();
check("13. PRIME gives exactly 80", L4("gei-level4-score")?.textContent === "80" && level4.d.querySelector('[data-objective="prime"] [data-objective-status]')?.textContent === "COMPLETE");

const stagePositions = [];
const stageTelemetry = [];
L4("gei-level4-advance").click();
stagePositions.push(Number(L4("gei-level4-gate")?.textContent.replace("%", "")));
stageTelemetry.push(`${L4("gei-level4-head")?.textContent}/${L4("gei-level4-flow")?.textContent}`);
check("14. Gate cannot skip notches", L4("gei-level4-gate")?.textContent === "20%" && !stagePositions.includes(40));
check("16. Each gate position requires confirmation", L4("gei-level4-score")?.textContent === "80" && !level4.d.querySelector('[data-sequence-step="20"]')?.classList.contains("is-confirmed") && L4("gei-level4-confirm-gate")?.disabled === false);
L4("gei-level4-confirm-gate").click();
for (const expected of [40, 60, 80]) {
  L4("gei-level4-advance").click();
  stagePositions.push(Number(L4("gei-level4-gate")?.textContent.replace("%", "")));
  stageTelemetry.push(`${L4("gei-level4-head")?.textContent}/${L4("gei-level4-flow")?.textContent}`);
  L4("gei-level4-confirm-gate").click();
}
check("15. Gate positions are exactly 20/40/60/80", JSON.stringify(stagePositions) === JSON.stringify([20, 40, 60, 80]));
check("17. Hydraulic telemetry updates after each stage", JSON.stringify(stageTelemetry) === JSON.stringify(["24 UNITS/5 UNITS", "22 UNITS/9 UNITS", "20 UNITS/12 UNITS", "18 UNITS/14 UNITS"]));
check("20. Objective 2 gives exactly 120", L4("gei-level4-score")?.textContent === "200" && level4.d.querySelector('[data-objective="sequence"] [data-objective-status]')?.textContent === "COMPLETE");

const level4Shock = loadPage("simulator.html", "?level=4", seedOpenGate);
const S4 = (id) => level4Shock.d.getElementById(id);
for (let i = 0; i < 6; i += 1) S4("gei-level4-downstream-up").click();
S4("gei-level4-arm").click();
S4("gei-level4-advance").click();
S4("gei-level4-advance").click();
check("18. Unsafe movement triggers gate-shock recovery", S4("gei-level4-status")?.textContent === "UNCONTROLLED RELEASE — GATE RECLOSED. RE-PRIME THE HEAD." && S4("gei-level4-gate")?.textContent === "0%" && S4("gei-level4-flow")?.textContent === "0 UNITS" && S4("gei-level4-upstream")?.textContent === "72%" && S4("gei-level4-downstream")?.textContent === "42%");
check("19. Recovery preserves Objective 1", S4("gei-level4-score")?.textContent === "80" && level4Shock.d.querySelector('[data-objective="prime"] [data-objective-status]')?.textContent === "COMPLETE" && level4Shock.d.querySelector('[data-sequence-step="20"]')?.classList.contains("is-confirmed") === false);

const level4StoredBeforeCompletion = level4.w.localStorage.getItem("geiSimulatorLevel4V1");
L4("gei-level4-confirm-stable").click();
check("22. Invalid stabilization gives no score", L4("gei-level4-score")?.textContent === "200" && /STABILIZATION DENIED/.test(L4("gei-level4-status")?.textContent || "") && level4.w.localStorage.getItem("geiSimulatorLevel4V1") === null);
for (let i = 0; i < 4; i += 1) L4("gei-level4-downstream-trim-up").click();
check("21. Final trim requires exact operating ranges", L4("gei-level4-gate")?.textContent === "80%" && L4("gei-level4-upstream")?.textContent === "64%" && L4("gei-level4-downstream")?.textContent === "54%" && L4("gei-level4-head")?.textContent === "10 UNITS" && L4("gei-level4-flow")?.textContent === "8 UNITS" && L4("gei-level4-downstream-response")?.textContent === "DOWNSTREAM STABLE");
L4("gei-level4-confirm-stable").click();
check("23. Objective 3 gives exactly 160", L4("gei-level4-score")?.textContent === "360" && level4.d.querySelector('[data-objective="settle"] [data-objective-status]')?.textContent === "COMPLETE");
check("24. Final score is exactly 360", L4("gei-level4-final-score")?.textContent === "360 SCORE" && L4("gei-level4-complete")?.hidden === false);
const level4Saved = JSON.parse(level4.w.localStorage.getItem("geiSimulatorLevel4V1") || "{}");
check("25. Level 4 state is persisted only after completion", level4StoredBeforeCompletion === null && level4Saved.version === "1.63.33" && level4Saved.completed === true && level4Saved.bestScore === 360 && Number.isFinite(level4Saved.updatedAt) && JSON.stringify(Object.keys(level4Saved).sort()) === JSON.stringify(["bestScore", "completed", "updatedAt", "version"]));

function completeLevel4Run(page) {
  const get = (id) => page.d.getElementById(id);
  for (let i = 0; i < 6; i += 1) get("gei-level4-downstream-up").click();
  get("gei-level4-arm").click();
  for (let i = 0; i < 4; i += 1) {
    get("gei-level4-advance").click();
    get("gei-level4-confirm-gate").click();
  }
  for (let i = 0; i < 4; i += 1) get("gei-level4-downstream-trim-up").click();
  get("gei-level4-confirm-stable").click();
}

const level4Best = loadPage("simulator.html", "?level=4", (w) => {
  seedOpenGate(w);
  w.localStorage.setItem("geiSimulatorLevel4V1", JSON.stringify({ version: "1.63.33", completed: true, bestScore: 999, updatedAt: 123 }));
});
completeLevel4Run(level4Best);
check("26. bestScore uses max(previous/current)", JSON.parse(level4Best.w.localStorage.getItem("geiSimulatorLevel4V1") || "{}").bestScore === 999);
level4Best.d.getElementById("gei-level4-reset").click();
const level4AfterReset = JSON.parse(level4Best.w.localStorage.getItem("geiSimulatorLevel4V1") || "{}");
check("27. Reset preserves persisted best score", level4Best.d.getElementById("gei-level4-score")?.textContent === "0" && level4AfterReset.completed === true && level4AfterReset.bestScore === 999);

const level4Isolation = loadPage("simulator.html", "?level=4", (w) => {
  seedOpenGate(w);
  w.localStorage.setItem("geiSimulatorScoreV1", JSON.stringify({ version: "1.63.30", score: 225, updatedAt: 11 }));
  w.localStorage.setItem("geiSimulatorLevel2V1", JSON.stringify({ version: "1.63.31", completed: true, bestScore: 270, updatedAt: 12 }));
  w.localStorage.setItem("geiSimulatorLevel3V1", JSON.stringify({ version: "1.63.32", completed: true, bestScore: 330, updatedAt: 13 }));
  w.localStorage.setItem("geiAcademyProgressV1", JSON.stringify({ completed: [1, 2, 3], xp: 333 }));
  w.localStorage.setItem("geiDayCompletionV1", JSON.stringify({ 1: { completed: true } }));
});
const protectedLevel4Keys = ["geiSimulatorScoreV1", "geiSimulatorLevel2V1", "geiSimulatorLevel3V1", "geiAcademyProgressV1", "geiDayCompletionV1", "geiDamGateV1"];
const protectedLevel4Before = Object.fromEntries(protectedLevel4Keys.map((key) => [key, level4Isolation.w.localStorage.getItem(key)]));
completeLevel4Run(level4Isolation);
const protectedLevel4After = Object.fromEntries(protectedLevel4Keys.map((key) => [key, level4Isolation.w.localStorage.getItem(key)]));
check("28. Level 1 state remains unchanged", protectedLevel4After.geiSimulatorScoreV1 === protectedLevel4Before.geiSimulatorScoreV1);
check("29. Level 2 state remains unchanged", protectedLevel4After.geiSimulatorLevel2V1 === protectedLevel4Before.geiSimulatorLevel2V1);
check("30. Level 3 state remains unchanged", protectedLevel4After.geiSimulatorLevel3V1 === protectedLevel4Before.geiSimulatorLevel3V1);
check("31. Academy XP remains unchanged", protectedLevel4After.geiAcademyProgressV1 === protectedLevel4Before.geiAcademyProgressV1);
check("32. Dam Gate remains unchanged", protectedLevel4After.geiDamGateV1 === protectedLevel4Before.geiDamGateV1);
check("33. Day Completion remains unchanged", protectedLevel4After.geiDayCompletionV1 === protectedLevel4Before.geiDayCompletionV1);
check("34. No new CustomEvents", contract.events.length === 59 && !/CustomEvent/.test(level4Source));
check("35. No new globals", contract.globals.length === 31 && !/window\.GEI_/.test(level4Source));
check("36. No polling", !/setInterval|setTimeout|requestAnimationFrame/.test(level4Source));
check("37. No recurring timers", !/setInterval|setTimeout/.test(level4Source));
check("38. No MutationObserver", !/MutationObserver/.test(level4Source));
check("39. No unexpected Level 4 runtime errors", level4.errors.length === 0 && level4Shock.errors.length === 0 && level4Best.errors.length === 0 && level4Isolation.errors.length === 0, [...new Set([...level4.errors, ...level4Shock.errors, ...level4Best.errors, ...level4Isolation.errors])].join(" | "));

let level4CssParsed = true;
try { cssTree.parse(level4CssAcceptance, { positions: true }); } catch (_) { level4CssParsed = false; }
check("40. New Level 4 CSS parses", Boolean(level4CssAcceptance) && level4CssParsed);
const level4UnscopedSelector = /(?:^|})\s*(?:html|body|button|h1|h2|h3|p|a|fieldset|legend|main|input)\s*\{/m;
check("41. Level 4 selectors are scoped beneath .gei-level4", !level4UnscopedSelector.test(level4CssAcceptance) && !/gei-game|gei-level2|gei-level3|gei-simulator-/.test(level4CssAcceptance));
check("42. Level 4 CSS uses V2 tokens", /var\(--v2-/.test(level4CssAcceptance) && !/#[0-9a-f]{3,8}\b/i.test(level4CssAcceptance));
const level4DirectFontSizes = [...level4CssAcceptance.matchAll(/font-size\s*:\s*(\d+(?:\.\d+)?)px/g)].map((m) => Number(m[1]));
check("43. Level 4 typography meets the 12px floor", level4DirectFontSizes.every((size) => size >= 12));
check("44. Level 4 controls meet the 48px target", /\.gei-level4 button[^{]*\{|min-height:\s*var\(--v2-tap\)/.test(level4CssAcceptance));
check("45. Level 4 mobile breakpoints include 1024/680/480/360", [1024, 680, 480, 360].every((width) => level4CssAcceptance.includes(`max-width: ${width}px`)));
check("46. Level 4 CSS supports reduced motion", /prefers-reduced-motion:\s*reduce/.test(level4CssAcceptance));
check("47. Level 4 CSS has no horizontal overflow declarations", !/overflow-x\s*:\s*(?:auto|scroll)/.test(level4CssAcceptance));

const level1AfterLevel4 = loadPage("simulator.html", "?level=1", seedOpenGate);
const L1After4 = (id) => level1AfterLevel4.d.getElementById(id);
for (let i = 0; i < 8; i += 1) L1After4("game-more").click();
level1AfterLevel4.d.querySelector('[data-action="observe"]').click();
level1AfterLevel4.d.querySelector('[data-action="separate"]').click();
level1AfterLevel4.d.querySelector('[data-action="release"]').click();
check("7. Level 1 remains 225", L1After4("game-score")?.textContent === "225" && !level1AfterLevel4.d.getElementById("gei-level4"));
check("48. Level 1 independently reruns after Level 4", L1After4("game-score")?.textContent === "225" && level1AfterLevel4.loadErrors.length === 0);

const level2AfterLevel4 = loadPage("simulator.html", "?level=2", seedOpenGate);
const L2After4 = (id) => level2AfterLevel4.d.getElementById(id);
for (const index of [0, 1, 2]) level2AfterLevel4.d.querySelector(`[data-sensor-index="${index}"]`).click();
for (let i = 0; i < 7; i += 1) L2After4("gei-level2-raise").click();
L2After4("gei-level2-confirm-height").click();
for (const index of [0, 1, 2]) level2AfterLevel4.d.querySelector(`[data-brace-index="${index}"]`).click();
L2After4("gei-level2-lock").click();
check("8. Level 2 remains 270", L2After4("gei-level2-score")?.textContent === "270" && !level2AfterLevel4.d.getElementById("gei-level4"));
check("49. Level 2 independently reruns after Level 4", L2After4("gei-level2-score")?.textContent === "270" && level2AfterLevel4.loadErrors.length === 0);

const level3AfterLevel4 = loadPage("simulator.html", "?level=3", seedOpenGate);
const L3After4 = (id) => level3AfterLevel4.d.getElementById(id);
for (const marker of ["north", "east", "south"]) level3AfterLevel4.d.querySelector(`[data-basin-marker="${marker}"]`).click();
for (let i = 0; i < 4; i += 1) L3After4("gei-level3-lower").click();
L3After4("gei-level3-confirm-exposure").click();
L3After4("gei-level3-outflow-up").click();
L3After4("gei-level3-outflow-up").click();
L3After4("gei-level3-stabilize").click();
check("9. Level 3 remains 330", L3After4("gei-level3-score")?.textContent === "330" && !level3AfterLevel4.d.getElementById("gei-level4"));
check("50. Level 3 independently reruns after Level 4", L3After4("gei-level3-score")?.textContent === "330" && level3AfterLevel4.loadErrors.length === 0);

const wallAfterLevel4 = loadPage("simulator.html", "", seedOpenGateWithLevel3);
check("51. Simulator Wall independently reruns after Level 4", Boolean(wallAfterLevel4.d.getElementById("gei-simulator-wall")) && wallAfterLevel4.d.getElementById("gei-level4-entry")?.getAttribute("href") === "simulator.html?level=4" && !wallAfterLevel4.d.querySelector('[href*="level=5"]'));

/* ------------------------------------------------------------------ *
 * 11. CSS INTEGRITY
 * ------------------------------------------------------------------ */
/* ------------------------------------------------------------------ *
 * 10e. LEVEL 5 — WATERWHEEL / USEFUL WORK
 * ------------------------------------------------------------------ */
section("10e. Level 5 — Waterwheel / Useful Work");
const level5Source = fs.readFileSync(path.join(ROOT, "v1-63-34-gei-genesis-level-5-engine.js"), "utf8");
const level5CssAcceptancePath = path.join(ROOT, "v2-gei-simulator-level5.css");
const level5CssAcceptance = fs.existsSync(level5CssAcceptancePath) ? fs.readFileSync(level5CssAcceptancePath, "utf8") : "";

const level5Closed = loadPage("simulator.html", "?level=5");
check("1. Level 5 requires the open Dam Gate", !level5Closed.d.getElementById("gei-level5") && Boolean(level5Closed.d.getElementById("gei-simulator-wall")) && level5Closed.w.localStorage.getItem("geiSimulatorLevel5V1") === null);
const level5GateOnly = loadPage("simulator.html", "?level=5", seedOpenGate);
check("2. Level 5 requires completed Level 4", !level5GateOnly.d.getElementById("gei-level5") && level5GateOnly.w.localStorage.getItem("geiSimulatorLevel5V1") === null);
const level5 = loadPage("simulator.html", "?level=5", seedOpenGateWithLevel4);
const L5 = (id) => level5.d.getElementById(id);
check("3. Exact Level 5 activation guard is enforced", Boolean(L5("gei-level5")) && /window\.location\.search\s*===\s*[\"']\?level=5[\"']/.test(level5Source) && /opened === true/.test(level5Source) && /geiSimulatorLevel4V1/.test(level5Source));
check("4. Initial Waterwheel telemetry is exact", L5("gei-level5-head")?.textContent === "40 UNITS" && L5("gei-level5-flow")?.textContent === "0 UNITS" && L5("gei-level5-rpm")?.textContent === "0 RPM" && L5("gei-level5-load")?.textContent === "0%" && L5("gei-level5-output")?.textContent === "0 UNITS" && L5("gei-level5-wheel-state")?.textContent === "PARKED" && L5("gei-level5-stability")?.textContent === "SYSTEM READY" && L5("gei-level5-score")?.textContent === "0");
check("5. Level 5 starts without persisted transient state", level5.w.localStorage.getItem("geiSimulatorLevel5V1") === null && L5("gei-level5-objective-count")?.textContent === "0 / 3" && L5("gei-level5-status")?.getAttribute("aria-live") === "polite");
const wallLevel4Incomplete = loadPage("simulator.html", "", (w) => { seedOpenGateWithLevel3(w); w.localStorage.setItem("geiSimulatorLevel4V1", JSON.stringify({ version: "1.63.33", completed: false, bestScore: 0, updatedAt: null })); });
check("6. Level 4 incomplete hides ENTER LEVEL 5", !wallLevel4Incomplete.d.getElementById("gei-level5-entry"));
const wallAfterLevel5 = loadPage("simulator.html", "", seedOpenGateWithLevel4);
check("7. Level 4 completion exposes ENTER LEVEL 5", wallAfterLevel5.d.getElementById("gei-level5-entry")?.textContent === "ENTER LEVEL 5");
check("8. Level 5 handoff target is exact", wallAfterLevel5.d.getElementById("gei-level5-entry")?.getAttribute("href") === "simulator.html?level=5" && !level5Source.includes("level=6"));

L5("gei-level5-head-up").click();
L5("gei-level5-head-up").click();
L5("gei-level5-head-up").click();
L5("gei-level5-align").click();
check("9. Invalid ALIGN confirmation gives no score", L5("gei-level5-score")?.textContent === "0" && /ALIGNMENT DENIED/.test(L5("gei-level5-status")?.textContent || ""));
L5("gei-level5-head-down").click();
L5("gei-level5-head-down").click();
L5("gei-level5-head-down").click();
check("10. Head channel changes deterministically by 2 units", L5("gei-level5-head")?.textContent === "40 UNITS");
L5("gei-level5-align").click();
check("11. ALIGN awards exactly 70", L5("gei-level5-score")?.textContent === "70" && level5.d.querySelector('[data-objective="align"] [data-objective-status]')?.textContent === "COMPLETE" && L5("gei-level5-wheel-state")?.textContent === "ALIGNED");
L5("gei-level5-confirm-drive").click();
check("12. Invalid DRIVE confirmation gives no score", L5("gei-level5-score")?.textContent === "70" && /DRIVE DENIED/.test(L5("gei-level5-status")?.textContent || ""));
L5("gei-level5-engage").click();
for (let i = 0; i < 5; i += 1) L5("gei-level5-flow-up").click();
for (let i = 0; i < 5; i += 1) L5("gei-level5-load-up").click();
check("13. DRIVE controls create deterministic motion", L5("gei-level5-flow")?.textContent === "20 UNITS" && L5("gei-level5-load")?.textContent === "25%" && L5("gei-level5-rpm")?.textContent === "47 RPM" && L5("gei-level5-output")?.textContent === "12 UNITS");
check("14. DRIVE telemetry reports balanced transfer", L5("gei-level5-wheel-state")?.textContent === "TURNING" && L5("gei-level5-stability")?.textContent === "SYSTEM BALANCED");
L5("gei-level5-confirm-drive").click();
check("15. DRIVE awards exactly 130 for a 200 total", L5("gei-level5-score")?.textContent === "200" && level5.d.querySelector('[data-objective="drive"] [data-objective-status]')?.textContent === "COMPLETE" && L5("gei-level5-wheel-state")?.textContent === "TRANSFERRING");
L5("gei-level5-confirm-work").click();
check("16. Invalid WORK confirmation gives no score", L5("gei-level5-score")?.textContent === "200" && /WORK DENIED/.test(L5("gei-level5-status")?.textContent || ""));
for (let i = 0; i < 7; i += 1) L5("gei-level5-load-up").click();
check("17. Useful load produces stable mechanical output", L5("gei-level5-load")?.textContent === "60%" && L5("gei-level5-rpm")?.textContent === "43 RPM" && L5("gei-level5-output")?.textContent === "26 UNITS" && L5("gei-level5-stability")?.textContent === "SYSTEM STABLE");
const level5StoredBeforeCompletion = level5.w.localStorage.getItem("geiSimulatorLevel5V1");
L5("gei-level5-confirm-work").click();
check("18. WORK awards exactly 190", L5("gei-level5-score")?.textContent === "390" && level5.d.querySelector('[data-objective="work"] [data-objective-status]')?.textContent === "COMPLETE");
check("19. Final Level 5 score is exactly 390", L5("gei-level5-final-score")?.textContent === "390 SCORE" && L5("gei-level5-complete")?.hidden === false && L5("gei-level5-wheel-state")?.textContent === "WORKING");
const level5Saved = JSON.parse(level5.w.localStorage.getItem("geiSimulatorLevel5V1") || "{}");
check("20. Level 5 persists only after Objective 3", level5StoredBeforeCompletion === null && level5Saved.version === "1.63.34" && level5Saved.completed === true && level5Saved.bestScore === 390 && Number.isFinite(level5Saved.updatedAt));
check("21. Level 5 result schema contains no transient fields", JSON.stringify(Object.keys(level5Saved).sort()) === JSON.stringify(["bestScore", "completed", "updatedAt", "version"]));
check("22. Contract delta is exactly 32/59/31/15/117", contract.storageKeys.length === 32 && contract.events.length === 59 && contract.globals.length === 31 && contract.internalUrls.length === 15 && contract.externalUrls.length === 117);

function completeLevel5Run(page) {
  const get = (id) => page.d.getElementById(id);
  get("gei-level5-align").click();
  get("gei-level5-engage").click();
  for (let i = 0; i < 5; i += 1) get("gei-level5-flow-up").click();
  for (let i = 0; i < 5; i += 1) get("gei-level5-load-up").click();
  get("gei-level5-confirm-drive").click();
  for (let i = 0; i < 7; i += 1) get("gei-level5-load-up").click();
  get("gei-level5-confirm-work").click();
}

const level5DeterministicA = loadPage("simulator.html", "?level=5", seedOpenGateWithLevel4);
const level5DeterministicB = loadPage("simulator.html", "?level=5", seedOpenGateWithLevel4);
function reachLevel5Drive(page) {
  const get = (id) => page.d.getElementById(id);
  get("gei-level5-align").click();
  get("gei-level5-engage").click();
  for (let i = 0; i < 5; i += 1) get("gei-level5-flow-up").click();
  for (let i = 0; i < 5; i += 1) get("gei-level5-load-up").click();
}
reachLevel5Drive(level5DeterministicA);
reachLevel5Drive(level5DeterministicB);
const deterministicReadout = (page) => ["gei-level5-head", "gei-level5-flow", "gei-level5-rpm", "gei-level5-load", "gei-level5-output", "gei-level5-wheel-state", "gei-level5-stability"].map((id) => page.d.getElementById(id)?.textContent);
check("23. Identical inputs produce identical telemetry", JSON.stringify(deterministicReadout(level5DeterministicA)) === JSON.stringify(deterministicReadout(level5DeterministicB)));

const level5Trip = loadPage("simulator.html", "?level=5", seedOpenGateWithLevel4);
const T5 = (id) => level5Trip.d.getElementById(id);
reachLevel5Drive(level5Trip);
T5("gei-level5-confirm-drive").click();
T5("gei-level5-flow-up").click();
T5("gei-level5-flow-up").click();
check("24. Overspeed trip is deterministic", T5("gei-level5-status")?.textContent === "OVERSPEED TRIP — WHEEL DISENGAGED. RE-ESTABLISH SAFE DRIVE." && T5("gei-level5-wheel-state")?.textContent === "TRIPPED");
check("25. Overspeed recovery clears live motion safely", T5("gei-level5-head")?.textContent === "40 UNITS" && T5("gei-level5-flow")?.textContent === "0 UNITS" && T5("gei-level5-rpm")?.textContent === "0 RPM" && T5("gei-level5-load")?.textContent === "0%" && T5("gei-level5-output")?.textContent === "0 UNITS");
check("26. Overspeed preserves completed earlier objectives", T5("gei-level5-score")?.textContent === "200" && level5Trip.d.querySelector('[data-objective="align"] [data-objective-status]')?.textContent === "COMPLETE" && level5Trip.d.querySelector('[data-objective="drive"] [data-objective-status]')?.textContent === "COMPLETE" && level5Trip.d.querySelector('[data-objective="work"] [data-objective-status]')?.textContent === "CURRENT");
check("27. Overspeed does not persist an incomplete run", level5Trip.w.localStorage.getItem("geiSimulatorLevel5V1") === null);
T5("gei-level5-engage").click();
for (let i = 0; i < 5; i += 1) T5("gei-level5-flow-up").click();
for (let i = 0; i < 12; i += 1) T5("gei-level5-load-up").click();
T5("gei-level5-confirm-work").click();
check("28. Waterwheel recovery can resume and complete", T5("gei-level5-score")?.textContent === "390" && JSON.parse(level5Trip.w.localStorage.getItem("geiSimulatorLevel5V1") || "{}").completed === true);

const level5Best = loadPage("simulator.html", "?level=5", (w) => {
  seedOpenGateWithLevel4(w);
  w.localStorage.setItem("geiSimulatorLevel5V1", JSON.stringify({ version: "1.63.34", completed: true, bestScore: 999, updatedAt: 123 }));
});
completeLevel5Run(level5Best);
check("29. Level 5 bestScore uses maximum previous/current", JSON.parse(level5Best.w.localStorage.getItem("geiSimulatorLevel5V1") || "{}").bestScore === 999);
level5Best.d.getElementById("gei-level5-reset").click();
const level5AfterReset = JSON.parse(level5Best.w.localStorage.getItem("geiSimulatorLevel5V1") || "{}");
check("30. Level 5 reset preserves persisted best", level5Best.d.getElementById("gei-level5-score")?.textContent === "0" && level5Best.d.getElementById("gei-level5-wheel-state")?.textContent === "PARKED" && level5AfterReset.completed === true && level5AfterReset.bestScore === 999);

const level5Isolation = loadPage("simulator.html", "?level=5", (w) => {
  seedOpenGateWithLevel4(w);
  w.localStorage.setItem("geiSimulatorScoreV1", JSON.stringify({ version: "1.63.30", score: 225, updatedAt: 11 }));
  w.localStorage.setItem("geiSimulatorLevel2V1", JSON.stringify({ version: "1.63.31", completed: true, bestScore: 270, updatedAt: 12 }));
  w.localStorage.setItem("geiSimulatorLevel3V1", JSON.stringify({ version: "1.63.32", completed: true, bestScore: 330, updatedAt: 13 }));
  w.localStorage.setItem("geiAcademyProgressV1", JSON.stringify({ completed: [1, 2, 3], xp: 333 }));
  w.localStorage.setItem("geiDayCompletionV1", JSON.stringify({ 1: { completed: true } }));
});
const protectedLevel5Keys = ["geiSimulatorScoreV1", "geiSimulatorLevel2V1", "geiSimulatorLevel3V1", "geiSimulatorLevel4V1", "geiAcademyProgressV1", "geiDayCompletionV1", "geiDamGateV1"];
const protectedLevel5Before = Object.fromEntries(protectedLevel5Keys.map((key) => [key, level5Isolation.w.localStorage.getItem(key)]));
completeLevel5Run(level5Isolation);
const protectedLevel5After = Object.fromEntries(protectedLevel5Keys.map((key) => [key, level5Isolation.w.localStorage.getItem(key)]));
check("31. Level 1 state remains unchanged", protectedLevel5After.geiSimulatorScoreV1 === protectedLevel5Before.geiSimulatorScoreV1);
check("32. Level 2 state remains unchanged", protectedLevel5After.geiSimulatorLevel2V1 === protectedLevel5Before.geiSimulatorLevel2V1);
check("33. Level 3 state remains unchanged", protectedLevel5After.geiSimulatorLevel3V1 === protectedLevel5Before.geiSimulatorLevel3V1);
check("34. Level 4 state remains unchanged", protectedLevel5After.geiSimulatorLevel4V1 === protectedLevel5Before.geiSimulatorLevel4V1);
check("35. Academy XP remains unchanged", protectedLevel5After.geiAcademyProgressV1 === protectedLevel5Before.geiAcademyProgressV1);
check("36. Day Completion remains unchanged", protectedLevel5After.geiDayCompletionV1 === protectedLevel5Before.geiDayCompletionV1);
check("37. Dam Gate remains unchanged", protectedLevel5After.geiDamGateV1 === protectedLevel5Before.geiDamGateV1);
check("38. Level 5 creates no new CustomEvents or globals", !/CustomEvent/.test(level5Source) && !/window\.GEI_/.test(level5Source));
check("39. Level 5 has no polling", !/setInterval|requestAnimationFrame/.test(level5Source));
check("40. Level 5 has no recurring timers", !/setTimeout|setInterval/.test(level5Source));
check("41. Level 5 has no MutationObserver", !/MutationObserver/.test(level5Source));
check("42. Level 5 pages have no new runtime errors", [level5, level5GateOnly, level5Trip, level5Best, level5Isolation].every((page) => page.errors.length === 0));

let level5CssParsed = true;
try { cssTree.parse(level5CssAcceptance, { positions: true }); } catch (_) { level5CssParsed = false; }
check("43. Level 5 CSS parses", Boolean(level5CssAcceptance) && level5CssParsed);
const level5UnscopedSelector = /(?:^|})\s*(?:html|body|button|h1|h2|h3|p|a|fieldset|legend|main|input)\s*\{/m;
check("44. Level 5 selectors are scoped beneath .gei-level5", !level5UnscopedSelector.test(level5CssAcceptance) && !/gei-game|gei-level[1-4]|gei-simulator-/.test(level5CssAcceptance));
check("45. Level 5 CSS uses V2 tokens", /var\(--v2-/.test(level5CssAcceptance) && !/#[0-9a-f]{3,8}\b/i.test(level5CssAcceptance));
const level5DirectFontSizes = [...level5CssAcceptance.matchAll(/font-size\s*:\s*(\d+(?:\.\d+)?)px/g)].map((m) => Number(m[1]));
check("46. Level 5 typography meets the 12px floor", level5DirectFontSizes.every((size) => size >= 12));
check("47. Level 5 controls meet the 48px target", /\.gei-level5 button[^{]*\{|min-height:\s*var\(--v2-tap\)/.test(level5CssAcceptance));
check("48. Level 5 responsive breakpoints include 1024/680/480/360", [1024, 680, 480, 360].every((width) => level5CssAcceptance.includes(`max-width: ${width}px`)));
check("49. Level 5 CSS supports reduced motion", /prefers-reduced-motion:\s*reduce/.test(level5CssAcceptance));
check("50. Level 5 CSS has no horizontal overflow declarations", !/overflow-x\s*:\s*(?:auto|scroll)/.test(level5CssAcceptance));

const level1AfterLevel5 = loadPage("simulator.html", "?level=1", seedOpenGate);
const L1After5 = (id) => level1AfterLevel5.d.getElementById(id);
for (let i = 0; i < 8; i += 1) L1After5("game-more").click();
level1AfterLevel5.d.querySelector('[data-action="observe"]').click();
level1AfterLevel5.d.querySelector('[data-action="separate"]').click();
level1AfterLevel5.d.querySelector('[data-action="release"]').click();
check("51. Level 1 reruns after Level 5 at 225", L1After5("game-score")?.textContent === "225" && level1AfterLevel5.loadErrors.length === 0);

const level2AfterLevel5 = loadPage("simulator.html", "?level=2", seedOpenGate);
const L2After5 = (id) => level2AfterLevel5.d.getElementById(id);
for (const index of [0, 1, 2]) level2AfterLevel5.d.querySelector(`[data-sensor-index="${index}"]`).click();
for (let i = 0; i < 7; i += 1) L2After5("gei-level2-raise").click();
L2After5("gei-level2-confirm-height").click();
for (const index of [0, 1, 2]) level2AfterLevel5.d.querySelector(`[data-brace-index="${index}"]`).click();
L2After5("gei-level2-lock").click();
check("52. Level 2 reruns after Level 5 at 270", L2After5("gei-level2-score")?.textContent === "270" && level2AfterLevel5.loadErrors.length === 0);

const level3AfterLevel5 = loadPage("simulator.html", "?level=3", seedOpenGate);
const L3After5 = (id) => level3AfterLevel5.d.getElementById(id);
for (const marker of ["north", "east", "south"]) level3AfterLevel5.d.querySelector(`[data-basin-marker="${marker}"]`).click();
for (let i = 0; i < 4; i += 1) L3After5("gei-level3-lower").click();
L3After5("gei-level3-confirm-exposure").click();
L3After5("gei-level3-outflow-up").click();
L3After5("gei-level3-outflow-up").click();
L3After5("gei-level3-stabilize").click();
check("53. Level 3 reruns after Level 5 at 330", L3After5("gei-level3-score")?.textContent === "330" && level3AfterLevel5.loadErrors.length === 0);

const level4AfterLevel5 = loadPage("simulator.html", "?level=4", seedOpenGate);
const L4After5 = (id) => level4AfterLevel5.d.getElementById(id);
for (let i = 0; i < 6; i += 1) L4After5("gei-level4-downstream-up").click();
L4After5("gei-level4-arm").click();
for (let i = 0; i < 4; i += 1) {
  L4After5("gei-level4-advance").click();
  L4After5("gei-level4-confirm-gate").click();
}
for (let i = 0; i < 4; i += 1) L4After5("gei-level4-downstream-trim-up").click();
L4After5("gei-level4-confirm-stable").click();
check("54. Level 4 reruns after Level 5 at 360", L4After5("gei-level4-score")?.textContent === "360" && level4AfterLevel5.loadErrors.length === 0);

check("55. Simulator Wall reruns after Level 5", Boolean(wallAfterLevel5.d.getElementById("gei-simulator-wall")) && wallAfterLevel5.d.getElementById("gei-level4-entry")?.getAttribute("href") === "simulator.html?level=4" && wallAfterLevel5.d.getElementById("gei-level5-entry")?.getAttribute("href") === "simulator.html?level=5");

/* ------------------------------------------------------------------ *
 * 10f. LEVEL 6 — BEAST SYSTEM / FINAL OPERATING ENVELOPE
 * ------------------------------------------------------------------ */
section("10f. Level 6 — Beast System / Final Operating Envelope");
const level6Source = fs.readFileSync(path.join(ROOT, "v1-63-35-gei-genesis-level-6-engine.js"), "utf8");
const level6CssAcceptancePath = path.join(ROOT, "v2-gei-simulator-level6.css");
const level6CssAcceptance = fs.existsSync(level6CssAcceptancePath) ? fs.readFileSync(level6CssAcceptancePath, "utf8") : "";

const level6Closed = loadPage("simulator.html", "?level=6");
check("1. Level 6 requires the open Dam Gate", !level6Closed.d.getElementById("gei-level6") && Boolean(level6Closed.d.getElementById("gei-simulator-wall")) && level6Closed.w.localStorage.getItem("geiSimulatorLevel6V1") === null);
const level6GateOnly = loadPage("simulator.html", "?level=6", seedOpenGate);
check("2. Level 6 requires completed Level 5", !level6GateOnly.d.getElementById("gei-level6") && level6GateOnly.w.localStorage.getItem("geiSimulatorLevel6V1") === null);
const level6 = loadPage("simulator.html", "?level=6", seedOpenGateWithLevel5);
const L6 = (id) => level6.d.getElementById(id);
const numericL6 = (id) => Number((L6(id)?.textContent || "").replace(/%/g, ""));
check("3. Exact Level 6 activation guard is enforced", Boolean(L6("gei-level6")) && /window\.location\.search\s*===\s*["']\?level=6["']/.test(level6Source) && /opened === true/.test(level6Source) && /geiSimulatorLevel5V1/.test(level6Source));
check("4. Initial Beast System telemetry is exact", numericL6("gei-level6-reservoir") === 72 && numericL6("gei-level6-tailwater") === 32 && numericL6("gei-level6-head") === 40 && numericL6("gei-level6-sluice") === 0 && numericL6("gei-level6-flow") === 0 && numericL6("gei-level6-rpm") === 0 && numericL6("gei-level6-load") === 0 && numericL6("gei-level6-output") === 0 && numericL6("gei-level6-downstream-response") === 0 && numericL6("gei-level6-stability-index") === 8 && L6("gei-level6-stability")?.textContent === "IDLE" && L6("gei-level6-system-state")?.textContent === "IDLE" && L6("gei-level6-engagement")?.textContent === "DISENGAGED");
check("5. Level 6 starts without persisted transient state and has exactly three objectives", level6.w.localStorage.getItem("geiSimulatorLevel6V1") === null && L6("gei-level6-objective-count")?.textContent === "0 / 3" && level6.d.querySelectorAll("[data-objective]").length === 3 && L6("gei-level6-status")?.getAttribute("aria-live") === "polite");
check("6. Level 5 incomplete hides ENTER LEVEL 6", !loadPage("simulator.html", "", seedOpenGateWithLevel4).d.getElementById("gei-level6-entry"));
const wallAfterLevel6Handoff = loadPage("simulator.html", "", seedOpenGateWithLevel5);
check("7. Level 5 completion exposes ENTER LEVEL 6", wallAfterLevel6Handoff.d.getElementById("gei-level6-entry")?.textContent === "ENTER LEVEL 6" && wallAfterLevel6Handoff.d.getElementById("gei-level6-entry")?.getAttribute("href") === "simulator.html?level=6");
check("8. No later-stage route, link or dead control exists", !/level\s*=\s*7|LEVEL 7/i.test(level6Source + fs.readFileSync(path.join(ROOT, "simulator.html"), "utf8")) && !wallAfterLevel6Handoff.d.querySelector('[href*="level=7"], [id*="level7"], [data-level="7"]') && ![...wallAfterLevel6Handoff.d.querySelectorAll("button,a")].some((el) => /level\s*7/i.test(el.textContent || "")));

L6("gei-level6-synchronize").click();
check("9. Invalid SYNCHRONIZE confirmation gives no score", L6("gei-level6-score")?.textContent === "0" && /SYNCHRONIZE DENIED/.test(L6("gei-level6-status")?.textContent || ""));
for (let i = 0; i < 3; i += 1) L6("gei-level6-tailwater-up").click();
check("10. Tailwater and derived head move deterministically", numericL6("gei-level6-tailwater") === 38 && numericL6("gei-level6-head") === 34 && numericL6("gei-level6-reservoir") === 72);
L6("gei-level6-synchronize").click();
check("11. SYNCHRONIZE awards exactly 90", L6("gei-level6-score")?.textContent === "90" && level6.d.querySelector('[data-objective="synchronize"] [data-objective-status]')?.textContent === "COMPLETE" && L6("gei-level6-objective-count")?.textContent === "1 / 3");
L6("gei-level6-engage").click();
check("12. Synchronized system engages without changing water balance", L6("gei-level6-engagement")?.textContent === "ENGAGED" && L6("gei-level6-system-state")?.textContent === "WORKING" && numericL6("gei-level6-head") === 34);
for (let i = 0; i < 10; i += 1) L6("gei-level6-sluice-up").click();
for (let i = 0; i < 5; i += 1) L6("gei-level6-load-up").click();
check("13. INTEGRATE reads the coupled equations at the intermediate setpoint", numericL6("gei-level6-sluice") === 50 && numericL6("gei-level6-flow") === 17 && numericL6("gei-level6-load") === 25 && numericL6("gei-level6-rpm") === 43 && numericL6("gei-level6-output") === 11 && numericL6("gei-level6-downstream-response") === 23 && numericL6("gei-level6-stability-index") === 55 && L6("gei-level6-stability")?.textContent === "BALANCED");
L6("gei-level6-confirm-integrate").click();
check("14. INTEGRATE awards exactly 150 for a 240 total", L6("gei-level6-score")?.textContent === "240" && level6.d.querySelector('[data-objective="integrate"] [data-objective-status]')?.textContent === "COMPLETE" && L6("gei-level6-objective-count")?.textContent === "2 / 3");

for (let i = 0; i < 7; i += 1) L6("gei-level6-load-up").click();
const finalOperatingValues = {
  reservoir: numericL6("gei-level6-reservoir"),
  tailwater: numericL6("gei-level6-tailwater"),
  head: numericL6("gei-level6-head"),
  sluice: numericL6("gei-level6-sluice"),
  flow: numericL6("gei-level6-flow"),
  load: numericL6("gei-level6-load"),
  rpm: numericL6("gei-level6-rpm"),
  output: numericL6("gei-level6-output"),
  downstream: numericL6("gei-level6-downstream-response")
};
const expectedHead = Math.max(0, finalOperatingValues.reservoir - finalOperatingValues.tailwater);
const expectedFlow = Math.round((finalOperatingValues.sluice / 100) * expectedHead);
const expectedHydraulicDrive = Math.round((expectedFlow * expectedHead) / 12);
const expectedLoadDrag = Math.round(finalOperatingValues.load * 0.20);
const expectedRpm = Math.max(0, expectedHydraulicDrive - expectedLoadDrag);
const expectedOutput = Math.round(expectedRpm * finalOperatingValues.load / 100);
const expectedDownstream = Math.max(0, expectedFlow * 2 - expectedOutput);
const expectedIndex = Math.round((
  Math.max(0, 100 - Math.abs(expectedHead - 32) * 10) +
  Math.max(0, 100 - Math.abs(expectedFlow - 16) * 12) +
  Math.max(0, 100 - Math.abs(expectedRpm - 34) * 5) +
  Math.max(0, 100 - Math.abs(finalOperatingValues.load - 60) * 2) +
  Math.max(0, 100 - Math.abs(expectedOutput - 22) * 5) +
  Math.max(0, 100 - Math.abs(expectedDownstream - 12) * 6)
) / 6);
check("15. Objective 3 complete input sequence reaches the approved coupled final state", JSON.stringify(finalOperatingValues) === JSON.stringify({ reservoir: 72, tailwater: 38, head: 34, sluice: 50, flow: 17, load: 60, rpm: 36, output: 22, downstream: 12 }));
check("16. Final displayed values equal the coupled equations", expectedHead === finalOperatingValues.head && expectedFlow === finalOperatingValues.flow && expectedRpm === finalOperatingValues.rpm && expectedOutput === finalOperatingValues.output && expectedDownstream === finalOperatingValues.downstream && expectedIndex === numericL6("gei-level6-stability-index"));
check("17. Final state satisfies every operating-envelope band simultaneously", finalOperatingValues.reservoir >= 68 && finalOperatingValues.reservoir <= 74 && finalOperatingValues.tailwater >= 38 && finalOperatingValues.tailwater <= 42 && finalOperatingValues.head >= 30 && finalOperatingValues.head <= 34 && finalOperatingValues.sluice >= 45 && finalOperatingValues.sluice <= 55 && finalOperatingValues.flow >= 14 && finalOperatingValues.flow <= 18 && finalOperatingValues.load >= 55 && finalOperatingValues.load <= 65 && finalOperatingValues.rpm >= 30 && finalOperatingValues.rpm <= 38 && finalOperatingValues.output >= 18 && finalOperatingValues.output <= 26 && finalOperatingValues.downstream >= 9 && finalOperatingValues.downstream <= 16);
check("18. Final operating state is engaged, stable, working and index-safe", L6("gei-level6-engagement")?.textContent === "ENGAGED" && L6("gei-level6-stability")?.textContent === "STABLE" && L6("gei-level6-system-state")?.textContent === "WORKING" && numericL6("gei-level6-stability-index") >= 50);
const level6StoredBeforeCompletion = level6.w.localStorage.getItem("geiSimulatorLevel6V1");
L6("gei-level6-confirm-master").click();
check("19. MASTER THE SYSTEM awards exactly 210", L6("gei-level6-score")?.textContent === "450" && level6.d.querySelector('[data-objective="master"] [data-objective-status]')?.textContent === "COMPLETE" && L6("gei-level6-objective-count")?.textContent === "3 / 3");
check("20. Final Level 6 score is exactly 450", L6("gei-level6-final-score")?.textContent === "450 SCORE" && L6("gei-level6-complete")?.hidden === false && /ALL SIX SIMULATOR LEVELS COMPLETE/.test(L6("gei-level6-complete-title")?.textContent || ""));
const level6Saved = JSON.parse(level6.w.localStorage.getItem("geiSimulatorLevel6V1") || "{}");
check("21. Level 6 persists only after Objective 3", level6StoredBeforeCompletion === null && level6Saved.version === "1.63.35" && level6Saved.completed === true && level6Saved.bestScore === 450 && Number.isFinite(level6Saved.updatedAt));
check("22. Level 6 result schema contains no transient fields", JSON.stringify(Object.keys(level6Saved).sort()) === JSON.stringify(["bestScore", "completed", "updatedAt", "version"]));

function completeLevel6Run(page) {
  const get = (id) => page.d.getElementById(id);
  for (let i = 0; i < 3; i += 1) get("gei-level6-tailwater-up").click();
  get("gei-level6-synchronize").click();
  get("gei-level6-engage").click();
  for (let i = 0; i < 10; i += 1) get("gei-level6-sluice-up").click();
  for (let i = 0; i < 5; i += 1) get("gei-level6-load-up").click();
  get("gei-level6-confirm-integrate").click();
  for (let i = 0; i < 7; i += 1) get("gei-level6-load-up").click();
  get("gei-level6-confirm-master").click();
}

const level6DeterministicA = loadPage("simulator.html", "?level=6", seedOpenGateWithLevel5);
const level6DeterministicB = loadPage("simulator.html", "?level=6", seedOpenGateWithLevel5);
completeLevel6Run(level6DeterministicA);
completeLevel6Run(level6DeterministicB);
const deterministicLevel6Readout = (page) => ["gei-level6-reservoir", "gei-level6-tailwater", "gei-level6-head", "gei-level6-sluice", "gei-level6-flow", "gei-level6-engagement", "gei-level6-load", "gei-level6-rpm", "gei-level6-output", "gei-level6-downstream-response", "gei-level6-stability-index", "gei-level6-stability", "gei-level6-system-state", "gei-level6-score"].map((id) => page.d.getElementById(id)?.textContent);
check("23. Identical Level 6 inputs produce identical final telemetry and score", JSON.stringify(deterministicLevel6Readout(level6DeterministicA)) === JSON.stringify(deterministicLevel6Readout(level6DeterministicB)));
check("24. Deterministic replay stores the same final score", JSON.parse(level6DeterministicA.w.localStorage.getItem("geiSimulatorLevel6V1") || "{}").bestScore === 450 && JSON.parse(level6DeterministicB.w.localStorage.getItem("geiSimulatorLevel6V1") || "{}").bestScore === 450);

const level6Cascade = loadPage("simulator.html", "?level=6", seedOpenGateWithLevel5);
const C6 = (id) => level6Cascade.d.getElementById(id);
for (let i = 0; i < 3; i += 1) C6("gei-level6-tailwater-up").click();
C6("gei-level6-synchronize").click();
C6("gei-level6-engage").click();
for (let i = 0; i < 15; i += 1) C6("gei-level6-sluice-up").click();
check("25. Cascade failure trips at the coupled overspeed threshold", C6("gei-level6-status")?.textContent === "CASCADE TRIP — SLUICE CLOSED. DISENGAGE AND REBUILD THE WORKING SYSTEM." && C6("gei-level6-sluice")?.textContent === "0%" && C6("gei-level6-engagement")?.textContent === "DISENGAGED" && C6("gei-level6-system-state")?.textContent === "RECOVERY");
check("26. Cascade recovery clears downstream progress and preserves completed objectives", C6("gei-level6-downstream-response")?.textContent === "0" && C6("gei-level6-score")?.textContent === "90" && level6Cascade.d.querySelector('[data-objective="synchronize"] [data-objective-status]')?.textContent === "COMPLETE" && level6Cascade.d.querySelector('[data-objective="integrate"] [data-objective-status]')?.textContent === "CURRENT" && level6Cascade.w.localStorage.getItem("geiSimulatorLevel6V1") === null);
C6("gei-level6-engage").click();
for (let i = 0; i < 10; i += 1) C6("gei-level6-sluice-up").click();
for (let i = 0; i < 5; i += 1) C6("gei-level6-load-up").click();
C6("gei-level6-confirm-integrate").click();
for (let i = 0; i < 7; i += 1) C6("gei-level6-load-up").click();
C6("gei-level6-confirm-master").click();
check("27. Cascade recovery can re-enter the envelope and complete", C6("gei-level6-score")?.textContent === "450" && JSON.parse(level6Cascade.w.localStorage.getItem("geiSimulatorLevel6V1") || "{}").completed === true);

const level6Best = loadPage("simulator.html", "?level=6", (w) => {
  seedOpenGateWithLevel5(w);
  w.localStorage.setItem("geiSimulatorLevel6V1", JSON.stringify({ version: "1.63.35", completed: true, bestScore: 999, updatedAt: 123 }));
});
completeLevel6Run(level6Best);
check("28. Level 6 bestScore uses maximum previous/current", JSON.parse(level6Best.w.localStorage.getItem("geiSimulatorLevel6V1") || "{}").bestScore === 999);
level6Best.d.getElementById("gei-level6-reset").click();
const level6AfterReset = JSON.parse(level6Best.w.localStorage.getItem("geiSimulatorLevel6V1") || "{}");
check("29. Level 6 reset preserves persisted result and best score", level6Best.d.getElementById("gei-level6-score")?.textContent === "0" && level6Best.d.getElementById("gei-level6-objective-count")?.textContent === "0 / 3" && level6Best.d.getElementById("gei-level6-engagement")?.textContent === "DISENGAGED" && level6AfterReset.completed === true && level6AfterReset.bestScore === 999);

const level6Isolation = loadPage("simulator.html", "?level=6", (w) => {
  seedOpenGateWithLevel5(w);
  w.localStorage.setItem("geiSimulatorScoreV1", JSON.stringify({ version: "1.63.30", score: 225, updatedAt: 11 }));
  w.localStorage.setItem("geiSimulatorLevel2V1", JSON.stringify({ version: "1.63.31", completed: true, bestScore: 270, updatedAt: 12 }));
  w.localStorage.setItem("geiSimulatorLevel3V1", JSON.stringify({ version: "1.63.32", completed: true, bestScore: 330, updatedAt: 13 }));
  w.localStorage.setItem("geiSimulatorLevel4V1", JSON.stringify({ version: "1.63.33", completed: true, bestScore: 360, updatedAt: 14 }));
  w.localStorage.setItem("geiSimulatorLevel5V1", JSON.stringify({ version: "1.63.34", completed: true, bestScore: 390, updatedAt: 15 }));
  w.localStorage.setItem("geiAcademyProgressV1", JSON.stringify({ completed: [1, 2, 3], xp: 333 }));
  w.localStorage.setItem("geiDayCompletionV1", JSON.stringify({ 1: { completed: true } }));
});
const protectedLevel6Keys = ["geiDamGateV1", "geiAcademyProgressV1", "geiDayCompletionV1", "geiSimulatorScoreV1", "geiSimulatorLevel2V1", "geiSimulatorLevel3V1", "geiSimulatorLevel4V1", "geiSimulatorLevel5V1"];
const protectedLevel6Before = Object.fromEntries(protectedLevel6Keys.map((key) => [key, level6Isolation.w.localStorage.getItem(key)]));
completeLevel6Run(level6Isolation);
const protectedLevel6After = Object.fromEntries(protectedLevel6Keys.map((key) => [key, level6Isolation.w.localStorage.getItem(key)]));
for (const key of protectedLevel6Keys) check(`30. Protected state remains unchanged: ${key}`, protectedLevel6After[key] === protectedLevel6Before[key]);
check("38. Level 6 creates no new CustomEvents or GEI globals", !/CustomEvent/.test(level6Source) && !/window\.GEI_/.test(level6Source));
check("39. Level 6 has no polling, recurring timers or MutationObserver", !/setInterval|setTimeout|requestAnimationFrame|MutationObserver/.test(level6Source));
check("40. Level 6 uses only its own result key for writes", /localStorage\.setItem\(STORAGE_KEY/.test(level6Source) && !/localStorage\.setItem\(\s*["'](?:geiDamGateV1|geiAcademyProgressV1|geiDayCompletionV1|geiSimulatorScoreV1|geiSimulatorLevel2V1|geiSimulatorLevel3V1|geiSimulatorLevel4V1|geiSimulatorLevel5V1)["']/.test(level6Source));
check("41. Level 6 pages add no runtime errors", [level6, level6GateOnly, level6Closed, level6DeterministicA, level6DeterministicB, level6Cascade, level6Best, level6Isolation].every((page) => page.errors.length === 0), [...new Set([level6, level6GateOnly, level6Closed, level6DeterministicA, level6DeterministicB, level6Cascade, level6Best, level6Isolation].flatMap((page) => page.errors))].join(" | "));

let level6CssParsed = true;
try { cssTree.parse(level6CssAcceptance, { positions: true }); } catch (_) { level6CssParsed = false; }
check("42. Level 6 CSS parses", Boolean(level6CssAcceptance) && level6CssParsed);
const level6UnscopedSelector = /(?:^|})\s*(?:html|body|button|h1|h2|h3|p|a|fieldset|legend|main|input)\s*\{/m;
check("43. Level 6 selectors are scoped beneath .gei-level6", !level6UnscopedSelector.test(level6CssAcceptance) && !/gei-game|gei-level[1-5]|gei-simulator-/.test(level6CssAcceptance));
check("44. Level 6 CSS uses V2 tokens", /var\(--v2-/.test(level6CssAcceptance) && !/#[0-9a-f]{3,8}\b/i.test(level6CssAcceptance));
const level6DirectFontSizes = [...level6CssAcceptance.matchAll(/font-size\s*:\s*(\d+(?:\.\d+)?)px/g)].map((m) => Number(m[1]));
check("45. Level 6 typography meets the 12px floor", level6DirectFontSizes.every((size) => size >= 12));
check("46. Level 6 controls meet the 48px target", /\.gei-level6 button[^{]*\{|min-height:\s*var\(--v2-tap\)/.test(level6CssAcceptance));
check("47. Level 6 responsive breakpoints include 1024/680/480/360", [1024, 680, 480, 360].every((width) => level6CssAcceptance.includes(`max-width: ${width}px`)));
check("48. Level 6 CSS supports reduced motion", /prefers-reduced-motion:\s*reduce/.test(level6CssAcceptance));
check("49. Level 6 CSS has no intentional horizontal overflow", !/overflow-x\s*:\s*(?:auto|scroll)/.test(level6CssAcceptance));
check("50. Level 6 status is textual and ARIA-live", /role="status" aria-live="polite"/.test(level6Source));

/* Independent post-Level-6 reruns preserve every earlier simulator and Wall path. */
const level1AfterLevel6 = loadPage("simulator.html", "?level=1", seedOpenGate);
const L1After6 = (id) => level1AfterLevel6.d.getElementById(id);
for (let i = 0; i < 8; i += 1) L1After6("game-more").click();
level1AfterLevel6.d.querySelector('[data-action="observe"]').click();
level1AfterLevel6.d.querySelector('[data-action="separate"]').click();
level1AfterLevel6.d.querySelector('[data-action="release"]').click();
check("51. Level 1 reruns after Level 6 at 225", L1After6("game-score")?.textContent === "225" && level1AfterLevel6.loadErrors.length === 0);

const level2AfterLevel6 = loadPage("simulator.html", "?level=2", seedOpenGate);
const L2After6 = (id) => level2AfterLevel6.d.getElementById(id);
for (const index of [0, 1, 2]) level2AfterLevel6.d.querySelector(`[data-sensor-index="${index}"]`).click();
for (let i = 0; i < 7; i += 1) L2After6("gei-level2-raise").click();
L2After6("gei-level2-confirm-height").click();
for (const index of [0, 1, 2]) level2AfterLevel6.d.querySelector(`[data-brace-index="${index}"]`).click();
L2After6("gei-level2-lock").click();
check("52. Level 2 reruns after Level 6 at 270", L2After6("gei-level2-score")?.textContent === "270" && level2AfterLevel6.loadErrors.length === 0);

const level3AfterLevel6 = loadPage("simulator.html", "?level=3", seedOpenGate);
const L3After6 = (id) => level3AfterLevel6.d.getElementById(id);
for (const marker of ["north", "east", "south"]) level3AfterLevel6.d.querySelector(`[data-basin-marker="${marker}"]`).click();
for (let i = 0; i < 4; i += 1) L3After6("gei-level3-lower").click();
L3After6("gei-level3-confirm-exposure").click();
L3After6("gei-level3-outflow-up").click();
L3After6("gei-level3-outflow-up").click();
L3After6("gei-level3-stabilize").click();
check("53. Level 3 reruns after Level 6 at 330", L3After6("gei-level3-score")?.textContent === "330" && level3AfterLevel6.loadErrors.length === 0);

const level4AfterLevel6 = loadPage("simulator.html", "?level=4", seedOpenGate);
const L4After6 = (id) => level4AfterLevel6.d.getElementById(id);
for (let i = 0; i < 6; i += 1) L4After6("gei-level4-downstream-up").click();
L4After6("gei-level4-arm").click();
for (let i = 0; i < 4; i += 1) {
  L4After6("gei-level4-advance").click();
  L4After6("gei-level4-confirm-gate").click();
}
for (let i = 0; i < 4; i += 1) L4After6("gei-level4-downstream-trim-up").click();
L4After6("gei-level4-confirm-stable").click();
check("54. Level 4 reruns after Level 6 at 360", L4After6("gei-level4-score")?.textContent === "360" && level4AfterLevel6.loadErrors.length === 0);

const level5AfterLevel6 = loadPage("simulator.html", "?level=5", seedOpenGateWithLevel4);
const L5After6 = (id) => level5AfterLevel6.d.getElementById(id);
L5After6("gei-level5-align").click();
L5After6("gei-level5-engage").click();
for (let i = 0; i < 5; i += 1) L5After6("gei-level5-flow-up").click();
for (let i = 0; i < 5; i += 1) L5After6("gei-level5-load-up").click();
L5After6("gei-level5-confirm-drive").click();
for (let i = 0; i < 7; i += 1) L5After6("gei-level5-load-up").click();
L5After6("gei-level5-confirm-work").click();
check("55. Level 5 reruns after Level 6 at 390", L5After6("gei-level5-score")?.textContent === "390" && level5AfterLevel6.loadErrors.length === 0);

const wallAfterLevel6 = loadPage("simulator.html", "", seedOpenGateWithLevel5);
check("56. Simulator Wall reruns after Level 6 with the final handoff", Boolean(wallAfterLevel6.d.getElementById("gei-simulator-wall")) && wallAfterLevel6.d.getElementById("gei-level5-entry")?.getAttribute("href") === "simulator.html?level=5" && wallAfterLevel6.d.getElementById("gei-level6-entry")?.getAttribute("href") === "simulator.html?level=6" && !wallAfterLevel6.d.querySelector('[href*="level=7"]'));

/* ------------------------------------------------------------------ *
 * 11. CSS INTEGRITY
 * ------------------------------------------------------------------ */
section("11. CSS integrity");
const cssFiles = fs.readdirSync(ROOT).filter((f) => f.endsWith(".css")).sort();
let cssErrors = 0;
for (const f of cssFiles) {
  const src = fs.readFileSync(path.join(ROOT, f), "utf8");
  try { cssTree.parse(src, { positions: true, onParseError: (e) => { cssErrors += 1; warnings.push(`${f}: ${e.message}`); } }); }
  catch (e) { cssErrors += 1; warnings.push(`${f}: ${e.message}`); }
}
check(`all ${cssFiles.length} stylesheets parse`, cssErrors === 0, `${cssErrors} parse errors`);

const V2_TOKEN_HEX = new Set([
  "04050a", "06070d", "0a0d16", "0f1420", "1b2434", "eaf2ff", "8fa2bd",
  "2fd2ff", "3d3dea", "f310ba", "ff1493", "22c55e", "f5a524", "ff3b5c",
  "0b3a4d", "12657f", "7fe9ff", "ffffff", "fff", "000000", "000",
]);
const v2Files = fs.readdirSync(ROOT).filter((f) => f.startsWith("v2-") && f.endsWith(".css")).sort();
for (const f of v2Files) {
  const src = fs.readFileSync(path.join(ROOT, f), "utf8");
  const tiny = [...src.matchAll(/font-size\s*:\s*(\d+(?:\.\d+)?)px/g)].map((m) => Number(m[1])).filter((n) => n < 12);
  check(`${f}: no font-size below 12px`, tiny.length === 0, `sizes=${[...new Set(tiny)].join(",")}`);
  const hexes = [...new Set([...src.matchAll(/#([0-9a-fA-F]{6}|[0-9a-fA-F]{3})\b/g)].map((m) => m[1].toLowerCase()))];
  const stray = hexes.filter((h) => !V2_TOKEN_HEX.has(h));
  check(`${f}: only tokenised hex values`, stray.length === 0, `stray=#${stray.join(",#")}`);
}
const level2CssPath = path.join(ROOT, "v2-gei-simulator-level2.css");
if (fs.existsSync(level2CssPath)) {
  const level2CssSource = fs.readFileSync(level2CssPath, "utf8");
  const unscopedLevel2Selector = /(?:^|})\s*(?:html|body|button|h1|h2|h3|p|a|fieldset|legend|main)\s*\{/m;
  check("Level 2 stylesheet is wired only through simulator.html", fs.readFileSync(path.join(ROOT, "simulator.html"), "utf8").includes("v2-gei-simulator-level2.css"));
  check("Level 2 stylesheet has no unscoped global element selector", !unscopedLevel2Selector.test(level2CssSource));
  check("Level 2 stylesheet does not target Level 1 or Wall selectors", !/gei-game|gei-simulator-/.test(level2CssSource));
}
const level3CssPath = path.join(ROOT, "v2-gei-simulator-level3.css");
if (fs.existsSync(level3CssPath)) {
  const level3CssSource = fs.readFileSync(level3CssPath, "utf8");
  const unscopedLevel3Selector = /(?:^|})\s*(?:html|body|button|h1|h2|h3|p|a|fieldset|legend|main|input)\s*\{/m;
  const simulatorHtml = fs.readFileSync(path.join(ROOT, "simulator.html"), "utf8");
  check("Level 3 stylesheet is wired through simulator.html", simulatorHtml.includes("v2-gei-simulator-level3.css") && simulatorHtml.includes("v1-63-32-gei-genesis-level-3-engine.js"));
  check("Level 3 stylesheet has no unscoped global element selector", !unscopedLevel3Selector.test(level3CssSource));
  check("Level 3 stylesheet does not target Level 1, Level 2 or Wall selectors", !/gei-game|gei-level2|gei-simulator-/.test(level3CssSource));
  check("Level 3 stylesheet includes 1024, 680, 480 and 360 breakpoints", [1024, 680, 480, 360].every((width) => level3CssSource.includes(`max-width: ${width}px`)));
  check("Level 3 stylesheet includes 48px control sizing", /min-height:\s*var\(--v2-tap\)/.test(level3CssSource));
  check("Level 3 stylesheet includes reduced-motion support", /prefers-reduced-motion:\s*reduce/.test(level3CssSource));
  check("Level 3 stylesheet has no intentional horizontal overflow", !/overflow-x\s*:\s*(?:auto|scroll)/.test(level3CssSource));
  check("Level 3 stylesheet includes an accessible range control", /input\[type=\"range\"\]/.test(level3CssSource));
}
if (v2Files.length) {
  check("V2 design-system stylesheet present", v2Files.includes("v2-gei-design-system.css"), `found: ${v2Files.join(",")}`);
} else {
  console.log("  SKIP  no v2-*.css yet (pre-Phase-2 baseline)");
}

/* ------------------------------------------------------------------ *
 * 11b. SKIN SYSTEM (V2 changed the DEFAULT, not the data)
 * ------------------------------------------------------------------ */
section("11b. Skin system");
const skinDefault = loadPage("index.html");
check("6 skins registered (5 original + gei-hydraulic)",
  skinDefault.d.querySelectorAll("[data-skin-option]").length === 6,
  `found ${skinDefault.d.querySelectorAll("[data-skin-option]").length}`);
check("default skin is gei-hydraulic when nothing is saved",
  skinDefault.d.documentElement.dataset.skin === "gei-hydraulic",
  `got ${skinDefault.d.documentElement.dataset.skin}`);
check("hydraulic palette resolves to the dark surface",
  skinDefault.d.documentElement.style.getPropertyValue("--skin-bg").trim() === "#06070d",
  `--skin-bg=${skinDefault.d.documentElement.style.getPropertyValue("--skin-bg")}`);
check("hydraulic accent is brand cyan",
  skinDefault.d.documentElement.style.getPropertyValue("--skin-accent").trim() === "#2fd2ff");
check("gei-hydraulic persisted to gei-academy-skin-v1",
  skinDefault.w.localStorage.getItem("gei-academy-skin-v1") === "gei-hydraulic",
  `stored=${skinDefault.w.localStorage.getItem("gei-academy-skin-v1")}`);

// A learner who already picked a light skin must keep it. No forced reset.
for (const legacy of ["academic", "pink", "blue", "green", "dark"]) {
  const pg = loadPage("index.html", "", (w) => w.localStorage.setItem("gei-academy-skin-v1", legacy));
  check(`saved skin "${legacy}" is honoured, not reset`,
    pg.d.documentElement.dataset.skin === legacy,
    `got ${pg.d.documentElement.dataset.skin}`);
}
const legacyBg = loadPage("index.html", "", (w) => w.localStorage.setItem("gei-academy-skin-v1", "academic"));
check("saved academic skin still resolves light (#f7f9fc)",
  legacyBg.d.documentElement.style.getPropertyValue("--skin-bg").trim() === "#f7f9fc",
  `--skin-bg=${legacyBg.d.documentElement.style.getPropertyValue("--skin-bg")}`);

/* ------------------------------------------------------------------ *
 * 12. RUNTIME ERRORS
 * ------------------------------------------------------------------ */
section("12. Runtime error budget");
// Known pre-existing defects in the V1.63.30 baseline. Recorded, not fixed, so that any
// NEW error introduced by the visual remix fails the run.
const KNOWN_BASELINE_ERRORS = [
  // FIXED IN V2.0.2 -- adam-milestones.js loadChildScript() used to do
  // dataset["geiMastery-milestones"] = marker; a hyphen is illegal in a DOMStringMap
  // property name, so the setter threw SyntaxError and aborted init(), leaving
  // adam-mastery-milestones.js, adam-mastery-celebration.js and adam-reward-unlock.js
  // uninjected. It now uses setAttribute. If this error ever returns, section 2b fails too.
  //
  // FIXED IN V2.0.9 -- was "NotFoundError: The child can not be found in the parent."
  // Owned by v1-63-16-gei-video-lab-intelligence.js, which called
  // root.insertBefore(section, connection) while connection.parentNode was
  // .gei-video-learning rather than #video-root. The throw happened after the
  // dataset.v16316 = "ready" marker was set, so the whole Video Lab reflection /
  // saved-notes UI never mounted and never retried. Now inserts via
  // connection.parentNode. If this error ever returns, this section fails.
  //
  // 1. profile.js render() reaches c.querySelector("#gei-profile-percent").textContent.
  //    The card is intact at boot (verified), so something later in the gei:xp-updated
  //    fan-out strips that node. Owning module not yet identified.
  "Cannot set properties of null",
];
const distinct = [...new Set(idx.errors.map((e) => (e.match(/\[(.*?)\]/) || [, e])[1].split("\n")[0]))];
const unexpected = distinct.filter((e) => !KNOWN_BASELINE_ERRORS.some((k) => e.includes(k)));
check("no NEW runtime errors beyond the recorded baseline", unexpected.length === 0, unexpected.join(" | "));
check(`baseline still has exactly ${KNOWN_BASELINE_ERRORS.length} known defect${KNOWN_BASELINE_ERRORS.length === 1 ? "" : "s"}`,
  distinct.filter((e) => KNOWN_BASELINE_ERRORS.some((k) => e.includes(k))).length === KNOWN_BASELINE_ERRORS.length,
  `seen=${distinct.join(" | ")}`);
for (const e of distinct) warnings.push(`known pre-existing runtime error: ${e}`);

/* ------------------------------------------------------------------ */
console.log("\n" + "═".repeat(70));
console.log(`  ${pass} passed, ${fail} failed`);
if (warnings.length) {
  console.log(`\n  warnings (${warnings.length}):`);
  for (const w of warnings.slice(0, 12)) console.log(`   • ${w}`);
}
if (fail) {
  console.log("\n  FAILED CHECKS:");
  for (const f of failures) console.log(`   ✗ ${f}`);
}
console.log("═".repeat(70));
process.exit(fail ? 1 : 0);
