// =========================
// CONFIG
// =========================

const config = {
  name: "snow",
  handle: "https.snows.rest",
  role: "casual person on the internet",

  avatar: "cat.png",

  bio: [
    "hi, im snow nice to meet you.",
    "i really like gaming, piano, keyboards and sleeping ",
  ],

  projects: [
    {
      name: "snows.rest",
      description: "this website.",
      url: "https://snows.rest",
      tags: ["HTML", "CSS", "JavaScript"]
    }
  ],

  socials: [
    {
      label: "Discord",
      handle: "@sleepysnow.mp3",
      url: "https://discord.com/users/1453556642296627355"
    },
    {
      label: "GitHub",
      handle: "@snowy-xyz",
      url: "https://github.com/snowy-xyz"
    }
  ]
};

// =========================
// STAR BACKGROUND
// =========================

function initStars() {

  const canvas = document.getElementById("stars");
  if (!canvas) return;

  const ctx = canvas.getContext("2d");

  function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }

  resize();

  window.addEventListener("resize", resize);

  const stars = [];

  for (let i = 0; i < 150; i++) {

    stars.push({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      radius: Math.random() * 1.6 + 0.3,
      speed: Math.random() * 0.45 + 0.1
    });

  }

  function animate() {

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = "#ffffff";

    for (const star of stars) {

      star.y += star.speed;

      if (star.y > canvas.height) {
        star.y = 0;
        star.x = Math.random() * canvas.width;
      }

      ctx.beginPath();
      ctx.arc(
        star.x,
        star.y,
        star.radius,
        0,
        Math.PI * 2
      );
      ctx.fill();

    }

    requestAnimationFrame(animate);

  }

  animate();

}

// =========================
// INTRO
// =========================
function initLoading() {

  const loading = document.getElementById("loading");
  const terminal = document.getElementById("terminal");
  const intro = document.getElementById("intro");

  if (!loading || !terminal || !intro) return;

  const lines = [
    "> booting snows.rest...",
    "> loading music... done",
    "> fetching discord status... done",
    "> drawing starfield... done",
    "> loading profile... done",
    "> rendering interface... done",
    "> finishing up... done",
    "",
    "ready."
  ];

  let index = 0;

  function addLine() {

    if (index >= lines.length) {

      setTimeout(() => {
        loading.classList.add("out");

        setTimeout(() => {
          loading.style.display = "none";
          intro.style.display = "flex";
        }, 500);

      }, 800);

      return;
    }

    const line = document.createElement("div");
    line.textContent = lines[index];

    terminal.appendChild(line);

    index++;

    setTimeout(addLine, 350);

  }

  addLine();

}

function initIntro() {

  const intro = document.getElementById("intro");
  const app = document.getElementById("app");
  const music = document.getElementById("bgMusic");

  if (!intro || !app) return;

  intro.addEventListener("click", () => {

    intro.classList.add("out");

    app.classList.add("visible");

    if (music) {

      music.volume = 0.4;

      music.play().catch(() => {});

    }

  });

}
// =========================
// NAVIGATION
// =========================

function initNavigation() {

 const tabs = document.querySelectorAll(".nav-tab");
  const content = document.getElementById("content");

  if (!content) return;

  function setActive(tab) {

    content.classList.add("fade");

    setTimeout(() => {

      content.innerHTML = renderTab(tab);

      content.classList.remove("fade");

      // Restore Discord status when returning to Home
      if (tab === "home" && latestDiscordData) {
        updateStatus(latestDiscordData);
      }

    }, 150);

  }

tabs.forEach(button => {

  button.addEventListener("click", () => {

    tabs.forEach(btn => btn.classList.remove("active"));
    button.classList.add("active");

    setActive(button.dataset.tab);

  });

});
  setActive("home");

}


// =========================
// PAGE RENDERING
// =========================

function renderTab(tab) {

  if (tab === "home") {

    return `
      <div class="items">

        <div class="item item-bare">

          <div class="item-avatar-wrap">

            <img
              class="item-avatar"
              src="${config.avatar}"
              alt="Avatar"
            >

            <span class="status-dot offline"></span>

          </div>

          <div>

            <div class="item-name">
              ${config.name}
            </div>

            <div class="item-handle">
              ${config.handle}
            </div>

            <div
              id="statusText"
              class="item-sub"
            >
              offline
            </div>

            <div
              id="activityText"
              class="item-sub"
            >
            </div>

          </div>

        </div>

      </div>
    `;

  }

  if (tab === "about") {

    return `
      <div class="about-text">
        ${config.bio
          .map(text => `<p>${text}</p>`)
          .join("")}
      </div>
    `;

  }

  if (tab === "projects") {

    return `
      <div class="projects-list">

      ${config.projects.map(project => `

        <a
          class="project-item"
          href="${project.url}"
          target="_blank"
        >

          <div class="project-name">
            ${project.name}
          </div>

          <div class="project-desc">
            ${project.description}
          </div>

          <div class="project-tags">

            ${project.tags
              .map(tag =>
                `<span class="tag">${tag}</span>`
              )
              .join("")}

          </div>

        </a>

      `).join("")}

      </div>
    `;

  }

  if (tab === "socials") {

    return `
      <div class="socials-list">

      ${config.socials.map(social => `

        <a
          class="socials-link"
          href="${social.url}"
          target="_blank"
        >

          <span>${social.label}</span>

          <span>${social.handle}</span>

        </a>

      `).join("")}

      </div>
    `;

  }

  return "";

}
// =========================
// LANYARD (Discord Status)
// =========================
let latestDiscordData = null;
const DISCORD_ID = "1453556642296627355";

function loadLanyard() {
  console.log("connecting...");

  const ws = new WebSocket("wss://api.lanyard.rest/socket");
  ws.onopen = () => {
    ws.send(JSON.stringify({
      op: 2,
      d: {
        subscribe_to_id: DISCORD_ID
      }
    }));
  };

ws.onmessage = (event) => {
  const packet = JSON.parse(event.data);

  console.log("PACKET:", packet);

 if (packet.op === 0) {
  console.log("DATA:", packet.d);

  latestDiscordData = packet.d; // Save the latest status

  updateStatus(packet.d);
}
};

  ws.onerror = (e) => console.error("Lanyard error:", e);
  ws.onclose = () => console.log("Lanyard disconnected");
}
function updateStatus(data) {
  console.log(data);

  const dot = document.querySelector(".status-dot");
  const statusText = document.getElementById("statusText");
  const activityText = document.getElementById("activityText");

  if (dot) {
    dot.className = "status-dot " + data.discord_status;
  }

  const pretty = {
    online: "online",
    idle: "idle",
    dnd: "do Not Disturb",
    offline: "offline"
  };

  if (statusText) {
    statusText.textContent =
      pretty[data.discord_status] || data.discord_status;
  }

  const activities = data.activities || [];
  const activity = activities.find(a => a.type === 0);

  if (activityText) {
    if (activity) {
      activityText.textContent = `🎮 ${activity.name}`;
    } else if (data.listening_to_spotify && data.spotify) {
      activityText.textContent =
        `🎵 ${data.spotify.song} — ${data.spotify.artist}`;
    } else {
      activityText.textContent = "";
    }
  }

  console.log("Discord:", data);
  console.log("loaded");
}
function initMusicPlayer() {

  const music = document.getElementById("bgMusic");

  const play = document.getElementById("playPause");
  const progress = document.getElementById("progress");

  const current = document.getElementById("currentTime");
  const duration = document.getElementById("duration");

  if (!music) return;


  play.addEventListener("click", () => {

    if (music.paused) {

      music.play();
      play.textContent = "Ⅱ";

    } else {

      music.pause();
      play.textContent = "▶";

    }

  });


  music.addEventListener("loadedmetadata", () => {

    duration.textContent = formatTime(music.duration);

  });


  music.addEventListener("timeupdate", () => {

    current.textContent = formatTime(music.currentTime);

    progress.value =
      (music.currentTime / music.duration) * 100;

  });


  progress.addEventListener("input", () => {

    music.currentTime =
      (progress.value / 100) * music.duration;

  });


}


function formatTime(seconds) {

  if (isNaN(seconds)) return "0:00";

  const minutes = Math.floor(seconds / 60);

  const secondsLeft = Math.floor(seconds % 60)
    .toString()
    .padStart(2, "0");

  return `${minutes}:${secondsLeft}`;

}
// =========================
// START EVERYTHING
// =========================

window.addEventListener("load", () => {
  initStars();
  initLoading();
  initIntro();
  initNavigation();
  initMusicPlayer()
  loadLanyard();
});
const fullTitle = "snows.rest";

let length = 1;
let direction = 1;

setInterval(() => {
  document.title = fullTitle.slice(0, length);

  length += direction;

  if (length > fullTitle.length) {
    length = fullTitle.length - 1;
    direction = -1;
  } else if (length < 1) {
    length = 2;
    direction = 1;
  }

}, 200);
