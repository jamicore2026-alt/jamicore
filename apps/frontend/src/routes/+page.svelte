<script>
  import { onMount } from 'svelte';

  let statsRevealed = $state(false);
  let statValues = $state([0, 0, 0, 0]);
  const statTargets = [500, 25, 10, 3];
  let statEl = $state(null);

  onMount(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          statsRevealed = true;
        }
      },
      { threshold: 0.3 }
    );

    const el = document.getElementById('stats-section');
    if (el) observer.observe(el);

    return () => observer.disconnect();
  });

  $effect(() => {
    if (!statsRevealed) return;

    statTargets.forEach((target, i) => {
      const increment = Math.ceil(target / 40);
      const interval = setInterval(() => {
        statValues[i] += increment;
        if (statValues[i] >= target) {
          statValues[i] = target;
          clearInterval(interval);
        }
      }, 40);
    });
  });
</script>

<svelte:head>
  <title>Al-Ektefa Group — One Group. Multiple Solutions.</title>
  <meta name="description" content="Al-Ektefa Group offers premium agricultural trade, SaaS e-commerce platform (Jamicore), and smart accounting services for growing businesses in the Gulf and beyond." />
</svelte:head>

<!-- ============ SECTION 1: HERO ============ -->
<section class="hero">
  <div class="hero-bg-pattern"></div>
  <div class="hero-container">
    <div class="hero-content">
      <p class="tag">AL-EKTEFA GROUP</p>
      <h1>One Group.<br />Three Specialized<br />Solutions.</h1>
      <div class="gold-underline"></div>
      <div class="subtitle-row">
        <span>Finance</span>
        <svg width="6" height="6" viewBox="0 0 6 6" fill="var(--gold)" xmlns="http://www.w3.org/2000/svg"><circle cx="3" cy="3" r="3"/></svg>
        <span>Trade</span>
        <svg width="6" height="6" viewBox="0 0 6 6" fill="var(--gold)" xmlns="http://www.w3.org/2000/svg"><circle cx="3" cy="3" r="3"/></svg>
        <span>Technology</span>
      </div>
      <p class="hero-desc">
        Three specialized divisions delivering premium agricultural products,
        next-generation commerce technology, and comprehensive financial services —
        all under one trusted group.
      </p>
      <a href="#divisions" class="btn btn-primary">Explore Our Divisions
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
      </a>
    </div>
    <div class="hero-visual">
      <div class="geo-shape shape-1"></div>
      <div class="geo-shape shape-2"></div>
      <div class="geo-shape shape-3"></div>
    </div>
  </div>
  <div class="scroll-indicator">
    <span>Scroll</span>
    <svg width="14" height="8" viewBox="0 0 14 8" fill="none" stroke="var(--gold)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="1 1 7 7 13 1"/></svg>
  </div>
</section>

<!-- ============ SECTION 2: DIVISION CARDS ============ -->
<section id="divisions" class="section-padding">
  <div class="container">
    <div class="cards-grid">
      <!-- Card 1: Agricultural Trade -->
      <a href="/trade" class="division-card card-green">
        <div class="card-icon">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="var(--gold)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M17 8C17 10.76 13.86 13 12 13C10.14 13 7 10.76 7 8C7 5.24 12 2 12 2C12 2 17 5.24 17 8Z"/>
            <path d="M12 2V22"/>
            <path d="M8 16C6.9 15 4 13.5 4 11"/>
            <path d="M16 16C17.1 15 20 13.5 20 11"/>
          </svg>
        </div>
        <h3>Agricultural Trade</h3>
        <p class="card-subtitle">Global Food Trade</p>
        <div class="gold-divider"></div>
        <p class="card-desc">Premium quality agricultural products including coffee, spices, rice, lentils, and pulses for global markets.</p>
        <span class="card-link">Explore
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
        </span>
      </a>

      <!-- Card 2: Jamicore SaaS -->
      <a href="/jamicore" class="division-card card-purple">
        <div class="card-icon">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="var(--gold)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
            <rect x="2" y="3" width="20" height="14" rx="2" ry="2"/>
            <line x1="8" y1="21" x2="16" y2="21"/>
            <line x1="12" y1="17" x2="12" y2="21"/>
          </svg>
        </div>
        <h3>Jamicore SaaS</h3>
        <p class="card-subtitle">Commerce Platform</p>
        <div class="gold-divider"></div>
        <p class="card-desc">All-in-one e-commerce, POS, and payment solutions to build and scale your digital business effortlessly.</p>
        <span class="card-link">Explore
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
        </span>
      </a>

      <!-- Card 3: Accounting -->
      <a href="/accounting" class="division-card card-navy">
        <div class="card-icon">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="var(--gold)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
            <polyline points="14 2 14 8 20 8"/>
            <line x1="16" y1="13" x2="8" y2="13"/>
            <line x1="16" y1="17" x2="8" y2="17"/>
            <polyline points="10 9 9 9 8 9"/>
          </svg>
        </div>
        <h3>Accounting</h3>
        <p class="card-subtitle">Financial Services</p>
        <div class="gold-divider"></div>
        <p class="card-desc">Smart financial management, compliance, taxation, and payroll solutions for businesses of all sizes.</p>
        <span class="card-link">Explore
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
        </span>
      </a>
    </div>
  </div>
</section>

<!-- ============ SECTION 3: WHY CHOOSE US ============ -->
<section id="why-us" class="why-section section-padding" style="background: var(--navy-light);">
  <div class="container text-center">
    <p class="tag">WHY CHOOSE AL-EKTEFA GROUP</p>
    <h2 class="why-heading">Built on Trust.<br />Driven by Excellence.</h2>

    <div class="features-grid">
      <div class="feature-block">
        <div class="feature-icon">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--gold)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
          </svg>
        </div>
        <h4>Trusted Expertise</h4>
        <p>Over a decade of experience across agriculture, technology, and financial services with a proven track record.</p>
      </div>
      <div class="feature-block">
        <div class="feature-icon">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--gold)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="10"/>
            <line x1="2" y1="12" x2="22" y2="12"/>
            <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
          </svg>
        </div>
        <h4>Global Reach</h4>
        <p>Serving clients across 25+ countries with deep market knowledge and reliable international supply chains.</p>
      </div>
      <div class="feature-block">
        <div class="feature-icon">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--gold)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
            <circle cx="9" cy="7" r="4"/>
            <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
            <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
          </svg>
        </div>
        <h4>Client Focused</h4>
        <p>Tailored solutions designed around your unique needs — we listen first, then deliver results that matter.</p>
      </div>
      <div class="feature-block">
        <div class="feature-icon">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--gold)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="8" r="7"/>
            <polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88"/>
          </svg>
        </div>
        <h4>Quality Assured</h4>
        <p>Rigorous quality standards across all divisions — from agricultural sourcing to software delivery.</p>
      </div>
    </div>
  </div>
</section>

<!-- ============ SECTION 4: STATS BAR ============ -->
<section id="stats-section" class="stats-section">
  <div class="container">
    <div class="stats-row">
      <div class="stat-item">
        <div class="stat-icon">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--gold)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
            <circle cx="12" cy="7" r="4"/>
          </svg>
        </div>
        <div class="stat-number">{statValues[0]}+</div>
        <div class="stat-label">Happy Clients</div>
      </div>
      <div class="stat-divider"></div>
      <div class="stat-item">
        <div class="stat-icon">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--gold)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="10"/>
            <line x1="2" y1="12" x2="22" y2="12"/>
            <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
          </svg>
        </div>
        <div class="stat-number">{statValues[1]}+</div>
        <div class="stat-label">Countries</div>
      </div>
      <div class="stat-divider"></div>
      <div class="stat-item">
        <div class="stat-icon">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--gold)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="10"/>
            <polyline points="12 6 12 12 16 14"/>
          </svg>
        </div>
        <div class="stat-number">{statValues[2]}+</div>
        <div class="stat-label">Years</div>
      </div>
      <div class="stat-divider"></div>
      <div class="stat-item">
        <div class="stat-icon">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--gold)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
            <rect x="3" y="3" width="7" height="7" rx="1"/>
            <rect x="14" y="3" width="7" height="7" rx="1"/>
            <rect x="3" y="14" width="7" height="7" rx="1"/>
            <rect x="14" y="14" width="7" height="7" rx="1"/>
          </svg>
        </div>
        <div class="stat-number">{statValues[3]}</div>
        <div class="stat-label">Divisions</div>
      </div>
    </div>
  </div>
</section>

<!-- ============ SECTION 5: FOOTER BRAND STRIP ============ -->
<section id="contact" class="brand-strip section-padding">
  <div class="container text-center">
    <div class="brand-icons">
      <div class="brand-block">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--gold)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
          <path d="M2 21c.6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1 .6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1"/>
          <path d="M19.38 20A11.6 11.6 0 0 0 21 9l-9-5-9 5c0 2.9.5 5.5 1.5 7.9"/>
          <path d="M11 14h4"/><path d="M11 18h4"/>
        </svg>
        <span class="brand-label">TRADING</span>
      </div>
      <div class="brand-block">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--gold)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
          <rect x="2" y="3" width="20" height="14" rx="2" ry="2"/>
          <line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/>
          <path d="M6 8h.01"/><path d="M10 8h.01"/><path d="M14 8h.01"/>
        </svg>
        <span class="brand-label">JAMICORE</span>
      </div>
      <div class="brand-block">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--gold)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
          <path d="M3 3v18h18"/>
          <path d="M18.7 8l-5.1 5.2-2.8-2.7L7 14.3"/>
        </svg>
        <span class="brand-label">ACCOUNTING</span>
      </div>
    </div>
    <p class="brand-strip-tagline">ONE GROUP. MULTIPLE SOLUTIONS.</p>
  </div>
</section>

<style>
  /* HERO */
  .hero {
    position: relative;
    min-height: 100vh;
    display: flex;
    align-items: center;
    overflow: hidden;
    background: var(--navy);
  }
  .hero-bg-pattern {
    position: absolute;
    inset: 0;
    background:
      radial-gradient(circle at 20% 30%, rgba(201, 168, 76, 0.06) 0%, transparent 50%),
      radial-gradient(circle at 80% 70%, rgba(201, 168, 76, 0.04) 0%, transparent 50%),
      repeating-linear-gradient(45deg, transparent, transparent 80px, rgba(201, 168, 76, 0.02) 80px, rgba(201, 168, 76, 0.02) 81px);
    pointer-events: none;
  }
  .hero-container {
    max-width: 1280px;
    margin: 0 auto;
    padding: 0 24px;
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 80px;
    align-items: center;
    width: 100%;
    position: relative;
    z-index: 1;
  }
  .hero-content {
    max-width: 600px;
  }
  .hero-content h1 {
    font-size: 64px;
    font-weight: 700;
    line-height: 1.15;
    color: var(--white);
    margin-bottom: 24px;
  }
  .gold-underline {
    width: 100px;
    height: 3px;
    background: var(--gold);
    margin: 28px 0;
  }
  .subtitle-row {
    display: flex;
    align-items: center;
    gap: 12px;
    font-size: 15px;
    font-weight: 600;
    color: var(--text-muted);
    text-transform: uppercase;
    letter-spacing: 2px;
    margin-bottom: 28px;
  }
  .hero-desc {
    font-size: 17px;
    line-height: 1.7;
    color: var(--text-muted);
    margin-bottom: 40px;
  }
  .hero-visual {
    position: relative;
    height: 500px;
  }
  .geo-shape {
    position: absolute;
  }
  .shape-1 {
    top: 40px;
    right: 20px;
    width: 200px;
    height: 200px;
    clip-path: polygon(50% 0%, 0% 100%, 100% 100%);
    background: rgba(201, 168, 76, 0.08);
    animation: float 6s ease-in-out infinite;
  }
  .shape-2 {
    top: 160px;
    right: 100px;
    width: 120px;
    height: 120px;
    border-radius: 50%;
    border: 2px solid rgba(201, 168, 76, 0.15);
    animation: float 8s ease-in-out infinite reverse;
  }
  .shape-3 {
    bottom: 60px;
    right: 60px;
    width: 160px;
    height: 160px;
    clip-path: polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%);
    background: rgba(201, 168, 76, 0.06);
    animation: float 7s ease-in-out infinite 1s;
  }
  @keyframes float {
    0%, 100% { transform: translateY(0); }
    50% { transform: translateY(-20px); }
  }
  .scroll-indicator {
    position: absolute;
    bottom: 40px;
    left: 50%;
    transform: translateX(-50%);
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 6px;
    font-size: 11px;
    color: var(--text-muted);
    text-transform: uppercase;
    letter-spacing: 3px;
    animation: bounce 2s ease-in-out infinite;
    z-index: 1;
  }
  @keyframes bounce {
    0%, 100% { transform: translateX(-50%) translateY(0); }
    50% { transform: translateX(-50%) translateY(8px); }
  }

  /* DIVISION CARDS */
  .cards-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 28px;
  }
  .division-card {
    display: block;
    padding: 48px 32px;
    border-radius: var(--radius);
    transition: all 0.4s ease;
    position: relative;
    overflow: hidden;
  }
  .division-card:hover {
    transform: translateY(-8px);
    box-shadow: 0 20px 60px rgba(201, 168, 76, 0.15);
  }
  .card-green { background: var(--green-dark); }
  .card-purple { background: var(--purple-dark); }
  .card-navy { background: var(--navy-light); }
  .card-icon {
    width: 72px;
    height: 72px;
    border-radius: 50%;
    background: rgba(201, 168, 76, 0.1);
    border: 1px solid rgba(201, 168, 76, 0.25);
    display: flex;
    align-items: center;
    justify-content: center;
    margin-bottom: 28px;
  }
  .division-card h3 {
    font-size: 26px;
    font-weight: 700;
    color: var(--white);
    margin-bottom: 6px;
  }
  .card-subtitle {
    font-size: 14px;
    font-weight: 600;
    color: var(--gold);
    text-transform: uppercase;
    letter-spacing: 2px;
  }
  .card-desc {
    font-size: 15px;
    line-height: 1.7;
    color: var(--text-muted);
    margin-bottom: 24px;
  }
  .card-link {
    font-size: 15px;
    font-weight: 600;
    color: var(--gold);
    display: inline-flex;
    align-items: center;
    gap: 8px;
    transition: gap var(--transition);
  }
  .division-card:hover .card-link {
    gap: 12px;
  }

  /* WHY CHOOSE US */
  .why-heading {
    font-size: 44px;
    font-weight: 700;
    color: var(--white);
    margin-bottom: 64px;
    line-height: 1.25;
  }
  .features-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 32px;
  }
  .feature-block {
    text-align: center;
  }
  .feature-icon {
    width: 72px;
    height: 72px;
    border-radius: 16px;
    background: rgba(201, 168, 76, 0.08);
    border: 1px solid rgba(201, 168, 76, 0.15);
    display: flex;
    align-items: center;
    justify-content: center;
    margin: 0 auto 20px;
  }
  .feature-block h4 {
    font-size: 18px;
    font-weight: 600;
    color: var(--white);
    margin-bottom: 10px;
  }
  .feature-block p {
    font-size: 14px;
    line-height: 1.65;
    color: var(--text-muted);
  }

  /* STATS BAR */
  .stats-section {
    background: var(--navy-light);
    padding: 72px 24px;
  }
  .stats-row {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 64px;
  }
  .stat-item {
    text-align: center;
  }
  .stat-icon {
    margin-bottom: 12px;
  }
  .stat-number {
    font-family: 'Playfair Display', serif;
    font-size: 48px;
    font-weight: 700;
    color: var(--gold);
    margin-bottom: 4px;
    min-width: 80px;
  }
  .stat-label {
    font-size: 14px;
    color: var(--text-muted);
    text-transform: uppercase;
    letter-spacing: 1px;
  }
  .stat-divider {
    width: 1px;
    height: 60px;
    background: rgba(201, 168, 76, 0.15);
  }

  /* FOOTER BRAND STRIP */
  .brand-strip {
    background: var(--gray-light);
  }
  .brand-icons {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 64px;
    margin-bottom: 32px;
  }
  .brand-block {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 12px;
  }
  .brand-label {
    font-family: 'Playfair Display', serif;
    font-size: 14px;
    font-weight: 600;
    color: var(--navy);
    letter-spacing: 2px;
  }
  .brand-strip-tagline {
    font-size: 13px;
    font-weight: 600;
    color: var(--gold);
    text-transform: uppercase;
    letter-spacing: 5px;
  }

  @media (max-width: 768px) {
    .hero-container {
      grid-template-columns: 1fr;
      gap: 40px;
      text-align: center;
      padding-top: 100px;
      padding-bottom: 60px;
    }
    .hero-content h1 {
      font-size: 38px;
    }
    .gold-underline {
      margin: 24px auto;
    }
    .subtitle-row {
      justify-content: center;
    }
    .hero-desc {
      font-size: 15px;
    }
    .hero-visual {
      display: none;
    }
    .cards-grid {
      grid-template-columns: 1fr;
    }
    .why-heading {
      font-size: 30px;
      margin-bottom: 40px;
    }
    .features-grid {
      grid-template-columns: repeat(2, 1fr);
      gap: 24px;
    }
    .stats-row {
      flex-direction: column;
      gap: 28px;
    }
    .stat-divider {
      width: 60px;
      height: 1px;
    }
    .stat-number {
      font-size: 36px;
    }
    .brand-icons {
      gap: 32px;
    }
  }
</style>
