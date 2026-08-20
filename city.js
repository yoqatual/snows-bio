// =========================
// CITY SKYLINE BACKGROUND (3D / Three.js)
// =========================
// Layered buildings with rooftop detail, a CN Tower with an
// antenna mast, a road with real low-poly cars (plus the odd
// supercar blowing past), sidewalks with streetlamps, and
// pedestrians who occasionally wander into a building and
// vanish for a while, as if they'd gone inside.
//
// Loaded as an ES module (see the import map in index.html) so it
// can pull in the postprocessing add-ons needed for the bloom glow.
// It still exposes window.initCity() for script.js to call, same
// as the old plain-script version did.

import * as THREE from "three";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";

function initCity() {

  const canvasEl = document.getElementById("city");
  if (!canvasEl) return;

  // -------------------------
  // World layout (world units)
  // Camera looks toward -z. Larger z = closer to camera.
  // -------------------------

  const GROUND_Y = 0;

  const ROAD_HALF_WIDTH = 5;                 // road spans z: -5..5
  const SIDEWALK_DEPTH = 4;
  const SIDEWALK_NEAR_Z = ROAD_HALF_WIDTH + SIDEWALK_DEPTH / 2;   // in front of road (camera side)
  const SIDEWALK_FAR_Z = -ROAD_HALF_WIDTH - SIDEWALK_DEPTH / 2;   // behind road (building side)

  const LAYER_Z = [-74, -44, -14];           // back, mid, front building rows
  const LAYER_COLOR = [0x3a3a3a, 0x232323, 0x0a0a0a];
  const LAYER_WINDOW = ["#8a8a8a", "#c7c7c7", "#ffffff"];
  const LAYER_HEIGHT_SCALE = [22, 30, 40];

  const CAMERA_BASE = { x: 0, y: 20, z: 50 };
  const CAMERA_LOOKAT = { x: 0, y: 9, z: -8 };

  let width, height;
  let buildingGroups = [];
  let cars = [];
  let supercars = [];
  let pedestrians = [];
  let streetlamps = [];
  let stars;
  let mouseX = 0, mouseY = 0;
  let streetWidthWorld = 200;
  let nextSupercarAt = performance.now() + 6000;

  // -------------------------
  // Scene / camera / renderer / bloom
  // -------------------------

  const scene = new THREE.Scene();

  const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 2000);

  const renderer = new THREE.WebGLRenderer({ canvas: canvasEl, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.15;
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));

  const bloomPass = new UnrealBloomPass(new THREE.Vector2(1, 1), 0.85, 0.4, 0.78);
  composer.addPass(bloomPass);
  composer.addPass(new OutputPass());

  // -------------------------
  // Lighting
  // -------------------------

  scene.add(new THREE.AmbientLight(0x8899aa, 0.5));

  const moon = new THREE.DirectionalLight(0xaabbff, 0.55);
  moon.position.set(-40, 60, 40);
  scene.add(moon);

  // -------------------------
  // Window texture helper
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
          c.fillRect(col * padX + padX * 0.25, r * padY + padY * 0.25, padX * 0.5, padY * 0.5);
        }
      }
    }

    const tex = new THREE.CanvasTexture(cnv);
    tex.magFilter = THREE.NearestFilter;
    tex.minFilter = THREE.NearestFilter;
    return tex;

  }

  // -------------------------
  // Buildings — boxes with a windowed front face, plus rooftop
  // detail (AC units / antenna spikes) on a fraction of them so
  // the skyline silhouette isn't just flat rectangles.
  // -------------------------

  function addRoofDetail(building, w, d, h) {

    const roofMat = new THREE.MeshLambertMaterial({ color: 0x111111 });

    if (Math.random() < 0.45) {
      // AC unit / rooftop box
      const boxW = w * (0.2 + Math.random() * 0.25);
      const boxD = d * (0.3 + Math.random() * 0.3);
      const boxH = 0.6 + Math.random() * 0.8;
      const box = new THREE.Mesh(new THREE.BoxGeometry(boxW, boxH, boxD), roofMat);
      box.position.set((Math.random() - 0.5) * w * 0.4, h / 2 + boxH / 2, (Math.random() - 0.5) * d * 0.3);
      building.add(box);
    }

    if (Math.random() < 0.3) {
      // Thin antenna spike
      const spikeH = 2 + Math.random() * 4;
      const spike = new THREE.Mesh(
        new THREE.CylinderGeometry(0.05, 0.08, spikeH, 6),
        roofMat
      );
      spike.position.set(0, h / 2 + spikeH / 2, 0);
      building.add(spike);
    }

  }

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

      const materials = [sideMat, sideMat, sideMat, sideMat, frontMat, sideMat];

      const geo = new THREE.BoxGeometry(w, h, d);
      const mesh = new THREE.Mesh(geo, materials);
      mesh.position.set(x + w / 2, GROUND_Y + h / 2, z);

      addRoofDetail(mesh, w, d, h);

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
  // CN Tower — lathe-revolved silhouette, plus a visible antenna
  // mast with cross-brace rungs on top, and strut details around
  // the pod, so it reads as an actual structure up close.
  // -------------------------

  let beaconLight, beaconMesh;

  function towerRadiusAt(t) {

    const points = [
      { t: 0, r: 1.6 }, { t: 0.58, r: 0.5 }, { t: 0.66, r: 0.4 },
      { t: 0.74, r: 0.22 }, { t: 0.80, r: 0.18 }, { t: 1, r: 0.05 }
    ];

    let base = points[0].r;
    for (let i = 0; i < points.length - 1; i++) {
      const a = points[i], b = points[i + 1];
      if (t >= a.t && t <= b.t) {
        base = a.r + (b.r - a.r) * ((t - a.t) / (b.t - a.t));
        break;
      }
    }

    const bumps = [{ start: 0.58, end: 0.66, amp: 0.65 }, { start: 0.74, end: 0.80, amp: 0.22 }];
    let bump = 0;
    for (const bmp of bumps) {
      if (t >= bmp.start && t <= bmp.end) {
        bump = Math.sin(((t - bmp.start) / (bmp.end - bmp.start)) * Math.PI) * bmp.amp;
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
      profile.push(new THREE.Vector2(Math.max(0.01, towerRadiusAt(t)), t * H));
    }

    const geo = new THREE.LatheGeometry(profile, 24);
    const mat = new THREE.MeshStandardMaterial({ color: 0x8a8a8a, emissive: 0x1a1a1a, metalness: 0.2, roughness: 0.6 });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(-streetWidthWorld * 0.3, GROUND_Y, -4);

    // Strut braces around the main pod for a bit of structure
    const strutMat = new THREE.MeshStandardMaterial({ color: 0x666666, metalness: 0.3, roughness: 0.5 });
    for (let i = 0; i < 6; i++) {
      const angle = (i / 6) * Math.PI * 2;
      const strutR = towerRadiusAt(0.62);
      const strut = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, strutR * 1.3), strutMat);
      strut.position.set(Math.cos(angle) * strutR * 0.6, H * 0.62, Math.sin(angle) * strutR * 0.6);
      strut.rotation.y = angle;
      mesh.add(strut);
    }

    // Antenna mast on top, with a few cross-brace rungs
    const mastH = 14;
    const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.07, mastH, 6), strutMat);
    mast.position.set(0, H + mastH / 2, 0);
    mesh.add(mast);

    for (let i = 1; i <= 4; i++) {
      const rungY = H + (mastH / 5) * i;
      const rung = new THREE.Mesh(new THREE.TorusGeometry(0.12 - i * 0.015, 0.015, 6, 10), strutMat);
      rung.rotation.x = Math.PI / 2;
      rung.position.set(0, rungY, 0);
      mesh.add(rung);
    }

    // Pulsing beacon at the very tip
    const beaconGeo = new THREE.SphereGeometry(0.35, 12, 12);
    const beaconMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    beaconMesh = new THREE.Mesh(beaconGeo, beaconMat);
    beaconMesh.position.set(mesh.position.x, H + mastH, mesh.position.z);

    beaconLight = new THREE.PointLight(0xffffff, 1, 20);
    beaconLight.position.copy(beaconMesh.position);

    scene.add(mesh);
    scene.add(beaconMesh);
    scene.add(beaconLight);

  }

  // -------------------------
  // Road, sidewalks, streetlamps
  // -------------------------

  function buildRoad() {

    const roadGeo = new THREE.PlaneGeometry(streetWidthWorld + 60, ROAD_HALF_WIDTH * 2);
    const roadMat = new THREE.MeshLambertMaterial({ color: 0x191919 });
    const road = new THREE.Mesh(roadGeo, roadMat);
    road.rotation.x = -Math.PI / 2;
    road.position.set(0, GROUND_Y, 0);
    scene.add(road);

    // Dashed center line
    const dashMat = new THREE.MeshBasicMaterial({ color: 0xdddd88 });
    let x = -streetWidthWorld / 2 - 10;
    while (x < streetWidthWorld / 2 + 10) {
      const dash = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 0.15), dashMat);
      dash.rotation.x = -Math.PI / 2;
      dash.position.set(x, GROUND_Y + 0.01, 0);
      scene.add(dash);
      x += 3;
    }

    [SIDEWALK_NEAR_Z, SIDEWALK_FAR_Z].forEach(z => {
      const sw = new THREE.Mesh(
        new THREE.BoxGeometry(streetWidthWorld + 60, 0.3, SIDEWALK_DEPTH),
        new THREE.MeshLambertMaterial({ color: 0x3a3a3a })
      );
      sw.position.set(0, GROUND_Y + 0.15, z);
      scene.add(sw);
    });

  }

  function rebuildStreetlamps() {

    streetlamps.forEach(l => scene.remove(l.mesh));
    streetlamps = [];

    const poleMat = new THREE.MeshLambertMaterial({ color: 0x1a1a1a });
    const glowMat = new THREE.MeshBasicMaterial({ color: 0xffe8b0 });

    [SIDEWALK_NEAR_Z, SIDEWALK_FAR_Z].forEach(z => {

      let x = -streetWidthWorld / 2;

      while (x < streetWidthWorld / 2) {

        const group = new THREE.Group();

        const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 4, 6), poleMat);
        pole.position.y = 2;
        group.add(pole);

        const armDir = z > 0 ? -1 : 1; // arm reaches over the road
        const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.8, 6), poleMat);
        arm.rotation.z = Math.PI / 2;
        arm.position.set(armDir * 0.4, 3.9, 0);
        group.add(arm);

        const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.18, 8, 8), glowMat);
        lamp.position.set(armDir * 0.8, 3.85, 0);
        group.add(lamp);

        group.position.set(x, GROUND_Y, z);
        scene.add(group);

        streetlamps.push({ mesh: group });

        x += 13 + Math.random() * 3;

      }

    });

  }

  // -------------------------
  // Cars — normal traffic plus the occasional supercar
  // -------------------------

  function makeCar(color, isSupercar) {

    const group = new THREE.Group();
    const scale = isSupercar ? 1.15 : 1;

    const bodyMat = new THREE.MeshStandardMaterial({
      color, emissive: isSupercar ? color : 0x222222,
      emissiveIntensity: isSupercar ? 0.4 : 1,
      roughness: 0.3, metalness: 0.4
    });

    const bodyLen = isSupercar ? 4.4 : 3.3;
    const bodyH = isSupercar ? 0.55 : 0.85;
    const bodyW = isSupercar ? 1.7 : 1.5;

    const body = new THREE.Mesh(new THREE.BoxGeometry(bodyLen, bodyH, bodyW), bodyMat);
    body.position.y = bodyH / 2 + 0.15;
    group.add(body);

    if (!isSupercar) {
      const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.65, 0.6, 1.3), bodyMat);
      cabin.position.set(-0.2, body.position.y + bodyH / 2 + 0.3, 0);
      group.add(cabin);
    } else {
      // Low sloped cabin + rear spoiler
      const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.35, 1.3), bodyMat);
      cabin.position.set(0.1, body.position.y + bodyH / 2 + 0.17, 0);
      group.add(cabin);

      const spoiler = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.3, 1.5), new THREE.MeshStandardMaterial({ color: 0x111111 }));
      spoiler.position.set(-bodyLen / 2 - 0.05, body.position.y + 0.35, 0);
      group.add(spoiler);
    }

    const wheelGeo = new THREE.CylinderGeometry(0.33, 0.33, 0.27, 12);
    const wheelMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.9 });
    const wx = bodyLen / 2 - 0.5;
    const wz = bodyW / 2 + 0.05;

    [[wx, wz], [wx, -wz], [-wx, wz], [-wx, -wz]].forEach(p => {
      const wheel = new THREE.Mesh(wheelGeo, wheelMat);
      wheel.rotation.x = Math.PI / 2;
      wheel.position.set(p[0], 0.33, p[1]);
      group.add(wheel);
    });

    const headMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 8), headMat);
    head.position.set(bodyLen / 2 + 0.1, body.position.y, 0);
    group.add(head);

    const tailMat = new THREE.MeshBasicMaterial({ color: 0xff3333 });
    const tail = new THREE.Mesh(new THREE.SphereGeometry(0.1, 8, 8), tailMat);
    tail.position.set(-bodyLen / 2 - 0.1, body.position.y, 0);
    group.add(tail);

    group.scale.setScalar(scale);

    return group;

  }

  function rebuildCars() {

    cars.forEach(c => scene.remove(c.mesh));
    cars = [];

    const carCount = Math.max(4, Math.floor(streetWidthWorld / 22));
    const colors = [0xffffff, 0xdddddd, 0xcfd8ff, 0xffd9a0];

    for (let i = 0; i < carCount; i++) {

      const direction = Math.random() < 0.5 ? 1 : -1;
      const mesh = makeCar(colors[Math.floor(Math.random() * colors.length)], false);

      mesh.rotation.y = direction > 0 ? 0 : Math.PI;
      mesh.position.set((Math.random() - 0.5) * streetWidthWorld, GROUND_Y, 2.5 * direction);

      scene.add(mesh);
      cars.push({ mesh, speed: (0.06 + Math.random() * 0.08) * direction });

    }

  }

  function spawnSupercar() {

    const direction = Math.random() < 0.5 ? 1 : -1;
    const colors = [0xff2d2d, 0xffe600, 0x2dd4ff];
    const mesh = makeCar(colors[Math.floor(Math.random() * colors.length)], true);

    mesh.rotation.y = direction > 0 ? 0 : Math.PI;
    mesh.position.set(direction > 0 ? -streetWidthWorld / 2 - 6 : streetWidthWorld / 2 + 6, GROUND_Y, 2.5 * direction);

    scene.add(mesh);
    supercars.push({ mesh, speed: 0.45 * direction });

  }

  // -------------------------
  // Pedestrians — walk the sidewalks, and every so often duck
  // into a building (shrink + fade) and reappear elsewhere a
  // little later, as if they went inside and came back out.
  // -------------------------

  function makePedestrian(color) {

    const group = new THREE.Group();
    const mat = new THREE.MeshStandardMaterial({ color, roughness: 0.6, transparent: true, opacity: 1 });

    const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.14, 0.5, 4, 8), mat);
    body.position.y = 0.55;
    group.add(body);

    const head = new THREE.Mesh(new THREE.SphereGeometry(0.13, 8, 8), mat);
    head.position.y = 1.0;
    group.add(head);

    const legGeo = new THREE.CylinderGeometry(0.045, 0.045, 0.45, 6);
    const legL = new THREE.Mesh(legGeo, mat);
    legL.position.set(0, 0.22, 0.08);
    const legR = new THREE.Mesh(legGeo, mat);
    legR.position.set(0, 0.22, -0.08);
    group.add(legL, legR);

    group.userData.legs = [legL, legR];
    group.userData.mats = [mat];

    return group;

  }

  function rebuildPedestrians() {

    pedestrians.forEach(p => scene.remove(p.mesh));
    pedestrians = [];

    const colors = [0x99a3ff, 0xffb199, 0xffe08a, 0xa0e0c0, 0xd9d9d9];
    const count = Math.max(5, Math.floor(streetWidthWorld / 16));

    for (let i = 0; i < count; i++) {

      const z = Math.random() < 0.5 ? SIDEWALK_NEAR_Z : SIDEWALK_FAR_Z;
      const direction = Math.random() < 0.5 ? 1 : -1;
      const mesh = makePedestrian(colors[Math.floor(Math.random() * colors.length)]);

      mesh.rotation.y = direction > 0 ? -Math.PI / 2 : Math.PI / 2;
      mesh.position.set((Math.random() - 0.5) * streetWidthWorld, GROUND_Y, z + (Math.random() - 0.5) * 1.2);

      scene.add(mesh);

      pedestrians.push({
        mesh,
        z,
        speed: (0.012 + Math.random() * 0.02) * direction,
        state: "walking",       // walking | entering | hidden | exiting
        timer: 4 + Math.random() * 10
      });

    }

  }

  // -------------------------
  // Stars
  // -------------------------

  function buildStars() {

    const count = 400;
    const positions = new Float32Array(count * 3);

    for (let i = 0; i < count; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 400;
      positions[i * 3 + 1] = Math.random() * 120 + 20;
      positions[i * 3 + 2] = -100 - Math.random() * 150;
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));

    stars = new THREE.Points(geo, new THREE.PointsMaterial({ color: 0xffffff, size: 0.6, sizeAttenuation: true }));
    scene.add(stars);

  }

  // -------------------------
  // Resize
  // -------------------------

  function resize() {

    width = window.innerWidth;
    height = window.innerHeight;

    camera.aspect = width / height;
    camera.updateProjectionMatrix();

    renderer.setSize(width, height);
    composer.setSize(width, height);

    streetWidthWorld = Math.max(120, (width / height) * 110);

    camera.position.set(CAMERA_BASE.x, CAMERA_BASE.y, CAMERA_BASE.z);
    camera.lookAt(CAMERA_LOOKAT.x, CAMERA_LOOKAT.y, CAMERA_LOOKAT.z);

    rebuildBuildings();
    rebuildCars();
    rebuildStreetlamps();
    rebuildPedestrians();

  }

  // -------------------------
  // Animate
  // -------------------------

  function animate() {

    requestAnimationFrame(animate);

    const now = performance.now();
    const t = now / 1000;

    // Cars
    cars.forEach(car => {
      car.mesh.position.x += car.speed;
      const limit = streetWidthWorld / 2 + 4;
      if (car.speed > 0 && car.mesh.position.x > limit) car.mesh.position.x = -limit;
      if (car.speed < 0 && car.mesh.position.x < -limit) car.mesh.position.x = limit;
    });

    // Supercars: spawn occasionally, remove once off-screen
    if (now > nextSupercarAt) {
      spawnSupercar();
      nextSupercarAt = now + 7000 + Math.random() * 9000;
    }
    supercars.forEach(sc => { sc.mesh.position.x += sc.speed; });
    supercars = supercars.filter(sc => {
      const limit = streetWidthWorld / 2 + 10;
      const gone = Math.abs(sc.mesh.position.x) > limit;
      if (gone) scene.remove(sc.mesh);
      return !gone;
    });

    // Pedestrians: walk, and occasionally duck into a building
    pedestrians.forEach(p => {

      p.timer -= 1 / 60;

      if (p.state === "walking") {

        p.mesh.position.x += p.speed;
        const limit = streetWidthWorld / 2 + 2;
        if (p.speed > 0 && p.mesh.position.x > limit) p.mesh.position.x = -limit;
        if (p.speed < 0 && p.mesh.position.x < -limit) p.mesh.position.x = limit;

        // simple walk bounce + leg swing
        p.mesh.position.y = Math.abs(Math.sin(t * 6 + p.mesh.position.x)) * 0.03;
        const swing = Math.sin(t * 8 + p.mesh.position.x) * 0.4;
        if (p.mesh.userData.legs) {
          p.mesh.userData.legs[0].rotation.x = swing;
          p.mesh.userData.legs[1].rotation.x = -swing;
        }

        if (p.timer <= 0 && p.z === SIDEWALK_FAR_Z && Math.random() < 0.5) {
          p.state = "entering";
          p.timer = 0.8;
        } else if (p.timer <= 0) {
          p.timer = 4 + Math.random() * 10;
        }

      } else if (p.state === "entering") {

        const s = Math.max(0, p.timer / 0.8);
        p.mesh.scale.setScalar(s);
        p.mesh.userData.mats.forEach(m => m.opacity = s);
        if (p.timer <= 0) {
          p.state = "hidden";
          p.timer = 3 + Math.random() * 6;
        }

      } else if (p.state === "hidden") {

        if (p.timer <= 0) {
          p.mesh.position.x = (Math.random() - 0.5) * streetWidthWorld;
          p.speed = (0.012 + Math.random() * 0.02) * (Math.random() < 0.5 ? 1 : -1);
          p.mesh.rotation.y = p.speed > 0 ? -Math.PI / 2 : Math.PI / 2;
          p.state = "exiting";
          p.timer = 0.8;
        }

      } else if (p.state === "exiting") {

        const s = Math.min(1, 1 - p.timer / 0.8);
        p.mesh.scale.setScalar(s);
        p.mesh.userData.mats.forEach(m => m.opacity = s);
        if (p.timer <= 0) {
          p.state = "walking";
          p.timer = 4 + Math.random() * 10;
        }

      }

    });

    // Beacon pulse
    const pulse = (Math.sin(now / 400) + 1) / 2;
    if (beaconLight) beaconLight.intensity = 0.6 + pulse * 1.4;
    if (beaconMesh) beaconMesh.scale.setScalar(1 + pulse * 0.4);

    if (stars) stars.rotation.y += 0.00006;

    // Camera: slow idle drift + mouse parallax combined
    const driftX = Math.sin(t * 0.08) * 5 + Math.sin(t * 0.021) * 2;
    const driftY = Math.sin(t * 0.05) * 1.4;
    const targetX = CAMERA_BASE.x + driftX + mouseX * 6;
    const targetY = CAMERA_BASE.y + driftY + mouseY * 3;

    camera.position.x += (targetX - camera.position.x) * 0.02;
    camera.position.y += (targetY - camera.position.y) * 0.02;
    camera.lookAt(CAMERA_LOOKAT.x, CAMERA_LOOKAT.y, CAMERA_LOOKAT.z);

    composer.render();

  }

  window.addEventListener("mousemove", (e) => {
    mouseX = (e.clientX / window.innerWidth - 0.5) * 2;
    mouseY = (e.clientY / window.innerHeight - 0.5) * 2;
  });

  window.addEventListener("resize", resize);

  buildStars();
  buildRoad();
  buildTower();
  resize();
  animate();

}

window.initCity = initCity;
