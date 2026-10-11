
(() => {
    const canvas = document.getElementById("gameCanvas");
    const ctx = canvas.getContext("2d");

    const menu = document.getElementById("menu");
    const pauseMenu = document.getElementById("pauseMenu");
    const gameOverMenu = document.getElementById("gameOverMenu");
    const winMenu = document.getElementById("winMenu");

    const progressText = document.getElementById("progress");
    const bestText = document.getElementById("best");
    const progressBar = document.getElementById("progressBar");

    const startButton = document.getElementById("startButton");
    const pauseButton = document.getElementById("pauseButton");
    const resumeButton = document.getElementById("resumeButton");
    const restartButton = document.getElementById("restartButton");
    const retryButton = document.getElementById("retryButton");
    const nextButton = document.getElementById("nextButton");

    let width = 0;
    let height = 0;
    let ground = 0;
    let lastTime = 0;

    let gameState = "menu";
    let distance = 0;
    let levelLength = 6000;
    let speed = 360;
    let best = 0;

    let player;
    let obstacles = [];
    let particles = [];
    let stars = [];

    try {
        best = Number(localStorage.getItem("neonDashBest")) || 0;
    } catch (error) {}

    bestText.textContent = best + "%";

    function resizeCanvas() {
        const dpr = Math.min(window.devicePixelRatio || 1, 2);

        width = window.innerWidth;
        height = window.innerHeight;
        ground = height * 0.78;

        canvas.width = Math.floor(width * dpr);
        canvas.height = Math.floor(height * dpr);

        canvas.style.width = width + "px";
        canvas.style.height = height + "px";

        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

        stars = Array.from({ length: 80 }, () => ({
            x: Math.random() * width,
            y: Math.random() * height * 0.7,
            size: Math.random() * 2 + 0.5,
            alpha: Math.random() * 0.6 + 0.2
        }));

        if (player) {
            player.size = Math.max(24, Math.min(40, height * 0.09));
            player.y = Math.min(player.y, ground - player.size);
        }
    }

    function createPlayer() {
        const size = Math.max(24, Math.min(40, height * 0.09));

        player = {
            x: width * 0.2,
            y: ground - size,
            size: size,
            velocityY: 0,
            rotation: 0,
            grounded: true
        };
    }

    function createLevel() {
        obstacles = [];

        let x = width + 250;

        while (x < levelLength + width) {
            const choice = Math.random();

            if (choice < 0.5) {
                obstacles.push({
                    x,
                    width: 28,
                    height: 35,
                    type: "spike"
                });

                x += 28;
            } else if (choice < 0.8) {
                obstacles.push({
                    x,
                    width: 35,
                    height: 35,
                    type: "block"
                });

                x += 35;
            } else {
                for (let i = 0; i < 2; i++) {
                    obstacles.push({
                        x: x + i * 30,
                        width: 28,
                        height: 34,
                        type: "spike"
                    });
                }

                x += 60;
            }

            x += 230 + Math.random() * 190;
        }

        obstacles.push({
            x: levelLength + width,
            width: 20,
            height: ground,
            type: "finish"
        });
    }

    function resetGame() {
        distance = 0;
        speed = Math.max(320, width * 0.42);
        particles = [];

        createPlayer();
        createLevel();
        updateProgress();
    }

    function hideMenus() {
        menu.classList.add("hidden");
        pauseMenu.classList.add("hidden");
        gameOverMenu.classList.add("hidden");
        winMenu.classList.add("hidden");
    }

    function startGame() {
        resetGame();
        hideMenus();

        gameState = "playing";
        lastTime = performance.now();
    }

    function jump() {
        if (gameState === "menu") {
            startGame();
            return;
        }

        if (gameState === "dead" || gameState === "won") {
            return;
        }

        if (gameState !== "playing") {
            return;
        }

        if (player.grounded) {
            player.velocityY = -Math.max(570, height * 1.5);
            player.grounded = false;
        }
    }

    function togglePause() {
        if (gameState === "playing") {
            gameState = "paused";
            pauseMenu.classList.remove("hidden");
        } else if (gameState === "paused") {
            gameState = "playing";
            pauseMenu.classList.add("hidden");
            lastTime = performance.now();
        }
    }

    function updateProgress() {
        const progress = Math.min(
            100,
            Math.floor((distance / levelLength) * 100)
        );

        progressText.textContent = progress + "%";
        progressBar.style.width = progress + "%";
    }

    function gameOver() {
        if (gameState !== "playing") return;

        gameState = "dead";
        gameOverMenu.classList.remove("hidden");

        const progress = Math.min(
            100,
            Math.floor((distance / levelLength) * 100)
        );

        saveBest(progress);
    }

    function winGame() {
        if (gameState !== "playing") return;

        gameState = "won";
        progressText.textContent = "100%";
        progressBar.style.width = "100%";

        saveBest(100);
        winMenu.classList.remove("hidden");
    }

    function saveBest(progress) {
        if (progress > best) {
            best = progress;
            bestText.textContent = best + "%";

            try {
                localStorage.setItem("neonDashBest", String(best));
            } catch (error) {}
        }
    }

    function update(dt) {
        if (gameState !== "playing") return;

        distance += speed * dt;
        speed = Math.min(speed + dt * 3, 490);

        updateProgress();

        player.velocityY += Math.max(1500, height * 4) * dt;
        player.y += player.velocityY * dt;

        if (player.y + player.size >= ground) {
            player.y = ground - player.size;
            player.velocityY = 0;
            player.grounded = true;

            player.rotation =
                Math.round(player.rotation / (Math.PI / 2)) *
                (Math.PI / 2);
        } else {
            player.grounded = false;
            player.rotation += dt * 5;
        }

        for (const obstacle of obstacles) {
            obstacle.x -= speed * dt;

            if (obstacle.type === "finish") {
                if (obstacle.x < player.x + player.size) {
                    winGame();
                    return;
                }

                continue;
            }

            const px = player.x + 5;
            const py = player.y + 5;
            const ps = player.size - 10;

            if (obstacle.type === "spike") {
                const ox = obstacle.x + 6;
                const oy = ground - obstacle.height + 9;
                const ow = obstacle.width - 12;

                if (
                    px < ox + ow &&
                    px + ps > ox &&
                    py + ps > oy &&
                    py + ps > ground - obstacle.height + 3
                ) {
                    gameOver();
                    return;
                }
            }

            if (obstacle.type === "block") {
                const oy = ground - obstacle.height;

                if (
                    px < obstacle.x + obstacle.width - 3 &&
                    px + ps > obstacle.x + 3 &&
                    py + ps > oy + 3
                ) {
                    gameOver();
                    return;
                }
            }
        }

        obstacles = obstacles.filter(
            obstacle => obstacle.x > -100
        );
    }

    function drawBackground() {
        const gradient = ctx.createLinearGradient(
            0, 0, width, height
        );

        gradient.addColorStop(0, "#11112f");
        gradient.addColorStop(0.55, "#19133c");
        gradient.addColorStop(1, "#080819");

        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, width, height);

        for (const star of stars) {
            ctx.globalAlpha = star.alpha;
            ctx.fillStyle = "#c5d7ff";

            const x =
                ((star.x - distance * 0.04) % width + width) % width;

            ctx.fillRect(x, star.y, star.size, star.size);
        }

        ctx.globalAlpha = 1;

        ctx.strokeStyle = "#6358b526";
        ctx.lineWidth = 1;

        const gridSize = 50;
        const offset = distance % gridSize;

        for (let x = -offset; x < width; x += gridSize) {
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, ground);
            ctx.stroke();
        }

        for (let y = 0; y < ground; y += gridSize) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(width, y);
            ctx.stroke();
        }

        const glow = ctx.createLinearGradient(
            0, ground - 20, 0, ground + 35
        );

        glow.addColorStop(0, "#48f6ff30");
        glow.addColorStop(1, "#48f6ff00");

        ctx.fillStyle = glow;
        ctx.fillRect(0, ground - 20, width, 55);

        ctx.fillStyle = "#10102b";
        ctx.fillRect(0, ground, width, height - ground);

        ctx.shadowColor = "#48f6ff";
        ctx.shadowBlur = 12;
        ctx.fillStyle = "#48f6ff";
        ctx.fillRect(0, ground, width, 2);
        ctx.shadowBlur = 0;

        ctx.strokeStyle = "#48f6ff25";

        for (let x = -offset; x < width; x += gridSize) {
            ctx.beginPath();
            ctx.moveTo(x, ground);
            ctx.lineTo(x - 30, height);
            ctx.stroke();
        }
    }

    function drawObstacles() {
        for (const obstacle of obstacles) {
            if (obstacle.type === "spike") {
                ctx.save();

                ctx.shadowColor = "#ff4fd8";
                ctx.shadowBlur = 15;
                ctx.fillStyle = "#ff4fd8";

                ctx.beginPath();
                ctx.moveTo(obstacle.x, ground);
                ctx.lineTo(
                    obstacle.x + obstacle.width / 2,
                    ground - obstacle.height
                );
                ctx.lineTo(
                    obstacle.x + obstacle.width,
                    ground
                );
                ctx.closePath();
                ctx.fill();

                ctx.shadowBlur = 0;
                ctx.strokeStyle = "#ffc4f4";
                ctx.lineWidth = 1.5;
                ctx.stroke();

                ctx.restore();
            }

            if (obstacle.type === "block") {
                const y = ground - obstacle.height;

                ctx.save();

                ctx.shadowColor = "#ff4fd8";
                ctx.shadowBlur = 12;
                ctx.fillStyle = "#c12cae";
                ctx.fillRect(
                    obstacle.x,
                    y,
                    obstacle.width,
                    obstacle.height
                );

                ctx.shadowBlur = 0;
                ctx.strokeStyle = "#ffb3ed";
                ctx.lineWidth = 2;
                ctx.strokeRect(
                    obstacle.x + 5,
                    y + 5,
                    obstacle.width - 10,
                    obstacle.height - 10
                );

                ctx.restore();
            }

            if (obstacle.type === "finish") {
                ctx.save();

                ctx.shadowColor = "#48f6ff";
                ctx.shadowBlur = 20;
                ctx.fillStyle = "#48f6ff";
                ctx.fillRect(obstacle.x, 0, 4, ground);

                ctx.restore();
            }
        }
    }

    function drawPlayer() {
        if (!player) return;

        ctx.save();

        ctx.translate(
            player.x + player.size / 2,
            player.y + player.size / 2
        );

        ctx.rotate(player.rotation);

        ctx.shadowColor = "#48f6ff";
        ctx.shadowBlur = 20;
        ctx.fillStyle = "#48f6ff";

        ctx.fillRect(
            -player.size / 2,
            -player.size / 2,
            player.size,
            player.size
        );

        ctx.shadowBlur = 0;
        ctx.strokeStyle = "#e5ffff";
        ctx.lineWidth = 2;

        ctx.strokeRect(
            -player.size / 2 + 2,
            -player.size / 2 + 2,
            player.size - 4,
            player.size - 4
        );

        ctx.fillStyle = "#10102b";

        ctx.fillRect(
            -player.size * 0.25,
            -player.size * 0.2,
            player.size * 0.15,
            player.size * 0.15
        );

        ctx.fillRect(
            player.size * 0.1,
            -player.size * 0.2,
            player.size * 0.15,
            player.size * 0.15
        );

        ctx.fillRect(
            -player.size * 0.2,
            player.size * 0.15,
            player.size * 0.4,
            player.size * 0.08
        );

        ctx.restore();
    }

    function draw() {
        drawBackground();
        drawObstacles();
        drawPlayer();
    }

    function loop(time) {
        const dt = Math.min((time - lastTime) / 1000 || 0, 0.033);
        lastTime = time;

        update(dt);
        draw();

        requestAnimationFrame(loop);
    }

    startButton.addEventListener("click", startGame);
    retryButton.addEventListener("click", startGame);
    restartButton.addEventListener("click", startGame);
    nextButton.addEventListener("click", startGame);

    pauseButton.addEventListener("click", togglePause);
    resumeButton.addEventListener("click", togglePause);

    canvas.addEventListener("pointerdown", event => {
        event.preventDefault();
        jump();
    });

    window.addEventListener("keydown", event => {
        if (
            event.code === "Space" ||
            event.code === "ArrowUp" ||
            event.code === "KeyW"
        ) {
            event.preventDefault();

            if (!event.repeat) {
                jump();
            }
        }

        if (event.code === "Escape" || event.code === "KeyP") {
            togglePause();
        }
    });

    window.addEventListener("resize", resizeCanvas);

    window.addEventListener("orientationchange", () => {
        setTimeout(resizeCanvas, 150);
    });

    resizeCanvas();
    resetGame();

    lastTime = performance.now();
    requestAnimationFrame(loop);
})();
