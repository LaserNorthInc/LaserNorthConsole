let canvas, ctx;
let gameRunning = false;
let score = 0;
let basket = { x: 175, y: 350, w: 60, h: 20 };
let items = [];
let speed = 2.5;

function toggleGame() {
    const area = document.getElementById('game-area');
    if (area.style.display === 'none') {
        area.style.display = 'block';
        if (!gameRunning) initGame();
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
    items = [];
    speed = 2.5;
    
    window.onkeydown = (e) => {
        if (e.key === "ArrowLeft" && basket.x > 0) basket.x -= 25;
        if (e.key === "ArrowRight" && basket.x < canvas.width - basket.w) basket.x += 25;
    };
    
    requestAnimationFrame(gameLoop);
}

function gameLoop() {
    if (!gameRunning) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = "#ff6b00";
    ctx.fillRect(basket.x, basket.y, basket.w, basket.h);

    if (Math.random() < 0.02) {
        items.push({ x: Math.random() * (canvas.width - 20), y: 0, size: 15 });
    }

    ctx.fillStyle = "#e4e6eb";
    items.forEach((item, index) => {
        item.y += speed;
        ctx.fillRect(item.x, item.y, item.size, item.size);

        if (item.y + item.size > basket.y && item.x > basket.x && item.x < basket.x + basket.w) {
            items.splice(index, 1);
            score++;
            if (score % 5 === 0) speed += 0.3;
        }

        if (item.y > canvas.height) {
            gameRunning = false;
            alert("Sheet Scrap! Final Score: " + score);
            document.getElementById('game-area').style.display = 'none';
        }
    });

    ctx.fillStyle = "#fff";
    ctx.font = "bold 14px Inter";
    ctx.fillText("CAUGHT: " + score, 15, 25);
    requestAnimationFrame(gameLoop);
}