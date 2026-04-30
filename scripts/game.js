// ../scripts/game.js - VOID RUNNER (Hard Precision Survival)

let canvas, ctx;
let gameRunning = false;
let score = 0;
let highScore = localStorage.getItem('voidHigh') || 0;

let ship = { x: 200, y: 300, vx: 0, vy: 0, angle: 0 };
let obstacles = [];
let orbs = [];
let particles = [];

let difficulty = 1;
let scrollSpeed = 3.5;
let keys = {};
let mouseX = 200;

function toggleGame() {
    const area = document.getElementById('game-area');
    if (area.style.display === 'none') {
        area.style.display = 'block';
        initGame();
    } else {
        area.style.display = 'none';
        gameRunning = false;
    }
}

function initGame() {
    canvas = document.getElementById('gameCanvas');
    ctx = canvas.getContext('2d');

    gameRunning = true;
    score = 0;
    difficulty = 1;
    scrollSpeed = 3.5;

    ship.x = 200;
    ship.y = 280;
    ship.vx = 0;
    ship.vy = 0;

    obstacles = [];
    orbs = [];
    particles = [];

    document.addEventListener('keydown', e => keys[e.key] = true);
    document.addEventListener('keyup', e => keys[e.key] = false);

    canvas.addEventListener('mousemove', (e) => {
        const rect = canvas.getBoundingClientRect();
        mouseX = Math.max(30, Math.min(canvas.width - 30, e.clientX - rect.left));
    });

    requestAnimationFrame(gameLoop);
}

function spawnObstacle() {
    const gap = 110 - difficulty * 8;
    const leftWidth = 60 + Math.random() * (canvas.width - gap - 120);

    obstacles.push({
        x: 0,
        y: -40,
        width: leftWidth,
        height: 28,
        passed: false
    });

    obstacles.push({
        x: leftWidth + gap,
        y: -40,
        width: canvas.width - leftWidth - gap,
        height: 28,
        passed: false
    });
}

function spawnOrb() {
    orbs.push({
        x: 40 + Math.random() * (canvas.width - 80),
        y: -20,
        size: 9
    });
}

function createParticles(x, y, color, count) {
    for (let i = 0; i < count; i++) {
        particles.push({
            x, y,
            vx: Math.random() * 10 - 5,
            vy: Math.random() * 10 - 6,
            life: 18,
            color
        });
    }
}

function gameLoop() {
    if (!gameRunning) return;

    ctx.fillStyle = 'rgba(3, 3, 12, 0.95)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Ship control - strong mouse attraction + keyboard
    const targetX = mouseX;
    ship.vx += (targetX - ship.x) * 0.085;
    ship.vx *= 0.82;                    // strong friction

    if (keys['ArrowLeft'] || keys['a']) ship.vx -= 2.2;
    if (keys['ArrowRight'] || keys['d']) ship.vx += 2.2;

    ship.x += ship.vx;
    ship.y = 280; // fixed vertical position for difficulty

    // Boundaries
    if (ship.x < 25) { ship.x = 25; ship.vx = 4; }
    if (ship.x > canvas.width - 25) { ship.x = canvas.width - 25; ship.vx = -4; }

    // Spawning
    if (Math.random() < 0.085 + difficulty * 0.022) spawnObstacle();
    if (Math.random() < 0.065 + difficulty * 0.018) spawnOrb();

    // Update & draw obstacles
    for (let i = obstacles.length - 1; i >= 0; i--) {
        const o = obstacles[i];
        o.y += scrollSpeed + difficulty * 0.6;

        ctx.fillStyle = '#ff3366';
        ctx.fillRect(o.x, o.y, o.width, o.height);

        // Collision
        if (
            ship.x + 14 > o.x && 
            ship.x - 14 < o.x + o.width &&
            ship.y + 14 > o.y && 
            ship.y - 14 < o.y + o.height
        ) {
            gameRunning = false;
            if (score > highScore) {
                highScore = score;
                localStorage.setItem('voidHigh', highScore);
            }
            alert(`VOID RUNNER\n\nFinal Score: ${score}\nHigh Score: ${highScore}`);
            document.getElementById('game-area').style.display = 'none';
            return;
        }

        // Score when passed
        if (!o.passed && o.y > ship.y) {
            o.passed = true;
            score += 10;
        }

        if (o.y > canvas.height + 50) obstacles.splice(i, 1);
    }

    // Update & draw orbs
    for (let i = orbs.length - 1; i >= 0; i--) {
        const o = orbs[i];
        o.y += scrollSpeed + 1;

        ctx.shadowBlur = 15;
        ctx.shadowColor = '#00ffcc';
        ctx.fillStyle = '#00ffcc';
        ctx.beginPath();
        ctx.arc(o.x, o.y, o.size, 0, Math.PI*2);
        ctx.fill();
        ctx.shadowBlur = 0;

        if (Math.hypot(o.x - ship.x, o.y - ship.y) < 24) {
            score += 25;
            createParticles(o.x, o.y, '#00ffcc', 14);
            orbs.splice(i, 1);
            difficulty += 0.12;
        }

        if (o.y > canvas.height + 20) orbs.splice(i, 1);
    }

    // Draw Ship (sharp neon triangle)
    ctx.save();
    ctx.translate(ship.x, ship.y);
    ctx.rotate(ship.vx * 0.025);   // tilt based on velocity

    ctx.fillStyle = '#ffffff';
    ctx.shadowBlur = 30;
    ctx.shadowColor = '#00ffff';
    ctx.beginPath();
    ctx.moveTo(0, -19);
    ctx.lineTo(-13, 14);
    ctx.lineTo(13, 14);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    // Particles
    for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.35;
        p.life--;

        ctx.globalAlpha = p.life / 18;
        ctx.fillStyle = p.color;
        ctx.fillRect(p.x, p.y, 4, 4);

        if (p.life <= 0) particles.splice(i, 1);
    }
    ctx.globalAlpha = 1;

    // UI
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 26px Inter, sans-serif';
    ctx.fillText(score, 30, 50);

    ctx.font = 'bold 15px Inter, sans-serif';
    ctx.fillStyle = '#00ffcc';
    ctx.fillText('VOID RUNNER', 30, 78);

    ctx.fillStyle = '#ff3366';
    ctx.fillText('HIGH ' + highScore, 260, 50);

    // Increase difficulty rapidly
    if (score > 0 && score % 280 === 0) {
        difficulty += 0.45;
        scrollSpeed += 0.25;
    }

    requestAnimationFrame(gameLoop);
}