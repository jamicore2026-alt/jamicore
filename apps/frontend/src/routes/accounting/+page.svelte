<script>
  let formSubmitted = $state(false);
  let formData = $state({ name: '', email: '', company: '', serviceType: '', message: '' });

  function handleSubmit(e) {
    e.preventDefault();
    formSubmitted = true;
    formData = { name: '', email: '', company: '', serviceType: '', message: '' };
    setTimeout(() => formSubmitted = false, 4000);
  }
</script>

<svelte:head>
  <title>Accounting Services — Al-Ektefa Group</title>
  <meta name="description" content="Al-Ektefa Accounting: smart financial management, tax compliance, payroll, and audit services for growing businesses." />
</svelte:head>

<!-- ============ SECTION 1: HERO ============ -->
<section class="hero accounting-hero">
  <div class="hero-bg-accents">
    <div class="accent-line accent-1"></div>
    <div class="accent-line accent-2"></div>
    <div class="accent-dot accent-3"></div>
  </div>
  <div class="hero-container">
    <div class="hero-content">
      <p class="tag">AL-EKTEFA ACCOUNTING</p>
      <h1>Smart Financial<br />Services for Growing<br />Businesses</h1>
      <p class="hero-desc">
        Comprehensive accounting, tax compliance, payroll, and audit services
        designed to help your business navigate complex financial regulations
        and focus on what matters most — growth.
      </p>
      <div class="hero-ctas">
        <a href="#services" class="btn btn-primary">Our Services
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
        </a>
        <a href="#contact" class="btn btn-outline">Free Consultation</a>
      </div>
    </div>
    <div class="hero-visual">
      <div class="geo-accent"></div>
      <div class="geo-line"></div>
    </div>
  </div>
</section>

<!-- ============ SECTION 2: SERVICES GRID ============ -->
<section id="services" class="services-section section-padding">
  <div class="container text-center">
    <p class="tag">OUR SERVICES</p>
    <h2 class="services-heading">Complete Financial Management</h2>
    <p class="services-subtitle">From day-to-day bookkeeping to strategic financial planning, we handle it all.</p>

    <div class="services-grid">
      <div class="service-card">
        <div class="service-icon">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="var(--gold)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M12 20V10"/>
            <path d="M18 20V4"/>
            <path d="M6 20v-4"/>
          </svg>
        </div>
        <h3>Financial Management</h3>
        <p class="service-subtitle">Bookkeeping & Reporting</p>
        <div class="gold-divider" style="margin-left: auto; margin-right: auto;"></div>
        <p>Complete bookkeeping services, financial statement preparation, cash flow management, and management reporting to keep your finances organized and compliant.</p>
      </div>
      <div class="service-card">
        <div class="service-icon">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="var(--gold)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
            <rect x="2" y="3" width="20" height="18" rx="2" ry="2"/>
            <line x1="12" y1="8" x2="12" y2="16"/>
            <line x1="8" y1="12" x2="16" y2="12"/>
          </svg>
        </div>
        <h3>Tax & Compliance</h3>
        <p class="service-subtitle">VAT & Corporate Tax</p>
        <div class="gold-divider" style="margin-left: auto; margin-right: auto;"></div>
        <p>VAT registration, filing, and compliance, corporate tax planning, international tax advisory, and representation before tax authorities.</p>
      </div>
      <div class="service-card">
        <div class="service-icon">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="var(--gold)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
            <circle cx="9" cy="7" r="4"/>
            <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
            <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
          </svg>
        </div>
        <h3>Payroll</h3>
        <p class="service-subtitle">Employee Management</p>
        <div class="gold-divider" style="margin-left: auto; margin-right: auto;"></div>
        <p>End-to-end payroll processing, employee benefits administration, WPS compliance, gratuity calculations, and HR reporting.</p>
      </div>
      <div class="service-card">
        <div class="service-icon">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="var(--gold)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
            <polyline points="14 2 14 8 20 8"/>
            <line x1="16" y1="13" x2="8" y2="13"/>
            <line x1="16" y1="17" x2="8" y2="17"/>
          </svg>
        </div>
        <h3>Audit & Assurance</h3>
        <p class="service-subtitle">Statutory & Internal</p>
        <div class="gold-divider" style="margin-left: auto; margin-right: auto;"></div>
        <p>Statutory audits, internal audits, agreed-upon procedures, and financial due diligence for mergers, acquisitions, and investments.</p>
      </div>
    </div>
  </div>
</section>

<!-- ============ SECTION 3: WHY US ============ -->
<section class="why-section section-padding" style="background: var(--navy-light);">
  <div class="container">
    <div class="why-grid">
      <div class="why-stats">
        <div class="stat-item">
          <div class="stat-number">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--gold)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="12" r="10"/>
              <line x1="2" y1="12" x2="22" y2="12"/>
              <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
            </svg>
          </div>
          <span class="stat-value">200+</span>
          <span class="stat-label">Clients Served</span>
        </div>
        <div class="stat-item">
          <div class="stat-number">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--gold)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="12" r="10"/>
              <polyline points="12 6 12 12 16 14"/>
            </svg>
          </div>
          <span class="stat-value">10+</span>
          <span class="stat-label">Years Experience</span>
        </div>
        <div class="stat-item">
          <div class="stat-number">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--gold)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
              <path d="M12 2L2 7l10 5 10-5-10-5z"/>
              <path d="M2 17l10 5 10-5"/>
              <path d="M2 12l10 5 10-5"/>
            </svg>
          </div>
          <span class="stat-value">100%</span>
          <span class="stat-label">Compliance Rate</span>
        </div>
      </div>
      <div class="why-points">
        <p class="tag">WHY AL-EKTEFA ACCOUNTING</p>
        <h2>Trusted Financial<br />Partner for Your Business</h2>
        <p class="why-desc">We combine deep regulatory knowledge with practical business insight to deliver financial services that go beyond compliance — we help drive business performance.</p>

        <div class="trust-points">
          <div class="trust-point">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--gold)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
            <div>
              <strong>Certified Professionals</strong>
              <p>Qualified accountants and auditors with regional expertise.</p>
            </div>
          </div>
          <div class="trust-point">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--gold)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
            <div>
              <strong>Regulatory Expertise</strong>
              <p>Up-to-date with GCC tax laws, VAT regulations, and compliance requirements.</p>
            </div>
          </div>
          <div class="trust-point">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--gold)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
            <div>
              <strong>Technology Driven</strong>
              <p>Cloud-based accounting platforms for real-time visibility and collaboration.</p>
            </div>
          </div>
          <div class="trust-point">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--gold)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
            <div>
              <strong>Confidential & Secure</strong>
              <p>Enterprise-grade data protection and strict client confidentiality protocols.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</section>

<!-- ============ SECTION 4: OUR PROCESS ============ -->
<section class="process-section section-padding">
  <div class="container text-center">
    <p class="tag">OUR PROCESS</p>
    <h2 class="process-heading">How We Work</h2>
    <p class="process-subtitle">A structured approach to financial management that delivers results.</p>

    <div class="steps-row">
      <div class="step">
        <div class="step-number">01</div>
        <h4>Consultation</h4>
        <p>We meet to understand your business, financial goals, and current challenges. Free initial assessment.</p>
      </div>
      <div class="step-connector">
        <svg width="32" height="2" viewBox="0 0 32 2" fill="none" xmlns="http://www.w3.org/2000/svg"><rect width="32" height="2" rx="1" fill="var(--gold)" opacity="0.3"/></svg>
      </div>
      <div class="step">
        <div class="step-number">02</div>
        <h4>Onboarding</h4>
        <p>We set up your accounts, integrate with your systems, and assign your dedicated account manager.</p>
      </div>
      <div class="step-connector">
        <svg width="32" height="2" viewBox="0 0 32 2" fill="none" xmlns="http://www.w3.org/2000/svg"><rect width="32" height="2" rx="1" fill="var(--gold)" opacity="0.3"/></svg>
      </div>
      <div class="step">
        <div class="step-number">03</div>
        <h4>Management</h4>
        <p>Ongoing financial management with monthly reports, tax filings, and proactive advisory.</p>
      </div>
      <div class="step-connector">
        <svg width="32" height="2" viewBox="0 0 32 2" fill="none" xmlns="http://www.w3.org/2000/svg"><rect width="32" height="2" rx="1" fill="var(--gold)" opacity="0.3"/></svg>
      </div>
      <div class="step">
        <div class="step-number">04</div>
        <h4>Reports</h4>
        <p>Clear, actionable financial reports delivered on schedule. Always available for questions and strategic advice.</p>
      </div>
    </div>
  </div>
</section>

<!-- ============ SECTION 5: CONSULTATION FORM ============ -->
<section id="contact" class="contact-section section-padding">
  <div class="container">
    <div class="form-wrapper">
      <p class="tag text-center">FREE CONSULTATION</p>
      <h2 class="form-heading text-center">Start Your Financial Journey</h2>
      <p class="form-subtitle text-center">Book a free consultation with our accounting team. We will assess your needs and propose a tailored solution.</p>

      {#if formSubmitted}
        <div class="toast">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--green-dark)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
          Consultation request submitted! Our team will contact you within 24 hours.
        </div>
      {/if}

      <form onsubmit={handleSubmit}>
        <div class="form-grid">
          <div class="form-group">
            <label for="name">Full Name *</label>
            <input id="name" type="text" required placeholder="Your full name" bind:value={formData.name} />
          </div>
          <div class="form-group">
            <label for="email">Email Address *</label>
            <input id="email" type="email" required placeholder="you@company.com" bind:value={formData.email} />
          </div>
          <div class="form-group">
            <label for="company">Company Name</label>
            <input id="company" type="text" placeholder="Your company" bind:value={formData.company} />
          </div>
          <div class="form-group">
            <label for="serviceType">Service Needed *</label>
            <select id="serviceType" required bind:value={formData.serviceType}>
              <option value="">Select a service</option>
              <option value="financial">Financial Management</option>
              <option value="tax">Tax & Compliance</option>
              <option value="payroll">Payroll</option>
              <option value="audit">Audit & Assurance</option>
              <option value="multiple">Multiple Services</option>
            </select>
          </div>
          <div class="form-group full-width">
            <label for="message">Tell us about your needs</label>
            <textarea id="message" rows="4" placeholder="Briefly describe your business and what services you are interested in..." bind:value={formData.message}></textarea>
          </div>
        </div>
        <button type="submit" class="btn btn-primary form-submit">Request Consultation
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
        </button>
      </form>
    </div>
  </div>
</section>

<style>
  .accounting-hero {
    min-height: 100vh;
    display: flex;
    align-items: center;
    background: var(--navy);
    position: relative;
    overflow: hidden;
  }
  .hero-bg-accents {
    position: absolute;
    inset: 0;
    pointer-events: none;
  }
  .accent-line {
    position: absolute;
    background: rgba(201, 168, 76, 0.06);
  }
  .accent-1 {
    top: 20%;
    right: -100px;
    width: 600px;
    height: 1px;
    transform: rotate(-25deg);
  }
  .accent-2 {
    bottom: 25%;
    right: -50px;
    width: 500px;
    height: 1px;
    transform: rotate(15deg);
  }
  .accent-3 {
    position: absolute;
    top: 45%;
    right: 15%;
    width: 300px;
    height: 300px;
    border-radius: 50%;
    border: 1px solid rgba(201, 168, 76, 0.08);
  }
  .hero-container {
    max-width: 1280px;
    margin: 0 auto;
    padding: 0 24px;
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 60px;
    align-items: center;
    width: 100%;
    position: relative;
    z-index: 1;
  }
  .hero-content h1 {
    font-size: 52px;
    font-weight: 700;
    line-height: 1.15;
    color: var(--white);
    margin-bottom: 24px;
  }
  .hero-desc {
    font-size: 17px;
    line-height: 1.7;
    color: var(--text-muted);
    margin-bottom: 40px;
    max-width: 540px;
  }
  .hero-ctas {
    display: flex;
    gap: 16px;
    flex-wrap: wrap;
  }
  .hero-visual {
    position: relative;
    height: 400px;
  }
  .geo-accent {
    position: absolute;
    top: 50px;
    right: 30px;
    width: 250px;
    height: 250px;
    border-radius: 50%;
    border: 2px solid rgba(201, 168, 76, 0.1);
    animation: float 7s ease-in-out infinite;
  }
  .geo-line {
    position: absolute;
    bottom: 60px;
    right: 80px;
    width: 200px;
    height: 3px;
    background: rgba(201, 168, 76, 0.12);
    transform: rotate(-30deg);
    animation: float 6s ease-in-out infinite reverse;
  }
  @keyframes float {
    0%, 100% { transform: translateY(0); }
    50% { transform: translateY(-15px); }
  }

  .services-heading {
    font-size: 44px;
    font-weight: 700;
    color: var(--white);
    margin-bottom: 8px;
  }
  .services-subtitle {
    font-size: 16px;
    color: var(--text-muted);
    margin-bottom: 52px;
  }
  .services-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 28px;
    max-width: 960px;
    margin: 0 auto;
  }
  .service-card {
    background: var(--navy-light);
    border-radius: var(--radius);
    padding: 44px 32px;
    text-align: left;
    transition: all 0.3s ease;
    border: 1px solid transparent;
  }
  .service-card:hover {
    border-color: rgba(201, 168, 76, 0.2);
    transform: translateY(-4px);
    box-shadow: 0 12px 40px rgba(201, 168, 76, 0.08);
  }
  .service-icon {
    margin-bottom: 24px;
  }
  .service-card h3 {
    font-size: 22px;
    font-weight: 600;
    color: var(--white);
    margin-bottom: 4px;
  }
  .service-subtitle {
    font-size: 13px;
    font-weight: 600;
    color: var(--gold);
    text-transform: uppercase;
    letter-spacing: 2px;
  }
  .service-card p {
    font-size: 15px;
    line-height: 1.6;
    color: var(--text-muted);
  }

  .why-grid {
    display: grid;
    grid-template-columns: 1fr 1.2fr;
    gap: 64px;
    align-items: center;
  }
  .why-stats {
    display: flex;
    flex-direction: column;
    gap: 32px;
  }
  .stat-item {
    display: flex;
    align-items: center;
    gap: 16px;
  }
  .stat-value {
    font-family: 'Playfair Display', serif;
    font-size: 36px;
    font-weight: 700;
    color: var(--gold);
    min-width: 80px;
  }
  .stat-label {
    font-size: 14px;
    color: var(--text-muted);
    text-transform: uppercase;
    letter-spacing: 1px;
  }
  .why-points h2 {
    font-size: 38px;
    font-weight: 700;
    color: var(--white);
    margin-bottom: 16px;
    line-height: 1.2;
  }
  .why-desc {
    font-size: 15px;
    line-height: 1.7;
    color: var(--text-muted);
    margin-bottom: 32px;
  }
  .trust-points {
    display: flex;
    flex-direction: column;
    gap: 18px;
  }
  .trust-point {
    display: flex;
    gap: 14px;
    align-items: flex-start;
  }
  .trust-point strong {
    font-size: 15px;
    font-weight: 600;
    color: var(--white);
    display: block;
    margin-bottom: 2px;
  }
  .trust-point p {
    font-size: 13px;
    color: var(--text-muted);
  }

  .process-heading {
    font-size: 44px;
    font-weight: 700;
    color: var(--white);
    margin-bottom: 8px;
  }
  .process-subtitle {
    font-size: 16px;
    color: var(--text-muted);
    margin-bottom: 52px;
  }
  .steps-row {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 16px;
    flex-wrap: wrap;
  }
  .step {
    flex: 0 0 220px;
  }
  .step-number {
    width: 64px;
    height: 64px;
    border-radius: 50%;
    background: rgba(201, 168, 76, 0.1);
    border: 1px solid rgba(201, 168, 76, 0.25);
    display: flex;
    align-items: center;
    justify-content: center;
    margin: 0 auto 16px;
    font-family: 'Playfair Display', serif;
    font-size: 22px;
    font-weight: 700;
    color: var(--gold);
  }
  .step h4 {
    font-size: 18px;
    font-weight: 600;
    color: var(--white);
    margin-bottom: 8px;
  }
  .step p {
    font-size: 13px;
    line-height: 1.6;
    color: var(--text-muted);
  }
  .step-connector {
    display: flex;
    align-items: center;
  }

  .contact-section {
    background: var(--gray-light);
  }
  .form-wrapper {
    max-width: 680px;
    margin: 0 auto;
  }
  .form-heading {
    font-size: 38px;
    font-weight: 700;
    color: var(--navy);
    margin-bottom: 8px;
  }
  .form-subtitle {
    font-size: 15px;
    color: var(--text-muted);
    margin-bottom: 36px;
  }
  .form-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 16px;
  }
  .form-group { display: flex; flex-direction: column; gap: 6px; }
  .form-group.full-width { grid-column: span 2; }
  .form-group label {
    font-size: 13px;
    font-weight: 600;
    color: var(--navy);
    text-transform: uppercase;
    letter-spacing: 1px;
  }
  .form-group input, .form-group select, .form-group textarea {
    padding: 12px 16px;
    background: var(--white);
    border: 1px solid rgba(13, 27, 62, 0.12);
    border-radius: 8px;
    font-size: 15px;
    color: var(--navy);
    transition: border-color var(--transition);
  }
  .form-group input:focus, .form-group select:focus, .form-group textarea:focus {
    outline: none;
    border-color: var(--gold);
  }
  .form-group textarea { resize: vertical; }
  .form-submit { margin-top: 24px; }
  .toast {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 14px 20px;
    background: rgba(26, 71, 49, 0.1);
    border: 1px solid var(--green-dark);
    color: var(--green-dark);
    border-radius: 8px;
    margin-bottom: 24px;
    font-size: 14px;
    font-weight: 500;
  }

  @media (max-width: 768px) {
    .hero-container {
      grid-template-columns: 1fr;
      text-align: center;
      padding-top: 100px;
      padding-bottom: 60px;
    }
    .hero-content h1 { font-size: 32px; }
    .hero-ctas { justify-content: center; }
    .hero-desc { margin-left: auto; margin-right: auto; }
    .hero-visual { display: none; }
    .services-heading, .process-heading { font-size: 32px; }
    .services-grid { grid-template-columns: 1fr; }
    .why-grid { grid-template-columns: 1fr; gap: 40px; }
    .why-points h2 { font-size: 28px; }
    .steps-row {
      flex-direction: column;
      align-items: center;
      gap: 24px;
    }
    .step { flex: 0 0 auto; max-width: 280px; }
    .step-connector { transform: rotate(90deg); }
    .form-grid { grid-template-columns: 1fr; }
    .form-group.full-width { grid-column: span 1; }
    .form-heading { font-size: 28px; }
  }
</style>
