// ============================================
// GEOMETRY DASH: CUBE RUSH
// Полный игровой JavaScript
// ============================================

"use strict";

// ---------- ЭЛЕМЕНТЫ ----------

const canvas = document.getElementById("gameCanvas");
const ctx = canvas ? canvas.getContext("2d") : null;

const loadingScreen = document.getElementById("loadingScreen");
const loadingBar = document.getElementById("loadingBar");
const loadingPercent = document.getElementById("loadingPercent");

const mainMenu = document.getElementById("mainMenu");
const gameScreen = document.getElementById("gameScreen");

const menu = mainMenu;
const pauseMenu = document.getElementById("pauseMenu");
const gameOverMenu = document.getElementById("gameOverMenu");
const winMenu = document.getElementById("winMenu");
const skinMenu = document.getElementById("skinMenu");
const settingsMenu = document.getElementById("settingsMenu");

const progressBar = document.getElementById("progressBar");
const progressText = document.getElementById("progressText");

const menuCube = document.getElementById("menuCube");
const toast = document.getElementById("toast");

// ---------- СОСТОЯНИЕ ИГРЫ ----------

let state = "loading";
let animationId = null;
let lastTime = 0;

let distance = 0;
let score = 0;
let speed = 5;

let gravity = 0.8;
let jumpPower = -9;

let groundY = 0;
let levelLength = 5000;

let obstacles = [];
let particles = [];

let selectedSkin = "#00eaff";

let soundEnabled = true;
let musicEnabled = true;

let audioContext = null;
let toastTimeout = null;

const player = {
    x: 100,
    y: 0,
    size: 30,
    vy: 0,
    grounded: true,
    rotation: 0
};

// ---------- ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ----------

function setDisplay(element, display) {
    if (element) {
        element.style.display = display;
    }
}

function hideAllOverlays() {
    [
        pauseMenu,
        gameOverMenu,
        winMenu,
        skinMenu,
        settingsMenu
    ].forEach(element => {
        setDisplay(element, "none");
    });
}

function showToast(message) {
    if (!toast) return;

    toast.textContent = message;
    toast.classList.add("show");

    clearTimeout(toastTimeout);

    toastTimeout = setTimeout(() => {
        toast.classList.remove("show");
    }, 2200);
}

function showMainMenu() {
    stopGameLoop();

    state = "menu";

    setDisplay(loadingScreen, "none");
    setDisplay(mainMenu, "flex");
    setDisplay(gameScreen, "none");

    hideAllOverlays();

    if (ctx) {
        resizeCanvas();
        draw();
    }
}

function stopGameLoop() {
    if (animationId !== null) {
        cancelAnimationFrame(animationId);
        animationId = null;
    }
}

// ---------- ЗВУК ----------

function playSound(frequency = 440, duration = 0.08) {
    if (!soundEnabled) return;

    try {
        const AudioContextClass =
            window.AudioContext || window.webkitAudioContext;

        if (!AudioContextClass) return;

        if (!audioContext) {
            audioContext = new AudioContextClass();
        }

        if (audioContext.state === "suspended") {
            audioContext.resume();
        }

        const oscillator = audioContext.createOscillator();
        const gain = audioContext.createGain();

        oscillator.type = "square";
        oscillator.frequency.value = frequency;

        gain.gain.setValueAtTime(
            0.06,
            audioContext.currentTime
        );

        gain.gain.exponentialRampToValueAtTime(
            0.001,
            audioContext.currentTime + duration
        );

        oscillator.connect(gain);
        gain.connect(audioContext.destination);

        oscillator.start();
        oscillator.stop(audioContext.currentTime + duration);
    } catch (error) {
        console.warn("Не удалось воспроизвести звук:", error);
    }
}

// ---------- ЗАГРУЗКА ----------

function startLoading() {
    let progress = 0;

    const loadingInterval = setInterval(() => {
        progress += 5 + Math.random() * 12;
        progress = Math.min(progress, 100);

        if (loadingBar) {
            loadingBar.style.width = `${progress}%`;
        }

        if (loadingPercent) {
            loadingPercent.textContent =
                `${Math.floor(progress)}%`;
        }

        if (progress >= 100) {
            clearInterval(loadingInterval);

            setTimeout(() => {
                showMainMenu();
            }, 250);
        }
    }, 90);
}

// ---------- РАЗМЕР ИГРОВОГО ПОЛЯ ----------

function resizeCanvas() {
    if (!canvas || !ctx) return;

    const rect = canvas.getBoundingClientRect();

    if (rect.width <= 0 || rect.height <= 0) return;

    const dpr = Math.min(
        window.devicePixelRatio || 1,
        2
    );

    canvas.width = Math.floor(rect.width * dpr);
    canvas.height = Math.floor(rect.height * dpr);

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    groundY = rect.height - 45;

    if (state !== "playing" && state !== "paused") {
        player.y = groundY - player.size;
    }
}

// ---------- СОЗДАНИЕ УРОВНЯ ----------

function createLevel() {
    obstacles = [];

    let x = 450;

    while (x < levelLength) {
        x += 260 + Math.random() * 220;

        obstacles.push({
            x: x,
            width: 30,
            height: 35 + Math.random() * 15
        });

        if (Math.random() > 0.7) {
            x += 60;

            obstacles.push({
                x: x,
                width: 30,
                height: 35
            });
        }
    }
}

// ---------- НАЧАЛО ИГРЫ ----------

function resetGame() {
    distance = 0;
    score = 0;
    speed = 5;
    particles = [];

    player.x = 100;
    player.y = groundY - player.size;
    player.vy = 0;
    player.grounded = true;
    player.rotation = 0;

    createLevel();
    updateProgress();
}

function startGame() {
    stopGameLoop();

    if (audioContext && audioContext.state === "suspended") {
        audioContext.resume();
    }

    resizeCanvas();
    resetGame();

    state = "playing";

    setDisplay(loadingScreen, "none");
    setDisplay(mainMenu, "none");
    setDisplay(gameScreen, "block");

    hideAllOverlays();

    lastTime = performance.now();

    playSound(600, 0.1);

    animationId = requestAnimationFrame(loop);
}

// ---------- ПРЫЖОК ----------

function jump() {
    if (state !== "playing") return;
    if (!player.grounded) return;

    player.vy = jumpPower;
    player.grounded = false;

    playSound(520, 0.07);

    for (let i = 0; i < 5; i++) {
        particles.push({
            x: player.x + player.size / 2,
            y: groundY - 3,
            vx: (Math.random() - 0.5) * 3,
            vy: -Math.random() * 3,
            life: 1
        });
    }
}

// ---------- ПАУЗА ----------

function pauseGame() {
    if (state !== "playing") return;

    state = "paused";
    stopGameLoop();

    setDisplay(pauseMenu, "flex");

    playSound(300, 0.1);
}

function resumeGame() {
    if (state !== "paused") return;

    state = "playing";

    setDisplay(pauseMenu, "none");

    lastTime = performance.now();
    animationId = requestAnimationFrame(loop);
}

// ---------- ЗАВЕРШЕНИЕ ИГРЫ ----------

function gameOver() {
    if (state !== "playing") return;

    state = "gameover";
    stopGameLoop();

    setDisplay(gameOverMenu, "flex");

    playSound(160, 0.2);
}

function winGame() {
    if (state !== "playing") return;

    state = "won";
    stopGameLoop();

    updateProgress();
    setDisplay(winMenu, "flex");

    playSound(800, 0.15);

    setTimeout(() => {
        if (state === "won") {
            playSound(1000, 0.2);
        }
    }, 150);
}

// ---------- ПРОГРЕСС УРОВНЯ ----------

function updateProgress() {
    const progress = Math.min(
        100,
        Math.floor((distance / levelLength) * 100)
    );

    if (progressBar) {
        progressBar.style.width = `${progress}%`;
    }

    if (progressText) {
        progressText.textContent = `${progress}%`;
    }
}

// ---------- ОБНОВЛЕНИЕ ИГРЫ ----------

function update(delta) {
    const frameScale = Math.min(delta / 16.67, 2);

    distance += speed * frameScale;
    score = Math.floor(distance / 10);

    // Физика кубика
    player.vy += gravity * frameScale;
    player.y += player.vy * frameScale;

    if (player.y + player.size >= groundY) {
        player.y = groundY - player.size;
        player.vy = 0;
        player.grounded = true;
        player.rotation = 0;
    } else {
        player.grounded = false;
        player.rotation += 0.08 * frameScale;
    }

    // Проверка столкновений
    for (const obstacle of obstacles) {
        const obstacleX =
            obstacle.x - distance + player.x;

        if (
            obstacleX < -50 ||
            obstacleX > canvas.clientWidth + 50
        ) {
            continue;
        }

        const playerLeft = player.x + 5;
        const playerRight =
            player.x + player.size - 5;

        const playerTop = player.y + 5;
        const playerBottom =
            player.y + player.size - 2;

        const obstacleTop =
            groundY - obstacle.height;

        const overlaps =
            playerRight > obstacleX + 4 &&
            playerLeft < obstacleX + obstacle.width - 4 &&
            playerBottom > obstacleTop + 5 &&
            playerTop < groundY;

        if (overlaps) {
            gameOver();
            return;
        }
    }

    // Частицы прыжка
    particles.forEach(particle => {
        particle.x += particle.vx * frameScale;
        particle.y += particle.vy * frameScale;

        particle.vy += 0.15 * frameScale;
        particle.life -= 0.025 * frameScale;
    });

    particles = particles.filter(
        particle => particle.life > 0
    );

    updateProgress();

    if (distance >= levelLength) {
        winGame();
    }
}

// ---------- ОТРИСОВКА ФОНА ----------

function drawBackground() {
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;

    const gradient = ctx.createLinearGradient(
        0, 0, 0, height
    );

    gradient.addColorStop(0, "#15153b");
    gradient.addColorStop(1, "#30306b");

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    // Сетка
    ctx.strokeStyle = "rgba(255,255,255,0.08)";
    ctx.lineWidth = 1;

    const gridSize = 40;
    const offset = distance % gridSize;

    for (let x = -offset; x < width; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, groundY);
        ctx.stroke();
    }

    for (let y = 0; y < groundY; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
    }

    // Земля
    ctx.fillStyle = "#242452";
    ctx.fillRect(
        0,
        groundY,
        width,
        height - groundY
    );

    ctx.fillStyle = "#00f5ff";
    ctx.fillRect(0, groundY, width, 4);
}

// ---------- ОТРИСОВКА ШИПОВ ----------

function drawObstacles() {
    for (const obstacle of obstacles) {
        const x = obstacle.x - distance + player.x;

        if (
            x < -50 ||
            x > canvas.clientWidth + 50
        ) {
            continue;
        }

        ctx.fillStyle = "#ff3d81";

        ctx.beginPath();
        ctx.moveTo(x, groundY);

        ctx.lineTo(
            x + obstacle.width / 2,
            groundY - obstacle.height
        );

        ctx.lineTo(
            x + obstacle.width,
            groundY
        );

        ctx.closePath();
        ctx.fill();

        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth = 2;
        ctx.stroke();
    }
}

// ---------- ОТРИСОВКА КУБИКА ----------

function drawPlayer() {
    ctx.save();

    ctx.translate(
        player.x + player.size / 2,
        player.y + player.size / 2
    );

    ctx.rotate(player.rotation);

    ctx.shadowColor = selectedSkin;
    ctx.shadowBlur = 12;

    ctx.fillStyle = selectedSkin;

    ctx.fillRect(
        -player.size / 2,
        -player.size / 2,
        player.size,
        player.size
    );

    ctx.shadowBlur = 0;

    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 3;

    ctx.strokeRect(
        -player.size / 2,
        -player.size / 2,
        player.size,
        player.size
    );

    // Глаза
    ctx.fillStyle = "#17203f";

    ctx.fillRect(-8, -5, 5, 7);
    ctx.fillRect(3, -5, 5, 7);

    // Рот
    ctx.fillRect(-5, 7, 10, 3);

    ctx.restore();
}

// ---------- ЧАСТИЦЫ ----------

function drawParticles() {
    for (const particle of particles) {
        ctx.globalAlpha = particle.life;
        ctx.fillStyle = selectedSkin;

        ctx.fillRect(
            particle.x,
            particle.y,
            5,
            5
        );
    }

    ctx.globalAlpha = 1;
}

// ---------- СЧЁТ ----------

function drawScore() {
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 20px Arial";
    ctx.textAlign = "left";

    ctx.fillText(`Счёт: ${score}`, 16, 30);
}

// ---------- ОТРИСОВКА ИГРЫ ----------

function draw() {
    if (!canvas || !ctx) return;

    if (
        canvas.clientWidth <= 0 ||
        canvas.clientHeight <= 0
    ) {
        return;
    }

    drawBackground();
    drawObstacles();
    drawParticles();
    drawPlayer();
    drawScore();
}

// ---------- ИГРОВОЙ ЦИКЛ ----------

function loop(timestamp) {
    if (state !== "playing") {
        animationId = null;
        return;
    }

    const delta = lastTime
        ? timestamp - lastTime
        : 16.67;

    lastTime = timestamp;

    update(delta);
    draw();

    if (state === "playing") {
        animationId = requestAnimationFrame(loop);
    } else {
        animationId = null;
        draw();
    }
}

// ---------- ВЫБОР СКИНА ----------

function updateSkinPreview() {
    if (menuCube) {
        menuCube.style.backgroundColor = selectedSkin;
        menuCube.style.boxShadow =
            `0 0 22px ${selectedSkin}`;
    }
}

function selectSkin(color, button) {
    selectedSkin = color;

    document.querySelectorAll(".skin-option").forEach(option => {
        option.classList.remove("selected");
    });

    if (button) {
        button.classList.add("selected");
    }

    updateSkinPreview();

    playSound(600, 0.08);
}

// ---------- НАСТРОЙКИ ----------

function openSettings() {
    hideAllOverlays();
    setDisplay(settingsMenu, "flex");
}

function closeSettings() {
    setDisplay(settingsMenu, "none");
}

function openSkins() {
    hideAllOverlays();
    setDisplay(skinMenu, "flex");
}

function closeSkins() {
    setDisplay(skinMenu, "none");
}

// ---------- КНОПКИ ----------

function bindButton(id, callback) {
    const button = document.getElementById(id);

    if (!button) {
        console.warn(`Кнопка не найдена: ${id}`);
        return;
    }

    button.addEventListener("click", event => {
        event.preventDefault();
        callback();
    });
}

function bindControls() {
    // Главное меню
    bindButton("playButton", startGame);
    bindButton("skinButton", openSkins);
    bindButton("settingsButton", openSettings);

    // Редактор пока не готов
    bindButton("editorButton", () => {
        showToast("Редактор уровней скоро появится!");
        playSound(300, 0.08);
    });

    // Пауза
    bindButton("pauseButton", pauseGame);
    bindButton("resumeButton", resumeGame);

    bindButton("pauseRestartButton", startGame);

    bindButton("pauseHomeButton", showMainMenu);

    // Поражение
    bindButton("retryButton", startGame);
    bindButton("gameOverHomeButton", showMainMenu);

    // Победа
    bindButton("winRestartButton", startGame);
    bindButton("winHomeButton", showMainMenu);

    // Выбор скина
    bindButton("closeSkinButton", closeSkins);

    document.querySelectorAll(".skin-option").forEach(button => {
        button.addEventListener("click", () => {
            selectSkin(
                button.dataset.skin,
                button
            );
        });
    });

    // Настройки
    bindButton("closeSettingsButton", closeSettings);

    const soundToggle = document.getElementById("soundToggle");
    const musicToggle = document.getElementById("musicToggle");

    if (soundToggle) {
        soundToggle.checked = soundEnabled;

        soundToggle.addEventListener("change", () => {
            soundEnabled = soundToggle.checked;

            if (soundEnabled) {
                playSound(600, 0.08);
            }
        });
    }

    if (musicToggle) {
        musicToggle.checked = musicEnabled;

        musicToggle.addEventListener("change", () => {
            musicEnabled = musicToggle.checked;

            showToast(
                musicEnabled
                    ? "Музыка включена"
                    : "Музыка выключена"
            );
        });
    }
}

// ---------- КЛАВИАТУРА ----------

function bindKeyboard() {
    window.addEventListener("keydown", event => {
        if (
            event.code === "Space" ||
            event.code === "ArrowUp" ||
            event.code === "KeyW"
        ) {
            event.preventDefault();

            if (state === "menu") {
                startGame();
            } else if (state === "playing") {
                jump();
            } else if (state === "paused") {
                resumeGame();
            }
        }

        if (
            event.code === "Escape" ||
            event.code === "KeyP"
        ) {
            if (state === "playing") {
                pauseGame();
            } else if (state === "paused") {
                resumeGame();
            } else if (skinMenu && skinMenu.style.display !== "none") {
                closeSkins();
            } else if (
                settingsMenu &&
                settingsMenu.style.display !== "none"
            ) {
                closeSettings();
            }
        }
    });
}

// ---------- УПРАВЛЕНИЕ НА ТЕЛЕФОНЕ ----------

function bindTouchControls() {
    if (!canvas) return;

    canvas.addEventListener("pointerdown", event => {
        if (state === "playing") {
            event.preventDefault();
            jump();
        }
    });
}

// ---------- ЗАПУСК ----------

function init() {
    if (!canvas || !ctx) {
        console.error(
            'Не найден canvas с id="gameCanvas". Проверь index.html.'
        );

        showToast("Ошибка: игровое поле не найдено");
        return;
    }

    resizeCanvas();

    bindControls();
    bindKeyboard();
    bindTouchControls();

    updateSkinPreview();

    window.addEventListener("resize", () => {
        resizeCanvas();
        draw();
    });

    startLoading();
}

if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
} else {
    init();
}
