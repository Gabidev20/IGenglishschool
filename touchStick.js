/* ==========================================================================
   IGenglishschool — 👆 Touch stick (drag to steer) for the games
   --------------------------------------------------------------------------
   Put a finger anywhere on the game and drag: the avatar goes that way,
   and the finger can change direction without leaving the screen — like a
   joystick that appears where the finger landed. If the finger travels far,
   the joystick follows it, so turning back is always a short move.

   Several fingers at once (two players on one tablet): each finger is its
   own stick. Used by Maze Muncher and Jump & Learn.

   tsStick(surface, { onStart(e) -> ctx | null, onMove(ctx, dx, dy), onEnd(ctx) })
   returns a function that removes it.
   ========================================================================== */

const TS_RADIUS = 56;          // how far the knob goes from the centre (px)

function tsStick(surface, opts) {
  const o = opts || {};
  const sticks = new Map();    // pointerId -> { x0, y0, ctx, ring, knob }
  const show = (x, y) => {
    const ring = document.createElement('div');
    ring.className = 'ts-ring';
    ring.style.left = `${x}px`; ring.style.top = `${y}px`;
    const knob = document.createElement('div');
    knob.className = 'ts-knob';
    ring.appendChild(knob);
    document.body.appendChild(ring);
    return { ring, knob };
  };
  const down = e => {
    if (e.button != null && e.button > 0) return;
    const ctx = o.onStart ? o.onStart(e) : {};
    if (ctx === null) return;
    e.preventDefault();
    try { surface.setPointerCapture(e.pointerId); } catch (x) { /* old browser */ }
    const vis = e.pointerType === 'mouse' ? {} : show(e.clientX, e.clientY);
    sticks.set(e.pointerId, { x0: e.clientX, y0: e.clientY, ctx, ...vis });
  };
  const move = e => {
    const s = sticks.get(e.pointerId);
    if (!s) return;
    e.preventDefault();
    let dx = e.clientX - s.x0, dy = e.clientY - s.y0;
    const dist = Math.hypot(dx, dy);
    if (dist > TS_RADIUS) {
      // The joystick follows a finger that went far.
      s.x0 = e.clientX - dx / dist * TS_RADIUS; s.y0 = e.clientY - dy / dist * TS_RADIUS;
      dx = e.clientX - s.x0; dy = e.clientY - s.y0;
      if (s.ring) { s.ring.style.left = `${s.x0}px`; s.ring.style.top = `${s.y0}px`; }
    }
    if (s.knob) s.knob.style.transform = `translate(${dx}px, ${dy}px)`;
    if (o.onMove) o.onMove(s.ctx, dx, dy);
  };
  const up = e => {
    const s = sticks.get(e.pointerId);
    if (!s) return;
    sticks.delete(e.pointerId);
    if (s.ring) s.ring.remove();
    if (o.onEnd) o.onEnd(s.ctx);
  };
  surface.addEventListener('pointerdown', down);
  surface.addEventListener('pointermove', move);
  surface.addEventListener('pointerup', up);
  surface.addEventListener('pointercancel', up);
  // A long press must never open the browser's menu over the game.
  const noMenu = e => e.preventDefault();
  surface.addEventListener('contextmenu', noMenu);
  return () => {
    surface.removeEventListener('pointerdown', down);
    surface.removeEventListener('pointermove', move);
    surface.removeEventListener('pointerup', up);
    surface.removeEventListener('pointercancel', up);
    surface.removeEventListener('contextmenu', noMenu);
    sticks.forEach(s => { if (s.ring) s.ring.remove(); });
    sticks.clear();
  };
}

// Which way a drag points, once it is clear enough (Maze Muncher).
function tsDirection(dx, dy, min) {
  if (Math.max(Math.abs(dx), Math.abs(dy)) < (min || 16)) return null;
  return Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up');
}

// The whole game window: no long-press menu, no text selection, no image
// dragging — on the buttons too (their arrows are pictures).
function tsNoMenus(root) {
  if (!root || root.dataset.tsNoMenus) return;
  root.dataset.tsNoMenus = '1';
  root.addEventListener('contextmenu', e => e.preventDefault());
  root.addEventListener('dragstart', e => e.preventDefault());
}
