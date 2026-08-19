// =========================
// CITY SKYLINE BACKGROUND (3D / Three.js)
// =========================
// Same idea as the old 2D canvas version — layered building
// silhouettes, a CN Tower, cars driving along the street — but
// now built as an actual 3D scene so buildings have real depth
// and the cars are real low-poly meshes instead of glowing bars.
//
// Requires Three.js to be loaded before this file, e.g. in your
// HTML <head> or before the city.js <script> tag:
//
//   <script src="https://unpkg.com/three@0.160.0/build/three.min.js"></script>
//
// Uses the existing <canvas id="city"></canvas> element as the
// WebGL render target, so no HTML changes beyond the script tag
// above are needed.

function initCity() {

  const canvasEl = document.getElementById("city");
  if (!canvasEl) return;
  if (typeof THREE === "undefined") {
    console.error("Three.js not loaded — add the three.js <script> tag before city.js");
    return;
  }

  // -------------------------
  // Core scene / camera / renderer
  // -------------------------

  const scene = new THREE.Scene();

  const camera = new THREE.PerspectiveCamera(
    45,
    window.innerWidth / window.innerHeight,
    0.1,
    2000
  );

  const renderer = new THREE.WebGLRenderer({
    canvas: canvasEl,
    antialias: true,
    alpha: true
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));

  // -------------------------
  // Lighting
  // Mostly a night scene, so lights are dim — buildings read from
  // window textures / silhouette, not from illumination.
  // -------------------------

  scene.add(new THREE.AmbientLight(0x8899aa, 0.55));

  const moon = new THREE.DirectionalLight(0xaabbff, 0.6);
  moon.position.set(-40, 60, 40);
  scene.add(moon);

  // -------------------------
  // Layout constants (world units)
  // -------------------------

  const GROUND_Y = 0;
  const LAYER_Z = [-60, -30, 0];       // back, mid, front layers
  const LAYER_COLOR = [0x3a3a3a, 0x232323, 0x0a0a0a];
  const LAYER_WINDOW = ["rgba(255,255,255,0.35)", "rgba(255,255,255,0.55)", "rgba(255,255,255,0.85)"];
  const LAYER_HEIGHT_SCALE = [22, 30, 40]; // max building height per layer

  let width, height;
  let buildingGroups = [];
  let cars = [];
  let tower;
  let beaconLight, beaconMesh;
  let stars;
  let mouseX = 0, mouseY = 0;
  let streetWidthWorld = 200;

  // -------------------------
  // Window texture helper
  // Draws a small grid of lit windows onto a canvas and returns
  // it as a Three.js texture, used on the front face of buildings.
  // -------------------------

  function makeWindowTexture(wPx, hPx, windowColor) {

    const cnv = document.createElement("canvas");
    cnv.width = 64;
    cnv.height = Math.max(32, Math.round(64 * (hPx / wPx)));

    const c = cnv.getContext("2d");
    c.clearRect(0, 0, cnv.width, cnv.height);

    const cols = Math.max(2, Math.floor(cnv.width / 8));
    const rows = Math.max(2, Math.floor(cnv.height / 8));
    const padX = cnv.width / cols;
    const padY = cnv.height / rows;

    c.fillStyle = windowColor;

    for (let r = 0; r < rows; r++) {
      for (let col = 0; col < cols; col++) {
        if (Math.random() < 0.55) {
          c.fillRect(
            col * padX + padX * 0.25,
            r * padY + padY * 0.25,
            padX * 0.5,
            padY * 0.5
          );
        }
      }
    }

    const tex = new THREE.CanvasTexture(cnv);
    tex.magFilter = THREE.NearestFilter;
    tex.minFilter = THREE.NearestFilter;
    return tex;

  }

  // -------------------------
  // Buildings
  // -------------------------

  function buildLayer(layerIndex) {

    const group = new THREE.Group();
    const z = LAYER_Z[layerIndex];
    const baseColor = LAYER_COLOR[layerIndex];
    const windowColor = LAYER_WINDOW[layerIndex];
    const maxH = LAYER_HEIGHT_SCALE[layerIndex];

    const sideMat = new THREE.MeshLambertMaterial({ color: baseColor });

    let x = -streetWidthWorld / 2 - 10;

    while (x < streetWidthWorld / 2 + 10) {

      const w = 3 + Math.random() * 4;
      const d = 3 + Math.random() * 3;
      const h = maxH * (0.35 + Math.random() * 0.65);

      const winTex = makeWindowTexture(w, h, windowColor);
      const frontMat = new THREE.MeshBasicMaterial({ map: winTex });

      // Box face material order: [+x, -x, +y, -y, +z, -z]
      // Camera looks toward -z, so the +z face is what's visible.
      const materials = [
        sideMat, sideMat,
        sideMat, sideMat,
        frontMat, sideMat
      ];

      const geo = new THREE.BoxGeometry(w, h, d);
      const mesh = new THREE.Mesh(geo, materials);

      mesh.position.set(x + w / 2, GROUND_Y + h / 2, z);
      group.add(mesh);

      x += w + 0.6 + Math.random() * 1.2;

    }

    return group;

  }

  function rebuildBuildings() {

    buildingGroups.forEach(g => scene.remove(g));
    buildingGroups = LAYER_Z.map((_, i) => buildLayer(i));
    buildingGroups.forEach(g => scene.add(g));

  }

  // -------------------------
  // CN Tower — built with a LatheGeometry, revolving the same
  // taper + bulge profile from the old 2D version around the
  // vertical axis. This is what actually gives it a real 3D
  // "tower of revolution" shape instead of a flat cutout.
  // -------------------------

  function towerRadiusAt(t) {

    const points = [
      { t: 0,    r: 1.6 },
      { t: 0.58, r: 0.5 },
      { t: 0.66, r: 0.4 },
      { t: 0.74, r: 0.22 },
      { t: 0.80, r: 0.18 },
      { t: 1,    r: 0.02 }
    ];

    let base = points[0].r;
    for (let i = 0; i < points.length - 1; i++) {
      const a = points[i], b = points[i + 1];
      if (t >= a.t && t <= b.t) {
        const local = (t - a.t) / (b.t - a.t);
        base = a.r + (b.r - a.r) * local;
        break;
      }
    }

    const bumps = [
      { start: 0.58, end: 0.66, amp: 0.65 },
      { start: 0.74, end: 0.80, amp: 0.22 }
    ];

    let bump = 0;
    for (const bmp of bumps) {
      if (t >= bmp.start && t <= bmp.end) {
        const local = (t - bmp.start) / (bmp.end - bmp.start);
        bump = Math.sin(local * Math.PI) * bmp.amp;
        break;
      }
    }

    return base + bump;

  }

  function buildTower() {

    const H = 60;
    const STEPS = 48;
    const profile = [];

    for (let i = 0; i <= STEPS; i++) {
      const t = i / STEPS;
      const r = Math.max(0.01, towerRadiusAt(t));
      profile.push(new THREE.Vector2(r, t * H));
    }

    const geo = new THREE.LatheGeometry(profile, 24);
    const mat = new THREE.MeshStandardMaterial({
      color: 0x5a5a5a,
      metalness: 0.2,
      roughness: 0.7
    });

    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(-streetWidthWorld * 0.28, GROUND_Y, -20);

    // Pulsing beacon at the tip
    const beaconGeo = new THREE.SphereGeometry(0.4, 12, 12);
    const beaconMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    beaconMesh = new THREE.Mesh(beaconGeo, beaconMat);
    beaconMesh.position.set(mesh.position.x, H, mesh.position.z);

    beaconLight = new THREE.PointLight(0xffffff, 1, 20);
    beaconLight.position.copy(beaconMesh.position);

    scene.add(mesh);
    scene.add(beaconMesh);
    scene.add(beaconLight);

    return mesh;

  }

  // -------------------------
  // Cars — real low-poly 3D meshes: body, cabin, four wheels,
  // and a headlight/taillight glow depending on direction.
  // -------------------------

  function makeCar(color) {

    const group = new THREE.Group();

    const bodyMat = new THREE.MeshStandardMaterial({ color, roughness: 0.4, metalness: 0.3 });
    const body = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.55, 1), bodyMat);
    body.position.y = 0.45;
    group.add(body);

    const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.4, 0.85), bodyMat);
    cabin.position.set(-0.15, 0.85, 0);
    group.add(cabin);

    const wheelGeo = new THREE.CylinderGeometry(0.22, 0.22, 0.18, 12);
    const wheelMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.9 });

    const wheelPositions = [
      [0.75, 0.22, 0.55], [0.75, 0.22, -0.55],
      [-0.75, 0.22, 0.55], [-0.75, 0.22, -0.55]
    ];

    wheelPositions.forEach(p => {
      const wheel = new THREE.Mesh(wheelGeo, wheelMat);
      wheel.rotation.x = Math.PI / 2;
      wheel.position.set(p[0], p[1], p[2]);
      group.add(wheel);
    });

    // Headlight (front, glowing) and taillight (rear, dim red)
    const headMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.08, 8, 8), headMat);
    head.position.set(1.15, 0.45, 0);
    group.add(head);

    const tailMat = new THREE.MeshBasicMaterial({ color: 0xff3333 });
    const tail = new THREE.Mesh(new THREE.SphereGeometry(0.07, 8, 8), tailMat);
    tail.position.set(-1.15, 0.45, 0);
    group.add(tail);

    return group;

  }

  function rebuildCars() {

    cars.forEach(c => scene.remove(c.mesh));
    cars = [];

    const laneZ = 4;
    const carCount = Math.max(4, Math.floor(streetWidthWorld / 22));

    for (let i = 0; i < carCount; i++) {

      const direction = Math.random() < 0.5 ? 1 : -1;
      const colors = [0xffffff, 0xdddddd, 0xcfd8ff];
      const mesh = makeCar(colors[Math.floor(Math.random() * colors.length)]);

      mesh.rotation.y = direction > 0 ? 0 : Math.PI;
      mesh.position.set(
        (Math.random() - 0.5) * streetWidthWorld,
        GROUND_Y,
        laneZ * direction
      );

      scene.add(mesh);

      cars.push({
        mesh,
        speed: (0.06 + Math.random() * 0.08) * direction
      });

    }

  }

  // -------------------------
  // Street
  // -------------------------

  function buildStreet() {

    const geo = new THREE.PlaneGeometry(streetWidthWorld + 60, 16);
    const mat = new THREE.MeshLambertMaterial({ color: 0x141414 });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.set(0, GROUND_Y - 0.01, 8);
    scene.add(mesh);

  }

  // -------------------------
  // Stars
  // -------------------------

  function buildStars() {

    if (stars) scene.remove(stars);

    const count = 400;
    const positions = new Float32Array(count * 3);

    for (let i = 0; i < count; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 400;
      positions[i * 3 + 1] = Math.random() * 120 + 20;
      positions[i * 3 + 2] = -100 - Math.random() * 150;
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));

    const mat = new THREE.PointsMaterial({ color: 0xffffff, size: 0.6, sizeAttenuation: true });
    stars = new THREE.Points(geo, mat);
    scene.add(stars);

  }

  // -------------------------
  // Resize / layout
  // -------------------------

  function resize() {

    width = window.innerWidth;
    height = window.innerHeight;

    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height);

    // Keep the street roughly filling the viewport width regardless
    // of aspect ratio, similar to how the 2D version scaled to window.
    streetWidthWorld = Math.max(120, (width / height) * 110);

    camera.position.set(0, 26, 95);
    camera.lookAt(0, 14, 0);

    rebuildBuildings();
    rebuildCars();

  }

  // -------------------------
  // Animate
  // -------------------------

  function animate() {

    requestAnimationFrame(animate);

    // Cars drive back and forth, wrapping at the street edges
    cars.forEach(car => {
      car.mesh.position.x += car.speed;
      const limit = streetWidthWorld / 2 + 4;
      if (car.speed > 0 && car.mesh.position.x > limit) car.mesh.position.x = -limit;
      if (car.speed < 0 && car.mesh.position.x < -limit) car.mesh.position.x = limit;
    });

    // Pulsing beacon
    const pulse = (Math.sin(Date.now() / 400) + 1) / 2;
    if (beaconLight) beaconLight.intensity = 0.6 + pulse * 1.4;
    if (beaconMesh) beaconMesh.scale.setScalar(1 + pulse * 0.4);

    // Gentle drift on the stars for a bit of life
    if (stars) stars.rotation.y += 0.00006;

    // Subtle mouse parallax so the depth actually reads as 3D
    const targetX = mouseX * 6;
    const targetY = 26 + mouseY * 3;
    camera.position.x += (targetX - camera.position.x) * 0.02;
    camera.position.y += (targetY - camera.position.y) * 0.02;
    camera.lookAt(0, 14, 0);

    renderer.render(scene, camera);

  }

  window.addEventListener("mousemove", (e) => {
    mouseX = (e.clientX / window.innerWidth - 0.5) * 2;
    mouseY = (e.clientY / window.innerHeight - 0.5) * 2;
  });

  window.addEventListener("resize", resize);

  buildStreet();
  buildStars();
  tower = buildTower();
  resize();
  animate();

}
