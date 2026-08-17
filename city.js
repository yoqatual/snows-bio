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
    // A smooth taper down to a thin mast, with two rounded bulges
    // (sine-shaped, no hard corners) for the SkyPod and the smaller
    // upper deck above it.
    function halfWidthAt(t) {

      // Baseline taper, defined as width checkpoints from base (t=0) to tip (t=1)
      const points = [
        { t: 0,    w: 7 },
        { t: 0.58, w: 2.2 },
        { t: 0.66, w: 1.8 },
        { t: 0.74, w: 1.0 },
        { t: 0.80, w: 0.8 },
        { t: 1,    w: 0.05 }
      ];

      let base = points[0].w;
      for (let i = 0; i < points.length - 1; i++) {
        const a = points[i], b = points[i + 1];
        if (t >= a.t && t <= b.t) {
          const local = (t - a.t) / (b.t - a.t);
          base = a.w + (b.w - a.w) * local;
          break;
        }
      }

      // Two bulges: the main SkyPod, and the smaller upper deck above it
      const bumps = [
        { start: 0.58, end: 0.66, amp: 3.0 },
        { start: 0.74, end: 0.80, amp: 1.0 }
      ];

      let bump = 0;
      for (const b of bumps) {
        if (t >= b.start && t <= b.end) {
          const local = (t - b.start) / (b.end - b.start);
          bump = Math.sin(local * Math.PI) * b.amp;
          break;
        }
      }

      return base + bump;

    }

    const STEPS = 60;
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

    // Thin dark band across the middle of the main pod bulge
    const podPeakT = 0.62;
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

  function drawStreet() {

    // Faint street strip at the very base, under the car lanes.
    ctx.fillStyle = "rgba(20, 20, 20, 0.95)";
    ctx.fillRect(0, groundY, width, height - groundY);

  }

  function animate() {

    ctx.clearRect(0, 0, width, height);

    // Draw the back-most building layer, then the tower (so it
    // reads as sitting just behind the closer rows), then the
    // remaining layers in front of it.
    drawLayer(buildingLayers[0]);
    drawCNTower(towerX);
    for (let i = 1; i < buildingLayers.length; i++) {
      drawLayer(buildingLayers[i]);
    }

    drawStreet();
    drawCars();

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
