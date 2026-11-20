// SUNSET BAY — keyboard and mouse input.
// One clear job: turn browser events into one clean input state the game reads.

export function createInput(canvas) {
  const keys = new Set();
  const pressed = new Set();
  const mouse = { x: 0, y: 0, down: false, clicked: false };

  function keyName(e) {
    return e.key.length === 1 ? e.key.toLowerCase() : e.key;
  }

  window.addEventListener('keydown', (e) => {
    const k = keyName(e);
    if ([' ', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
      e.preventDefault();
    }
    if (!keys.has(k)) pressed.add(k);
    keys.add(k);
  });
  window.addEventListener('keyup', (e) => keys.delete(keyName(e)));
  window.addEventListener('blur', () => {
    keys.clear();
    mouse.down = false;
  });

  canvas.addEventListener('mousemove', (e) => {
    const r = canvas.getBoundingClientRect();
    mouse.x = e.clientX - r.left;
    mouse.y = e.clientY - r.top;
  });
  canvas.addEventListener('mousedown', (e) => {
    if (e.button === 0) {
      mouse.down = true;
      mouse.clicked = true;
    }
  });
  window.addEventListener('mouseup', () => {
    mouse.down = false;
  });

  // WASD plus arrows; call once per frame to read edge-triggered keys.
  function axis() {
    const x = (keys.has('d') || keys.has('ArrowRight') ? 1 : 0) - (keys.has('a') || keys.has('ArrowLeft') ? 1 : 0);
    const y = (keys.has('s') || keys.has('ArrowDown') ? 1 : 0) - (keys.has('w') || keys.has('ArrowUp') ? 1 : 0);
    return { x, y };
  }

  function isDown(...names) {
    return names.some((n) => keys.has(n));
  }

  function wasPressed(name) {
    return pressed.has(name);
  }

  function endFrame() {
    pressed.clear();
    mouse.clicked = false;
  }

  // True while any of the given keys is held down.
  function anyKey() {
    return keys.size > 0;
  }

  return { keys, mouse, axis, isDown, wasPressed, endFrame, anyKey };
}

// __REV__
