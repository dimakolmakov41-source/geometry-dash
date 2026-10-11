const canvas = document.getElementById("gameCanvas");
const ctx = canvas?.getContext("2d");

const menu = document.getElementById("menu");
const pauseMenu = document.getElementById("pauseMenu");
const gameOverMenu = document.getElementById("gameOverMenu");
const winMenu = document.getElementById("winMenu");

let state = "menu";
let animationId = null;
let lastTime = 0;
let distance = 0;
let score = 0;
let speed = 5;

// ИЗМЕНЕНО: прыжок ниже, гравитация сильнее
let gravity = 0.8;
let jumpPower = -9;

let obstacles = [];
let particles = [];

const player = {
    x: 100,
    y: 0,
    size: 30,
    vy: 0,
    grounded: false,
    rotation: 0
};

let groundY = 0;
let levelLength = 5000;

function resizeCanvas() {
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const dpr = Math.max(1, window.devicePixelRatio || 1);

    canvas.width = Math.max(1, Math.floor(rect.width * dpr));
    canvas.height = Math.max(1, Math.floor(rect.height * dpr));

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    groundY = rect.height - 45;

    if (state === "menu") {
        player.y = groundY - player.size;
    }
}

function showMenu(target) {
    [menu, pauseMenu, gameOverMenu, winMenu].forEach(element => {
        if (element) element.style.display = "none";
    });

    if (target) target.style.display = "flex";
}

function resetGame() {
    distance = 0;
    score = 0;
    speed = 5;
    obstacles = [];
    particles = [];

    player.x = 100;
    player.y = groundY - player.size;
    player.vy = 0;
    player.grounded = true;
    player.rotation = 0;

    createLevel();
    updateProgress();
}

function createLevel() {
    let x = 450;

    while (x < levelLength) {
        x += 260 + Math.random() * 220;

        obstacles.push({
            x,
            width: 30,
            height: 35 + Math.random() * 15,
            type: "spike"
        });

        if (Math.random() > 0.7) {
            x += 60;

            obstacles.push({
                x,
                width: 30,
                height: 35,
                type: "spike"
            });
        }
    }
}

function startGame() {
    resetGame();
    state = "playing";
    showMenu(null);
    lastTime = performance.now();

    if (animationId !== null) {
        cancelAnimationFrame(animationId);
    }

    animationId = requestAnimationFrame(loop);
}

function jump() {
    if (state !== "playing") return;

    if (player.grounded) {
        player.vy = jumpPower;
        player.grounded = false;
    }
}

function togglePause() {
    if (state === "playing") {
        state = "paused";
        showMenu(pauseMenu);
    } else if (state === "paused") {
        state = "playing";
        showMenu(null);
        lastTime = performance.now();
        animationId = requestAnimationFrame(loop);
    }
}

function gameOver() {
    state = "gameover";
    showMenu(gameOverMenu);
}

function winGame() {
    state = "won";
    showMenu(winMenu);
}

function updateProgress() {
    const progress = Math.min(
        100,
        Math.floor(distance / levelLength * 100)
    );

    const progressBar = document.getElementById("progressBar");
    const progressText = document.getElementById("progressText");

    if (progressBar) {
        progressBar.style.width = `${progress}%`;
    }

    if (progressText) {
        progressText.textContent = `${progress}%`;
    }
}

function update(delta) {
    const frameScale = Math.min(delta / 16.67, 2);

    distance += speed * frameScale;
    score = Math.floor(distance / 10);

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

    for (const obstacle of obstacles) {
        const obstacleX = obstacle.x - distance + player.x;

        if (
            obstacleX < -50 ||
            obstacleX > canvas.clientWidth + 50
        ) {
            continue;
        }

        const playerLeft = player.x + 5;
        const playerRight = player.x + player.size - 5;
        const playerTop = player.y + 5;
        const playerBottom = player.y + player.size - 2;

        const obstacleTop = groundY - obstacle.height;

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

    updateProgress();

    if (distance >= levelLength) {
        winGame();
    }
}

function drawBackground() {
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;

    const gradient = ctx.createLinearGradient(0, 0, 0, height);
    gradient.addColorStop(0, "#15153b");
    gradient.addColorStop(1, "#30306b");

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

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

    ctx.fillStyle = "#242452";
    ctx.fillRect(0, groundY, width, height - groundY);

    ctx.fillStyle = "#00f5ff";
    ctx.fillRect(0, groundY, width, 4);
}

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
        ctx.lineTo(x + obstacle.width, groundY);
        ctx.closePath();
        ctx.fill();

        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth = 2;
        ctx.stroke();
    }
}

function drawPlayer() {
    ctx.save();

    ctx.translate(
        player.x + player.size / 2,
        player.y + player.size / 2
    );

    ctx.rotate(player.rotation);

    ctx.fillStyle = "#00f5ff";
    ctx.fillRect(
        -player.size / 2,
        -player.size / 2,
        player.size,
        player.size
    );

    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 3;

    ctx.strokeRect(
        -player.size / 2,
        -player.size / 2,
        player.size,
        player.size
    );

    ctx.restore();
}

function drawScore() {
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 20px Arial";
    ctx.textAlign = "left";
    ctx.fillText(`Счёт: ${score}`, 16, 30);
}

function draw() {
    if (!canvas || !ctx) return;

    drawBackground();
    drawObstacles();
    drawPlayer();
    drawScore();
}

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

function bindButton(id, callback) {
    const button = document.getElementById(id);

    if (button) {
        button.addEventListener("click", event => {
            event.preventDefault();
            callback();
        });
    }
}

function bindControls() {
    bindButton("playButton", startGame);
    bindButton("startButton", startGame);
    bindButton("playBtn", startGame);
    bindButton("startBtn", startGame);
    bindButton("restartButton", startGame);
    bindButton("restartBtn", startGame);

    bindButton("resumeButton", togglePause);
    bindButton("resumeBtn", togglePause);
    bindButton("pauseButton", togglePause);
    bindButton("pauseBtn", togglePause);

    bindButton("menuButton", () => {
        state = "menu";
        showMenu(menu);
        draw();
    });

    bindButton("retryButton", startGame);
    bindButton("retryBtn", startGame);

    document.querySelectorAll("button").forEach(button => {
        const text = button.textContent.trim().toLowerCase();

        if (
            text === "играть" ||
            text === "начать игру" ||
            text === "play"
        ) {
            button.addEventListener("click", event => {
                event.preventDefault();
                startGame();
            });
        }
    });
}

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
            } else {
                jump();
            }
        }

        if (
            event.code === "Escape" ||
            event.code === "KeyP"
        ) {
            togglePause();
        }
    });
}

function bindTouchControls() {
    if (!canvas) return;

    canvas.addEventListener("pointerdown", event => {
        if (state === "playing") {
            event.preventDefault();
            jump();
        }
    });
}

function init() {
    if (!canvas || !ctx) {
        console.error(
            'Не найден canvas с id="gameCanvas". Проверь index.html.'
        );
        return;
    }

    resizeCanvas();
    bindControls();
    bindKeyboard();
    bindTouchControls();

    showMenu(menu);
    draw();

    window.addEventListener("resize", () => {
        resizeCanvas();
        draw();
    });
}

if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
} else {
    init();
}
