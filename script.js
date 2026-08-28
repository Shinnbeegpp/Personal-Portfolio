// ===== WEBGL SHADER BACKGROUND FOR LOADING SCREEN =====
(function () {
    const canvas = document.getElementById('shader-bg');
    if (!canvas) return;

    const gl = canvas.getContext('webgl');
    if (!gl) {
        console.warn('WebGL not supported.');
        return;
    }

    // Vertex shader
    const vsSource = `
        attribute vec4 aVertexPosition;
        void main() {
            gl_Position = aVertexPosition;
        }
    `;

    // Fragment shader
    const fsSource = `
        precision highp float;
        uniform vec2 iResolution;
        uniform float iTime;

        const float overallSpeed = 0.2;
        const float gridSmoothWidth = 0.015;
        const float axisWidth = 0.05;
        const float majorLineWidth = 0.025;
        const float minorLineWidth = 0.0125;
        const float majorLineFrequency = 5.0;
        const float minorLineFrequency = 1.0;
        const vec4 gridColor = vec4(0.5);
        const float scale = 5.0;
        const vec4 lineColor = vec4(0.8, 0.64, 0.45, 1.0);
        const float minLineWidth = 0.01;
        const float maxLineWidth = 0.2;
        const float lineSpeed = 1.0 * overallSpeed;
        const float lineAmplitude = 1.0;
        const float lineFrequency = 0.2;
        const float warpSpeed = 0.2 * overallSpeed;
        const float warpFrequency = 0.5;
        const float warpAmplitude = 1.0;
        const float offsetFrequency = 0.5;
        const float offsetSpeed = 1.33 * overallSpeed;
        const float minOffsetSpread = 0.6;
        const float maxOffsetSpread = 2.0;
        const int linesPerGroup = 16;

        #define drawCircle(pos, radius, coord) smoothstep(radius + gridSmoothWidth, radius, length(coord - (pos)))
        #define drawSmoothLine(pos, halfWidth, t) smoothstep(halfWidth, 0.0, abs(pos - (t)))
        #define drawCrispLine(pos, halfWidth, t) smoothstep(halfWidth + gridSmoothWidth, halfWidth, abs(pos - (t)))
        #define drawPeriodicLine(freq, width, t) drawCrispLine(freq / 2.0, width, abs(mod(t, freq) - (freq) / 2.0))

        float drawGridLines(float axis) {
            return drawCrispLine(0.0, axisWidth, axis)
                + drawPeriodicLine(majorLineFrequency, majorLineWidth, axis)
                + drawPeriodicLine(minorLineFrequency, minorLineWidth, axis);
        }

        float drawGrid(vec2 space) {
            return min(1.0, drawGridLines(space.x) + drawGridLines(space.y));
        }

        float random(float t) {
            return (cos(t) + cos(t * 1.3 + 1.3) + cos(t * 1.4 + 1.4)) / 3.0;
        }

        float getPlasmaY(float x, float horizontalFade, float offset) {
            return random(x * lineFrequency + iTime * lineSpeed) * horizontalFade * lineAmplitude + offset;
        }

        void main() {
            vec2 fragCoord = gl_FragCoord.xy;
            vec4 fragColor;
            vec2 uv = fragCoord.xy / iResolution.xy;
            vec2 space = (fragCoord - iResolution.xy / 2.0) / iResolution.x * 2.0 * scale;

            float horizontalFade = 1.0 - (cos(uv.x * 6.28) * 0.5 + 0.5);
            float verticalFade = 1.0 - (cos(uv.y * 6.28) * 0.5 + 0.5);

            space.y += random(space.x * warpFrequency + iTime * warpSpeed) * warpAmplitude * (0.5 + horizontalFade);
            space.x += random(space.y * warpFrequency + iTime * warpSpeed + 2.0) * warpAmplitude * horizontalFade;

            vec4 lines = vec4(0.0);
            vec4 bgColor1 = vec4(0.08, 0.06, 0.03, 1.0);
            vec4 bgColor2 = vec4(0.3, 0.2, 0.08, 1.0);

            for(int l = 0; l < linesPerGroup; l++) {
                float normalizedLineIndex = float(l) / float(linesPerGroup);
                float offsetTime = iTime * offsetSpeed;
                float offsetPosition = float(l) + space.x * offsetFrequency;
                float rand = random(offsetPosition + offsetTime) * 0.5 + 0.5;
                float halfWidth = mix(minLineWidth, maxLineWidth, rand * horizontalFade) / 2.0;
                float offset = random(offsetPosition + offsetTime * (1.0 + normalizedLineIndex)) * mix(minOffsetSpread, maxOffsetSpread, horizontalFade);
                float linePosition = getPlasmaY(space.x, horizontalFade, offset);
                float line = drawSmoothLine(linePosition, halfWidth, space.y) / 2.0 + drawCrispLine(linePosition, halfWidth * 0.15, space.y);

                float circleX = mod(float(l) + iTime * lineSpeed, 25.0) - 12.0;
                vec2 circlePosition = vec2(circleX, getPlasmaY(circleX, horizontalFade, offset));
                float circle = drawCircle(circlePosition, 0.01, space) * 4.0;

                line = line + circle;
                lines += line * lineColor * rand;
            }

            fragColor = mix(bgColor1, bgColor2, uv.x);
            fragColor *= verticalFade;
            fragColor.a = 1.0;
            fragColor += lines;

            gl_FragColor = fragColor;
        }
    `;

    // Helper function to compile shader
    function loadShader(gl, type, source) {
        const shader = gl.createShader(type);
        gl.shaderSource(shader, source);
        gl.compileShader(shader);

        if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
            console.error('Shader compile error: ', gl.getShaderInfoLog(shader));
            gl.deleteShader(shader);
            return null;
        }
        return shader;
    }

    // Initialize shader program
    function initShaderProgram(gl, vsSource, fsSource) {
        const vertexShader = loadShader(gl, gl.VERTEX_SHADER, vsSource);
        const fragmentShader = loadShader(gl, gl.FRAGMENT_SHADER, fsSource);

        const shaderProgram = gl.createProgram();
        gl.attachShader(shaderProgram, vertexShader);
        gl.attachShader(shaderProgram, fragmentShader);
        gl.linkProgram(shaderProgram);

        if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
            console.error('Shader program link error: ', gl.getProgramInfoLog(shaderProgram));
            return null;
        }
        return shaderProgram;
    }

    const shaderProgram = initShaderProgram(gl, vsSource, fsSource);
    const positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    const positions = [-1.0, -1.0, 1.0, -1.0, -1.0, 1.0, 1.0, 1.0];
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW);

    const programInfo = {
        program: shaderProgram,
        attribLocations: {
            vertexPosition: gl.getAttribLocation(shaderProgram, 'aVertexPosition'),
        },
        uniformLocations: {
            resolution: gl.getUniformLocation(shaderProgram, 'iResolution'),
            time: gl.getUniformLocation(shaderProgram, 'iTime'),
        },
    };

    function resizeCanvas() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        gl.viewport(0, 0, canvas.width, canvas.height);
    }

    window.addEventListener('resize', resizeCanvas);
    resizeCanvas();

    let startTime = Date.now();
    let shaderAnimationId;

    function render() {
        const currentTime = (Date.now() - startTime) / 1000;

        gl.clearColor(0.0, 0.0, 0.0, 1.0);
        gl.clear(gl.COLOR_BUFFER_BIT);

        gl.useProgram(programInfo.program);
        gl.uniform2f(programInfo.uniformLocations.resolution, canvas.width, canvas.height);
        gl.uniform1f(programInfo.uniformLocations.time, currentTime);

        gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
        gl.vertexAttribPointer(programInfo.attribLocations.vertexPosition, 2, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(programInfo.attribLocations.vertexPosition);

        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
        shaderAnimationId = requestAnimationFrame(render);
    }

    render();
})();


// ===== GOOEY TEXT LOADING ANIMATION =====
(function () {
    const texts = ["The Dev", "Jonard Marfa"];
    const morphTime = 1.5; // seconds for morph
    const cooldownTime = 1; // seconds to wait before next morph
    const totalDuration = 3840; // total loading time in ms

    const text1 = document.getElementById('gooey-text1');
    const text2 = document.getElementById('gooey-text2');
    const loadingScreen = document.getElementById('loading-screen');

    if (!text1 || !text2 || !loadingScreen) return;

    let textIndex = texts.length - 1;
    let time = new Date();
    let morph = 0;
    let cooldown = cooldownTime;
    let animationId;

    text1.textContent = texts[textIndex % texts.length];
    text2.textContent = texts[(textIndex + 1) % texts.length];

    function setMorph(fraction) {
        text2.style.filter = `blur(${Math.min(8 / fraction - 8, 100)}px)`;
        text2.style.opacity = `${Math.pow(fraction, 0.4) * 100}%`;

        const inverseFraction = 1 - fraction;
        text1.style.filter = `blur(${Math.min(8 / inverseFraction - 8, 100)}px)`;
        text1.style.opacity = `${Math.pow(inverseFraction, 0.4) * 100}%`;
    }

    function doCooldown() {
        morph = 0;
        text2.style.filter = "";
        text2.style.opacity = "100%";
        text1.style.filter = "";
        text1.style.opacity = "0%";
    }

    function doMorph() {
        morph -= cooldown;
        cooldown = 0;
        let fraction = morph / morphTime;

        if (fraction > 1) {
            cooldown = cooldownTime;
            fraction = 1;
        }

        setMorph(fraction);
    }

    function animate() {
        animationId = requestAnimationFrame(animate);
        const newTime = new Date();
        const shouldIncrementIndex = cooldown > 0;
        const dt = (newTime.getTime() - time.getTime()) / 1000;
        time = newTime;

        cooldown -= dt;

        if (cooldown <= 0) {
            if (shouldIncrementIndex) {
                textIndex = (textIndex + 1) % texts.length;
                text1.textContent = texts[textIndex % texts.length];
                text2.textContent = texts[(textIndex + 1) % texts.length];
            }
            doMorph();
        } else {
            doCooldown();
        }
    }

    // Start animation
    animate();

    // Hide loading screen after duration
    setTimeout(() => {
        cancelAnimationFrame(animationId);
        loadingScreen.classList.add('hidden');

        // Fade in main content
        const mainContent = document.getElementById('main-content');
        if (mainContent) {
            setTimeout(() => {
                mainContent.classList.add('visible');
            }, 100); // Small delay for smoother transition
        }
    }, totalDuration);
})();


// ===== TYPING ANIMATION =====
const textElement = document.querySelector(".typing-text");
const words = [
    "Developer { } ",
    "AI Explorer <_> ",       // Coding brackets
    "Problem Solver // ",     // Comment slashes
    "Innovator [~] "          // Terminal vibe
];
let wordIndex = 0;
let charIndex = 0;
let isDeleting = false;

function typeEffect() {
    const currentWord = words[wordIndex];

    if (isDeleting) {
        textElement.textContent = currentWord.substring(0, charIndex--);
    } else {
        textElement.textContent = currentWord.substring(0, charIndex++);
    }

    let typeSpeed = isDeleting ? 100 : 200;

    if (!isDeleting && charIndex === currentWord.length) {
        isDeleting = true;
        typeSpeed = 2000;
    } else if (isDeleting && charIndex === 0) {
        isDeleting = false;
        wordIndex = (wordIndex + 1) % words.length;
        typeSpeed = 500;
    }

    setTimeout(typeEffect, typeSpeed);
}

document.addEventListener("DOMContentLoaded", typeEffect);


// ===== NAVBAR SCROLL EFFECT =====
const navbar = document.getElementById('navbar');
let lastScroll = 0;

window.addEventListener('scroll', () => {
    const currentScroll = window.pageYOffset;

    if (currentScroll > 50) {
        navbar.classList.add('scrolled');
    } else {
        navbar.classList.remove('scrolled');
    }

    lastScroll = currentScroll;
});


// ===== SCROLL REVEAL ANIMATION =====
const revealElements = document.querySelectorAll('.reveal');

const revealOnScroll = () => {
    const triggerBottom = window.innerHeight * 0.85;

    revealElements.forEach(element => {
        const elementTop = element.getBoundingClientRect().top;

        if (elementTop < triggerBottom) {
            element.classList.add('reveal-active');
        }
    });
};

window.addEventListener('scroll', revealOnScroll);
revealOnScroll(); // Initial check


// ===== SMOOTH SCROLLING FOR NAV LINKS =====
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));

        if (target) {
            target.scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });

            // Close mobile menu if open
            navLinksContainer.classList.remove('active');
        }
    });
});


// ===== ACTIVE NAV LINK HIGHLIGHT =====
const sections = document.querySelectorAll('section[id]');
const navLinks = document.querySelectorAll('.nav-link');

window.addEventListener('scroll', () => {
    let current = '';

    sections.forEach(section => {
        const sectionTop = section.offsetTop;
        const sectionHeight = section.clientHeight;

        if (window.pageYOffset >= sectionTop - 200) {
            current = section.getAttribute('id');
        }
    });

    navLinks.forEach(link => {
        link.classList.remove('active');
        if (link.getAttribute('href') === `#${current}`) {
            link.classList.add('active');
        }
    });
});


// ===== HAMBURGER MENU TOGGLE =====
const hamburger = document.querySelector('.hamburger');
const navLinksContainer = document.querySelector('.nav-links');

hamburger.addEventListener('click', () => {
    navLinksContainer.classList.toggle('active');
    hamburger.classList.toggle('active');
});


// ===== TECH ICONS ROTATION ON HOVER =====
const techIcons = document.querySelectorAll('.tech-icon');

techIcons.forEach(icon => {
    icon.addEventListener('mouseenter', function () {
        this.style.transform = 'scale(1.3) rotate(360deg)';
    });

    icon.addEventListener('mouseleave', function () {
        this.style.transform = 'scale(1) rotate(0deg)';
    });
});


// ===== SKILL TAGS ANIMATION =====
const skillItems = document.querySelectorAll('.skill-item');
let delay = 0;

skillItems.forEach(item => {
    setTimeout(() => {
        item.style.opacity = '1';
        item.style.transform = 'translateY(0)';
    }, delay);
    delay += 100;
});


document.getElementById('contactForm').addEventListener('submit', async (e) => {
    e.preventDefault();  // stop redirect

    const form = e.target;
    const submitBtn = form.querySelector('button[type="submit"]');
    const statusMsg = document.getElementById('statusMsg');

    submitBtn.textContent = 'SENDING...';
    submitBtn.disabled = true;

    const formEndpoint = form.dataset.endpoint;

    if (!formEndpoint || formEndpoint === 'paste your link here') {
        statusMsg.textContent = 'Add your form endpoint to enable contact submissions.';
        submitBtn.textContent = 'Send Message';
        submitBtn.disabled = false;
        return;
    }

    try {
        const res = await fetch(formEndpoint, {
            method: "POST",
            body: new FormData(form),
            headers: { "Accept": "application/json" }
        });

        if (res.ok) {
            form.reset();
        } else {
            statusMsg.textContent = "Something went wrong ❌ Try again.";
        }
    } catch (error) {
        statusMsg.textContent = "Network error ❌";
    }

    submitBtn.textContent = 'Send Message';
    submitBtn.disabled = false;
});


// ===== CURSOR TRAIL EFFECT =====
let cursorTrail = [];
const maxTrailLength = 20;

document.addEventListener('mousemove', (e) => {
    cursorTrail.push({ x: e.clientX, y: e.clientY, time: Date.now() });

    if (cursorTrail.length > maxTrailLength) {
        cursorTrail.shift();
    }

    // Clean up old trail points
    cursorTrail = cursorTrail.filter(point => Date.now() - point.time < 500);
});


// ===== DOWNLOAD RESUME BUTTON RIPPLE EFFECT =====
const downloadBtn = document.querySelector('.btn-download');

downloadBtn.addEventListener('click', function (e) {
    const ripple = document.createElement('span');
    const rect = this.getBoundingClientRect();

    const size = Math.max(rect.width, rect.height);
    const x = e.clientX - rect.left - size / 2;
    const y = e.clientY - rect.top - size / 2;

    ripple.style.width = ripple.style.height = size + 'px';
    ripple.style.left = x + 'px';
    ripple.style.top = y + 'px';
    ripple.classList.add('ripple');

    this.appendChild(ripple);

    setTimeout(() => ripple.remove(), 600);
});


// ===== INITIALIZE ANIMATIONS ON LOAD =====
window.addEventListener('load', () => {
    document.body.classList.add('loaded');

    // Trigger initial reveal check
    revealOnScroll();
});


// ===== CODE WINDOW DOTS FUNCTIONALITY =====
const codeDots = document.querySelectorAll('.dot');

codeDots.forEach((dot, index) => {
    dot.addEventListener('click', () => {
        const codeWindow = dot.closest('.code-window');

        if (index === 0) { // Red dot - close animation
            codeWindow.style.opacity = '0';
            setTimeout(() => {
                codeWindow.style.opacity = '1';
            }, 300);
        } else if (index === 1) { // Yellow dot - minimize animation
            codeWindow.style.transform = 'scale(0.95)';
            setTimeout(() => {
                codeWindow.style.transform = 'scale(1)';
            }, 300);
        } else if (index === 2) { // Green dot - maximize animation
            codeWindow.style.transform = 'scale(1.05)';
            setTimeout(() => {
                codeWindow.style.transform = 'scale(1)';
            }, 300);
        }
    });
});


// ===== PERFORMANCE OPTIMIZATION =====
// Debounce function for scroll events
function debounce(func, wait = 10, immediate = true) {
    let timeout;
    return function () {
        const context = this, args = arguments;
        const later = function () {
            timeout = null;
            if (!immediate) func.apply(context, args);
        };
        const callNow = immediate && !timeout;
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
        if (callNow) func.apply(context, args);
    };
}

// Apply debounce to scroll events
window.addEventListener('scroll', debounce(revealOnScroll));


// ===== PROJECT CARD GLOWING BORDER EFFECT =====
document.addEventListener('DOMContentLoaded', () => {
    const cards = document.querySelectorAll('.project-card');
    const proximity = 64;
    const inactiveZone = 0.01;
    const spread = 40;
    const smoothing = 0.15; // Lower = smoother but slower, Higher = faster but less smooth

    // Wrap each card
    cards.forEach(card => {
        const wrapper = document.createElement('div');
        wrapper.className = 'project-card-wrapper';
        card.parentNode.insertBefore(wrapper, card);
        wrapper.appendChild(card);
    });

    const wrappers = document.querySelectorAll('.project-card-wrapper');
    const currentAngles = new Map();
    const targetAngles = new Map();

    // Initialize angles
    wrappers.forEach(wrapper => {
        currentAngles.set(wrapper, 0);
        targetAngles.set(wrapper, 0);
    });

    // Animation loop for smooth following
    function animationLoop() {
        wrappers.forEach(wrapper => {
            const current = currentAngles.get(wrapper);
            const target = targetAngles.get(wrapper);

            // Calculate shortest rotation path
            let diff = target - current;
            while (diff > 180) diff -= 360;
            while (diff < -180) diff += 360;

            // Lerp towards target
            const newAngle = current + diff * smoothing;
            currentAngles.set(wrapper, newAngle);
            wrapper.style.setProperty('--start', newAngle);
        });

        requestAnimationFrame(animationLoop);
    }

    // Start animation loop
    requestAnimationFrame(animationLoop);

    // Track mouse globally
    document.addEventListener('mousemove', (e) => {
        wrappers.forEach(wrapper => {
            const rect = wrapper.getBoundingClientRect();
            const width = rect.width;
            const height = rect.height;
            const centerX = rect.left + width / 2;
            const centerY = rect.top + height / 2;

            // Check inactive zone (center of card)
            const distFromCenter = Math.hypot(e.clientX - centerX, e.clientY - centerY);
            const inactiveRadius = 0.5 * Math.min(width, height) * inactiveZone;

            if (distFromCenter < inactiveRadius) {
                wrapper.style.setProperty('--active', '0');
                return;
            }

            // Check proximity
            const isActive = (
                e.clientX > rect.left - proximity &&
                e.clientX < rect.right + proximity &&
                e.clientY > rect.top - proximity &&
                e.clientY < rect.bottom + proximity
            );

            wrapper.style.setProperty('--active', isActive ? '1' : '0');

            if (!isActive) return;

            // Calculate angle from center to mouse and set as target
            const angle = (Math.atan2(e.clientY - centerY, e.clientX - centerX) * 180 / Math.PI) + 90;
            targetAngles.set(wrapper, angle);
        });
    });
});


console.log('Portfolio loaded successfully! ✨');
