
"use strict";

const $ = (id) => document.getElementById(id);

const loadingScreen = $("loadingScreen");
const mainMenu = $("mainMenu");
const gameScreen = $("gameScreen");
const canvas = $("gameCanvas");
const ctx = canvas.getContext("2d");

const pauseMenu = $("pauseMenu");
const gameOverMenu = $("gameOverMenu");
const winMenu = $("winMenu");
const skinMenu = $("skinMenu");
const settingsMenu = $("settingsMenu");

let state = "loading";
let animationId = 0;
let lastTime = 0;
let toastTimer = null;

let width = 0;
let height = 0;
let groundY = 0;

let cube = {
  x: 100,
  y: 0,
  size: 34,
  vy: 0,
  rotation: 0,
  grounded: true
};

let obstacles = [];
let distance = 0;
let levelLength = 6500;
let obstacleTimer = 0;
let gameSpeed = 6.2;
let skinColor = "#00eaff";

const GRAVITY = 0.58;
const JUMP_POWER = -13.5;

let soundEnabled = true;
let musicEnabled = true;
let audioContext = null;

function setVisible(element, visible, display = "flex") {
  if (element) element.style.display = visible ? display : "none";
}

function hideAllOverlays() {
  setVisible(pauseMenu, false);
  setVisible(gameOverMenu, false);
  setVisible(winMenu, false);
  setVisible(skinMenu, false);
  setVisible(settingsMenu, false);
}

function showToast(message) {
  const toast = $("toast");
  toast.textContent = message;
  setVisible(toast, true, "block");

  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => setVisible(toast, false), 2200);
}

function playTone(frequency = 440, duration = 0.09, type = "square", volume = 0.035) {
  if (!soundEnabled) return;

  try {
    audioContext = audioContext || new (window.AudioContext || window.webkitAudioContext)();

    if (audioContext.state === "suspended") {
      audioContext.resume();
    }

    const oscillator = audioContext.createOscillator();
    const gain = audioContext.createGain();

    oscillator.type = type;
    oscillator.frequency.value = frequency;
    gain.gain.setValueAtTime(volume, audioContext.currentTime);
    gain.gain.exponentialRampToValueAtTime(
      0.001,
      audioContext.currentTime + duration
    );

    oscillator.connect(gain);
    gain.connect(audioContext.destination);
    oscillator.start();
    oscillator.stop(audioContext.currentTime + duration);
  } catch (error) {
    // Игра продолжает работать, даже если звук недоступен.
  }
}

function resizeCanvas() {
  const rect = canvas.getBoundingClientRect();

  if (rect.width < 1 || rect.height < 1) return;

  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  width = rect.width;
  height = rect.height;

  canvas.width = Math.round(width * dpr);
  canvas.height = Math.round(height * dpr);

  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  groundY = height - 68;

  if (cube.grounded) {
    cube.y = groundY - cube.size;
  } else {
    cube.y = Math.min(cube.y, groundY - cube.size);
  }

  if (state !== "playing") draw();
}

window.addEventListener("resize", resizeCanvas);

function drawBackground() {
  const gradient = ctx.createLinearGradient(0, 0, 0, height);
  gradient.addColorStop(0, "#10143b");
  gradient.addColorStop(1, "#080a1d");

  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);

  const gridSize = 42;
  const offset = state === "playing" ? (distance * 0.35) % gridSize : 0;

  ctx.strokeStyle = "rgba(0, 234, 255, 0.10)";
  ctx.lineWidth = 1;

  for (let x = -offset; x < width; x += gridSize) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, groundY);
    ctx.stroke();
  }

  for (let y = 15; y < groundY; y += gridSize) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
    ctx.stroke();
  }

  ctx.fillStyle = "rgba(0, 234, 255, 0.06)";
  for (let i = 0; i < 8; i++) {
    const x = (i * 173 - distance * 0.18) % (width + 120);
    ctx.fillRect((x + width + 120) % (width + 120), 35 + i * 19, 3, 3);
  }
}

function drawGround() {
  ctx.fillStyle = "#101a3b";
  ctx.fillRect(0, groundY, width, height - groundY);

  ctx.fillStyle = "#00eaff";
  ctx.fillRect(0, groundY, width, 4);

  ctx.strokeStyle = "rgba(0, 234, 255, 0.22)";
  ctx.lineWidth = 1;

  const tile = 38;
  const offset = state === "playing" ? (distance * 1.3) % tile : 0;

  for (let x = -offset; x < width; x += tile) {
    ctx.strokeRect(x, groundY + 9, tile, 23);
  }
}

function drawCube() {
  ctx.save();

  const centerX = cube.x + cube.size / 2;
  const centerY = cube.y + cube.size / 2;

  ctx.translate(centerX, centerY);
  ctx.rotate(cube.rotation);

  ctx.shadowBlur = 18;
  ctx.shadowColor = skinColor;
  ctx.fillStyle = skinColor;
  ctx.fillRect(-cube.size / 2, -cube.size / 2, cube.size, cube.size);

  ctx.shadowBlur = 0;
  ctx.strokeStyle = "#ffffff";
  ctx.lineWidth = 2.5;
  ctx.strokeRect(
    -cube.size / 2 + 3,
    -cube.size / 2 + 3,
    cube.size - 6,
    cube.size - 6
  );

  ctx.fillStyle = "#10143a";
  ctx.fillRect(-9, -5, 5, 7);
  ctx.fillRect(4, -5, 5, 7);

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(-8, -4, 2, 3);
  ctx.fillRect(5, -4, 2, 3);

  ctx.restore();
}

function drawSpike(spike) {
  ctx.save();

  ctx.shadowBlur = 12;
  ctx.shadowColor = "#ff397b";
  ctx.fillStyle = "#ff397b";
  ctx.strokeStyle = "#ffd3e1";
  ctx.lineWidth = 1.5;

  ctx.beginPath();
  ctx.moveTo(spike.x, groundY);
  ctx.lineTo(spike.x + spike.width / 2, groundY - spike.height);
  ctx.lineTo(spike.x + spike.width, groundY);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  ctx.restore();
}

function draw() {
  if (!ctx || width < 1 || height < 1) return;

  drawBackground();
  drawGround();

  for (const spike of obstacles) {
    drawSpike(spike);
  }

  drawCube();
}

function resetGame() {
  distance = 0;
  obstacleTimer = 0;
  obstacles = [];
  gameSpeed = 6.2;

  cube.x = Math.max(55, Math.min(100, width * 0.18));
  cube.y = groundY - cube.size;
  cube.vy = 0;
  cube.rotation = 0;
  cube.grounded = true;

  updateProgress();
  draw();
}

function updateProgress() {
  const percent = Math.min(100, Math.floor((distance / levelLength) * 100));
  $("progressBar").style.width = percent + "%";
  $("progressText").textContent = percent + "%";
}

function spawnObstacleGroup() {
  const startX = width + 25;
  const spikeWidth = 34;
  const spikeHeight = 38 + Math.random() * 4;

  // Двойные и тройные шипы появляются не слишком часто.
  const roll = Math.random();
  let count = 1;

  if (roll > 0.66) count = 2;
  if (roll > 0.91) count = 3;

  const gap = 30;

  for (let i = 0; i < count; i++) {
    obstacles.push({
      x: startX + i * (spikeWidth + gap),
      width: spikeWidth,
      height: spikeHeight
    });
  }

  // Достаточно времени для подготовки к следующей группе.
  obstacleTimer = 78 + Math.random() * 40;
}

function jump() {
  if (state !== "playing") return;

  if (cube.grounded) {
    cube.vy = JUMP_POWER;
    cube.grounded = false;
    playTone(540, 0.08, "square", 0.025);
  }
}

function isColliding(spike) {
  // Немного уменьшаем хитбоксы, чтобы столкновения ощущались честнее.
  const playerLeft = cube.x + 5;
  const playerRight = cube.x + cube.size - 5;
  const playerTop = cube.y + 5;
  const playerBottom = cube.y + cube.size - 2;

  const spikeLeft = spike.x + 5;
  const spikeRight = spike.x + spike.width - 5;
  const spikeTop = groundY - spike.height + 10;

  const overlapsX = playerRight > spikeLeft && playerLeft < spikeRight;
  const overlapsY = playerBottom > spikeTop;

  return overlapsX && overlapsY;
}

function gameOver() {
  if (state !== "playing") return;

  state = "gameover";
  playTone(130, 0.35, "sawtooth", 0.05);
  setVisible(gameOverMenu, true);
}

function winGame() {
  if (state !== "playing") return;

  state = "won";
  playTone(700, 0.18, "sine", 0.05);
  setTimeout(() => playTone(900, 0.22, "sine", 0.05), 130);
  setVisible(winMenu, true);
}

function update(delta) {
  const dt = Math.min(delta / 16.67, 2);

  distance += gameSpeed * dt;
  obstacleTimer -= dt;

  if (obstacleTimer <= 0) {
    spawnObstacleGroup();
  }

  for (const spike of obstacles) {
    spike.x -= gameSpeed * dt;
  }

  obstacles = obstacles.filter((spike) => spike.x + spike.width > -20);

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
    cube.rotation = Math.round(cube.rotation / (Math.PI / 2)) * (Math.PI / 2);
  } else {
    cube.rotation += 0.085 * dt;
  }

  for (const spike of obstacles) {
    if (isColliding(spike)) {
      gameOver();
      return;
    }
  }

  updateProgress();

  if (distance >= levelLength) {
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

function stopGameLoop() {
  if (animationId) {
    cancelAnimationFrame(animationId);
    animationId = 0;
  }
}

function startGame() {
  stopGameLoop();
  hideAllOverlays();

  setVisible(loadingScreen, false);
  setVisible(mainMenu, false);
  setVisible(gameScreen, true, "block");

  state = "playing";

  // Сначала показываем игровую область, затем измеряем canvas.
  resizeCanvas();
  resetGame();

  lastTime = performance.now();
  animationId = requestAnimationFrame(gameLoop);
}

function showMainMenu() {
  stopGameLoop();
  state = "menu";

  hideAllOverlays();
  setVisible(gameScreen, false);
  setVisible(loadingScreen, false);
  setVisible(mainMenu, true, "flex");

  $("menuCube").style.backgroundColor = skinColor;
}

function pauseGame() {
  if (state !== "playing") return;

  state = "paused";
  stopGameLoop();
  setVisible(pauseMenu, true);
}

function resumeGame() {
  if (state !== "paused") return;

  hideAllOverlays();
  state = "playing";
  lastTime = performance.now();
  animationId = requestAnimationFrame(gameLoop);
}

function openFullscreen() {
  const target = document.documentElement;

  if (document.fullscreenElement) {
    if (document.exitFullscreen) {
      document.exitFullscreen().catch(() => {
        showToast("Не удалось выйти из полного экрана");
      });
    }
    return;
  }

  if (target.requestFullscreen) {
    target.requestFullscreen().then(() => {
      showToast("Полный экран включён!");
    }).catch(() => {
      showToast("Полный экран не поддерживается браузером");
    });
  } else {
    showToast("Нажми меню браузера и выбери «На весь экран»");
  }
}

function updateFullscreenButton() {
  const button = $("fullscreenButton");
  if (!button) return;

  button.innerHTML = document.fullscreenElement
    ? "<span>⛶</span> ВЫЙТИ ИЗ ПОЛНОГО ЭКРАНА"
    : "<span>⛶</span> ПОЛНЫЙ ЭКРАН";
}

$("playButton").addEventListener("click", startGame);
$("fullscreenButton").addEventListener("click", openFullscreen);

document.addEventListener("fullscreenchange", () => {
  updateFullscreenButton();
  setTimeout(resizeCanvas, 100);
});

$("menuButton").addEventListener("click", showMainMenu);
$("pauseButton").addEventListener("click", pauseGame);
$("resumeButton").addEventListener("click", resumeGame);

$("pauseRestartButton").addEventListener("click", startGame);
$("retryButton").addEventListener("click", startGame);
$("winRestartButton").addEventListener("click", startGame);

$("pauseHomeButton").addEventListener("click", showMainMenu);
$("gameOverHomeButton").addEventListener("click", showMainMenu);
$("winHomeButton").addEventListener("click", showMainMenu);

$("skinButton").addEventListener("click", () => {
  setVisible(skinMenu, true);
});

$("closeSkinButton").addEventListener("click", () => {
  setVisible(skinMenu, false);
});

document.querySelectorAll(".skin-option").forEach((button) => {
  button.addEventListener("click", () => {
    skinColor = button.dataset.skin;

    document.querySelectorAll(".skin-option").forEach((item) => {
      item.classList.remove("selected");
    });

    button.classList.add("selected");
    $("menuCube").style.backgroundColor = skinColor;
    draw();
    playTone(650, 0.07, "sine");
  });
});

$("settingsButton").addEventListener("click", () => {
  setVisible(settingsMenu, true);
});

$("closeSettingsButton").addEventListener("click", () => {
  setVisible(settingsMenu, false);
});

$("soundToggle").addEventListener("click", () => {
  soundEnabled = !soundEnabled;
  $("soundToggle").textContent = "ЗВУК: " + (soundEnabled ? "ВКЛ" : "ВЫКЛ");
  if (soundEnabled) playTone(600, 0.08);
});

$("musicToggle").addEventListener("click", () => {
  musicEnabled = !musicEnabled;
  $("musicToggle").textContent = "МУЗЫКА: " + (musicEnabled ? "ВКЛ" : "ВЫКЛ");
  showToast(musicEnabled ? "Музыка включена в настройках" : "Музыка выключена");
});

$("editorButton").addEventListener("click", () => {
  showToast("Редактор уровней появится в будущем!");
});

window.addEventListener("keydown", (event) => {
  if (event.code === "Space" || event.code === "ArrowUp" || event.code === "KeyW") {
    event.preventDefault();

    if (state === "playing") {
      jump();
    } else if (state === "paused") {
      resumeGame();
    }
  }

  if (event.code === "Escape" && state === "playing" && !document.fullscreenElement) {
    pauseGame();
  }
});

canvas.addEventListener("pointerdown", (event) => {
  event.preventDefault();
  jump();
});

canvas.addEventListener("contextmenu", (event) => event.preventDefault());

function startLoading() {
  let progress = 0;
  const bar = $("loadingBar");
  const percent = $("loadingPercent");

  const timer = setInterval(() => {
    progress += 5 + Math.random() * 12;
    progress = Math.min(progress, 100);

    bar.style.width = progress + "%";
    percent.textContent = Math.floor(progress) + "%";

    if (progress >= 100) {
      clearInterval(timer);
      setTimeout(() => {
        setVisible(loadingScreen, false);
        setVisible(mainMenu, true, "flex");
        state = "menu";
        updateFullscreenButton();
      }, 250);
    }
  }, 75);
}

setVisible(loadingScreen, true, "flex");
setVisible(mainMenu, false);
setVisible(gameScreen, false);
resizeCanvas();
startLoading();
