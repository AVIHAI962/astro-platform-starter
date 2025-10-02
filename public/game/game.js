const init = () => {
    const root = document.querySelector('[data-game-root]');
    if (!root) {
        return;
    }

    document.body.classList.add('game-mode');

    const CROSSHAIR_RADIUS = 150;
    const PX_PER_UNIT = 1.6;
    const MAX_SPEED = 180;
    const MIN_SPEED = 0;
    const SPEED_STEP = 6;
    const SPEED_SMOOTHING = 0.045;
    const ENEMY_SPEED = 90;
    const MAX_DISTANCE = 2000;
    const MIN_DISTANCE = 120;

    const world = document.getElementById('world');
    const target = document.getElementById('target');
    const timerEl = document.getElementById('timer');
    const scoreEl = document.getElementById('score');
    const rangeEl = document.getElementById('range-value');
    const speedGaugeEl = document.querySelector('.speed-gauge .gauge-track');
    const distanceGaugeEl = document.getElementById('distance-gauge');
    const throttleEl = document.getElementById('throttle');
    const speedIndicatorEl = document.getElementById('speed-indicator');
    const distanceIndicatorEl = document.getElementById('distance-indicator');

    if (
        !world ||
        !target ||
        !timerEl ||
        !scoreEl ||
        !rangeEl ||
        !speedGaugeEl ||
        !distanceGaugeEl ||
        !throttleEl ||
        !speedIndicatorEl ||
        !distanceIndicatorEl
    ) {
        return;
    }

    const speedSegments = Array.from(speedGaugeEl.querySelectorAll('.tick'));
    const distanceSegments = Array.from(distanceGaugeEl.querySelectorAll('.tick'));

    const pressed = new Set();

    let desiredSpeed = 90;
    let displayedSpeed = 90;
    let positionX = 0;
    let positionY = 0;
    let distance = 1500;
    let score = 0;
    let remaining = 60;
    let lastTimestamp = performance.now();
    let running = true;

    const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

    const updateIndicatorPosition = (indicator, track, ratio) => {
        const clampedRatio = clamp(ratio, 0, 1);
        const vertical = track.offsetHeight >= track.offsetWidth;
        if (vertical) {
            const position = (1 - clampedRatio) * 100;
            indicator.style.top = `${position}%`;
            indicator.style.left = '50%';
        } else {
            indicator.style.left = `${clampedRatio * 100}%`;
            indicator.style.top = '50%';
        }
    };

    const setTickActivity = (ticks, ratio, track, fill = 'low') => {
        const clampedRatio = clamp(ratio, 0, 1);
        const activeCount = Math.round(clampedRatio * ticks.length);
        const vertical = track.offsetHeight >= track.offsetWidth;
        const fillFromStart = fill === 'low' ? !vertical : vertical;
        ticks.forEach((tick, index) => {
            const shouldActivate = fillFromStart
                ? index < activeCount
                : index >= ticks.length - activeCount;
            tick.classList.toggle('active', shouldActivate);
        });
    };

    const updateGauges = () => {
        const speedRatio = displayedSpeed / MAX_SPEED;
        setTickActivity(speedSegments, speedRatio, speedGaugeEl, 'low');
        updateIndicatorPosition(speedIndicatorEl, speedGaugeEl, speedRatio);

        const throttleValue = (desiredSpeed / MAX_SPEED) * 10;
        throttleEl.textContent = throttleValue.toFixed(2);

        const proximityRatio = 1 - Math.min(Math.max((distance - MIN_DISTANCE) / (MAX_DISTANCE - MIN_DISTANCE), 0), 1);
        setTickActivity(distanceSegments, proximityRatio, distanceGaugeEl, 'low');
        updateIndicatorPosition(distanceIndicatorEl, distanceGaugeEl, proximityRatio);
    };

    const getInputVector = () => {
        let horizontal = 0;
        let vertical = 0;

        if (pressed.has('ArrowLeft') || pressed.has('KeyA')) horizontal -= 1;
        if (pressed.has('ArrowRight') || pressed.has('KeyD')) horizontal += 1;
        if (pressed.has('ArrowUp')) vertical += 1;
        if (pressed.has('ArrowDown')) vertical -= 1;

        const length = Math.hypot(horizontal, vertical);
        if (!length) return { x: 0, y: 0 };
        return { x: horizontal / length, y: vertical / length };
    };

    window.addEventListener('keydown', (event) => {
        pressed.add(event.code);
        if (event.code === 'KeyW') {
            desiredSpeed = clamp(desiredSpeed + SPEED_STEP, MIN_SPEED, MAX_SPEED);
        }
        if (event.code === 'KeyS') {
            desiredSpeed = clamp(desiredSpeed - SPEED_STEP, MIN_SPEED, MAX_SPEED);
        }
        if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.code)) {
            event.preventDefault();
        }
    });

    window.addEventListener('keyup', (event) => {
        pressed.delete(event.code);
    });

    const updateWorldPosition = () => {
        world.style.transform = `translate(calc(-50% + ${positionX}px), calc(-50% + ${positionY}px))`;
    };

    const updateTargetScale = () => {
        const closeness = 1 - Math.min(Math.max((distance - MIN_DISTANCE) / (MAX_DISTANCE - MIN_DISTANCE), 0), 1);
        const scale = clamp(0.6 + closeness * 1.4, 0.6, 2.1);
        target.style.transform = `scale(${scale})`;
    };

    const loop = (timestamp) => {
        if (!running) return;
        const delta = (timestamp - lastTimestamp) / 1000;
        lastTimestamp = timestamp;

        displayedSpeed += (desiredSpeed - displayedSpeed) * SPEED_SMOOTHING;

        const input = getInputVector();
        positionX += input.x * displayedSpeed * PX_PER_UNIT * delta;
        positionY += input.y * displayedSpeed * PX_PER_UNIT * delta;

        positionX = clamp(positionX, -320, 320);
        positionY = clamp(positionY, -320, 320);

        updateWorldPosition();

        distance += (ENEMY_SPEED - displayedSpeed) * delta;
        distance = clamp(distance, MIN_DISTANCE, MAX_DISTANCE);
        updateTargetScale();

        rangeEl.textContent = Math.round(distance).toLocaleString('he-IL');

        const radialDistance = Math.hypot(positionX, positionY);
        if (radialDistance <= CROSSHAIR_RADIUS) {
            score += delta * 150;
        }
        scoreEl.textContent = Math.round(score).toString().padStart(3, '0');

        remaining = Math.max(remaining - delta, 0);
        timerEl.textContent = Math.max(0, Math.round(remaining)).toString().padStart(2, '0');

        updateGauges();

        if (remaining > 0) {
            requestAnimationFrame(loop);
        } else {
            running = false;
            timerEl.classList.add('ended');
        }
    };

    updateWorldPosition();
    updateTargetScale();
    updateGauges();
    requestAnimationFrame(loop);
};

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
