<script>
  let formSubmitted = $state(false);
  let formData = $state({ name: '', email: '', company: '', businessType: '', message: '' });

  function handleSubmit(e) {
    e.preventDefault();
    formSubmitted = true;
    formData = { name: '', email: '', company: '', businessType: '', message: '' };
    setTimeout(() => formSubmitted = false, 4000);
  }
</script>

<svelte:head>
  <title>Jamicore Technology — Al-Ektefa Group</title>
  <meta name="description" content="Jamicore: all-in-one e-commerce, POS, and payment platform for Gulf merchants — part of Al-Ektefa Group." />
</svelte:head>

<!-- ============ SECTION 1: HERO ============ -->
<section class="hero jamicore-hero">
  <div class="hero-container">
    <div class="hero-content">
      <p class="tag">JAMICORE TECHNOLOGY</p>
      <h1>All-in-One Commerce<br />Platform for Gulf<br />Merchants</h1>
      <p class="hero-desc">
        Build, manage, and scale your business with our unified e-commerce, POS,
        and payment solutions. Designed for the Gulf market with Arabic-first
        interfaces and local payment integrations.
      </p>
      <div class="hero-ctas">
        <a href="#features" class="btn btn-primary">Explore Features
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
        </a>
        <a href="#contact" class="btn btn-outline">Request a Demo</a>
      </div>
    </div>
    <div class="hero-visual">
      <div class="geo-triangle"></div>
      <div class="geo-ring"></div>
      <div class="geo-square"></div>
    </div>
  </div>
</section>

<!-- ============ SECTION 2: PLATFORM OVERVIEW ============ -->
<section class="overview-section section-padding">
  <div class="container text-center">
    <p class="tag">PLATFORM OVERVIEW</p>
    <h2 class="overview-heading">One Platform, Three Pillars</h2>
    <p class="overview-subtitle">Everything you need to run a modern commerce business, unified under one seamless platform.</p>

    <div class="pillars-grid">
      <div class="pillar-card">
        <div class="pillar-icon">
          <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="var(--gold)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
            <rect x="2" y="3" width="20" height="14" rx="2" ry="2"/>
            <line x1="8" y1="21" x2="16" y2="21"/>
            <line x1="12" y1="17" x2="12" y2="21"/>
          </svg>
        </div>
        <h3>E-Commerce</h3>
        <p>Beautiful, fast online stores with Arabic and English support, mobile-optimized checkout, and inventory sync.</p>
      </div>
      <div class="pillar-card">
        <div class="pillar-icon">
          <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="var(--gold)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
            <rect x="3" y="3" width="18" height="12" rx="2"/>
            <path d="M7 19h10"/>
            <path d="M12 15v4"/>
          </svg>
        </div>
        <h3>Point of Sale</h3>
        <p>Modern POS terminal app for iPad and Android. Real-time sync with your online inventory and customer database.</p>
      </div>
      <div class="pillar-card">
        <div class="pillar-icon">
          <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="var(--gold)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
            <rect x="1" y="4" width="22" height="16" rx="2" ry="2"/>
            <line x1="1" y1="10" x2="23" y2="10"/>
          </svg>
        </div>
        <h3>Payments</h3>
        <p>Integrated payment gateway supporting Gulf payment methods: Mada, STC Pay, Apple Pay, Visa, and Mastercard.</p>
      </div>
    </div>
  </div>
</section>

<!-- ============ SECTION 3: FEATURES GRID ============ -->
<section id="features" class="features-section section-padding" style="background: var(--navy-light);">
  <div class="container text-center">
    <p class="tag">FEATURES</p>
    <h2 class="features-heading">Everything Your Business Needs</h2>
    <p class="features-subtitle">A comprehensive suite of tools to launch, operate, and grow your commerce business.</p>

    <div class="features-grid">
      <div class="feature-card">
        <div class="feature-icon">
          <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="var(--gold)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
            <rect x="3" y="3" width="7" height="7" rx="1"/>
            <rect x="14" y="3" width="7" height="7" rx="1"/>
            <rect x="3" y="14" width="7" height="7" rx="1"/>
            <rect x="14" y="14" width="7" height="7" rx="1"/>
          </svg>
        </div>
        <h3>Multi-Store Management</h3>
        <p>Run multiple stores under one account. Each with its own domain, catalog, and settings.</p>
      </div>
      <div class="feature-card">
        <div class="feature-icon">
          <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="var(--gold)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
            <polyline points="3.27 6.96 12 12.01 20.73 6.96"/>
            <line x1="12" y1="22.08" x2="12" y2="12"/>
          </svg>
        </div>
        <h3>Inventory Management</h3>
        <p>Track stock levels in real-time across online and physical stores. Smart low-stock alerts and automated purchase orders.</p>
      </div>
      <div class="feature-card">
        <div class="feature-icon">
          <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="var(--gold)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
            <rect x="3" y="3" width="18" height="12" rx="2"/>
            <path d="M7 19h10"/>
            <path d="M12 15v4"/>
          </svg>
        </div>
        <h3>POS Terminal</h3>
        <p>Fast, reliable point-of-sale app for iPad and Android. Works offline. Syncs automatically when back online.</p>
      </div>
      <div class="feature-card">
        <div class="feature-icon">
          <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="var(--gold)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
            <rect x="1" y="4" width="22" height="16" rx="2" ry="2"/>
            <line x1="1" y1="10" x2="23" y2="10"/>
          </svg>
        </div>
        <h3>Payment Integration</h3>
        <p>Accept Mada, Apple Pay, Visa, Mastercard, STC Pay, and more. Seamless checkout with Gulf-optimized payment flows.</p>
      </div>
      <div class="feature-card">
        <div class="feature-icon">
          <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="var(--gold)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
            <line x1="18" y1="20" x2="18" y2="10"/>
            <line x1="12" y1="20" x2="12" y2="4"/>
            <line x1="6" y1="20" x2="6" y2="14"/>
          </svg>
        </div>
        <h3>Analytics Dashboard</h3>
        <p>Real-time sales reports, customer insights, and inventory analytics. Make data-driven decisions with confidence.</p>
      </div>
      <div class="feature-card">
        <div class="feature-icon">
          <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="var(--gold)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
            <circle cx="9" cy="7" r="4"/>
            <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
            <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
          </svg>
        </div>
        <h3>Customer Management</h3>
        <p>Unified customer profiles across online and in-store. Loyalty programs, targeted promotions, and purchase history.</p>
      </div>
    </div>
  </div>
</section>

<!-- ============ SECTION 4: WHO IS IT FOR ============ -->
<section class="personas-section section-padding">
  <div class="container text-center">
    <p class="tag">WHO IS IT FOR</p>
    <h2 class="personas-heading">Built for Gulf Businesses</h2>
    <p class="personas-subtitle">Jamicore serves the unique needs of businesses across the Gulf region.</p>

    <div class="personas-grid">
      <div class="persona-card">
        <div class="persona-icon">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="var(--gold)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
            <polyline points="9 22 9 12 15 12 15 22"/>
          </svg>
        </div>
        <h3>Retail Stores</h3>
        <p>Fashion, electronics, home goods — run your physical store and online shop from one unified system.</p>
      </div>
      <div class="persona-card">
        <div class="persona-icon">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="var(--gold)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M18 8h1a4 4 0 0 1 0 8h-1"/>
            <path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z"/>
            <line x1="6" y1="1" x2="6" y2="4"/>
            <line x1="10" y1="1" x2="10" y2="4"/>
            <line x1="14" y1="1" x2="14" y2="4"/>
          </svg>
        </div>
        <h3>Restaurants and Cafes</h3>
        <p>QR ordering, kitchen display, online reservations, and loyalty programs for food service businesses.</p>
      </div>
      <div class="persona-card">
        <div class="persona-icon">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="var(--gold)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
            <rect x="1" y="3" width="15" height="13"/>
            <polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/>
            <circle cx="5.5" cy="18.5" r="2.5"/>
            <circle cx="18.5" cy="18.5" r="2.5"/>
          </svg>
        </div>
        <h3>Wholesale Distributors</h3>
        <p>B2B ordering portals, tiered pricing, bulk invoicing, and multi-warehouse inventory management.</p>
      </div>
    </div>
  </div>
</section>

<!-- ============ SECTION 5: PRICING TEASER ============ -->
<section class="pricing-section section-padding" style="background: var(--navy-light);">
  <div class="container text-center">
    <p class="tag">PRICING</p>
    <h2 class="pricing-heading">Plans for Every Stage</h2>
    <p class="pricing-subtitle">From startups to enterprise, we have a plan that fits your business.</p>

    <div class="pricing-grid">
      <div class="pricing-card">
        <h3>Starter</h3>
        <div class="pricing-amount">Contact Us</div>
        <p class="pricing-desc">Perfect for new businesses launching their first online store.</p>
        <ul class="pricing-features">
          <li>1 Store</li>
          <li>Up to 500 Products</li>
          <li>Basic Analytics</li>
          <li>Email Support</li>
        </ul>
        <a href="#contact" class="btn btn-outline">Get Started</a>
      </div>
      <div class="pricing-card featured">
        <div class="popular-badge">Most Popular</div>
        <h3>Growth</h3>
        <div class="pricing-amount">Contact Us</div>
        <p class="pricing-desc">For growing businesses with multiple sales channels.</p>
        <ul class="pricing-features">
          <li>Up to 5 Stores</li>
          <li>Unlimited Products</li>
          <li>POS Terminal Included</li>
          <li>Advanced Analytics</li>
          <li>Priority Support</li>
        </ul>
        <a href="#contact" class="btn btn-primary">Get Started</a>
      </div>
      <div class="pricing-card">
        <h3>Enterprise</h3>
        <div class="pricing-amount">Contact Us</div>
        <p class="pricing-desc">Custom solutions for large-scale operations.</p>
        <ul class="pricing-features">
          <li>Unlimited Stores</li>
          <li>Custom Integrations</li>
          <li>Dedicated Account Manager</li>
          <li>24/7 Support</li>
          <li>SLA Guarantee</li>
        </ul>
        <a href="#contact" class="btn btn-outline">Contact Sales</a>
      </div>
    </div>
  </div>
</section>

<!-- ============ SECTION 6: CONTACT FORM ============ -->
<section id="contact" class="contact-section section-padding">
  <div class="container">
    <div class="form-wrapper">
      <p class="tag text-center">REQUEST A DEMO</p>
      <h2 class="form-heading text-center">See Jamicore in Action</h2>
      <p class="form-subtitle text-center">Fill out the form and our team will schedule a personalized demo for your business.</p>

      {#if formSubmitted}
        <div class="toast">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--green-dark)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
          Demo request submitted! Our team will contact you within 24 hours.
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
            <label for="businessType">Business Type *</label>
            <select id="businessType" required bind:value={formData.businessType}>
              <option value="">Select type</option>
              <option value="retail">Retail Store</option>
              <option value="restaurant">Restaurant / Cafe</option>
              <option value="wholesale">Wholesale Distributor</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div class="form-group full-width">
            <label for="message">Tell us about your needs</label>
            <textarea id="message" rows="4" placeholder="What kind of business do you run and what features are you interested in?" bind:value={formData.message}></textarea>
          </div>
        </div>
        <button type="submit" class="btn btn-primary form-submit">Request Demo
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
        </button>
      </form>
    </div>
  </div>
</section>

<style>
  .jamicore-hero {
    min-height: 100vh;
    display: flex;
    align-items: center;
    background: linear-gradient(135deg, #1B0F3C, #2D1B5E, #1A1242);
    position: relative;
    overflow: hidden;
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
  .geo-triangle {
    position: absolute;
    top: 10px;
    right: 40px;
    width: 200px;
    height: 200px;
    clip-path: polygon(50% 0%, 0% 100%, 100% 100%);
    background: rgba(201, 168, 76, 0.08);
    animation: float 6s ease-in-out infinite;
  }
  .geo-ring {
    position: absolute;
    bottom: 60px;
    right: 20px;
    width: 130px;
    height: 130px;
    border-radius: 50%;
    border: 2px solid rgba(201, 168, 76, 0.12);
    animation: float 8s ease-in-out infinite reverse;
  }
  .geo-square {
    position: absolute;
    top: 140px;
    right: 140px;
    width: 90px;
    height: 90px;
    clip-path: polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%);
    background: rgba(201, 168, 76, 0.05);
    animation: float 7s ease-in-out infinite 1.5s;
  }
  @keyframes float {
    0%, 100% { transform: translateY(0); }
    50% { transform: translateY(-15px); }
  }

  .overview-heading {
    font-size: 44px;
    font-weight: 700;
    color: var(--navy);
    margin-bottom: 8px;
  }
  .overview-subtitle {
    font-size: 16px;
    color: var(--text-muted);
    margin-bottom: 52px;
  }
  .pillars-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 28px;
  }
  .pillar-card {
    background: var(--navy-light);
    border-radius: var(--radius);
    padding: 44px 28px;
    transition: all 0.3s ease;
    border: 1px solid transparent;
  }
  .pillar-card:hover {
    border-color: rgba(201, 168, 76, 0.2);
    transform: translateY(-4px);
    box-shadow: 0 12px 40px rgba(201, 168, 76, 0.08);
  }
  .pillar-icon {
    margin-bottom: 24px;
  }
  .pillar-card h3 {
    font-size: 22px;
    font-weight: 600;
    color: var(--white);
    margin-bottom: 10px;
  }
  .pillar-card p {
    font-size: 15px;
    line-height: 1.6;
    color: var(--text-muted);
  }

  .features-heading {
    font-size: 44px;
    font-weight: 700;
    color: var(--white);
    margin-bottom: 8px;
  }
  .features-subtitle {
    font-size: 16px;
    color: var(--text-muted);
    margin-bottom: 52px;
  }
  .features-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 24px;
  }
  .feature-card {
    background: rgba(255, 255, 255, 0.03);
    border-radius: var(--radius);
    padding: 36px 28px;
    text-align: left;
    transition: all 0.3s ease;
    border: 1px solid rgba(255, 255, 255, 0.05);
  }
  .feature-card:hover {
    border-color: rgba(201, 168, 76, 0.15);
    transform: translateY(-4px);
    box-shadow: 0 12px 40px rgba(201, 168, 76, 0.06);
  }
  .feature-icon {
    margin-bottom: 20px;
  }
  .feature-card h3 {
    font-size: 18px;
    font-weight: 600;
    color: var(--white);
    margin-bottom: 8px;
  }
  .feature-card p {
    font-size: 14px;
    line-height: 1.6;
    color: var(--text-muted);
  }

  .personas-heading {
    font-size: 44px;
    font-weight: 700;
    color: var(--navy);
    margin-bottom: 8px;
  }
  .personas-subtitle {
    font-size: 16px;
    color: var(--text-muted);
    margin-bottom: 52px;
  }
  .personas-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 28px;
  }
  .persona-card {
    background: var(--navy-light);
    border-radius: var(--radius);
    padding: 44px 28px;
    transition: all 0.3s ease;
    border: 1px solid transparent;
  }
  .persona-card:hover {
    border-color: rgba(201, 168, 76, 0.2);
    transform: translateY(-4px);
  }
  .persona-icon {
    margin-bottom: 24px;
  }
  .persona-card h3 {
    font-size: 20px;
    font-weight: 600;
    color: var(--white);
    margin-bottom: 10px;
  }
  .persona-card p {
    font-size: 15px;
    line-height: 1.6;
    color: var(--text-muted);
  }

  .pricing-heading {
    font-size: 44px;
    font-weight: 700;
    color: var(--white);
    margin-bottom: 8px;
  }
  .pricing-subtitle {
    font-size: 16px;
    color: var(--text-muted);
    margin-bottom: 52px;
  }
  .pricing-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 24px;
    align-items: start;
  }
  .pricing-card {
    background: rgba(255, 255, 255, 0.03);
    border-radius: var(--radius);
    padding: 40px 28px;
    text-align: center;
    border: 1px solid rgba(255, 255, 255, 0.05);
    transition: all 0.3s ease;
    position: relative;
  }
  .pricing-card:hover {
    border-color: rgba(201, 168, 76, 0.15);
  }
  .pricing-card.featured {
    border-color: var(--gold);
    transform: scale(1.03);
  }
  .pricing-card.featured:hover {
    box-shadow: 0 16px 48px rgba(201, 168, 76, 0.12);
  }
  .popular-badge {
    position: absolute;
    top: -14px;
    left: 50%;
    transform: translateX(-50%);
    padding: 6px 20px;
    background: var(--gold);
    color: var(--navy);
    font-size: 12px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 1px;
    border-radius: 20px;
  }
  .pricing-card h3 {
    font-size: 24px;
    font-weight: 700;
    color: var(--white);
    margin-bottom: 16px;
    margin-top: 8px;
  }
  .pricing-amount {
    font-family: 'Playfair Display', serif;
    font-size: 32px;
    font-weight: 700;
    color: var(--gold);
    margin-bottom: 12px;
  }
  .pricing-desc {
    font-size: 14px;
    color: var(--text-muted);
    margin-bottom: 24px;
    line-height: 1.5;
  }
  .pricing-features {
    list-style: none;
    text-align: left;
    margin-bottom: 28px;
  }
  .pricing-features li {
    padding: 8px 0;
    font-size: 14px;
    color: var(--text-muted);
    border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  }
  .pricing-features li::before {
    content: '';
    display: inline-block;
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: var(--gold);
    margin-right: 10px;
  }
  .pricing-card .btn {
    width: 100%;
    justify-content: center;
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
    .overview-heading, .features-heading, .personas-heading, .pricing-heading { font-size: 32px; }
    .pillars-grid, .features-grid, .personas-grid, .pricing-grid { grid-template-columns: 1fr; }
    .form-grid { grid-template-columns: 1fr; }
    .form-group.full-width { grid-column: span 1; }
    .form-heading { font-size: 28px; }
  }
</style>
