// SUNSET BAY — saving and loading.
// One clear job: persist the campaign (cash, missions, best stats) in
// localStorage and restore it on continue.

const KEY = 'sunsetbay-save-v1';

export function hasSave() {
  try {
    return !!window.localStorage.getItem(KEY);
  } catch (err) {
    return false;
  }
}

export function saveGame(state) {
  try {
    const data = {
      cash: state.cash,
      missionIndex: state.missionIndex,
      completed: state.completedMissions.slice(),
      bestCash: state.bestCash,
      totalEarned: state.totalEarned,
      player: { x: state.player.x, y: state.player.y, hp: state.player.hp },
      savedAt: Date.now(),
    };
    window.localStorage.setItem(KEY, JSON.stringify(data));
    return true;
  } catch (err) {
    return false;
  }
}

export function loadGame() {
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (typeof data.cash !== 'number' || !Array.isArray(data.completed)) return null;
    return data;
  } catch (err) {
    return null;
  }
}

export function clearSave() {
  try {
    window.localStorage.removeItem(KEY);
  } catch (err) {
    // Storage unavailable; a new game simply starts fresh.
  }
}

// When the last save was written, or null when there is none.
export function lastSavedAt() {
  const data = loadGame();
  return data && data.savedAt ? data.savedAt : null;
}
