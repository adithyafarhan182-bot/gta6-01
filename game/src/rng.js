// SUNSET BAY — deterministic random numbers.
// One clear job: a small seeded generator so the city is the same every run
// and staged screenshots reproduce exactly.

// mulberry32: tiny, fast, good enough for a game.
export function makeRng(seed) {
  let a = seed >>> 0;
  return function next() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Helpers bound to one generator instance.
export function rngHelpers(rng) {
  return {
    range(min, max) {
      return min + rng() * (max - min);
    },
    int(min, max) {
      return Math.floor(min + rng() * (max - min + 1));
    },
    pick(list) {
      return list[Math.floor(rng() * list.length)];
    },
    chance(p) {
      return rng() < p;
    },
  };
}

// Fisher–Yates shuffle bound to the same generator.
export function shuffleList(rng, list) {
  const out = list.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    const tmp = out[i];
    out[i] = out[j];
    out[j] = tmp;
  }
  return out;
}
