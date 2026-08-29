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

        const vec3 backgroundDark = vec3(0.020, 0.000, 0.031);
        const vec3 backgroundPurple = vec3(0.027, 0.000, 0.059);
        const vec3 deepPurple = vec3(0.427, 0.157, 0.851);
        const vec3 primaryPurple = vec3(0.545, 0.361, 0.965);
        const vec3 brightViolet = vec3(0.659, 0.333, 0.969);
        const vec3 magentaAccent = vec3(0.851, 0.275, 0.937);
        const vec3 gridPurple = vec3(0.180, 0.130, 0.300);

        float hash21(vec2 value) {
            value = fract(value * vec2(123.34, 456.21));
            value += dot(value, value + 45.32);
            return fract(value.x * value.y);
        }

        float segmentDistance(vec2 point, vec2 start, vec2 end) {
            vec2 pointOffset = point - start;
            vec2 segment = end - start;
            float projection = clamp(
                dot(pointOffset, segment) / max(dot(segment, segment), 0.0001),
                0.0,
                1.0
            );
            return length(pointOffset - segment * projection);
        }

        float routeHeight(vec2 cell, float seed) {
            float level = floor(hash21(cell + vec2(seed * 3.17, seed * 7.31)) * 3.0);
            return (level + 0.5) / 3.0;
        }

        vec3 circuitLayer(
            vec2 uv,
            float scale,
            float driftSpeed,
            float seed,
            float baseWidth
        ) {
            float aspect = iResolution.x / iResolution.y;
            vec2 circuitPosition = vec2(uv.x * aspect, uv.y) * scale;
            circuitPosition.x += iTime * driftSpeed + seed * 1.73;
            circuitPosition.y += iTime * driftSpeed * 0.12 + seed * 2.31;

            vec2 cell = floor(circuitPosition);
            vec2 localPosition = fract(circuitPosition);

            float startHeight = routeHeight(cell, seed);
            float endHeight = routeHeight(cell + vec2(1.0, 0.0), seed);
            float widthVariation = mix(
                0.72,
                1.28,
                hash21(cell + vec2(seed * 5.13, seed * 1.91))
            );
            float traceWidth = baseWidth * widthVariation;
            float antialiasWidth = max(scale / iResolution.y * 1.5, 0.006);

            float horizontalTrace = segmentDistance(
                localPosition,
                vec2(0.0, startHeight),
                vec2(1.0, startHeight)
            );
            float verticalTurn = segmentDistance(
                localPosition,
                vec2(1.0, startHeight),
                vec2(1.0, endHeight)
            );
            float traceDistance = min(horizontalTrace, verticalTurn);

            float branchGate = step(
                0.68,
                hash21(cell + vec2(seed * 2.41 + 8.0, seed * 4.73 + 3.0))
            );
            float branchX = mix(
                0.30,
                0.70,
                hash21(cell + vec2(seed * 6.11 + 2.0, 17.0))
            );
            float branchDirection = mix(
                -1.0,
                1.0,
                step(0.5, hash21(cell + vec2(31.0, seed * 2.83)))
            );
            float branchLength = mix(
                0.16,
                0.34,
                hash21(cell + vec2(seed * 9.07, 43.0))
            );
            vec2 branchStart = vec2(branchX, startHeight);
            vec2 branchEnd = vec2(
                branchX,
                clamp(startHeight + branchDirection * branchLength, 0.10, 0.90)
            );
            float branchTrace = segmentDistance(localPosition, branchStart, branchEnd);
            traceDistance = min(
                traceDistance,
                mix(10.0, branchTrace, branchGate)
            );

            float trace = 1.0 - smoothstep(
                traceWidth,
                traceWidth + antialiasWidth,
                traceDistance
            );
            trace *= mix(
                0.55,
                1.0,
                hash21(cell + vec2(seed * 7.37, seed * 3.59))
            );

            float nodeRadius = traceWidth * 2.8;
            float junctionGate = step(
                0.76,
                hash21(cell + vec2(seed * 11.0 + 5.0, 23.0))
            );
            vec2 junctionPosition = vec2(0.52, startHeight);
            float junctionNode = 1.0 - smoothstep(
                nodeRadius,
                nodeRadius + antialiasWidth * 1.5,
                length(localPosition - junctionPosition)
            );
            float branchNode = 1.0 - smoothstep(
                nodeRadius,
                nodeRadius + antialiasWidth * 1.5,
                length(localPosition - branchEnd)
            );
            float node = max(
                junctionNode * junctionGate,
                branchNode * branchGate
            );
            node *= 0.72 + 0.28 * sin(
                iTime * 1.1 +
                hash21(cell + vec2(seed * 13.0, 71.0)) * 6.28318
            );

            float pulseGate = step(
                0.74,
                hash21(vec2(cell.y + seed * 5.0, seed * 19.0))
            );
            float pulsePhase = fract(
                circuitPosition.x * 0.18 -
                iTime * (0.32 + driftSpeed * 2.0) +
                hash21(vec2(cell.y, seed * 29.0))
            );
            float pulseEnvelope = 1.0 - smoothstep(
                0.025,
                0.095,
                abs(pulsePhase - 0.5)
            );
            float pulse = trace * pulseGate * pulseEnvelope;

            return vec3(trace, node, pulse);
        }

        float technicalGrid(vec2 uv) {
            float aspect = iResolution.x / iResolution.y;
            vec2 gridPosition = vec2(uv.x * aspect, uv.y) * 24.0;
            vec2 gridCell = fract(gridPosition);
            vec2 edgeDistance = min(gridCell, 1.0 - gridCell);
            float nearestEdge = min(edgeDistance.x, edgeDistance.y);
            float pixelWidth = 24.0 / iResolution.y;
            return 1.0 - smoothstep(
                pixelWidth,
                pixelWidth * 2.4,
                nearestEdge
            );
        }

        void main() {
            vec2 uv = gl_FragCoord.xy / iResolution.xy;

            float rightEmphasis = smoothstep(0.28, 0.82, uv.x);
            float centerEmphasis = 0.72 + 0.28 * (
                1.0 - abs(uv.y - 0.5) * 2.0
            );
            float circuitVisibility = mix(0.20, 1.0, rightEmphasis) * centerEmphasis;

            vec3 color = mix(
                backgroundDark,
                backgroundPurple,
                rightEmphasis * 0.72
            );

            float grid = technicalGrid(uv);
            color += gridPurple * grid * mix(0.012, 0.035, rightEmphasis);

            vec3 backgroundLayer = circuitLayer(uv, 10.5, 0.024, 1.7, 0.012);
            vec3 middleLayer = circuitLayer(uv, 7.2, 0.041, 5.3, 0.018);
            vec3 foregroundLayer = circuitLayer(uv, 4.8, 0.064, 9.1, 0.023);

            color += deepPurple * backgroundLayer.x * 0.10 * circuitVisibility;
            color += primaryPurple * middleLayer.x * 0.18 * circuitVisibility;
            color += brightViolet * foregroundLayer.x * 0.25 * circuitVisibility;

            color += primaryPurple * backgroundLayer.y * 0.16 * circuitVisibility;
            color += brightViolet * middleLayer.y * 0.30 * circuitVisibility;
            color += magentaAccent * foregroundLayer.y * 0.42 * circuitVisibility;

            float signalPulse =
                backgroundLayer.z * 0.22 +
                middleLayer.z * 0.42 +
                foregroundLayer.z * 0.68;
            color += magentaAccent * signalPulse * circuitVisibility;

            vec2 vignettePosition = (uv - 0.5) * vec2(0.85, 1.0);
            float vignette = 1.0 - smoothstep(
                0.34,
                0.82,
                length(vignettePosition)
            );
            color *= mix(0.72, 1.0, vignette);

            gl_FragColor = vec4(color, 1.0);
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
    const texts = ["Hello", "Jonard Marfa"];
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
    "Vibe Coder <_> ",       // Coding brackets
    "Tech Enthusiast // ",     // Comment slashes
    "Gamer [~] "          // Terminal vibe
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


let statusMessageTimeout;

document.getElementById('contactForm').addEventListener('submit', async (e) => {
    e.preventDefault();  // stop redirect

    const form = e.target;
    const submitBtn = form.querySelector('button[type="submit"]');
    const statusMsg = document.getElementById('statusMsg');

    clearTimeout(statusMessageTimeout);
    statusMsg.textContent = '';
    submitBtn.textContent = 'SENDING...';
    submitBtn.disabled = true;

    const formEndpoint = form.dataset.endpoint;

    if (!formEndpoint || formEndpoint === 'paste your link here') {
        statusMsg.textContent = 'Add your form endpoint to enable contact submissions.';
        statusMessageTimeout = setTimeout(() => {
            statusMsg.textContent = '';
        }, 5000);
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
            statusMsg.textContent = 'Message sent successfully!';
            form.reset();
        } else {
            statusMsg.textContent = "Something went wrong ❌ Try again.";
        }
    } catch (error) {
        statusMsg.textContent = "Network error ❌";
    }

    statusMessageTimeout = setTimeout(() => {
        statusMsg.textContent = '';
    }, 5000);

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
