/**
 * OLED FOCUS TERMINAL - FINAL REORDER
 * Toggle Order: Clock -> Timer -> Stopwatch
 * Behavior: Clock (Solid) | Tools (Blink when Paused)
 */

const views = ['clock', 'timer', 'stopwatch']; // Updated Order
let currentModeIdx = 0;
let lastTime = "";
let wakeLock = null;

// Tool States
let swStart = 0, swElapsed = 0, swInt = null;
let timerTime = 0, timerInt = null;

// DOM Elements
const clockEl = document.getElementById('digital-clock');
const dateEl = document.getElementById('date-display');
const container = document.getElementById('main-container');
const swDisplay = document.getElementById('stopwatch-display');
const timerDisplay = document.getElementById('timer-display');

/** 1. ALWAYS ON (WAKE LOCK) **/
/**
 * IMPROVED WAKE LOCK ENGINE
 */
/**
 * THE AGGRESSIVE WAKE ENGINE
 */
const requestWakeLock = async () => {
    if (!('wakeLock' in navigator)) return;

    try {
        wakeLock = await navigator.wakeLock.request('screen');
        console.log('O Success! Screen Wake Lock is active.');

        // If the system releases it, we immediately try to grab it back
        wakeLock.addEventListener('release', () => {
            console.warn('O Wake Lock was released. Retrying in 1s...');
            setTimeout(requestWakeLock, 1000); 
        });

    } catch (err) {
        console.error(`Wake Lock Failed: ${err.message}`);
    }
};

/**
 * THE INITIALIZATION (Triggered by first interaction)
 */
document.addEventListener('click', () => {
    // 1. Grab the programmatic lock
    requestWakeLock();
    
    // 2. The "YouTube" Trick: Play the invisible video
    const ghostVideo = document.getElementById('ghost-video');
    ghostVideo.play().then(() => {
        console.log("O Media Wake Lock: Active (Ghost Video Playing)");
    }).catch(err => {
        console.log("O Media Wake Lock: Blocked by browser settings");
    });
}, { once: true });

/** 2. MODE CYCLER **/
const cycleMode = () => {
    currentModeIdx = (currentModeIdx + 1) % views.length;
    document.querySelectorAll('.view').forEach(v => v.classList.add('hidden'));
    
    const activeMode = views[currentModeIdx];
    document.getElementById(`${activeMode}-view`).classList.remove('hidden');
    
    // Ensure displays are rendered correctly when switching
    if (activeMode === 'timer') renderTimer();
    if (activeMode === 'stopwatch' && !swInt) updateSW(); 
};

/** 3. CLOCK ENGINE (Solid) **/
setInterval(() => {
    if (views[currentModeIdx] !== 'clock') return;
    const now = new Date();
    const raw = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
    
    if (raw !== lastTime) {
        lastTime = raw;
        clockEl.classList.remove('blinking'); 
        clockEl.innerHTML = raw.replace(/:/g, '<span class="colon">:</span>');
        dateEl.textContent = now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
    }
}, 1000);

/** 4. STOPWATCH LOGIC **/
function toggleStopwatch() {
    if (swInt) { 
        clearInterval(swInt); 
        swElapsed += Date.now() - swStart; 
        swInt = null; 
        swDisplay.classList.add('blinking'); // Blink on Pause
    } else { 
        swStart = Date.now(); 
        swInt = setInterval(updateSW, 50); 
        swDisplay.classList.remove('blinking'); // Solid on Run
    }
}

function updateSW() {
    const time = (swInt) ? (Date.now() - swStart + swElapsed) : swElapsed;
    const m = Math.floor(time / 60000).toString().padStart(2, '0');
    const s = Math.floor((time % 60000) / 1000).toString().padStart(2, '0');
    const ms = Math.floor((time % 1000) / 10).toString().padStart(2, '0');
    swDisplay.innerHTML = `${m}<span class="colon">:</span>${s}.${ms}`;
}

/** 5. TIMER LOGIC **/
function adjustTimer(seconds) {
    timerTime = Math.max(0, timerTime + seconds);
    timerDisplay.classList.add('blinking'); // Blink while setting
    renderTimer();
}

function renderTimer() {
    const h = Math.floor(timerTime / 3600).toString().padStart(2, '0');
    const m = Math.floor((timerTime % 3600) / 60).toString().padStart(2, '0');
    const s = (timerTime % 60).toString().padStart(2, '0');
    timerDisplay.innerHTML = `${h}<span class="colon">:</span>${m}<span class="colon">:</span>${s}`;
}

function toggleTimer() {
    if (timerInt) { 
        clearInterval(timerInt); 
        timerInt = null; 
        timerDisplay.classList.add('blinking'); // Blink on Pause
    } else if (timerTime > 0) {
        timerDisplay.classList.remove('blinking'); // Solid on Run
        timerInt = setInterval(() => {
            timerTime--; 
            renderTimer();
            if (timerTime <= 0) { 
                clearInterval(timerInt); 
                timerInt = null;
                timerDisplay.classList.remove('blinking');
                triggerVisualAlarm(); 
            }
        }, 1000);
    }
}

function triggerVisualAlarm() {
    let flashes = 0;
    const interval = setInterval(() => {
        document.body.classList.toggle('alarm-flash');
        flashes++;
        if (flashes === 6) { 
            clearInterval(interval);
            document.body.classList.remove('alarm-flash');
        }
    }, 200);
}

/** 6. KEYBOARD SHORTCUTS **/
document.addEventListener('keydown', (e) => {
    const key = e.key.toLowerCase();
    const mode = views[currentModeIdx];

    if (key === 'm') cycleMode();
    if (key === 'f') {
        if (!document.fullscreenElement) document.documentElement.requestFullscreen();
        else document.exitFullscreen();
    }
    
    if (key === 't') toggleElementVisibility(clockEl);
    if (key === 'd') toggleElementVisibility(dateEl);

    if (key === ' ') {
        e.preventDefault();
        if (mode === 'stopwatch') toggleStopwatch();
        if (mode === 'timer') toggleTimer();
    }
    if (key === 'r') resetActiveTool();

    if (mode === 'timer' && !timerInt) {
        if (e.key === 'ArrowUp') adjustTimer(60);
        if (e.key === 'ArrowDown') adjustTimer(-60);
        if (e.key === 'ArrowRight') adjustTimer(3600);
        if (e.key === 'ArrowLeft') adjustTimer(-3600);
    }
});

/** 7. UTILS **/
function resetActiveTool() {
    const mode = views[currentModeIdx];
    if (mode === 'stopwatch') {
        clearInterval(swInt); swInt = null; swElapsed = 0;
        swDisplay.innerHTML = `00<span class="colon">:</span>00.00`;
        swDisplay.classList.remove('blinking');
    } else if (mode === 'timer') {
        clearInterval(timerInt); timerInt = null; timerTime = 0;
        renderTimer();
        timerDisplay.classList.remove('blinking');
    }
}

function toggleElementVisibility(el) {
    const isVisible = window.getComputedStyle(el).color !== 'rgb(0, 0, 0)';
    el.style.color = isVisible ? '#000000' : 'var(--clock-color)';
}

let cursorTimer;

document.addEventListener('mousemove', () => {
    // Show the cursor when the mouse moves
    document.body.style.cursor = 'default';
    
    // Clear the timer
    clearTimeout(cursorTimer);
    
    // Set a timer to hide it again after 2 seconds of stillness
    cursorTimer = setTimeout(() => {
        document.body.style.cursor = 'none';
    }, 2000);
});

// Pixel Shift (Burn-in protection)
setInterval(() => {
    const x = Math.floor(Math.random() * 41) - 20; 
    const y = Math.floor(Math.random() * 41) - 20; 
    container.style.transform = `translate(${x}px, ${y}px)`;
}, 120000);

document.addEventListener('click', requestWakeLock, { once: true });