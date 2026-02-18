const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreElement = document.getElementById('score');
const highScoreElement = document.getElementById('high-score');
const startBtn = document.getElementById('start-btn');
const speedRange = document.getElementById('speed-range');
const speedValue = document.getElementById('speed-value');

// Game settings
const gridSize = 20;
let tileCount = canvas.width / gridSize;
let baseSpeed = 200; // Base milliseconds delay
let speed = 100;
let gameLoop;
let score = 0;
let highScore = localStorage.getItem('snakeHighScore') || 0;

highScoreElement.textContent = highScore;

// Snake and Food
let snake = [];
let food = { x: 0, y: 0 };
let dx = 0;
let dy = 0;

// Game State
let isGameRunning = false;

// Audio context for sound effects (simple beep)
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

function playSound(type) {
    if (audioCtx.state === 'suspended') {
        audioCtx.resume();
    }
    const oscillator = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioCtx.destination);
    
    if (type === 'eat') {
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(600, audioCtx.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(1000, audioCtx.currentTime + 0.1);
        gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.1);
        oscillator.start();
        oscillator.stop(audioCtx.currentTime + 0.1);
    } else if (type === 'die') {
        oscillator.type = 'sawtooth';
        oscillator.frequency.setValueAtTime(100, audioCtx.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(50, audioCtx.currentTime + 0.3);
        gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.3);
        oscillator.start();
        oscillator.stop(audioCtx.currentTime + 0.3);
    }
}

function initGame() {
    // Reset snake to center
    const startX = Math.floor(tileCount / 2);
    const startY = Math.floor(tileCount / 2);
    snake = [
        { x: startX, y: startY },
        { x: startX - 1, y: startY },
        { x: startX - 2, y: startY }
    ];
    score = 0;
    scoreElement.textContent = score;
    dx = 1;
    dy = 0;
    createFood();
    isGameRunning = true;
    startBtn.textContent = '重新开始';
    startBtn.blur(); // Remove focus so spacebar doesn't trigger button
    
    // Calculate speed based on slider (1-20)
    // Range 1 (slowest) -> 20 (fastest)
    // Delay: 300ms -> 50ms
    const val = parseInt(speedRange.value);
    // Map 1-20 to roughly 300-30
    speed = 310 - (val * 13);
    
    if (gameLoop) clearInterval(gameLoop);
    gameLoop = setInterval(draw, speed);
}

// Update speed display
speedRange.addEventListener('input', () => {
    speedValue.textContent = speedRange.value;
    if (isGameRunning) {
        // Update speed in real-time if game is running
        const val = parseInt(speedRange.value);
        speed = 310 - (val * 13);
        clearInterval(gameLoop);
        gameLoop = setInterval(draw, speed);
        // Refocus game canvas logic to prevent focus stealing issues if any
        startBtn.blur(); 
    }
});

function createFood() {
    food.x = Math.floor(Math.random() * tileCount);
    food.y = Math.floor(Math.random() * tileCount);
    
    // Check if food spawns on snake body
    for (let part of snake) {
        if (part.x === food.x && part.y === food.y) {
            createFood();
            return;
        }
    }
}

function draw() {
    // Clear canvas
    ctx.fillStyle = 'black';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Move snake
    const head = { x: snake[0].x + dx, y: snake[0].y + dy };
    
    // Check collision with walls
    if (head.x < 0 || head.x >= tileCount || head.y < 0 || head.y >= tileCount) {
        gameOver();
        return;
    }
    
    // Check collision with self
    for (let i = 0; i < snake.length; i++) {
        if (head.x === snake[i].x && head.y === snake[i].y) {
            gameOver();
            return;
        }
    }
    
    snake.unshift(head);
    
    // Check if ate food
    if (head.x === food.x && head.y === food.y) {
        score += 10;
        scoreElement.textContent = score;
        playSound('eat');
        createFood();
        // Don't pop the tail, so snake grows
    } else {
        snake.pop();
    }
    
    // Draw Food
    ctx.fillStyle = '#e74c3c';
    // Draw food as circle
    ctx.beginPath();
    ctx.arc(food.x * gridSize + gridSize/2, food.y * gridSize + gridSize/2, gridSize/2 - 2, 0, Math.PI * 2);
    ctx.fill();
    
    // Draw Snake
    for (let i = 0; i < snake.length; i++) {
        // Head is a slightly different color
        if (i === 0) ctx.fillStyle = '#27ae60';
        else ctx.fillStyle = '#2ecc71';
        
        ctx.fillRect(snake[i].x * gridSize, snake[i].y * gridSize, gridSize - 2, gridSize - 2);
    }
}

function gameOver() {
    isGameRunning = false;
    clearInterval(gameLoop);
    playSound('die');
    
    if (score > highScore) {
        highScore = score;
        localStorage.setItem('snakeHighScore', highScore);
        highScoreElement.textContent = highScore;
    }
    
    ctx.fillStyle = 'white';
    ctx.font = '50px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('游戏结束', canvas.width / 2, canvas.height / 2);
    
    startBtn.textContent = '开始游戏';
}

// Input Handling
document.addEventListener('keydown', changeDirection);

function changeDirection(event) {
    if (!isGameRunning) return;
    
    const LEFT_KEY = 37;
    const RIGHT_KEY = 39;
    const UP_KEY = 38;
    const DOWN_KEY = 40;
    
    const keyPressed = event.keyCode;
    const goingUp = dy === -1;
    const goingDown = dy === 1;
    const goingRight = dx === 1;
    const goingLeft = dx === -1;
    
    if (keyPressed === LEFT_KEY && !goingRight) {
        dx = -1;
        dy = 0;
    }
    if (keyPressed === UP_KEY && !goingDown) {
        dx = 0;
        dy = -1;
    }
    if (keyPressed === RIGHT_KEY && !goingLeft) {
        dx = 1;
        dy = 0;
    }
    if (keyPressed === DOWN_KEY && !goingUp) {
        dx = 0;
        dy = 1;
    }
}

// Mobile Controls
// Prevent default touch actions to avoid scrolling while playing
const mobileBtns = document.querySelectorAll('.mobile-controls button');
mobileBtns.forEach(btn => {
    btn.addEventListener('touchstart', (e) => {
        e.preventDefault(); // Prevent long-press menu etc
    }, { passive: false });
});

document.getElementById('up-btn').addEventListener('touchstart', (e) => {
    e.preventDefault();
    if (dy !== 1) { dx = 0; dy = -1; }
});
document.getElementById('down-btn').addEventListener('touchstart', (e) => {
    e.preventDefault();
    if (dy !== -1) { dx = 0; dy = 1; }
});
document.getElementById('left-btn').addEventListener('touchstart', (e) => {
    e.preventDefault();
    if (dx !== 1) { dx = -1; dy = 0; }
});
document.getElementById('right-btn').addEventListener('touchstart', (e) => {
    e.preventDefault();
    if (dx !== -1) { dx = 1; dy = 0; }
});

// Also keep click for mouse testing
document.getElementById('up-btn').addEventListener('click', () => {
    if (dy !== 1) { dx = 0; dy = -1; }
});
document.getElementById('down-btn').addEventListener('click', () => {
    if (dy !== -1) { dx = 0; dy = 1; }
});
document.getElementById('left-btn').addEventListener('click', () => {
    if (dx !== 1) { dx = -1; dy = 0; }
});
document.getElementById('right-btn').addEventListener('click', () => {
    if (dx !== -1) { dx = 1; dy = 0; }
});

startBtn.addEventListener('click', initGame);
