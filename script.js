(() => {
  'use strict';

  const canvas = document.getElementById('gameCanvas');
  const ctx = canvas.getContext('2d');
  const menuScreen = document.getElementById('menuScreen');
  const resultScreen = document.getElementById('resultScreen');
  const pauseOverlay = document.getElementById('pauseOverlay');
  const pauseButton = document.getElementById('pauseButton');
  const progressFill = document.getElementById('progressFill');
  const percentLabel = document.getElementById('percentLabel');
  const bestLabel = document.getElementById('bestLabel');
  const soundButton = document.getElementById('soundButton');

  const W = canvas.width;
  const H = canvas.height;
  const GROUND = 438;
  const LEVEL_LENGTH = 6200;
  const SPEED = 390;
  const GRAVITY = 1900;
  const JUMP = -690;

  let state = 'menu';
  let lastTime = 0;
  let world = 0;
  let camera = 0;
  let percent = 0;
  let best = Number(localStorage.getItem('gdClassicBest') || 0);
  let soundOn = true;
  let audio = null;
  let particles = [];
  let shake = 0;
  let cube = { x: 170, y: GROUND - 42, size: 42, vy: 0, rotation: 0, grounded: true };

  const obstacles = [];
  let x = 650;
  const pattern = [
    ['spike', 1], ['spike', 1], ['block', 1], ['spike', 1], ['spike', 1],
    ['double', 1], ['block', 1], ['spike', 1], ['triple', 1], ['spike', 1],
    ['block', 1], ['double', 1], ['spike', 1], ['spike', 1], ['block', 1],
    ['triple', 1], ['double', 1], ['spike', 1], ['block', 1], ['spike', 1]
  ];
  pattern.forEach((item, index) => {
    const [type] = item;
    if (type === 'spike') obstacles.push({ x, type: 'spike', w: 42, h: 42 });
    if (type === 'double') {
      obstacles.push({ x, type: 'spike', w: 42, h: 42 });
      obstacles.push({ x: x + 40, type: 'spike', w: 42, h: 42 });
    }
    if (type === 'triple') {
      for (let n = 0; n < 3; n++) obstacles.push({ x: x + n * 40, type: 'spike', w: 42, h: 42 });
    }
    if (type === 'block') obstacles.push({ x, type: 'block', w: 42, h: 42 });
    x += [280, 320, 360, 300][index % 4];
  });
  obstacles.push({ x: LEVEL_LENGTH - 120, type: 'finish', w: 24, h: 170 });

  function sound(frequency = 440, duration = 0.07, wave = 'square') {
    if (!soundOn) return;
    try {
      audio = audio || new (window.AudioContext || window.webkitAudioContext)();
      if (audio.state === 'suspended') audio.resume();
      const oscillator = audio.createOscillator();
      const gain = audio.createGain();
      oscillator.type = wave;
      oscillator.frequency.setValueAtTime(frequency, audio.currentTime);
      gain.gain.setValueAtTime(0.055, audio.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audio.currentTime + duration);
      oscillator.connect(gain);
      gain.connect(audio.destination);
      oscillator.start();
      oscillator.stop(audio.currentTime + duration);
    } catch (_) {}
  }

  function resetGame() {
    world = 0;
    camera = 0;
    percent = 0;
    particles = [];
    shake = 0;
    cube = { x: 170, y: GROUND - 42, size: 42, vy: 0, rotation: 0, grounded: true };
    progressFill.style.width = '0%';
    percentLabel.textContent = '0%';
  }

  function startGame() {
    resetGame();
    state = 'playing';
    menuScreen.classList.add('hidden');
    resultScreen.classList.add('hidden');
    pauseOverlay.classList.add('hidden');
    pauseButton.classList.remove('hidden');
    lastTime = performance.now();
    sound(620, .09);
  }

  function showResult(won) {
    state = won ? 'won' : 'dead';
    pauseButton.classList.add('hidden');
    resultScreen.classList.remove('hidden');
    document.getElementById('resultEyebrow').textContent = won ? 'LEVEL COMPLETE!' : 'LEVEL FAILED';
    document.getElementById('resultTitle').innerHTML = won ? 'УРОВЕНЬ<br><strong>ПРОЙДЕН!</strong>' : 'ПОПРОБУЙ<br><strong>ЕЩЁ РАЗ!</strong>';
    document.getElementById('resultDescription').textContent = won ? 'Отличная работа! Ты добрался до финиша.' : 'Каждая попытка приближает к победе.';
    document.getElementById('resultPercent').textContent = Math.floor(percent) + '%';
    if (percent > best) {
      best = Math.floor(percent);
      localStorage.setItem('gdClassicBest', String(best));
      bestLabel.textContent = best + '%';
    }
    sound(won ? 740 : 150, .22, won ? 'triangle' : 'sawtooth');
  }

  function jump() {
    if (state !== 'playing') return;
    if (cube.grounded) {
      cube.vy = JUMP;
      cube.grounded = false;
      sound(520, .055);
      for (let i = 0; i < 5; i++) particles.push({
        x: cube.x + cube.size / 2, y: GROUND - 3,
        vx: (Math.random() - .5) * 150, vy: -Math.random() * 130,
        life: .35, color: '#fff0a8', size: 5
      });
    }
  }

  function pause() {
    if (state !== 'playing') return;
    state = 'paused';
    pauseOverlay.classList.remove('hidden');
    pauseButton.classList.add('hidden');
  }
  function resume() {
    if (state !== 'paused') return;
    state = 'playing';
    pauseOverlay.classList.add('hidden');
    pauseButton.classList.remove('hidden');
    lastTime = performance.now();
  }

  function rectsOverlap(a, b) {
    return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
  }

  function update(dt) {
    if (state !== 'playing') return;
    world += SPEED * dt;
    camera = world;
    percent = Math.min(100, world / LEVEL_LENGTH * 100);
    percentLabel.textContent = Math.floor(percent) + '%';
    progressFill.style.width = percent + '%';

    cube.vy += GRAVITY * dt;
    cube.y += cube.vy * dt;
    if (cube.y + cube.size >= GROUND) {
      cube.y = GROUND - cube.size;
      cube.vy = 0;
      cube.grounded = true;
      cube.rotation = Math.round(cube.rotation / (Math.PI / 2)) * (Math.PI / 2);
    } else {
      cube.grounded = false;
      cube.rotation += dt * 7.5;
    }

    const player = { x: cube.x + 7, y: cube.y + 6, w: cube.size - 14, h: cube.size - 12 };
    for (const obstacle of obstacles) {
      const screenX = obstacle.x - camera + cube.x;
      if (screenX < -70 || screenX > W + 60) continue;
      if (obstacle.type === 'finish') {
        if (world >= LEVEL_LENGTH) { percent = 100; showResult(true); return; }
        continue;
      }
      let hitbox;
      if (obstacle.type === 'spike') hitbox = { x: screenX + 8, y: GROUND - 34, w: 26, h: 34 };
      else hitbox = { x: screenX + 3, y: GROUND - 40, w: 36, h: 40 };
      if (rectsOverlap(player, hitbox)) {
        shake = 8;
        for (let i = 0; i < 18; i++) particles.push({
          x: cube.x + cube.size / 2, y: cube.y + cube.size / 2,
          vx: (Math.random() - .5) * 420, vy: (Math.random() - .5) * 420,
          life: .65, color: ['#f4a43b', '#fff0a8', '#7ecfda'][i % 3], size: 6 + Math.random() * 5
        });
        showResult(false);
        return;
      }
    }

    particles.forEach(p => { p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 450 * dt; p.life -= dt; });
    particles = particles.filter(p => p.life > 0);
    shake = Math.max(0, shake - dt * 35);
  }

  function drawBackground() {
    const sky = ctx.createLinearGradient(0, 0, 0, H);
    sky.addColorStop(0, '#78cddd');
    sky.addColorStop(1, '#d0edcf');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, W, H);

    // Далёкие холмы и геометрические узоры.
    ctx.fillStyle = '#a7dcae';
    for (let i = 0; i < 8; i++) {
      const px = ((i * 190 - camera * .22) % (W + 220) + W + 220) % (W + 220) - 100;
      ctx.beginPath();
      ctx.moveTo(px - 100, GROUND);
      ctx.lineTo(px, 235 + (i % 3) * 28);
      ctx.lineTo(px + 120, GROUND);
      ctx.closePath();
      ctx.fill();
    }
    ctx.strokeStyle = 'rgba(39,83,111,.12)';
    ctx.lineWidth = 2;
    for (let i = 0; i < 13; i++) {
      const px = ((i * 110 - camera * .42) % (W + 120) + W + 120) % (W + 120) - 60;
      ctx.strokeRect(px, 95 + (i % 4) * 28, 34, 34);
      ctx.beginPath(); ctx.moveTo(px - 9, 160 + (i % 3) * 24); ctx.lineTo(px + 20, 132 + (i % 3) * 24); ctx.stroke();
    }
  }

  function drawGround() {
    ctx.fillStyle = '#e6b64e';
    ctx.fillRect(0, GROUND, W, H - GROUND);
    ctx.fillStyle = '#fff0a8';
    ctx.fillRect(0, GROUND, W, 8);
    ctx.fillStyle = '#c88d38';
    for (let i = 0; i < 28; i++) {
      const px = ((i * 44 - camera) % (W + 44) + W + 44) % (W + 44) - 44;
      ctx.fillRect(px, GROUND + 20, 22, 5);
      ctx.fillRect(px + 15, GROUND + 49, 13, 5);
    }
    ctx.fillStyle = '#b47a32';
    ctx.fillRect(0, GROUND + 78, W, 4);
  }

  function drawObstacles() {
    obstacles.forEach(o => {
      const sx = o.x - camera + cube.x;
      if (sx < -60 || sx > W + 60) return;
      if (o.type === 'spike') {
        ctx.fillStyle = '#f3f0df';
        ctx.strokeStyle = '#26365f';
        ctx.lineWidth = 5;
        ctx.beginPath();
        ctx.moveTo(sx, GROUND + 2);
        ctx.lineTo(sx + 21, GROUND - 43);
        ctx.lineTo(sx + 43, GROUND + 2);
        ctx.closePath(); ctx.fill(); ctx.stroke();
        ctx.fillStyle = '#e7a34a';
        ctx.beginPath(); ctx.moveTo(sx + 21, GROUND - 32); ctx.lineTo(sx + 30, GROUND - 1); ctx.lineTo(sx + 13, GROUND - 1); ctx.closePath(); ctx.fill();
      } else if (o.type === 'block') {
        ctx.fillStyle = '#e5a04a'; ctx.strokeStyle = '#26365f'; ctx.lineWidth = 5;
        ctx.fillRect(sx, GROUND - 43, 43, 43); ctx.strokeRect(sx + 2, GROUND - 41, 39, 39);
        ctx.fillStyle = '#ffdb76'; ctx.fillRect(sx + 8, GROUND - 35, 10, 10);
        ctx.fillStyle = '#c77938'; ctx.fillRect(sx + 24, GROUND - 19, 10, 10);
      } else if (o.type === 'finish') {
        ctx.fillStyle = '#fff3d2'; ctx.fillRect(sx, GROUND - 165, 8, 165);
        for (let row = 0; row < 8; row++) for (let col = 0; col < 3; col++) {
          ctx.fillStyle = (row + col) % 2 ? '#263f83' : '#fff3d2';
          ctx.fillRect(sx + 8 + col * 13, GROUND - 165 + row * 13, 13, 13);
        }
      }
    });
  }

  function drawCube() {
    ctx.save();
    ctx.translate(cube.x + cube.size / 2, cube.y + cube.size / 2);
    ctx.rotate(cube.rotation);
    ctx.fillStyle = '#f2a83b';
    ctx.strokeStyle = '#26365f';
    ctx.lineWidth = 5;
    ctx.fillRect(-cube.size / 2, -cube.size / 2, cube.size, cube.size);
    ctx.strokeRect(-cube.size / 2 + 2, -cube.size / 2 + 2, cube.size - 4, cube.size - 4);
    ctx.fillStyle = '#ffd66b';
    ctx.fillRect(-13, -13, 10, 10);
    ctx.fillStyle = '#26365f';
    ctx.fillRect(-10, -9, 5, 7);
    ctx.fillRect(8, -9, 5, 7);
    ctx.fillRect(-8, 9, 17, 4);
    ctx.restore();
  }

  function drawParticles() {
    particles.forEach(p => {
      ctx.globalAlpha = Math.max(0, Math.min(1, p.life * 2));
      ctx.fillStyle = p.color;
      ctx.fillRect(p.x, p.y, p.size, p.size);
    });
    ctx.globalAlpha = 1;
  }

  function render() {
    ctx.save();
    if (shake > 0) ctx.translate((Math.random() - .5) * shake, (Math.random() - .5) * shake);
    drawBackground();
    drawGround();
    if (state === 'menu') {
      // Небольшая демонстрационная сцена в главном меню.
      const demo = (performance.now() / 1000) % 4;
      ctx.fillStyle = '#f2a83b'; ctx.strokeStyle = '#26365f'; ctx.lineWidth = 5;
      ctx.save(); ctx.translate(180, GROUND - 21 - Math.abs(Math.sin(demo * Math.PI / 2)) * 85); ctx.rotate(demo * Math.PI / 2);
      ctx.fillRect(-21, -21, 42, 42); ctx.strokeRect(-19, -19, 38, 38);
      ctx.fillStyle = '#26365f'; ctx.fillRect(-10, -8, 5, 7); ctx.fillRect(7, -8, 5, 7); ctx.restore();
    } else {
      drawObstacles();
      drawCube();
      drawParticles();
    }
    ctx.restore();
  }

  function loop(time) {
    const dt = Math.min((time - lastTime) / 1000 || 0, .033);
    lastTime = time;
    if (state === 'playing') update(dt);
    render();
    requestAnimationFrame(loop);
  }

  document.getElementById('playButton').addEventListener('click', startGame);
  document.getElementById('retryButton').addEventListener('click', startGame);
  document.getElementById('menuButton').addEventListener('click', () => {
    state = 'menu'; resultScreen.classList.add('hidden'); menuScreen.classList.remove('hidden'); resetGame();
  });
  document.getElementById('pauseMenuButton').addEventListener('click', () => {
    state = 'menu'; pauseOverlay.classList.add('hidden'); menuScreen.classList.remove('hidden'); resetGame();
  });
  document.getElementById('resumeButton').addEventListener('click', resume);
  pauseButton.addEventListener('click', pause);
  soundButton.addEventListener('click', () => {
    soundOn = !soundOn;
    soundButton.classList.toggle('muted', !soundOn);
    soundButton.textContent = soundOn ? '♫' : '♪';
    soundButton.setAttribute('aria-label', soundOn ? 'Выключить звук' : 'Включить звук');
    if (soundOn) sound(500, .08);
  });

  canvas.addEventListener('pointerdown', event => {
    event.preventDefault();
    if (state === 'playing') jump();
  });
  window.addEventListener('keydown', event => {
    if (['Space', 'ArrowUp', 'KeyW'].includes(event.code)) {
      event.preventDefault();
      if (state === 'playing') jump();
      else if (state === 'menu') startGame();
    }
    if (event.code === 'Escape' || event.code === 'KeyP') {
      if (state === 'playing') pause();
      else if (state === 'paused') resume();
    }
  });
  window.addEventListener('blur', () => { if (state === 'playing') pause(); });

  bestLabel.textContent = best + '%';
  lastTime = performance.now();
  requestAnimationFrame(loop);
})();