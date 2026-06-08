<script>
  let formSubmitted = $state(false);
  let formData = $state({ name: '', email: '', product: '', message: '' });

  function handleSubmit(e) {
    e.preventDefault();
    formSubmitted = true;
    formData = { name: '', email: '', product: '', message: '' };
    setTimeout(() => formSubmitted = false, 4000);
  }
</script>

<svelte:head>
  <title>Agricultural Trade — Al-Ektefa Group</title>
  <meta name="description" content="Premium agricultural trade: coffee, spices, rice, lentils, pulses, and grains for global markets — Al-Ektefa Trading Division." />
</svelte:head>

<!-- ============ SECTION 1: HERO ============ -->
<section class="hero trade-hero">
  <div class="hero-container">
    <div class="hero-content">
      <p class="tag">AGRICULTURAL TRADE</p>
      <h1>Premium Agricultural<br />Trade, Globally.</h1>
      <p class="hero-desc">
        Sourcing the finest agricultural products from trusted suppliers worldwide,
        delivering quality coffee, spices, rice, lentils, pulses, and grains
        to markets across the Middle East, Africa, and Asia.
      </p>
      <div class="hero-ctas">
        <a href="#products" class="btn btn-primary">View Products
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
        </a>
        <a href="#contact" class="btn btn-outline">Make an Inquiry</a>
      </div>
    </div>
    <div class="hero-visual">
      <div class="geo-leaf"></div>
      <div class="geo-circle"></div>
      <div class="geo-diamond"></div>
    </div>
  </div>
</section>

<!-- ============ SECTION 2: INTRO ============ -->
<section class="intro-section section-padding">
  <div class="container">
    <div class="intro-grid">
      <div class="intro-text">
        <p class="tag">WHO WE ARE IN TRADE</p>
        <h2>Sourcing Excellence<br />Across Continents</h2>
        <p class="intro-desc">
          Al-Ektefa Trading is the agricultural arm of Al-Ektefa Group, specializing
          in sourcing and distributing premium agricultural commodities. With deep
          relationships across major growing regions in Africa, Asia, and Latin America,
          we connect producers with buyers through reliable, quality-assured supply chains.
        </p>
        <p class="intro-desc">
          Our commitment to quality, consistency, and fair trade practices has made us
          a trusted partner for importers, wholesalers, and food manufacturers worldwide.
        </p>
      </div>
      <div class="intro-highlights">
        <div class="highlight-item">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--gold)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
          <span>Premium Quality Sourcing</span>
        </div>
        <div class="highlight-item">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--gold)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
          <span>Global Supply Chain</span>
        </div>
        <div class="highlight-item">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--gold)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
          <span>Quality Assurance</span>
        </div>
        <div class="highlight-item">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--gold)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
          <span>Competitive Pricing</span>
        </div>
        <div class="highlight-item">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--gold)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
          <span>Flexible Shipping Options</span>
        </div>
        <div class="highlight-item">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--gold)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
          <span>Dedicated Account Managers</span>
        </div>
      </div>
    </div>
  </div>
</section>

<!-- ============ SECTION 3: PRODUCTS GRID ============ -->
<section id="products" class="products-section section-padding">
  <div class="container text-center">
    <p class="tag">OUR PRODUCTS</p>
    <h2 class="products-heading">What We Trade</h2>
    <p class="products-subtitle">Premium agricultural commodities sourced from the world's finest growing regions.</p>

    <div class="products-grid">
      <div class="product-card">
        <div class="product-icon">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="var(--gold)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M18 8h1a4 4 0 0 1 0 8h-1"/>
            <path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z"/>
            <line x1="6" y1="1" x2="6" y2="4"/>
            <line x1="10" y1="1" x2="10" y2="4"/>
            <line x1="14" y1="1" x2="14" y2="4"/>
          </svg>
        </div>
        <h3>Coffee</h3>
        <p>Premium Arabica and Robusta coffee beans from Ethiopia, Brazil, and Vietnam. Green beans and roasted.</p>
      </div>
      <div class="product-card">
        <div class="product-icon">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="var(--gold)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10 10-4.5 10-10S17.5 2 12 2z"/>
            <path d="M12 8c-2.2 0-4 1.8-4 4s1.8 4 4 4 4-1.8 4-4-1.8-4-4-4z"/>
            <path d="M8 14c-2 0-3.5-1.5-3.5-3.5S6 7 8 7"/>
            <path d="M16 14c2 0 3.5-1.5 3.5-3.5S18 7 16 7"/>
          </svg>
        </div>
        <h3>Spices</h3>
        <p>Cardamom, black pepper, cinnamon, cloves, turmeric, and ginger from India, Sri Lanka, and Indonesia.</p>
      </div>
      <div class="product-card">
        <div class="product-icon">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="var(--gold)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
            <ellipse cx="12" cy="5" rx="9" ry="3"/>
            <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/>
            <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/>
          </svg>
        </div>
        <h3>Rice</h3>
        <p>Basmati, Jasmine, and long-grain white rice sourced from India, Pakistan, Thailand, and Vietnam.</p>
      </div>
      <div class="product-card">
        <div class="product-icon">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="var(--gold)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="8" cy="8" r="6"/>
            <path d="M18.09 10.37A6 6 0 1 1 10.34 18"/>
            <path d="M7 6h1v12"/>
          </svg>
        </div>
        <h3>Lentils</h3>
        <p>Red, green, brown, and black lentils from Canada, Australia, and India. High protein for food retail and processing.</p>
      </div>
      <div class="product-card">
        <div class="product-icon">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="var(--gold)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="3"/>
            <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/>
            <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/>
            <path d="M21 3v5h-5"/>
            <path d="M3 21v-5h5"/>
          </svg>
        </div>
        <h3>Pulses</h3>
        <p>Chickpeas, kidney beans, fava beans, and peas from Turkey, Canada, and Myanmar for global markets.</p>
      </div>
      <div class="product-card">
        <div class="product-icon">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="var(--gold)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M12 2L2 7l10 5 10-5-10-5z"/>
            <path d="M2 17l10 5 10-5"/>
            <path d="M2 12l10 5 10-5"/>
          </svg>
        </div>
        <h3>Grains</h3>
        <p>Wheat, corn, sorghum, and millet from major producing regions. Bulk supply for food processing and feed.</p>
      </div>
    </div>
  </div>
</section>

<!-- ============ SECTION 4: HOW IT WORKS ============ -->
<section class="process-section section-padding" style="background: var(--navy-light);">
  <div class="container text-center">
    <p class="tag">OUR PROCESS</p>
    <h2 class="process-heading">How Trade Works</h2>

    <div class="steps-row">
      <div class="step">
        <div class="step-number">
          <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="var(--gold)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
            <polyline points="22 4 12 14.01 9 11.01"/>
          </svg>
        </div>
        <h4>Inquiry</h4>
        <p>Submit your product requirements and specifications through our inquiry form or contact our trade desk directly.</p>
      </div>
      <div class="step-connector">
        <svg width="40" height="12" viewBox="0 0 40 12" fill="none" stroke="var(--gold)" stroke-width="1" stroke-dasharray="2 4" xmlns="http://www.w3.org/2000/svg"><line x1="2" y1="6" x2="38" y2="6"/></svg>
      </div>
      <div class="step">
        <div class="step-number">
          <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="var(--gold)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>
          </svg>
        </div>
        <h4>Sampling</h4>
        <p>Receive product samples and quality certificates. We ensure the grade meets your exact specifications.</p>
      </div>
      <div class="step-connector">
        <svg width="40" height="12" viewBox="0 0 40 12" fill="none" stroke="var(--gold)" stroke-width="1" stroke-dasharray="2 4" xmlns="http://www.w3.org/2000/svg"><line x1="2" y1="6" x2="38" y2="6"/></svg>
      </div>
      <div class="step">
        <div class="step-number">
          <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="var(--gold)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="20 12 20 22 4 22 4 12"/>
            <rect x="2" y="7" width="20" height="5"/>
            <line x1="12" y1="22" x2="12" y2="7"/>
            <path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z"/>
            <path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z"/>
          </svg>
        </div>
        <h4>Confirmation</h4>
        <p>Agree on pricing, contract terms, and logistics. We handle all documentation for smooth execution.</p>
      </div>
      <div class="step-connector">
        <svg width="40" height="12" viewBox="0 0 40 12" fill="none" stroke="var(--gold)" stroke-width="1" stroke-dasharray="2 4" xmlns="http://www.w3.org/2000/svg"><line x1="2" y1="6" x2="38" y2="6"/></svg>
      </div>
      <div class="step">
        <div class="step-number">
          <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="var(--gold)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
            <rect x="1" y="3" width="15" height="13"/>
            <polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/>
            <circle cx="5.5" cy="18.5" r="2.5"/>
            <circle cx="18.5" cy="18.5" r="2.5"/>
          </svg>
        </div>
        <h4>Delivery</h4>
        <p>Products shipped via sea or air freight with full tracking. On-time delivery to your port of choice.</p>
      </div>
    </div>
  </div>
</section>

<!-- ============ SECTION 5: MARKETS ============ -->
<section class="markets-section section-padding">
  <div class="container text-center">
    <p class="tag">GLOBAL REACH</p>
    <h2 class="markets-heading">Markets We Serve</h2>
    <p class="markets-subtitle">Delivering agricultural products to buyers across the Middle East, Africa, and Asia.</p>

    <div class="flags-grid">
      <div class="flag-item">🇦🇪 UAE</div>
      <div class="flag-item">🇸🇦 Saudi Arabia</div>
      <div class="flag-item">🇶🇦 Qatar</div>
      <div class="flag-item">🇰🇼 Kuwait</div>
      <div class="flag-item">🇴🇲 Oman</div>
      <div class="flag-item">🇧🇭 Bahrain</div>
      <div class="flag-item">🇯🇴 Jordan</div>
      <div class="flag-item">🇪🇬 Egypt</div>
      <div class="flag-item">🇮🇶 Iraq</div>
      <div class="flag-item">🇱🇧 Lebanon</div>
      <div class="flag-item">🇳🇬 Nigeria</div>
      <div class="flag-item">🇰🇪 Kenya</div>
      <div class="flag-item">🇹🇿 Tanzania</div>
      <div class="flag-item">🇵🇰 Pakistan</div>
      <div class="flag-item">🇮🇳 India</div>
      <div class="flag-item">🇧🇩 Bangladesh</div>
    </div>

    <div class="market-stat">
      <span class="market-number">25+</span>
      <span class="market-label">Countries Served</span>
    </div>
  </div>
</section>

<!-- ============ SECTION 6: INQUIRY FORM ============ -->
<section id="contact" class="contact-section section-padding">
  <div class="container">
    <div class="form-wrapper">
      <p class="tag text-center">MAKE AN INQUIRY</p>
      <h2 class="form-heading text-center">Let's Talk Trade</h2>
      <p class="form-subtitle text-center">Interested in our agricultural products? Fill out the form below and our trade desk will get back to you within 24 hours.</p>

      {#if formSubmitted}
        <div class="toast">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--green-dark)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
          Inquiry submitted successfully! Our trade desk will contact you soon.
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
          <div class="form-group full-width">
            <label for="product">Product of Interest *</label>
            <select id="product" required bind:value={formData.product}>
              <option value="">Select a product</option>
              <option value="coffee">Coffee</option>
              <option value="spices">Spices</option>
              <option value="rice">Rice</option>
              <option value="lentils">Lentils</option>
              <option value="pulses">Pulses</option>
              <option value="grains">Grains</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div class="form-group full-width">
            <label for="message">Message</label>
            <textarea id="message" rows="5" placeholder="Tell us about your requirements, quantity, and destination..." bind:value={formData.message}></textarea>
          </div>
        </div>
        <button type="submit" class="btn btn-primary form-submit">Submit Inquiry
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
        </button>
      </form>
    </div>
  </div>
</section>

<style>
  .trade-hero {
    min-height: 100vh;
    display: flex;
    align-items: center;
    background: linear-gradient(135deg, #0D3B1E, #1A4731, #0F2D16);
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
    font-size: 56px;
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
  .geo-leaf {
    position: absolute;
    top: 20px;
    right: 30px;
    width: 180px;
    height: 180px;
    clip-path: polygon(50% 0%, 100% 40%, 85% 100%, 15% 100%, 0% 40%);
    background: rgba(201, 168, 76, 0.08);
    animation: float 6s ease-in-out infinite;
  }
  .geo-circle {
    position: absolute;
    bottom: 40px;
    right: 80px;
    width: 100px;
    height: 100px;
    border-radius: 50%;
    border: 2px solid rgba(201, 168, 76, 0.12);
    animation: float 7s ease-in-out infinite reverse;
  }
  .geo-diamond {
    position: absolute;
    top: 120px;
    right: 120px;
    width: 80px;
    height: 80px;
    clip-path: polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%);
    background: rgba(201, 168, 76, 0.05);
    animation: float 8s ease-in-out infinite 1s;
  }
  @keyframes float {
    0%, 100% { transform: translateY(0); }
    50% { transform: translateY(-15px); }
  }

  .intro-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 64px;
    align-items: center;
  }
  .intro-text h2 {
    font-size: 38px;
    font-weight: 700;
    color: var(--white);
    margin-bottom: 20px;
    line-height: 1.2;
  }
  .intro-desc {
    font-size: 15px;
    line-height: 1.7;
    color: var(--text-muted);
    margin-bottom: 16px;
  }
  .intro-highlights {
    display: flex;
    flex-direction: column;
    gap: 14px;
    padding: 36px;
    background: var(--navy-light);
    border-radius: var(--radius);
    border: 1px solid rgba(201, 168, 76, 0.1);
  }
  .highlight-item {
    display: flex;
    align-items: center;
    gap: 12px;
    font-size: 15px;
    font-weight: 500;
    color: var(--white);
  }

  .products-heading {
    font-size: 44px;
    font-weight: 700;
    color: var(--white);
    margin-bottom: 8px;
  }
  .products-subtitle {
    font-size: 16px;
    color: var(--text-muted);
    margin-bottom: 52px;
  }
  .products-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 24px;
  }
  .product-card {
    background: var(--navy-light);
    border-radius: var(--radius);
    padding: 36px 28px;
    text-align: left;
    transition: all 0.3s ease;
    border: 1px solid transparent;
  }
  .product-card:hover {
    transform: translateY(-4px);
    border-color: rgba(201, 168, 76, 0.2);
    box-shadow: 0 12px 40px rgba(201, 168, 76, 0.08);
  }
  .product-icon {
    width: 64px;
    height: 64px;
    border-radius: 50%;
    background: rgba(201, 168, 76, 0.08);
    display: flex;
    align-items: center;
    justify-content: center;
    margin-bottom: 20px;
  }
  .product-card h3 {
    font-size: 20px;
    font-weight: 600;
    color: var(--white);
    margin-bottom: 8px;
  }
  .product-card p {
    font-size: 14px;
    line-height: 1.6;
    color: var(--text-muted);
  }

  .process-heading {
    font-size: 44px;
    font-weight: 700;
    color: var(--white);
    margin-bottom: 52px;
  }
  .steps-row {
    display: flex;
    align-items: flex-start;
    justify-content: center;
    gap: 8px;
    flex-wrap: wrap;
  }
  .step {
    flex: 0 0 220px;
    text-align: center;
  }
  .step-number {
    width: 72px;
    height: 72px;
    border-radius: 50%;
    background: rgba(201, 168, 76, 0.1);
    border: 1px solid rgba(201, 168, 76, 0.25);
    display: flex;
    align-items: center;
    justify-content: center;
    margin: 0 auto 16px;
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
    padding-top: 30px;
  }

  .markets-heading {
    font-size: 44px;
    font-weight: 700;
    color: var(--white);
    margin-bottom: 8px;
  }
  .markets-subtitle {
    font-size: 16px;
    color: var(--text-muted);
    margin-bottom: 44px;
  }
  .flags-grid {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: 12px;
    margin-bottom: 40px;
    max-width: 900px;
    margin-left: auto;
    margin-right: auto;
  }
  .flag-item {
    padding: 10px 20px;
    background: var(--navy-light);
    border-radius: 8px;
    font-size: 15px;
    font-weight: 500;
    color: var(--white);
    border: 1px solid rgba(201, 168, 76, 0.08);
  }
  .market-stat {
    margin-top: 24px;
  }
  .market-number {
    font-family: 'Playfair Display', serif;
    font-size: 56px;
    font-weight: 700;
    color: var(--gold);
    display: block;
  }
  .market-label {
    font-size: 15px;
    color: var(--text-muted);
    text-transform: uppercase;
    letter-spacing: 2px;
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
    .hero-content h1 { font-size: 36px; }
    .hero-ctas { justify-content: center; }
    .hero-desc { margin-left: auto; margin-right: auto; }
    .hero-visual { display: none; }
    .intro-grid { grid-template-columns: 1fr; gap: 32px; }
    .intro-text h2 { font-size: 28px; }
    .products-grid { grid-template-columns: 1fr; }
    .products-heading { font-size: 32px; }
    .process-heading { font-size: 32px; }
    .steps-row {
      flex-direction: column;
      align-items: center;
      gap: 20px;
    }
    .step { flex: 0 0 auto; max-width: 280px; }
    .step-connector { transform: rotate(90deg); padding-top: 0; }
    .markets-heading { font-size: 32px; }
    .flags-grid { gap: 8px; }
    .flag-item { padding: 8px 14px; font-size: 13px; }
    .form-grid { grid-template-columns: 1fr; }
    .form-group.full-width { grid-column: span 1; }
    .form-heading { font-size: 28px; }
  }
</style>
