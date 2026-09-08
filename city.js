// =========================
// CITY SKYLINE BACKGROUND
// =========================
// Procedurally generated building silhouettes with lit windows,
// sitting along the bottom of the screen, plus little cars that
// drive back and forth along the street at the base.

function initCity() {

  const canvas = document.getElementById("city");
  if (!canvas) return;

  const ctx = canvas.getContext("2d");

  let width, height, groundY;
  let buildingLayers = [];
  let cars = [];
  let towerX = 0;
  let snowflakes = [];
  let planes = [];
  let train = null;

  // Black & white palette: distant buildings read lighter/hazier,
  // closest buildings go near-pure black for a strong silhouette.
  const LAYER_COLORS = [
    { fill: "#3a3a3a", window: "rgba(255, 255, 255, 0.35)" },
    { fill: "#1f1f1f", window: "rgba(255, 255, 255, 0.55)" },
    { fill: "#050505", window: "rgba(255, 255, 255, 0.85)" }
  ];

  function resize() {
    width = canvas.width = window.innerWidth;
    height = canvas.height = window.innerHeight;
    groundY = height * 0.86;
    towerX = width * 0.15;
    buildingLayers = LAYER_COLORS.map((color, i) =>
      generateLayer(color, i)
    );
    initSnow();
  }

  function initSnow() {

    snowflakes = [];
    const count = Math.floor(width / 8);

    for (let i = 0; i < count; i++) {
      snowflakes.push({
        x: Math.random() * width,
        y: Math.random() * height,
        radius: 1 + Math.random() * 2.2,
        speed: 0.5 + Math.random() * 1.4,
        drift: (Math.random() - 0.5) * 0.6,
        opacity: 0.25 + Math.random() * 0.55
      });
    }

  }

  function drawSnow() {

    snowflakes.forEach(f => {

      f.y += f.speed;
      f.x += f.drift;

      if (f.y > height) {
        f.y = -5;
        f.x = Math.random() * width;
      }
      if (f.x < -5) f.x = width + 5;
      if (f.x > width + 5) f.x = -5;

      ctx.fillStyle = `rgba(255, 255, 255, ${f.opacity})`;
      ctx.beginPath();
      ctx.arc(f.x, f.y, f.radius, 0, Math.PI * 2);
      ctx.fill();

    });

  }

  function generateLayer(color, layerIndex) {

    // Layers further back (lower index) are shorter and start
    // higher up the screen, so they peek out behind the front row.
    const depthFactor = (layerIndex + 1) / LAYER_COLORS.length;
    const maxHeight = height * 0.32 * depthFactor + height * 0.12;
    const minHeight = maxHeight * 0.35;

    const buildings = [];
    let x = -20;

    while (x < width + 20) {

      const w = 40 + Math.random() * 60;
      const h = minHeight + Math.random() * (maxHeight - minHeight);

      const windowRows = Math.max(2, Math.floor(h / 18));
      const windowCols = Math.max(2, Math.floor(w / 16));

      const windows = [];
      for (let r = 0; r < windowRows; r++) {
        for (let c = 0; c < windowCols; c++) {
          if (Math.random() < 0.55) {
            windows.push({ r, c });
          }
        }
      }

      buildings.push({ x, w, h, windowRows, windowCols, windows });

      x += w + 4 + Math.random() * 10;

    }

    return { color, buildings };

  }

  function drawLayer(layer) {

    ctx.fillStyle = layer.color.fill;

    layer.buildings.forEach(b => {
      ctx.fillRect(b.x, groundY - b.h, b.w, b.h);
    });

    ctx.fillStyle = layer.color.window;

    const winW = 4;
    const winH = 6;

    layer.buildings.forEach(b => {

      const padX = b.w / b.windowCols;
      const padY = b.h / b.windowRows;

      b.windows.forEach(win => {
        const wx = b.x + win.c * padX + padX / 2 - winW / 2;
        const wy = groundY - b.h + win.r * padY + padY / 2 - winH / 2;
        ctx.fillRect(wx, wy, winW, winH);
      });

    });

  }

  function drawCNTower(x) {

    const H = height * 0.62; // total tower height
    const baseY = groundY;

    // Width of the tower at normalized height t (0 = base, 1 = tip).
    // A smooth taper down to a thin mast, with a gentle rounded
    // bulge (sine-shaped, no hard corners) for the pod.
    function halfWidthAt(t) {

      const wBase = 5;
      const wNeck1 = 2.4;
      const wNeck2 = 1.2;
      const podBump = 8;

      if (t < 0.55) {
        const local = t / 0.55;
        return wBase + (wNeck1 - wBase) * local;
      }

      if (t < 0.78) {
        const local = (t - 0.55) / (0.78 - 0.55);
        const baseline = wNeck1 + (wNeck2 - wNeck1) * local;
        const bump = Math.sin(local * Math.PI) * podBump;
        return baseline + bump;
      }

      const local = (t - 0.78) / (1 - 0.78);
      return wNeck2 * (1 - local);

    }

    const STEPS = 36;
    const leftPts = [];
    const rightPts = [];

    for (let i = 0; i <= STEPS; i++) {
      const t = i / STEPS;
      const y = baseY - H * t;
      const hw = halfWidthAt(t);
      leftPts.push([x - hw, y]);
      rightPts.push([x + hw, y]);
    }

    ctx.fillStyle = "#5a5a5a";
    ctx.strokeStyle = "rgba(255, 255, 255, 0.2)";
    ctx.lineWidth = 1;

    ctx.beginPath();
    ctx.moveTo(leftPts[0][0], leftPts[0][1]);
    for (let i = 1; i < leftPts.length; i++) {
      ctx.lineTo(leftPts[i][0], leftPts[i][1]);
    }
    for (let i = rightPts.length - 1; i >= 0; i--) {
      ctx.lineTo(rightPts[i][0], rightPts[i][1]);
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Thin dark band across the middle of the pod bulge
    const podPeakT = 0.665;
    const podPeakY = baseY - H * podPeakT;
    const podPeakHw = halfWidthAt(podPeakT);
    ctx.fillStyle = "rgba(0, 0, 0, 0.3)";
    ctx.fillRect(x - podPeakHw, podPeakY - 1, podPeakHw * 2, 3);

    // Pulsing white beacon right at the tip
    const tipY = baseY - H;
    const pulse = (Math.sin(Date.now() / 400) + 1) / 2; // 0..1
    const radius = 1.5 + pulse * 2;

    ctx.fillStyle = `rgba(255, 255, 255, ${0.5 + pulse * 0.5})`;
    ctx.shadowColor = "#ffffff";
    ctx.shadowBlur = 8 + pulse * 14;
    ctx.beginPath();
    ctx.arc(x, tipY, radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

  }

  function initCars() {

    cars = [];

    const laneY = groundY + 8;
    const carCount = Math.max(5, Math.floor(width / 180));

    for (let i = 0; i < carCount; i++) {

      const direction = Math.random() < 0.5 ? 1 : -1;

      cars.push({
        x: Math.random() * width,
        y: laneY + (direction > 0 ? 14 : 0),
        speed: (0.8 + Math.random() * 1.6) * direction,
        color: Math.random() < 0.5 ? "#ffffff" : "#dddddd",
        length: 20 + Math.random() * 10
      });

    }

  }

  function drawCars() {

    cars.forEach(car => {

      car.x += car.speed;

      if (car.speed > 0 && car.x > width + 30) car.x = -30;
      if (car.speed < 0 && car.x < -30) car.x = width + 30;

      const dir = car.speed > 0 ? 1 : -1;

      // Body
      ctx.fillStyle = car.color;
      ctx.shadowColor = car.color;
      ctx.shadowBlur = 14;
      ctx.fillRect(car.x, car.y, car.length * dir, 5);

      // Bright headlight dot at the leading edge
      ctx.fillStyle = "#ffffff";
      ctx.shadowBlur = 20;
      ctx.beginPath();
      ctx.arc(car.x + car.length * dir, car.y + 2.5, 2.5, 0, Math.PI * 2);
      ctx.fill();

      ctx.shadowBlur = 0;

    });

  }

  function maybeSpawnPlane() {

    // Small per-frame chance, only when none is currently on screen —
    // works out to roughly one plane every 20-40 seconds.
    if (planes.length === 0 && Math.random() < 0.0006) {

      const dir = Math.random() < 0.5 ? 1 : -1;
      const y = height * 0.08 + Math.random() * height * 0.18;

      planes.push({
        x: dir === 1 ? -30 : width + 30,
        y,
        vx: dir * (0.5 + Math.random() * 0.4),
        dir
      });

    }

  }

  function drawPlanes() {

    planes.forEach(p => {

      p.x += p.vx;

      // Faint body line
      ctx.strokeStyle = "rgba(255, 255, 255, 0.4)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(p.x - 9 * p.dir, p.y);
      ctx.lineTo(p.x + 9 * p.dir, p.y);
      ctx.stroke();

      // Blinking warning light on the tail
      const blinkOn = Math.floor(Date.now() / 500) % 2 === 0;

      if (blinkOn) {
        ctx.fillStyle = "#ff5555";
        ctx.shadowColor = "#ff5555";
        ctx.shadowBlur = 6;
        ctx.beginPath();
        ctx.arc(p.x - 9 * p.dir, p.y, 1.8, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
      }

    });

    planes = planes.filter(p => p.x > -50 && p.x < width + 50);

  }

  function maybeSpawnTrain() {

    if (!train && Math.random() < 0.0003) {

      const dir = Math.random() < 0.5 ? 1 : -1;
      const carsCount = 4 + Math.floor(Math.random() * 3);

      train = {
        x: dir === 1 ? -carsCount * 30 - 30 : width + carsCount * 30 + 30,
        y: groundY - height * 0.1,
        vx: dir * (2 + Math.random()),
        dir,
        carsCount
      };

    }

  }

  function drawTrain() {

    if (!train) return;

    train.x += train.vx;

    const carWidth = 26;
    const carGap = 3;
    const carHeight = 9;

    for (let i = 0; i < train.carsCount; i++) {

      const cx = train.x + i * (carWidth + carGap) * train.dir;

      ctx.fillStyle = "#0d0d0d";
      ctx.fillRect(cx, train.y, carWidth * train.dir, carHeight);

      ctx.fillStyle = "rgba(255, 255, 255, 0.55)";
      for (let w = 0; w < 3; w++) {
        ctx.fillRect(cx + (4 + w * 8) * train.dir, train.y + 2, 3, 3);
      }

    }

    const leadEdge = train.x + train.carsCount * (carWidth + carGap) * train.dir;
    if (leadEdge < -400 || leadEdge > width + 400) train = null;

  }

  function drawStreet() {

    // Faint street strip at the very base, under the car lanes.
    ctx.fillStyle = "rgba(20, 20, 20, 0.95)";
    ctx.fillRect(0, groundY, width, height - groundY);

  }

  function animate() {

    ctx.clearRect(0, 0, width, height);

    // Draw the back-most building layer, then the tower and any
    // passing train (so they read as sitting just behind the
    // closer rows), then the remaining layers in front of them.
    drawLayer(buildingLayers[0]);
    drawCNTower(towerX);
    maybeSpawnTrain();
    drawTrain();
    for (let i = 1; i < buildingLayers.length; i++) {
      drawLayer(buildingLayers[i]);
    }

    drawStreet();
    drawCars();

    maybeSpawnPlane();
    drawPlanes();

    drawSnow();

    requestAnimationFrame(animate);

  }

  resize();
  initCars();

  window.addEventListener("resize", () => {
    resize();
    initCars();
  });

  animate();

}
