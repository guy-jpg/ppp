// ===== Navbar scroll effect =====
const navbar = document.getElementById('navbar');
window.addEventListener('scroll', () => {
    if (window.scrollY > 50) {
        navbar.classList.add('scrolled');
    } else {
        navbar.classList.remove('scrolled');
    }
});

// ===== Mobile menu =====
const menuToggle = document.getElementById('menuToggle');
const navLinks = document.querySelector('.nav-links');
if (menuToggle) {
    menuToggle.addEventListener('click', () => {
        navLinks.classList.toggle('open');
    });
    document.querySelectorAll('.nav-links a').forEach(link => {
        link.addEventListener('click', () => navLinks.classList.remove('open'));
    });
}

// ===== Reveal on scroll =====
const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.classList.add('active');
            revealObserver.unobserve(entry.target);
        }
    });
}, { threshold: 0.1, rootMargin: '0px 0px -50px 0px' });
document.querySelectorAll('.reveal').forEach(el => revealObserver.observe(el));

// ===== Animate stat counters =====
const animateCounter = (el, target, duration = 2000) => {
    const start = 0;
    const increment = target / (duration / 16);
    let current = start;
    const update = () => {
        current += increment;
        if (current < target) {
            el.textContent = Math.floor(current);
            requestAnimationFrame(update);
        } else {
            el.textContent = target;
        }
    };
    update();
};
const statObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            const target = parseInt(entry.target.dataset.target);
            animateCounter(entry.target, target);
            statObserver.unobserve(entry.target);
        }
    });
}, { threshold: 0.5 });
document.querySelectorAll('.stat-num').forEach(el => statObserver.observe(el));

// ===== Form submission =====
function handleSubmit(event) {
    event.preventDefault();
    const form = event.target;
    const success = document.getElementById('formSuccess');
    success.classList.add('show');
    form.reset();
    setTimeout(() => success.classList.remove('show'), 5000);
    return false;
}

// ===== Typing effect =====
const typingWords = ['כל אחד ואחת', 'יזמים', 'עסקים', 'מנהלים', 'חולמים', 'יוצרים', 'העתיד'];
const typingEl = document.getElementById('typingText');
let wordIdx = 0;
let charIdx = 0;
let deleting = false;

function typeLoop() {
    if (!typingEl) return;
    const word = typingWords[wordIdx];

    if (!deleting) {
        typingEl.textContent = word.slice(0, charIdx + 1);
        charIdx++;
        if (charIdx === word.length) {
            deleting = true;
            setTimeout(typeLoop, 1800);
            return;
        }
    } else {
        typingEl.textContent = word.slice(0, charIdx - 1);
        charIdx--;
        if (charIdx === 0) {
            deleting = false;
            wordIdx = (wordIdx + 1) % typingWords.length;
        }
    }
    setTimeout(typeLoop, deleting ? 50 : 100);
}
typeLoop();

// ===== Custom cursor =====
const cursor = document.getElementById('cursor');
const trail = document.getElementById('cursorTrail');
let mouseX = 0, mouseY = 0, trailX = 0, trailY = 0;

if (cursor && window.matchMedia('(hover: hover)').matches) {
    document.addEventListener('mousemove', (e) => {
        mouseX = e.clientX;
        mouseY = e.clientY;
        cursor.style.left = mouseX + 'px';
        cursor.style.top = mouseY + 'px';
    });

    function animateTrail() {
        trailX += (mouseX - trailX) * 0.15;
        trailY += (mouseY - trailY) * 0.15;
        if (trail) {
            trail.style.left = trailX + 'px';
            trail.style.top = trailY + 'px';
        }
        requestAnimationFrame(animateTrail);
    }
    animateTrail();

    document.querySelectorAll('a, button, .service-card, .about-card, input, textarea, select, .contact-detail').forEach(el => {
        el.addEventListener('mouseenter', () => cursor.classList.add('hover'));
        el.addEventListener('mouseleave', () => cursor.classList.remove('hover'));
    });
}

// ===== 3D tilt on cards =====
document.querySelectorAll('.tilt-card').forEach(card => {
    card.addEventListener('mousemove', (e) => {
        const rect = card.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const cx = rect.width / 2;
        const cy = rect.height / 2;
        const rotateX = ((y - cy) / cy) * -8;
        const rotateY = ((x - cx) / cx) * 8;
        card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateY(-6px)`;
    });
    card.addEventListener('mouseleave', () => {
        card.style.transform = '';
    });
});

// ===== Particles (mouse-reactive) =====
const particlesCanvas = document.getElementById('particlesCanvas');
if (particlesCanvas) {
    const pctx = particlesCanvas.getContext('2d');
    let particles = [];
    let pmouseX = -9999, pmouseY = -9999;

    function resizeParticles() {
        particlesCanvas.width = window.innerWidth;
        particlesCanvas.height = window.innerHeight;
    }
    resizeParticles();
    window.addEventListener('resize', resizeParticles);

    window.addEventListener('mousemove', (e) => {
        pmouseX = e.clientX;
        pmouseY = e.clientY;
    });

    class Particle {
        constructor() {
            this.x = Math.random() * particlesCanvas.width;
            this.y = Math.random() * particlesCanvas.height;
            this.vx = (Math.random() - 0.5) * 0.3;
            this.vy = (Math.random() - 0.5) * 0.3;
            this.r = Math.random() * 1.5 + 0.5;
            const colors = ['#7c5cff', '#00d4ff', '#ff5cdc'];
            this.color = colors[Math.floor(Math.random() * colors.length)];
        }
        update() {
            const dx = pmouseX - this.x;
            const dy = pmouseY - this.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < 120) {
                const force = (120 - dist) / 120;
                this.x -= (dx / dist) * force * 1.5;
                this.y -= (dy / dist) * force * 1.5;
            }
            this.x += this.vx;
            this.y += this.vy;
            if (this.x < 0 || this.x > particlesCanvas.width) this.vx *= -1;
            if (this.y < 0 || this.y > particlesCanvas.height) this.vy *= -1;
        }
        draw() {
            pctx.beginPath();
            pctx.arc(this.x, this.y, this.r, 0, Math.PI * 2);
            pctx.fillStyle = this.color;
            pctx.shadowColor = this.color;
            pctx.shadowBlur = 8;
            pctx.fill();
        }
    }

    const PARTICLE_COUNT = window.innerWidth < 768 ? 40 : 90;
    for (let i = 0; i < PARTICLE_COUNT; i++) particles.push(new Particle());

    function drawConnections() {
        for (let i = 0; i < particles.length; i++) {
            for (let j = i + 1; j < particles.length; j++) {
                const dx = particles[i].x - particles[j].x;
                const dy = particles[i].y - particles[j].y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist < 110) {
                    pctx.beginPath();
                    pctx.strokeStyle = `rgba(124, 92, 255, ${(1 - dist / 110) * 0.25})`;
                    pctx.lineWidth = 0.6;
                    pctx.shadowBlur = 0;
                    pctx.moveTo(particles[i].x, particles[i].y);
                    pctx.lineTo(particles[j].x, particles[j].y);
                    pctx.stroke();
                }
            }
        }
    }

    function animateParticles() {
        pctx.clearRect(0, 0, particlesCanvas.width, particlesCanvas.height);
        particles.forEach(p => { p.update(); p.draw(); });
        drawConnections();
        requestAnimationFrame(animateParticles);
    }
    animateParticles();
}

// ===== Matrix rain =====
const matrixCanvas = document.getElementById('matrixCanvas');
if (matrixCanvas) {
    const mctx = matrixCanvas.getContext('2d');
    let columns = [];
    const chars = 'אבגדהוזחטיכלמנסעפצקרשת01TEVAI{}<>/\\=+*#%@'.split('');
    const fontSize = 16;

    function resizeMatrix() {
        matrixCanvas.width = window.innerWidth;
        matrixCanvas.height = window.innerHeight;
        const cols = Math.floor(matrixCanvas.width / fontSize);
        columns = Array(cols).fill(0).map(() => Math.random() * matrixCanvas.height / fontSize);
    }
    resizeMatrix();
    window.addEventListener('resize', resizeMatrix);

    function drawMatrix() {
        mctx.fillStyle = 'rgba(10, 10, 20, 0.06)';
        mctx.fillRect(0, 0, matrixCanvas.width, matrixCanvas.height);
        mctx.fillStyle = '#7c5cff';
        mctx.font = `${fontSize}px monospace`;
        for (let i = 0; i < columns.length; i++) {
            const char = chars[Math.floor(Math.random() * chars.length)];
            const x = i * fontSize;
            const y = columns[i] * fontSize;
            mctx.fillStyle = Math.random() > 0.97 ? '#00d4ff' : '#7c5cff';
            mctx.fillText(char, x, y);
            if (y > matrixCanvas.height && Math.random() > 0.975) {
                columns[i] = 0;
            }
            columns[i] += 0.5;
        }
    }
    setInterval(drawMatrix, 70);
}
