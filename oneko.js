// =========================
// ONEKO CURSOR CAT
// =========================
// A little cat that idles until you move your mouse, then runs
// to catch up, with idle/sleep/scratch animations when it's not
// chasing. Classic "oneko" style.
//
// Sprite sheet: 8 columns x 4 rows, 32x32px per frame.
// Using the original public-domain oneko/xneko art (by Tatsuya
// Kato & Masayuki Koba), served from adryd325/oneko.js on GitHub.

function initOnekoCat() {

  const SPRITE_URL =
    "https://raw.githubusercontent.com/adryd325/oneko.js/14bab15a755d0e35cd4ae19c931d96d306f99f42/oneko.gif";

  const FRAME_SIZE = 32;
  const SPEED = 10;         // px the cat moves per tick when chasing
  const TICK_MS = 100;      // ~10fps, matches the sprite's chunky feel
  const IDLE_DISTANCE = 48; // how close the mouse can be before the cat stops

  // [column, row] pairs on the sprite sheet for each animation state.
  // Multi-frame states alternate frames each tick for a walking/
  // scratching effect.
  const FRAMES = {
    idle:     [[3, 3]],
    alert:    [[7, 3]],
    scratch:  [[5, 0], [6, 0], [7, 0]],
    tired:    [[3, 2]],
    sleeping: [[2, 0], [2, 1]],
    N:        [[1, 2], [1, 3]],
    NE:       [[0, 2], [0, 3]],
    E:        [[3, 0], [3, 1]],
    SE:       [[5, 1], [5, 2]],
    S:        [[6, 3], [7, 2]],
    SW:       [[5, 3], [6, 1]],
    W:        [[4, 2], [4, 3]],
    NW:       [[1, 0], [1, 1]]
  };

  const cat = document.createElement("div");
  cat.id = "oneko";
  cat.style.position = "fixed";
  cat.style.width = FRAME_SIZE + "px";
  cat.style.height = FRAME_SIZE + "px";
  cat.style.pointerEvents = "none";
  cat.style.zIndex = "999999";
  cat.style.imageRendering = "pixelated";
  cat.style.backgroundImage = `url("${SPRITE_URL}")`;
  document.body.appendChild(cat);

  let catX = window.innerWidth / 2;
  let catY = window.innerHeight / 2;
  let mouseX = catX;
  let mouseY = catY;
  let frameToggle = 0;
  let idleTicks = 0;

  document.addEventListener("mousemove", (e) => {
    mouseX = e.clientX;
    mouseY = e.clientY;
  });

  function setFrame(state) {
    const options = FRAMES[state];
    const [col, row] = options[frameToggle % options.length];
    cat.style.backgroundPosition =
      (-col * FRAME_SIZE) + "px " + (-row * FRAME_SIZE) + "px";
  }

  function directionFromAngle(angle) {
    // angle in degrees, 0 = east, going clockwise (screen y grows down)
    const dirs = ["E", "SE", "S", "SW", "W", "NW", "N", "NE"];
    const index = Math.round(((angle + 360) % 360) / 45) % 8;
    return dirs[index];
  }

  function tick() {

    frameToggle++;

    const diffX = mouseX - catX;
    const diffY = mouseY - catY;
    const distance = Math.sqrt(diffX * diffX + diffY * diffY);

    if (distance < IDLE_DISTANCE) {

      idleTicks++;

      // Sit for a bit, then occasionally scratch or fall asleep,
      // just for a bit of personality while parked.
      if (idleTicks > 80) {
        setFrame("sleeping");
      } else if (idleTicks > 40) {
        setFrame("tired");
      } else if (idleTicks > 20 && idleTicks % 10 < 3) {
        setFrame("scratch");
      } else {
        setFrame("idle");
      }

    } else {

      idleTicks = 0;

      const angle = Math.atan2(diffY, diffX) * (180 / Math.PI);
      const dir = directionFromAngle(angle);

      const step = Math.min(SPEED, distance);
      catX += (diffX / distance) * step;
      catY += (diffY / distance) * step;

      setFrame(dir);

    }

    cat.style.left = (catX - FRAME_SIZE / 2) + "px";
    cat.style.top = (catY - FRAME_SIZE / 2) + "px";

  }

  setInterval(tick, TICK_MS);

}
