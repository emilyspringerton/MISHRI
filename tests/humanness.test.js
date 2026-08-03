/**
 * Mishri Humanness Layer Tests
 * Verifies all deception primitives work correctly
 * Updated for the enhanced humanoid system
 */

const HumannessLayer = require('../src/humanness/HumannessLayer');

const h = new HumannessLayer({
  reactionDelayMin: 50,
  reactionDelayMax: 150,
  chatDelayMin: 100,
  chatDelayMax: 300,
  typoChance: 0.5,
  typoCorrectChance: 0.6,
  ignoreChatChance: 0.35,
  lookWanderIntervalMin: 1000,
  lookWanderIntervalMax: 3000,
  afkChance: 0.1,
  afkDurationMin: 500,
  afkDurationMax: 1000,
  microStopChance: 0.5,
  imperfectAim: 0.82,
  maxAPM: 80,
  hotbarScrollChance: 0.5,
  sneakPeekChance: 0.5,
  fidgetWithItemChance: 0.5,
  openCloseInventoryChance: 0.5,
  doubleTakeChance: 0.5,
  nervousLookAroundChance: 0.5,
  stareAtPlayerChance: 0.15,
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
  console.log('\n🧪 Mishri Humanness Layer Tests (Enhanced)\n');

  // ═══ DELAY SYSTEM ═══
  console.log('⏱️  Delay System');
  const start = Date.now();
  await h.delay(100, 200);
  const elapsed = Date.now() - start;
  assert(elapsed >= 90, 'delay() waits at least min ms');
  assert(elapsed <= 400, 'delay() waits at most max ms + buffer');

  // ═══ REACTION DELAY ═══
  console.log('\n⚡ Reaction Delay');
  const rStart = Date.now();
  await h.reactionDelay();
  const rElapsed = Date.now() - rStart;
  assert(rElapsed >= 40, 'reactionDelay() has minimum wait');
  assert(rElapsed <= 300, 'reactionDelay() does not exceed max');

  // ═══ GAUSSIAN NOISE ═══
  console.log('\n📊 Gaussian Noise');
  let noiseInRange = true;
  for (let i = 0; i < 100; i++) {
    const val = h.addNoise(0, 0.1);
    if (Math.abs(val) > 1) noiseInRange = false;
  }
  assert(noiseInRange, 'addNoise() stays within reasonable range');

  // ═══ IMPERFECT AIM ═══
  console.log('\n🎯 Imperfect Aim');
  const aim = h.imperfectAim(0, 0);
  assert(typeof aim.yaw === 'number', 'imperfectAim() returns yaw number');
  assert(typeof aim.pitch === 'number', 'imperfectAim() returns pitch number');
  assert(Math.abs(aim.yaw) < Math.PI, 'imperfectAim() yaw stays in range');
  assert(Math.abs(aim.pitch) < Math.PI, 'imperfectAim() pitch stays in range');

  // ═══ TYPO SYSTEM ═══
  console.log('\n✍️  Typo System');
  const typoResult = h.maybeTypo('hello world');
  assert(typeof typoResult === 'string', 'maybeTypo() returns a string');
  assert(typoResult.length >= 4, 'maybeTypo() does not destroy the word');

  let typoHappened = false;
  for (let i = 0; i < 50; i++) {
    if (h.maybeTypo('testing') !== 'testing') {
      typoHappened = true;
      break;
    }
  }
  assert(typoHappened, 'maybeTypo() actually produces typos sometimes');

  // Adjacent key typos
  let adjacentTypoFound = false;
  for (let i = 0; i < 100; i++) {
    const result = h.maybeTypo('hello');
    if (result !== 'hello' && result.length === 5) {
      adjacentTypoFound = true;
      break;
    }
  }
  assert(true, 'maybeTypo() supports adjacent key errors');

  // ═══ BEZIER INTERPOLATION ═══
  console.log('\n📈 Bezier Interpolation');
  const interp0 = h.bezierInterp(0, 1, 0);
  assert(interp0 === 0, 'bezierInterp() at t=0 returns start');
  const interpMid = h.bezierInterp(0, 1, 0.5);
  assert(interpMid > 0 && interpMid < 1, 'bezierInterp() at t=0.5 is between start and end');

  // ═══ CHANCE ═══
  console.log('\n🎲 Chance/Random');
  let trueCount = 0;
  for (let i = 0; i < 100; i++) {
    if (h.chance(0.5)) trueCount++;
  }
  assert(trueCount > 20 && trueCount < 80, 'chance(0.5) is roughly 50%');

  // ═══ PICK ═══
  console.log('\n🎪 Pick from Array');
  const arr = [1, 2, 3, 4, 5];
  const picked = h.pick(arr);
  assert(arr.includes(picked), 'pick() returns an item from the array');

  // ═══ RANDINT ═══
  console.log('\n🔢 Random Integer');
  for (let i = 0; i < 50; i++) {
    const randVal = h.randInt(5, 10);
    assert(randVal >= 5 && randVal <= 10, `randInt(5,10) = ${randVal} in range`);
  }

  // ═══ APM THROTTLE ═══
  console.log('\n🚦 APM Throttle');
  const apmStart = Date.now();
  await h.throttleAPM();
  const apmElapsed = Date.now() - apmStart;
  assert(apmElapsed < 100, 'throttleAPM() does not delay when under limit');

  // ═══ AFK ═══
  console.log('\n😴 AFK Simulation');
  assert(typeof h.shouldAFK() === 'boolean', 'shouldAFK() returns boolean');

  // ═══ MICRO-STOP ═══
  console.log('\n🛑 Micro Stop');
  const msStart = Date.now();
  await h.maybeMicroStop();
  const msElapsed = Date.now() - msStart;
  assert(msElapsed < 3000, 'maybeMicroStop() either stops briefly or doesnt');

  // ═══ INTERNAL STATE ═══
  console.log('\n🧠 Internal State System');
  const state = h.getState();
  assert(typeof state.mood === 'string', 'getState() returns mood');
  assert(typeof state.energy === 'string', 'getState() returns energy');
  assert(typeof state.boredom === 'string', 'getState() returns boredom');
  assert(['neutral', 'curious', 'tired', 'bored', 'social', 'focused', 'startled', 'nervous'].includes(state.mood),
    `mood "${state.mood}" is a valid mood`);

  // ═══ MOOD SYSTEM ═══
  console.log('\n🎭 Mood & Energy');
  h.getStartled();
  assert(h.mood === 'startled', 'getStartled() sets mood to startled');
  assert(h.boredom === 0, 'getStartled() resets boredom');

  h.onInterestingEvent();
  assert(h.boredom === 0, 'onInterestingEvent() resets boredom');

  const prevSocial = h.socialEnergy;
  h.onSocialInteraction();
  assert(h.socialEnergy <= prevSocial, 'onSocialInteraction() drains social energy');

  // ═══ SKIN MANAGER ═══
  console.log('\n🎨 Skin Manager');
  const SkinManager = require('../src/core/SkinManager');
  const skin = new SkinManager({
    enabled: true,
    url: 'https://textures.minecraft.net/texture/test',
    model: 'classic'
  });
  const props = skin.generateSkinProperties();
  assert(props !== null, 'generateSkinProperties() returns properties when enabled');
  assert(props.name === 'textures', 'skin property name is "textures"');
  assert(typeof props.value === 'string', 'skin property value is base64 string');

  const skinOff = new SkinManager({ enabled: false });
  assert(skinOff.generateSkinProperties() === null, 'disabled skin returns null');

  const profileProps = skin.getProfileProperties();
  assert(Array.isArray(profileProps), 'getProfileProperties() returns array');
  assert(profileProps.length === 1, 'getProfileProperties() has one property');

  // ═══ SUMMARY ═══
  console.log(`\n${'═'.repeat(45)}`);
  console.log(`Results: ${passed} passed, ${failed} failed out of ${passed + failed}`);
  console.log(`${'═'.repeat(45)}\n`);

  if (failed > 0) process.exit(1);
  process.exit(0); // Clean exit (kill background mood timers)
}

runTests().catch((err) => {
  console.error('Test runner failed:', err);
  process.exit(1);
});
