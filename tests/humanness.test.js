/**
 * Mishri Humanness Layer Tests
 * Verifies all deception primitives work correctly
 */

const HumannessLayer = require('../src/humanness/HumannessLayer');

const h = new HumannessLayer({
  reactionDelayMin: 50,
  reactionDelayMax: 150,
  chatDelayMin: 100,
  chatDelayMax: 300,
  typoChance: 0.5,
  ignoreChatChance: 0.3,
  lookWanderIntervalMin: 1000,
  lookWanderIntervalMax: 3000,
  afkChance: 0.1,
  afkDurationMin: 500,
  afkDurationMax: 1000,
  microStopChance: 0.5,
  imperfectAim: 0.85,
  maxAPM: 90,
});

let passed = 0;
let failed = 0;

function assert(condition, testName) {
  if (condition) {
    console.log(`  ✅ ${testName}`);
    passed++;
  } else {
    console.log(`  ❌ ${testName}`);
    failed++;
  }
}

async function runTests() {
  console.log('\n🧪 Mishri Humanness Layer Tests\n');

  // --- Delay Tests ---
  console.log('⏱️  Delay System');
  const start = Date.now();
  await h.delay(100, 200);
  const elapsed = Date.now() - start;
  assert(elapsed >= 90, 'delay() waits at least min ms');
  assert(elapsed <= 300, 'delay() waits at most max ms + buffer');

  // --- Reaction Delay ---
  console.log('\n⚡ Reaction Delay');
  const rStart = Date.now();
  await h.reactionDelay();
  const rElapsed = Date.now() - rStart;
  assert(rElapsed >= 40, 'reactionDelay() has minimum wait');
  assert(rElapsed <= 250, 'reactionDelay() does not exceed max');

  // --- Noise ---
  console.log('\n📊 Gaussian Noise');
  let noiseInRange = true;
  for (let i = 0; i < 100; i++) {
    const val = h.addNoise(0, 0.1);
    if (Math.abs(val) > 1) noiseInRange = false; // Should rarely exceed 10σ
  }
  assert(noiseInRange, 'addNoise() stays within reasonable range');

  // --- Imperfect Aim ---
  console.log('\n🎯 Imperfect Aim');
  const aim = h.imperfectAim(0, 0);
  assert(aim.yaw !== 0 || aim.pitch !== 0, 'imperfectAim() adds noise (not exact)');
  assert(Math.abs(aim.yaw) < Math.PI, 'imperfectAim() yaw stays in range');
  assert(Math.abs(aim.pitch) < Math.PI, 'imperfectAim() pitch stays in range');

  // --- Typo ---
  console.log('\n✍️  Typo System');
  const typoResult = h.maybeTypo('hello world');
  assert(typeof typoResult === 'string', 'maybeTypo() returns a string');
  assert(typoResult.length >= 5, 'maybeTypo() does not destroy the word');

  // Run many times to check typo actually happens
  let typoHappened = false;
  for (let i = 0; i < 50; i++) {
    if (h.maybeTypo('testing') !== 'testing') {
      typoHappened = true;
      break;
    }
  }
  assert(typoHappened, 'maybeTypo() actually produces typos sometimes');

  // Short text shouldn't get typos often
  const shortResult = h.maybeTypo('hi');
  assert(typeof shortResult === 'string', 'maybeTypo() handles short text');

  // --- Bezier Interpolation ---
  console.log('\n📈 Bezier Interpolation');
  const interp0 = h.bezierInterp(0, 1, 0);
  const interp1 = h.bezierInterp(0, 1, 1);
  assert(interp0 === 0, 'bezierInterp() at t=0 returns start');
  assert(Math.abs(interp1 - 1) < 0.5, 'bezierInterp() at t=1 returns approx end');

  // --- Chance ---
  console.log('\n🎲 Chance/Random');
  let trueCount = 0;
  for (let i = 0; i < 100; i++) {
    if (h.chance(0.5)) trueCount++;
  }
  assert(trueCount > 20 && trueCount < 80, 'chance(0.5) is roughly 50%');

  // --- Pick ---
  console.log('\n🎪 Pick from Array');
  const arr = [1, 2, 3, 4, 5];
  const picked = h.pick(arr);
  assert(arr.includes(picked), 'pick() returns an item from the array');

  // --- RandInt ---
  console.log('\n🔢 Random Integer');
  const randVal = h.randInt(5, 10);
  assert(randVal >= 5 && randVal <= 10, 'randInt() returns value in range');

  // --- APM Throttle ---
  console.log('\n🚦 APM Throttle');
  const apmStart = Date.now();
  await h.throttleAPM();
  const apmElapsed = Date.now() - apmStart;
  assert(apmElapsed < 100, 'throttleAPM() does not delay when under limit');

  // --- AFK ---
  console.log('\n😴 AFK Simulation');
  assert(typeof h.shouldAFK() === 'boolean', 'shouldAFK() returns boolean');

  // --- Micro-stop ---
  console.log('\n🛑 Micro Stop');
  const msStart = Date.now();
  await h.maybeMicroStop();
  const msElapsed = Date.now() - msStart;
  assert(msElapsed < 2000, 'maybeMicroStop() either stops briefly or doesnt');

  // --- Summary ---
  console.log(`\n${'═'.repeat(40)}`);
  console.log(`Results: ${passed} passed, ${failed} failed out of ${passed + failed}`);
  console.log(`${'═'.repeat(40)}\n`);

  if (failed > 0) process.exit(1);
}

runTests().catch((err) => {
  console.error('Test runner failed:', err);
  process.exit(1);
});
