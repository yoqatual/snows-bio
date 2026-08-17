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

  // Cool blue/purple palette, back layer darker + more purple,
  // front layer lighter + more blue, so there's a sense of depth.
  const LAYER_COLORS = [
    { fill: "#241a4a", window: "rgba(190, 200, 255, 0.55)" },
    { fill: "#2f2360", window: "rgba(200, 210, 255, 0.7)" },
    { fill: "#3b2c78", window: "rgba(220, 225, 255, 0.9)" }
  ];

  function resize() {
    width = canvas.width = window.innerWidth;
    height = canvas.height = window.innerHeight;
    groundY = height * 0.86;
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

  function initCars() {

    cars = [];

    const laneY = groundY + 6;
    const carCount = Math.max(3, Math.floor(width / 300));

    for (let i = 0; i < carCount; i++) {

      const direction = Math.random() < 0.5 ? 1 : -1;

      cars.push({
        x: Math.random() * width,
        y: laneY + (direction > 0 ? 10 : 0),
        speed: (0.6 + Math.random() * 1.2) * direction,
        color: Math.random() < 0.5 ? "#ff6b6b" : "#ffd166",
        length: 14 + Math.random() * 6
      });

    }

  }

  function drawCars() {

    cars.forEach(car => {

      car.x += car.speed;

      if (car.speed > 0 && car.x > width + 20) car.x = -20;
      if (car.speed < 0 && car.x < -20) car.x = width + 20;

      ctx.fillStyle = car.color;
      ctx.shadowColor = car.color;
      ctx.shadowBlur = 6;

      const dir = car.speed > 0 ? 1 : -1;
      ctx.fillRect(car.x, car.y, car.length * dir, 3);

      ctx.shadowBlur = 0;

    });

  }

  function drawStreet() {

    // Faint street strip at the very base, under the car lanes.
    ctx.fillStyle = "rgba(10, 8, 30, 0.9)";
    ctx.fillRect(0, groundY, width, height - groundY);

  }

  function animate() {

    ctx.clearRect(0, 0, width, height);

    buildingLayers.forEach(drawLayer);

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
