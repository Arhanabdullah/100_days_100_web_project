const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");

const color = "#00f0ff";
const secondaryColor = "#ff007f";

let score = 0;
let highScore = localStorage.getItem("breakoutHighScore") || 0;
let gameRunning = false;
let gamePaused = false;
const brickRowCount = 9;
const brickColumnCount = 5;
const heightRatio = 0.65; // Slightly wider ratio for layout comfort
canvas.height = canvas.width * heightRatio;
ctx.canvas.width = 800;
ctx.canvas.height = ctx.canvas.width * heightRatio;

const initialBallSpeed = 4;
let currentBrickColor = getRandomColor();

const ball = {
    x: canvas.width / 2,
    y: canvas.height / 2,
    size: 9,
    speed: initialBallSpeed,
    dx: 0,
    dy: 0,
};

const paddle = {
    x: canvas.width / 2 - 50,
    y: canvas.height - 25,
    w: 100,
    h: 12,
    speed: 8,
    dx: 0,
};

const brickInfo = {
    w: 70,
    h: 18,
    padding: 10,
    offsetX: 45,
    offsetY: 60,
    visible: true,
    color: getRandomColor(),
};

const bricks = [];
for (let i = 0; i < brickRowCount; i++) {
    bricks[i] = [];
    for (let j = 0; j < brickColumnCount; j++) {
        const x = i * (brickInfo.w + brickInfo.padding) + brickInfo.offsetX;
        const y = j * (brickInfo.h + brickInfo.padding) + brickInfo.offsetY;
        bricks[i][j] = { x, y, ...brickInfo };
    }
}

/* =========================================================
   PROCEDURAL SOUND ENGINE (Web Audio API)
========================================================= */
const SoundEngine = {
    audioCtx: null,
    enabled: true,

    init() {
        if (this.audioCtx) return;
        try {
            const AudioContextClass = window.AudioContext || window.webkitAudioContext;
            this.audioCtx = new AudioContextClass();
        } catch (e) {
            console.warn("Web Audio API not supported:", e);
        }
    },

    play(type) {
        if (!this.enabled) return;
        this.init();
        if (!this.audioCtx) return;

        if (this.audioCtx.state === "suspended") {
            this.audioCtx.resume();
        }

        const now = this.audioCtx.currentTime;

        if (type === "paddle") {
            // Low pop sound
            const osc = this.audioCtx.createOscillator();
            const gain = this.audioCtx.createGain();
            osc.type = "sine";
            osc.frequency.setValueAtTime(150, now);
            osc.frequency.exponentialRampToValueAtTime(300, now + 0.1);
            gain.gain.setValueAtTime(0.15, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
            osc.connect(gain);
            gain.connect(this.audioCtx.destination);
            osc.start(now);
            osc.stop(now + 0.1);
        } else if (type === "brick") {
            // High chime sound
            const osc = this.audioCtx.createOscillator();
            const gain = this.audioCtx.createGain();
            osc.type = "triangle";
            osc.frequency.setValueAtTime(500, now);
            osc.frequency.exponentialRampToValueAtTime(1000, now + 0.08);
            gain.gain.setValueAtTime(0.12, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
            osc.connect(gain);
            gain.connect(this.audioCtx.destination);
            osc.start(now);
            osc.stop(now + 0.08);
        } else if (type === "tick") {
            // Short countdown tick
            const osc = this.audioCtx.createOscillator();
            const gain = this.audioCtx.createGain();
            osc.type = "sine";
            osc.frequency.setValueAtTime(440, now);
            gain.gain.setValueAtTime(0.08, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
            osc.connect(gain);
            gain.connect(this.audioCtx.destination);
            osc.start(now);
            osc.stop(now + 0.05);
        } else if (type === "go") {
            // Clear start alert
            const osc = this.audioCtx.createOscillator();
            const gain = this.audioCtx.createGain();
            osc.type = "sine";
            osc.frequency.setValueAtTime(880, now);
            gain.gain.setValueAtTime(0.15, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
            osc.connect(gain);
            gain.connect(this.audioCtx.destination);
            osc.start(now);
            osc.stop(now + 0.25);
        } else if (type === "gameover") {
            // Low sawtooth drop
            const osc = this.audioCtx.createOscillator();
            const gain = this.audioCtx.createGain();
            osc.type = "sawtooth";
            osc.frequency.setValueAtTime(180, now);
            osc.frequency.linearRampToValueAtTime(40, now + 0.4);
            gain.gain.setValueAtTime(0.12, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
            osc.connect(gain);
            gain.connect(this.audioCtx.destination);
            osc.start(now);
            osc.stop(now + 0.4);
        } else if (type === "win") {
            // Cheerful ascending scale arpeggio
            const notes = [261.63, 329.63, 392.00, 523.25];
            notes.forEach((freq, idx) => {
                const noteTime = now + idx * 0.12;
                const osc = this.audioCtx.createOscillator();
                const gain = this.audioCtx.createGain();
                osc.type = "triangle";
                osc.frequency.setValueAtTime(freq, noteTime);
                gain.gain.setValueAtTime(0.15, noteTime);
                gain.gain.exponentialRampToValueAtTime(0.001, noteTime + 0.3);
                osc.connect(gain);
                gain.connect(this.audioCtx.destination);
                osc.start(noteTime);
                osc.stop(noteTime + 0.3);
            });
        }
    }
};

/* =========================================================
   CANVAS DRAWING FUNCTIONS (Premium Glowing Visuals)
========================================================= */
function drawBall() {
    ctx.beginPath();
    const grad = ctx.createRadialGradient(ball.x, ball.y, 1, ball.x, ball.y, ball.size);
    grad.addColorStop(0, "#fff");
    grad.addColorStop(0.3, "#a5f3fc");
    grad.addColorStop(1, color);
    
    ctx.arc(ball.x, ball.y, ball.size, 0, Math.PI * 2);
    ctx.fillStyle = grad;
    ctx.shadowBlur = 15;
    ctx.shadowColor = color;
    ctx.fill();
    ctx.shadowBlur = 0; // reset shadow
    ctx.closePath();
}

function drawPaddle() {
    ctx.beginPath();
    if (ctx.roundRect) {
        ctx.roundRect(paddle.x, paddle.y, paddle.w, paddle.h, 6);
    } else {
        ctx.rect(paddle.x, paddle.y, paddle.w, paddle.h);
    }
    
    const grad = ctx.createLinearGradient(paddle.x, paddle.y, paddle.x + paddle.w, paddle.y);
    grad.addColorStop(0, color);
    grad.addColorStop(0.5, "#ffffff");
    grad.addColorStop(1, color);
    
    ctx.fillStyle = grad;
    ctx.shadowBlur = 20;
    ctx.shadowColor = color;
    ctx.fill();
    ctx.shadowBlur = 0; // reset shadow
    ctx.closePath();
}

function drawScore() {
    ctx.font = 'bold 20px "Outfit", sans-serif';
    ctx.fillStyle = "#fff";
    ctx.fillText(`SCORE: ${score}`, 45, 35);
}

function drawBricks() {
    bricks.forEach((column) => {
        column.forEach((brick) => {
            if (brick.visible) {
                ctx.beginPath();
                if (ctx.roundRect) {
                    ctx.roundRect(brick.x, brick.y, brick.w, brick.h, 4);
                } else {
                    ctx.rect(brick.x, brick.y, brick.w, brick.h);
                }
                ctx.fillStyle = brick.color;
                ctx.shadowBlur = 8;
                ctx.shadowColor = brick.color;
                ctx.fill();
                ctx.shadowBlur = 0; // reset shadow
                ctx.closePath();
            }
        });
    });
}

function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawBall();
    drawPaddle();
    drawScore();
    drawBricks();
}

/* =========================================================
   PHYSICS & MOVEMENT LOOP
========================================================= */
function movePaddle() {
    paddle.x += paddle.dx;
    if (paddle.x + paddle.w > canvas.width) paddle.x = canvas.width - paddle.w;
    if (paddle.x < 0) paddle.x = 0;
}

function moveBall() {
    ball.x += ball.dx;
    ball.y += ball.dy;

    // Bounce off walls
    if (ball.x + ball.size > canvas.width || ball.x - ball.size < 0) {
        ball.dx *= -1;
        SoundEngine.play("paddle");
    }
    if (ball.y - ball.size < 0) {
        ball.dy *= -1;
        SoundEngine.play("paddle");
    }

    // Bounce off paddle
    if (
        ball.x - ball.size > paddle.x &&
        ball.x + ball.size < paddle.x + paddle.w &&
        ball.y + ball.size > paddle.y
    ) {
        ball.dy = -ball.speed;
        SoundEngine.play("paddle");
    }

    // Brick collision
    bricks.forEach((column) => {
        column.forEach((brick) => {
            if (brick.visible) {
                if (
                    ball.x - ball.size > brick.x &&
                    ball.x + ball.size < brick.x + brick.w &&
                    ball.y + ball.size > brick.y &&
                    ball.y - ball.size < brick.y + brick.h
                ) {
                    ball.dy *= -1;
                    brick.visible = false;

                    increaseScore();
                    checkWin();

                    currentBrickColor = getRandomColor();
                    bricks.forEach((col) => {
                        col.forEach((b) => {
                            b.color = currentBrickColor;
                        });
                    });
                    SoundEngine.play("brick");
                }
            }
        });
    });

    // Fall below paddle (lose life/gameover)
    if (ball.y + ball.size > canvas.height) {
        showGameOver();
        SoundEngine.play("gameover");
    }
}

function increaseScore() {
    score++;
    if (score % (brickRowCount * brickColumnCount) === 0) {
        showAllBricks();
    }
}

function showAllBricks() {
    bricks.forEach((column) => {
        column.forEach((brick) => (brick.visible = true));
    });
}

function checkWin() {
    const allBricksBroken = bricks.every((column) =>
        column.every((brick) => !brick.visible)
    );

    if (allBricksBroken) {
        gameRunning = false;
        gamePaused = false;
        const pauseToggleBtn = document.getElementById("pauseToggleBtn");
        if (pauseToggleBtn) {
            pauseToggleBtn.textContent = "⏸️ Pause";
            pauseToggleBtn.classList.remove("active");
        }
        
        document.getElementById("game-over-container").classList.remove("hidden");
        document.querySelector(".game-over-content h2").innerText = "You Win! 🎉";
        document.getElementById("final-score").innerText = score;

        if (score > highScore) {
            highScore = score;
            localStorage.setItem("breakoutHighScore", highScore);
            updateHighScoreHUD();
        }
        document.getElementById("high-score").innerText = highScore;
        SoundEngine.play("win");
    }
}

function keyDown(e) {
    if (e.key === "Right" || e.key === "ArrowRight") paddle.dx = paddle.speed;
    else if (e.key === "Left" || e.key === "ArrowLeft") paddle.dx = -paddle.speed;
    
    if (e.key === " " || e.key === "p" || e.key === "P") {
        if (e.repeat) return;
        if (gameRunning) {
            togglePause();
            e.preventDefault();
        }
    }
}

function keyUp(e) {
    if (
        e.key === "Right" ||
        e.key === "ArrowRight" ||
        e.key === "Left" ||
        e.key === "ArrowLeft"
    ) {
        paddle.dx = 0;
    }
}

function update() {
    if (gamePaused) return;

    movePaddle();
    moveBall();
    draw();
    if (gameRunning) {
        requestAnimationFrame(update);
    }
}

function drawPauseOverlay() {
    ctx.fillStyle = "rgba(11, 15, 25, 0.7)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    ctx.save();
    ctx.font = 'bold 36px "Outfit", sans-serif';
    ctx.fillStyle = "#fff";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.shadowBlur = 15;
    ctx.shadowColor = color;
    ctx.fillText("GAME PAUSED", canvas.width / 2, canvas.height / 2);
    
    ctx.font = '16px "Outfit", sans-serif';
    ctx.fillStyle = "#9ca3af";
    ctx.shadowBlur = 0;
    ctx.fillText("Press Space or P to Resume", canvas.width / 2, canvas.height / 2 + 45);
    ctx.restore();
}

function togglePause() {
    if (!gameRunning) return;
    
    gamePaused = !gamePaused;
    const pauseToggleBtn = document.getElementById("pauseToggleBtn");
    
    if (gamePaused) {
        paddle.dx = 0; // Stop paddle movement on pause
        if (pauseToggleBtn) {
            pauseToggleBtn.textContent = "▶️ Resume";
            pauseToggleBtn.classList.add("active");
        }
        draw();
        drawPauseOverlay();
    } else {
        if (pauseToggleBtn) {
            pauseToggleBtn.textContent = "⏸️ Pause";
            pauseToggleBtn.classList.remove("active");
        }
        requestAnimationFrame(update);
    }
}

document.addEventListener("keydown", keyDown);
document.addEventListener("keyup", keyUp);

function startGame() {
    document.getElementById("rules-container").style.display = "none";
    document.getElementById("game-over-container").classList.add("hidden");
    document.querySelector(".game-over-content h2").innerText = "Game Over";

    resetGame();
    updateHighScoreHUD();

    if (!gameRunning) {
        startCountdown();
    }
}

function resetGame() {
    gamePaused = false;
    const pauseToggleBtn = document.getElementById("pauseToggleBtn");
    if (pauseToggleBtn) {
        pauseToggleBtn.textContent = "⏸️ Pause";
        pauseToggleBtn.classList.remove("active");
    }

    score = 0;
    ball.x = canvas.width / 2;
    ball.y = canvas.height / 2;
    ball.speed = initialBallSpeed;
    ball.dx = ball.speed;
    ball.dy = -ball.speed;

    paddle.x = canvas.width / 2 - 50;
    resetBricks();

    document.getElementById("final-score").innerText = 0;
    draw();
}

function resetBricks() {
    bricks.forEach((column) => {
        column.forEach((brick) => (brick.visible = true));
    });
}

function showGameOver() {
    gameRunning = false;
    gamePaused = false;
    const pauseToggleBtn = document.getElementById("pauseToggleBtn");
    if (pauseToggleBtn) {
        pauseToggleBtn.textContent = "⏸️ Pause";
        pauseToggleBtn.classList.remove("active");
    }

    document.getElementById("game-over-container").classList.remove("hidden");
    document.getElementById("final-score").innerText = score;

    if (score > highScore) {
        highScore = score;
        localStorage.setItem("breakoutHighScore", highScore);
        updateHighScoreHUD();
    }
    document.getElementById("high-score").innerText = highScore;
}

function getRandomColor() {
    const vibrantColors = ["#00f0ff", "#ff007f", "#39ff14", "#ff00ff", "#ffff00", "#ff5f1f", "#bfff00"];
    return vibrantColors[Math.floor(Math.random() * vibrantColors.length)];
}

function updateHighScoreHUD() {
    const hudScore = document.getElementById("hud-high-score");
    const modalScore = document.getElementById("high-score");
    if (hudScore) hudScore.innerText = highScore;
    if (modalScore) modalScore.innerText = highScore;
}

document.getElementById("start-btn").addEventListener("click", startGame);
document.getElementById("restart-btn").addEventListener("click", startGame);

function startCountdown() {
    const countdownEl = document.getElementById("countdown");
    countdownEl.classList.remove("hidden");
    let count = 3;
    countdownEl.innerText = count;
    SoundEngine.play("tick");

    const timer = setInterval(() => {
        count--;
        if (count > 0) {
            countdownEl.innerText = count;
            SoundEngine.play("tick");
        } else if (count === 0) {
            countdownEl.innerText = "GO!";
            SoundEngine.play("go");
        } else {
            clearInterval(timer);
            countdownEl.classList.add("hidden");
            gameRunning = true;
            update();
        }
    }, 1000);
}

/* =========================================================
   SETTINGS & SENSITIVITY CONFIGURATION CONTROLS
========================================================= */
(function initSettings() {
    const sensitivitySlider = document.getElementById("sensitivity");
    const sensitivityValue = document.getElementById("sensitivity-value");
    const audioToggleBtn = document.getElementById("audioToggleBtn");
    const pauseToggleBtn = document.getElementById("pauseToggleBtn");

    // Load High Scores
    updateHighScoreHUD();

    // 0. Pause Setup
    if (pauseToggleBtn) {
        pauseToggleBtn.addEventListener("click", () => {
            togglePause();
        });
    }

    // 1. Sensitivity Setup
    if (sensitivitySlider) {
        const savedSensitivity = localStorage.getItem("breakoutSensitivity");
        if (savedSensitivity) {
            paddle.speed = parseInt(savedSensitivity);
            sensitivitySlider.value = paddle.speed;
        } else {
            paddle.speed = parseInt(sensitivitySlider.value);
        }
        if (sensitivityValue) sensitivityValue.innerText = paddle.speed;

        sensitivitySlider.addEventListener("input", (e) => {
            paddle.speed = parseInt(e.target.value);
            if (sensitivityValue) sensitivityValue.innerText = paddle.speed;
            try {
                localStorage.setItem("breakoutSensitivity", paddle.speed);
            } catch (_) {}
        });
    }

    // 2. Audio Setup
    if (audioToggleBtn) {
        try {
            const savedAudioState = localStorage.getItem("breakoutSoundEnabled");
            if (savedAudioState !== null) {
                SoundEngine.enabled = savedAudioState === "true";
            }
        } catch (_) {}
        
        audioToggleBtn.textContent = SoundEngine.enabled ? "🔊 Sound: On" : "🔇 Sound: Off";
        audioToggleBtn.classList.toggle("active", SoundEngine.enabled);

        audioToggleBtn.addEventListener("click", () => {
            SoundEngine.enabled = !SoundEngine.enabled;
            audioToggleBtn.textContent = SoundEngine.enabled ? "🔊 Sound: On" : "🔇 Sound: Off";
            audioToggleBtn.classList.toggle("active", SoundEngine.enabled);
            try {
                localStorage.setItem("breakoutSoundEnabled", SoundEngine.enabled);
            } catch (_) {}
        });
    }

    // Render Initial Frame
    draw();
})();