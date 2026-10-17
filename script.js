
"use strict";

const $ = (id) => document.getElementById(id);

const loadingScreen = $("loadingScreen");
const mainMenu = $("mainMenu");
const gameScreen = $("gameScreen");
const canvas = $("gameCanvas");
const ctx = canvas.getContext("2d");

const panels = [
  $("levelPanel"),
  $("skinPanel"),
  $("settingsPanel"),
  $("pausePanel"),
  $("deadPanel"),
  $("winPanel")
];

/* 22 ОСНОВНЫХ УРОВНЯ — В ПРАВИЛЬНОМ ПОРЯДКЕ */

const levels = [
  { name: "Stereo Madness", difficulty: "Лёгкий", length: 5200, gap: 115, doubles: 0.12, triples: 0.02 },
  { name: "Back on Track", difficulty: "Лёгкий", length: 5500, gap: 108, doubles: 0.18, triples: 0.03 },
  { name: "Polargeist", difficulty: "Нормальный", length: 5800, gap: 103, doubles: 0.23, triples: 0.05 },
  { name: "Dry Out", difficulty: "Нормальный", length: 6000, gap: 100, doubles: 0.27, triples: 0.06 },
  { name: "Base After Base", difficulty: "Нормальный", length: 6200, gap: 97, doubles: 0.29, triples: 0.07 },
  { name: "Can't Let Go", difficulty: "Нормальный", length: 6400, gap: 94, doubles: 0.32, triples: 0.09 },
  { name: "Jumper", difficulty: "Сложный", length: 6500, gap: 92, doubles: 0.35, triples: 0.10 },
  { name: "Time Machine", difficulty: "Сложный", length: 6700, gap: 90, doubles: 0.38, triples: 0.12 },
  { name: "Cycles", difficulty: "Сложный", length: 6800, gap: 88, doubles: 0.40, triples: 0.13 },
  { name: "xStep", difficulty: "Сложный", length: 7000, gap: 86, doubles: 0.42, triples: 0.15 },
  { name: "Clutterfunk", difficulty: "Очень сложный", length: 7200, gap: 84, doubles: 0.44, triples: 0.17 },
  { name: "Theory of Everything", difficulty: "Очень сложный", length: 7300, gap: 82, doubles: 0.46, triples: 0.18 },
  { name: "Electroman Adventures", difficulty: "Очень сложный", length: 7500, gap: 80, doubles: 0.47, triples: 0.19 },
  { name: "Clubstep", difficulty: "Безумный", length: 7700, gap: 79, doubles: 0.48, triples: 0.21 },
  { name: "Electrodynamix", difficulty: "Безумный", length: 7900, gap: 77, doubles: 0.49, triples: 0.22 },
  { name: "Hexagon Force", difficulty: "Безумный", length: 8000, gap: 76, doubles: 0.50, triples: 0.23 },
  { name: "Blast Processing", difficulty: "Сложный", length: 7800, gap: 79, doubles: 0.45, triples: 0.17 },
  { name: "Theory of Everything 2", difficulty: "Безумный", length: 8200, gap: 74, doubles: 0.51, triples: 0.24 },
  { name: "Geometrical Dominator", difficulty: "Очень сложный", length: 8000, gap: 76, doubles: 0.49, triples: 0.21 },
  { name: "Deadlocked", difficulty: "Безумный", length: 8500, gap: 72, doubles: 0.52, triples: 0.26 },
  { name: "Fingerdash", difficulty: "Безумный", length: 8400, gap: 73, doubles: 0.51, triples: 0.25 },
  { name: "Dash", difficulty: "Безумный", length: 8600, gap: 72, doubles: 0.52, triples: 0.26 }
];

let selectedLevel = 0;
let state = "loading";
let animationId = 0;
let lastTime = 0;
let width = 0;
let height = 0;
let groundY = 0;

let soundEnabled = true;
let skinColor = "#b7ff35";
let audioContext = null;
let toastTimer = null;

let cube = {
  x: 100,
  y: 0,
  size: 32,
  vy: 0,
  rotation: 0,
  grounded: true
};

let obstacles = [];
let distance = 0;
let obstacleTimer = 0;
let hue = 345;
let lastColorUpdate = 0;

const GRAVITY = 0.52;

/* ОКНА И УВЕДОМЛЕНИЯ */

function show(element, display = "flex") {
  element.classList.remove("hidden");
  element.style.display = display;
}

function hide(element) {
  element.classList.add("hidden");
  element.style.display = "none";
}

function hidePanels() {
  panels.forEach(hide);
}

function toast(message) {
  const element = $("toast");
  element.textContent = message;
  show(element, "block");

  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => hide(element), 2200);
}

/* ЗВУК */

function playTone(frequency = 440, duration = 0.08) {
  if (!soundEnabled) return;

  try {
    audioContext = audioContext ||
      new (window.AudioContext || window.webkitAudioContext)();

    if (audioContext.state === "suspended") {
      audioContext.resume();
    }

    const oscillator = audioContext.createOscillator();
    const gain = audioContext.createGain();

    oscillator.type = "square";
    oscillator.frequency.value = frequency;
    gain.gain.setValueAtTime(0.035, audioContext.currentTime);
    gain.gain.exponentialRampToValueAtTime(
      0.001,
      audioContext.currentTime + duration
    );

    oscillator.connect(gain);
    gain.connect(audioContext.destination);
    oscillator.start();
    oscillator.stop(audioContext.currentTime + duration);
  } catch (error) {
    // Игра продолжает работать без звука.
  }
}

/* ПЛАВНАЯ СМЕНА ЦВЕТА МЕНЮ */

function animateMenuColor(time) {
  if (time - lastColorUpdate > 80) {
    lastColorUpdate = time;
    hue = (hue + 0.12) % 360;

    document.documentElement.style.setProperty(
      "--menu-color",
      `hsl(${hue}, 90%, 38%)`
    );

    document.documentElement.style.setProperty(
      "--menu-light",
      `hsl(${hue}, 90%, 48%)`
    );
  }

  requestAnimationFrame(animateMenuColor);
}

requestAnimationFrame(animateMenuColor);

/* СПИСОК УРОВНЕЙ */

function buildLevelList() {
  const list = $("levelList");
  list.replaceChildren();

  levels.forEach((level, index) => {
    const button = document.createElement("button");
    button.className = "level-choice";
    button.type = "button";

    if (index === selectedLevel) {
      button.classList.add("selected");
    }

    const number = document.createElement("span");
    number.className = "level-number";
    number.textContent = index + 1;

    const details = document.createElement("span");
    details.className = "level-details";

    const title = document.createElement("span");
    title.className = "level-title";
    title.textContent = level.name;

    const difficulty = document.createElement("span");
    difficulty.className = "level-difficulty";
    difficulty.textContent = level.difficulty;

    details.append(title, difficulty);
    button.append(number, details);

    button.addEventListener("click", () => {
      selectedLevel = index;
      playTone(520, 0.06);
      hide($("levelPanel"));
      startGame();
    });

    list.append(button);
  });
}

/* CANVAS */

function resizeCanvas() {
  const rect = canvas.getBoundingClientRect();
  if (rect.width <= 0 || rect.height <= 0) return;

  const dpr = Math.min(window.devicePixelRatio || 1, 2);

  width = rect.width;
  height = rect.height;

  canvas.width = Math.round(width * dpr);
  canvas.height = Math.round(height * dpr);

  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  groundY = height - 65;

  if (cube.grounded) {
    cube.y = groundY - cube.size;
  }

  if (state !== "playing") draw();
}

window.addEventListener("resize", resizeCanvas);

/* РИСОВАНИЕ */

function drawBackground() {
  const gradient = ctx.createLinearGradient(0, 0, 0, height);
  gradient.addColorStop(0, "#0758b5");
  gradient.addColorStop(1, "#003477");

  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);

  const gridSize = 48;
  const offset = (distance * 0.3) % gridSize;

  ctx.lineWidth = 2;
  ctx.strokeStyle = "rgba(30, 125, 230, 0.36)";

  for (let x = -offset; x < width; x += gridSize) {
    ctx.strokeRect(x, 0, gridSize, groundY);
  }

  for (let y = 0; y < groundY; y += gridSize) {
    ctx.strokeRect(0, y, width, gridSize);
  }
}

function drawGround() {
  ctx.fillStyle = "#0751a0";
  ctx.fillRect(0, groundY, width, height - groundY);

  ctx.fillStyle = "#2bdcff";
  ctx.fillRect(0, groundY, width, 4);

  ctx.strokeStyle = "rgba(65, 200, 255, .4)";
  ctx.lineWidth = 2;

  const tile = 35;
  const offset = (distance * 1.1) % tile;

  for (let x = -offset; x < width; x += tile) {
    ctx.strokeRect(x, groundY + 8, tile, 25);
  }
}

function drawCube() {
  ctx.save();

  ctx.translate(
    cube.x + cube.size / 2,
    cube.y + cube.size / 2
  );

  ctx.rotate(cube.rotation);

  ctx.fillStyle = skinColor;
  ctx.strokeStyle = "#343b2a";
  ctx.lineWidth = 4;

  ctx.fillRect(
    -cube.size / 2,
    -cube.size / 2,
    cube.size,
    cube.size
  );

  ctx.strokeRect(
    -cube.size / 2,
    -cube.size / 2,
    cube.size,
    cube.size
  );

  ctx.strokeStyle = "#f8ffe4";
  ctx.lineWidth = 2;

  ctx.strokeRect(
    -cube.size / 2 + 4,
    -cube.size / 2 + 4,
    cube.size - 8,
    cube.size - 8
  );

  ctx.fillStyle = "#303421";
  ctx.fillRect(-8, -5, 5, 7);
  ctx.fillRect(3, -5, 5, 7);
  ctx.fillRect(-6, 5, 12, 3);

  ctx.restore();
}

function drawSpike(spike) {
  ctx.save();

  ctx.fillStyle = "#b7ff35";
  ctx.strokeStyle = "#3f7023";
  ctx.lineWidth = 3;

  ctx.beginPath();
  ctx.moveTo(spike.x, groundY);
  ctx.lineTo(spike.x + spike.width / 2, groundY - spike.height);
  ctx.lineTo(spike.x + spike.width, groundY);
  ctx.closePath();

  ctx.fill();
  ctx.stroke();

  ctx.strokeStyle = "rgba(255,255,255,.65)";
  ctx.lineWidth = 2;

  ctx.beginPath();
  ctx.moveTo(spike.x + 6, groundY - 3);
  ctx.lineTo(spike.x + spike.width / 2, groundY - spike.height + 8);
  ctx.stroke();

  ctx.restore();
}

function draw() {
  if (!width || !height) return;

  drawBackground();
  drawGround();

  obstacles.forEach(drawSpike);
  drawCube();
}

/* ИГРА */

function resetGame() {
  distance = 0;
  obstacleTimer = 75;
  obstacles = [];

  cube.x = Math.max(55, Math.min(100, width * 0.18));
  cube.y = groundY - cube.size;
  cube.vy = 0;
  cube.rotation = 0;
  cube.grounded = true;

  $("levelNameHUD").textContent = levels[selectedLevel].name.toUpperCase();
  updateProgress();
  draw();
}

function updateProgress() {
  const level = levels[selectedLevel];
  const percent = Math.min(
    100,
    Math.floor((distance / level.length) * 100)
  );

  $("progressBar").style.width = percent + "%";
  $("progressText").textContent = percent + "%";
}

function spawnObstacleGroup() {
  const level = levels[selectedLevel];
  const spikeWidth = 32;
  const gap = 10;
  const roll = Math.random();

  let count = 1;

  if (roll > 1 - level.doubles) count = 2;
  if (roll > 1 - level.triples) count = 3;

  const startX = width + 20;

  for (let i = 0; i < count; i++) {
    obstacles.push({
      x: startX + i * (spikeWidth + gap),
      width: spikeWidth,
      height: 35
    });
  }

  obstacleTimer = level.gap + Math.random() * 22;
}

function jump() {
  if (state !== "playing" || !cube.grounded) return;

  // Прыжок немного ниже, чем в предыдущей версии.
  cube.vy = -11.4;
  cube.grounded = false;

  playTone(520, 0.07);
}

function collides(spike) {
  const left = cube.x + 5;
  const right = cube.x + cube.size - 5;
  const top = cube.y + 5;
  const bottom = cube.y + cube.size - 2;

  const spikeLeft = spike.x + 5;
  const spikeRight = spike.x + spike.width - 5;
  const spikeTop = groundY - spike.height + 9;

  return (
    right > spikeLeft &&
    left < spikeRight &&
    bottom > spikeTop &&
    top < groundY
  );
}

function stopLoop() {
  if (animationId) {
    cancelAnimationFrame(animationId);
    animationId = 0;
  }
}

function gameOver() {
  if (state !== "playing") return;

  state = "dead";
  stopLoop();
  playTone(120, 0.2);
  show($("deadPanel"));
}

function winGame() {
  if (state !== "playing") return;

  state = "won";
  stopLoop();
  playTone(700, 0.12);

  $("winLevelText").textContent =
    `Ты прошёл уровень ${selectedLevel + 1}: ${levels[selectedLevel].name}!`;

  $("nextLevelButton").textContent =
    selectedLevel < levels.length - 1
      ? "▶ СЛЕДУЮЩИЙ УРОВЕНЬ"
      : "✓ ВСЕ УРОВНИ ЗАВЕРШЕНЫ";

  show($("winPanel"));
}

function update(delta) {
  const dt = Math.min(delta / 16.67, 2);
  const level = levels[selectedLevel];
  const speed = 5.1 + Math.min(selectedLevel * 0.035, 0.7);

  distance += speed * dt;
  obstacleTimer -= dt;

  if (obstacleTimer <= 0) {
    spawnObstacleGroup();
  }

  for (const spike of obstacles) {
    spike.x -= speed * dt;
  }

  obstacles = obstacles.filter(
    (spike) => spike.x + spike.width > -10
  );

  cube.vy += GRAVITY * dt;
  cube.y += cube.vy * dt;

  if (cube.y + cube.size >= groundY) {
    cube.y = groundY - cube.size;
    cube.vy = 0;
    cube.grounded = true;
  } else {
    cube.grounded = false;
  }

  if (cube.grounded) {
    cube.rotation =
      Math.round(cube.rotation / (Math.PI / 2)) * (Math.PI / 2);
  } else {
    cube.rotation += 0.09 * dt;
  }

  for (const spike of obstacles) {
    if (collides(spike)) {
      gameOver();
      return;
    }
  }

  updateProgress();

  if (distance >= level.length) {
    winGame();
  }
}

function gameLoop(time) {
  if (state !== "playing") {
    animationId = 0;
    return;
  }

  const delta = lastTime ? time - lastTime : 16.67;
  lastTime = time;

  update(delta);
  draw();

  if (state === "playing") {
    animationId = requestAnimationFrame(gameLoop);
  } else {
    animationId = 0;
  }
}

/* ПЕРЕКЛЮЧЕНИЕ ЭКРАНОВ */

function openLevelSelect() {
  buildLevelList();
  show($("levelPanel"));
}

function startGame() {
  stopLoop();
  hidePanels();
  hide(loadingScreen);
  hide(mainMenu);
  show(gameScreen, "block");

  state = "playing";

  resizeCanvas();
  resetGame();

  lastTime = performance.now();
  animationId = requestAnimationFrame(gameLoop);
}

function goHome() {
  stopLoop();
  state = "menu";

  hidePanels();
  hide(gameScreen);
  hide(loadingScreen);
  show(mainMenu, "flex");
}

function pauseGame() {
  if (state !== "playing") return;

  state = "paused";
  stopLoop();
  show($("pausePanel"));
}

function resumeGame() {
  if (state !== "paused") return;

  hidePanels();
  state = "playing";
  lastTime = performance.now();
  animationId = requestAnimationFrame(gameLoop);
}

/* ПОЛНЫЙ ЭКРАН */

async function toggleFullscreen() {
  try {
    if (document.fullscreenElement) {
      await document.exitFullscreen();
    } else if (document.documentElement.requestFullscreen) {
      await document.documentElement.requestFullscreen();
    } else {
      toast("Браузер не поддерживает полный экран");
      return;
    }

    toast(
      document.fullscreenElement
        ? "Полный экран включён!"
        : "Полный экран выключен"
    );

    setTimeout(resizeCanvas, 100);
  } catch (error) {
    toast("Попробуй открыть игру в браузере");
  }
}

document.addEventListener("fullscreenchange", () => {
  $("fullscreenButton").textContent = document.fullscreenElement
    ? "⛶ ВЫЙТИ ИЗ ПОЛНОГО ЭКРАНА"
    : "⛶ ПОЛНЫЙ ЭКРАН";

  setTimeout(resizeCanvas, 100);
});

/* КНОПКИ МЕНЮ */

$("playButton").addEventListener("click", openLevelSelect);

$("editorButton").addEventListener("click", () => {
  toast("Редактор уровней появится в будущей обнове!");
});

$("closeLevelsButton").addEventListener("click", () => {
  hide($("levelPanel"));
});

$("skinButton").addEventListener("click", () => {
  show($("skinPanel"));
});

$("closeSkinButton").addEventListener("click", () => {
  hide($("skinPanel"));
});

document.querySelectorAll(".skin-choice").forEach((button) => {
  button.addEventListener("click", () => {
    skinColor = button.dataset.color;

    document.querySelectorAll(".skin-choice").forEach((item) => {
      item.classList.remove("selected");
    });

    button.classList.add("selected");
    playTone(650, 0.06);
  });
});

function openSettings() {
  show($("settingsPanel"));
}

$("settingsButtonBottom").addEventListener("click", openSettings);

$("closeSettingsButton").addEventListener("click", () => {
  hide($("settingsPanel"));
});

$("fullscreenButton").addEventListener("click", toggleFullscreen);

$("soundButton").addEventListener("click", () => {
  soundEnabled = !soundEnabled;
  $("soundButton").textContent =
    "ЗВУК: " + (soundEnabled ? "ВКЛ" : "ВЫКЛ");

  if (soundEnabled) playTone(600, 0.07);
});

$("achievementsButton").addEventListener("click", () => {
  toast("Достижения появятся позже!");
});

$("statsButton").addEventListener("click", () => {
  toast("Статистика появится позже!");
});

$("moreGamesButton").addEventListener("click", () => {
  toast("Другие игры Dima скоро появятся!");
});

/* КНОПКИ ИГРЫ */

$("homeButton").addEventListener("click", goHome);
$("pauseButton").addEventListener("click", pauseGame);
$("resumeButton").addEventListener("click", resumeGame);

$("restartPauseButton").addEventListener("click", startGame);
$("retryButton").addEventListener("click", startGame);
$("winRetryButton").addEventListener("click", startGame);

$("homePauseButton").addEventListener("click", goHome);
$("homeDeadButton").addEventListener("click", goHome);
$("homeWinButton").addEventListener("click", goHome);

$("nextLevelButton").addEventListener("click", () => {
  if (selectedLevel < levels.length - 1) {
    selectedLevel++;
    startGame();
  } else {
    toast("Ты дошёл до конца списка уровней!");
    goHome();
  }
});

/* УПРАВЛЕНИЕ */

window.addEventListener("keydown", (event) => {
  if (
    event.code === "Space" ||
    event.code === "ArrowUp" ||
    event.code === "KeyW"
  ) {
    event.preventDefault();

    if (state === "playing") jump();
    else if (state === "paused") resumeGame();
  }

  if (event.code === "Escape" && state === "playing") {
    pauseGame();
  }
});

canvas.addEventListener("pointerdown", (event) => {
  event.preventDefault();
  jump();
});

canvas.addEventListener("contextmenu", (event) => {
  event.preventDefault();
});

/* ЗАГРУЗКА */

function startLoading() {
  let progress = 0;
  const bar = $("loadingBar");
  const percent = $("loadingPercent");

  const timer = setInterval(() => {
    progress = Math.min(100, progress + 4 + Math.random() * 10);

    bar.style.width = progress + "%";
    percent.textContent = Math.floor(progress) + "%";

    if (progress >= 100) {
      clearInterval(timer);

      setTimeout(() => {
        hide(loadingScreen);
        show(mainMenu, "flex");
        state = "menu";
      }, 350);
    }
  }, 90);
}

/* ПЕРВЫЙ ЗАПУСК */

hide(mainMenu);
hide(gameScreen);
hidePanels();
show(loadingScreen, "flex");

startLoading();
