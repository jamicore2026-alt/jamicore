<script>
  let activeTab = $state('coffee'); // 'coffee', 'spices', 'rice', 'lentils'
  let formSubmitted = $state(false);
  let formData = $state({ name: '', email: '', product: '', message: '' });

  function handleSubmit(e) {
    e.preventDefault();
    formSubmitted = true;
    formData = { name: '', email: '', product: '', message: '' };
    setTimeout(() => formSubmitted = false, 4000);
  }

  function setActiveTab(tab) {
    activeTab = tab;
  }
</script>

<svelte:head>
  <title>Premium Agricultural Trade — Al-Ektefa Group</title>
  <meta name="description" content="Al-Ektefa Group specializes in the trade of premium coffee beans, spices, rice, lentils, and pulses. Sourcing quality commodities globally from our base in Kuwait." />
</svelte:head>

<!-- ============ SECTION 1: HERO ============ -->
<section class="hero trade-hero">
  <div class="hero-container">
    <div class="hero-content">
      <p class="tag">PREMIUM AGRICULTURAL TRADE</p>
      <h1>Where Quality<br />Meets Trust</h1>
      <div class="gold-underline"></div>
      <p class="hero-desc">
        Specializing in the trade of premium coffee beans, spices, rice, lentils, and pulses. 
        Reliable sourcing, consistent quality, and long-term global partnerships — born in Kuwait.
      </p>
      <div class="hero-ctas">
        <a href="#portfolio" class="btn btn-primary">Our Product Families
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
        </a>
        <a href="#contact" class="btn btn-outline">Start an Inquiry</a>
      </div>
    </div>
    <div class="hero-visual">
      <!-- GCC Cityscape/Agricultural theme styled overlay -->
    </div>
  </div>
</section>

<!-- ============ SECTION 2: COMPANY SNAPSHOT ============ -->
<section class="snapshot-section section-padding">
  <div class="container">
    <div class="snapshot-grid">
      <div class="snapshot-left">
        <p class="tag">COMPANY SNAPSHOT</p>
        <h2>Al-Ektefa: A Trusted Partner in Global Food Trade</h2>
        <p class="snapshot-desc">
          Al-Ektefa is a dynamic import and export company specializing in premium agricultural products for international markets, with a focused portfolio designed for buyers who value consistency, quality, and dependable service.
        </p>
        
        <div class="milestone-box">
          <span class="milestone-year">2020</span>
          <p class="milestone-text">Established to connect global supply with customer-focused trading partnerships.</p>
        </div>
      </div>
      
      <div class="snapshot-right">
        <div class="pillar-item">
          <div class="pillar-icon">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--gold)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M12 2L2 7l10 5 10-5-10-5z"/>
              <path d="M2 17l10 5 10-5"/>
              <path d="M2 12l10 5 10-5"/>
            </svg>
          </div>
          <div class="pillar-info">
            <h4>Focused Product Portfolio</h4>
            <p>Coffee beans, spices, rice, lentils, and pulses selected for high market relevance.</p>
          </div>
        </div>
        
        <div class="pillar-item">
          <div class="pillar-icon">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--gold)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="12" r="10"/>
              <line x1="2" y1="12" x2="22" y2="12"/>
              <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
            </svg>
          </div>
          <div class="pillar-info">
            <h4>Global Sourcing Mindset</h4>
            <p>Reliable supplier relationships support product access across international trade channels.</p>
          </div>
        </div>
        
        <div class="pillar-item">
          <div class="pillar-icon">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--gold)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
              <circle cx="9" cy="7" r="4"/>
              <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
              <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
            </svg>
          </div>
          <div class="pillar-info">
            <h4>Customer-Centered Trading</h4>
            <p>Pricing, delivery, and communication are aligned to practical buyer requirements.</p>
          </div>
        </div>
        
        <div class="pillar-item">
          <div class="pillar-icon">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--gold)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
            </svg>
          </div>
          <div class="pillar-info">
            <h4>Built on Trust</h4>
            <p>The company prioritizes transparency, long-term relationships, and service excellence.</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</section>

<!-- ============ SECTION 3: PRODUCT PORTFOLIO ============ -->
<section id="portfolio" class="portfolio-section section-padding bg-alt">
  <div class="container">
    <div class="text-center">
      <p class="tag">PRODUCT PORTFOLIO</p>
      <h2 class="section-title">Four Product Families, One Trade Partner</h2>
      <p class="section-subtitle">Al-Ektefa presents a visual product portfolio across coffee beans, spices, rice, lentils, and pulses for international sourcing discussions.</p>
    </div>

    <!-- TABS CONTROLLER -->
    <div class="portfolio-tabs">
      <button class="tab-btn" class:active={activeTab === 'coffee'} onclick={() => setActiveTab('coffee')}>
        <span class="tab-num">01</span> Coffee Beans
      </button>
      <button class="tab-btn" class:active={activeTab === 'spices'} onclick={() => setActiveTab('spices')}>
        <span class="tab-num">02</span> Spices
      </button>
      <button class="tab-btn" class:active={activeTab === 'rice'} onclick={() => setActiveTab('rice')}>
        <span class="tab-num">03</span> Rice
      </button>
      <button class="tab-btn" class:active={activeTab === 'lentils'} onclick={() => setActiveTab('lentils')}>
        <span class="tab-num">04</span> Lentils & Pulses
      </button>
    </div>

    <!-- TAB PANEL: COFFEE -->
    {#if activeTab === 'coffee'}
      <div class="tab-content reveal-animation">
        <div class="tab-header">
          <h3>Coffee Beans Sourcing</h3>
          <p>Sourcing Arabica and Robusta green coffee beans through a quality-first approach.</p>
        </div>

        <div class="info-split">
          <div class="info-card variant-card">
            <div class="card-tag">VARIETAL 01</div>
            <h4>Arabica for Refined Flavor</h4>
            <p class="variant-desc">Positioned as the premium choice for buyers seeking aroma, clarity, sweetness, and differentiated origin character.</p>
            <div class="spec-grid">
              <div class="spec-item">
                <strong>Origin Character</strong>
                <span>Best suited for roasters who want traceable profiles and distinctive sensory notes.</span>
              </div>
              <div class="spec-item">
                <strong>Specialty Appeal</strong>
                <span>Supports higher-value applications where flavor complexity matters.</span>
              </div>
              <div class="spec-item">
                <strong>Green Bean Options</strong>
                <span>Structured around grade, processing style, and buyer requirements.</span>
              </div>
              <div class="spec-item">
                <strong>Buyer Fit</strong>
                <span>Ideal for specialty roasting, café blends, and selective wholesale.</span>
              </div>
            </div>
          </div>

          <div class="info-card variant-card">
            <div class="card-tag">VARIETAL 02</div>
            <h4>Robusta for Strength & Crema</h4>
            <p class="variant-desc">Presented as a commercially powerful option for buyers who need intensity, structure, and dependable blend performance.</p>
            <div class="spec-grid">
              <div class="spec-item">
                <strong>Blend Backbone</strong>
                <span>Supports espresso blends and value-focused roasting programs.</span>
              </div>
              <div class="spec-item">
                <strong>Strong Cup Impact</strong>
                <span>Delivers body, bitterness balance, and higher perceived intensity.</span>
              </div>
              <div class="spec-item">
                <strong>Practical Supply Fit</strong>
                <span>Useful for instant coffee, foodservice, and wholesale requirements.</span>
              </div>
              <div class="spec-item">
                <strong>Target Buyers</strong>
                <span>Structured for roasters, traders, and commercial buyers.</span>
              </div>
            </div>
          </div>
        </div>

        <!-- COFFEE JOURNEY -->
        <div class="journey-wrapper">
          <h4 class="journey-title">Coffee Sourcing Journey (From Cherry to Green Bean)</h4>
          <div class="journey-steps">
            <div class="journey-step">
              <div class="step-badge">01</div>
              <h5>Coffee Cherries</h5>
              <p>Quality begins with ripe cherries carefully selected at origin.</p>
            </div>
            <div class="journey-step">
              <div class="step-badge">02</div>
              <h5>Farmer Harvesting</h5>
              <p>Farmers and cooperatives shape consistency and grade at the source.</p>
            </div>
            <div class="journey-step">
              <div class="step-badge">03</div>
              <h5>Processing & Fermentation</h5>
              <p>Processing choices influence cup character and buyer preference.</p>
            </div>
            <div class="journey-step">
              <div class="step-badge">04</div>
              <h5>Drying & Green Beans</h5>
              <p>Prepared beans move toward final grading, export, and roasting.</p>
            </div>
          </div>
        </div>
      </div>
    {/if}

    <!-- TAB PANEL: SPICES -->
    {#if activeTab === 'spices'}
      <div class="tab-content reveal-animation">
        <div class="tab-header">
          <h3>Color, Aroma & Everyday Demand</h3>
          <p>Organizing whole, powdered, and blended spices into clear commercial groups for global buyers.</p>
        </div>

        <div class="spices-grid">
          <div class="spice-category">
            <div class="spice-cat-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--gold)" stroke-width="2">
                <circle cx="12" cy="12" r="10"/><path d="M12 8v8M8 12h8"/>
              </svg>
            </div>
            <h4>Whole Spices</h4>
            <p>Distinctive aromatics for restaurants, retail packs, and wholesale trade.</p>
            <ul class="spice-list">
              <li><strong>Aromatic Seeds:</strong> Cumin, fennel, coriander, and related culinary seeds.</li>
              <li><strong>Premium Aromatics:</strong> Cardamom, cloves, cinnamon, black pepper, and bay leaves.</li>
              <li><strong>Chili Products:</strong> Whole red chilies selected for color, heat, and flavor.</li>
            </ul>
          </div>

          <div class="spice-category">
            <div class="spice-cat-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--gold)" stroke-width="2">
                <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
              </svg>
            </div>
            <h4>Powdered Spices</h4>
            <p>Everyday essentials selected for color, freshness, and culinary consistency.</p>
            <ul class="spice-list">
              <li><strong>Essential Powders:</strong> Turmeric, red chili, coriander, and cumin.</li>
              <li><strong>Warm Aromatics:</strong> Black pepper, cinnamon, clove, and cardamom.</li>
              <li><strong>Fresh Processing:</strong> Finely ground under strict hygienic parameters.</li>
            </ul>
          </div>

          <div class="spice-category">
            <div class="spice-cat-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--gold)" stroke-width="2">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
              </svg>
            </div>
            <h4>Masala Blends</h4>
            <p>Practical blended seasoning options that match regular household and foodservice demand.</p>
            <ul class="spice-list">
              <li><strong>Authentic Mixes:</strong> Custom regional masalas for traditional curries and dishes.</li>
              <li><strong>Foodservice Ready:</strong> Bulk packaging tailored for restaurant chains and caterers.</li>
              <li><strong>Consistency:</strong> Rigorous quality assurance to ensure flavor profile replication.</li>
            </ul>
          </div>
        </div>
      </div>
    {/if}

    <!-- TAB PANEL: RICE -->
    {#if activeTab === 'rice'}
      <div class="tab-content reveal-animation">
        <div class="tab-header">
          <h3>Rice for Everyday Markets</h3>
          <p>Providing premium staple grains built around volume, nutrition, and supply chain reliability.</p>
        </div>

        <div class="rice-details-card">
          <div class="rice-img-placeholder">
            <!-- Styling handles background pattern -->
          </div>
          <div class="rice-info">
            <h4>Staple Grains Portfolio</h4>
            <p class="rice-desc">We structure our rice supply to meet diverse regional cooking methods, culinary styles, and commercial price points.</p>
            
            <div class="rice-types">
              <div class="rice-type-item">
                <span class="rice-badge">01</span>
                <div>
                  <h5>Premium Basmati Rice</h5>
                  <p>Aromatic, long-grain, and aged basmati rice ideal for premium retail, catering, and gourmet dining.</p>
                </div>
              </div>
              <div class="rice-type-item">
                <span class="rice-badge">02</span>
                <div>
                  <h5>Long Grain White Rice</h5>
                  <p>High-yield parboiled and raw white rice selected for everyday household and catering volume demand.</p>
                </div>
              </div>
              <div class="rice-type-item">
                <span class="rice-badge">03</span>
                <div>
                  <h5>Parboiled & Specialty Options</h5>
                  <p>Buyer-specific custom specifications matching local culinary preferences across the Gulf and Middle East.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    {/if}

    <!-- TAB PANEL: LENTILS & PULSES -->
    {#if activeTab === 'lentils'}
      <div class="tab-content reveal-animation">
        <div class="tab-header">
          <h3>Lentils, Beans & Staples Portfolio</h3>
          <p>A clear portfolio of dry staples selected for nutritional density and international trade demand.</p>
        </div>

        <div class="pulses-grid">
          <div class="pulse-card">
            <span class="pulse-number">01</span>
            <h4>Lentils & Dal</h4>
            <p>Red lentils, yellow split lentils, moong dal, chana dal, and related staples for households and packers.</p>
          </div>
          
          <div class="pulse-card">
            <span class="pulse-number">02</span>
            <h4>Beans</h4>
            <p>Kidney beans, black beans, white beans, and assorted cooking beans selected for consistency and grading.</p>
          </div>
          
          <div class="pulse-card">
            <span class="pulse-number">03</span>
            <h4>Pulses & Peas</h4>
            <p>Chickpeas, green peas, split peas, and additional pulse categories for food processors and exporters.</p>
          </div>
        </div>
      </div>
    {/if}
  </div>
</section>

<!-- ============ SECTION 4: MISSION & VISION ============ -->
<section class="mission-section section-padding">
  <div class="container">
    <div class="mission-header text-center">
      <p class="tag">VALUES & DIRECTION</p>
      <h2>Driven by Quality, Sustainability and Trust</h2>
      <p class="mission-subtitle">Al-Ektefa’s values are presented as practical commitments that buyers can expect in every relationship.</p>
    </div>

    <div class="mv-boxes">
      <div class="mv-box">
        <div class="mv-title">
          <span class="mv-badge">M</span>
          <h3>Our Mission</h3>
        </div>
        <p>To provide premium agricultural products with quality, sustainability, and customer satisfaction in every transaction.</p>
      </div>

      <div class="mv-box">
        <div class="mv-title">
          <span class="mv-badge">V</span>
          <h3>Our Vision</h3>
        </div>
        <p>To become a leading player in the global trade of rice, coffee beans, and spices by delivering top-notch products and long-term partnerships.</p>
      </div>
    </div>

    <!-- CORE VALUES GRID -->
    <div class="values-grid">
      <div class="value-card">
        <h5>Quality</h5>
        <p>Products selected and supplied with consistent international standards.</p>
      </div>
      <div class="value-card">
        <h5>Sustainability</h5>
        <p>Responsible sourcing with respect for long-term supply chains and farming partners.</p>
      </div>
      <div class="value-card">
        <h5>Integrity</h5>
        <p>Transparent business practices, honest communication, and dependable commitments.</p>
      </div>
      <div class="value-card">
        <h5>Customer Focus</h5>
        <p>Sourcing solutions aligned to client needs, local market regulations, and timelines.</p>
      </div>
      <div class="value-card">
        <h5>Global Network</h5>
        <p>Reliable suppliers and export partners across major agricultural growing regions.</p>
      </div>
    </div>
  </div>
</section>

<!-- ============ SECTION 5: CONTACT & GLOBAL REACH ============ -->
<section id="contact" class="contact-section section-padding bg-alt">
  <div class="container">
    <div class="contact-split">
      <div class="contact-info-block">
        <p class="tag">GLOBAL REACH</p>
        <h2>Ready to Supply International Markets</h2>
        <p class="contact-lead-text">
          Born in Kuwait, Al-Ektefa works with reliable suppliers and partners to serve customers across global food trade channels with a focused product portfolio and responsive business communication.
        </p>

        <div class="reach-features">
          <div class="reach-feature">
            <div class="rf-icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--gold)" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
            </div>
            <div>
              <h6>Global Sourcing Network</h6>
              <p>Reliable partners support access to market-ready agricultural products.</p>
            </div>
          </div>

          <div class="reach-feature">
            <div class="rf-icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--gold)" stroke-width="2"><rect x="1" y="3" width="15" height="13"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>
            </div>
            <div>
              <h6>Timely Delivery Focus</h6>
              <p>Shipment planning is aligned with buyer needs and business timelines.</p>
            </div>
          </div>

          <div class="reach-feature">
            <div class="rf-icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--gold)" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>
            </div>
            <div>
              <h6>Partnership Mindset</h6>
              <p>Open to importers, wholesalers, distributors, retailers, and foodservice clients.</p>
            </div>
          </div>
        </div>

        <div class="official-contacts">
          <h5>For Inquiries & Partnerships</h5>
          <span class="birthplace">COMPANY BIRTHPLACE: KUWAIT</span>
          
          <div class="contact-channels">
            <div class="channel">
              <span class="channel-label">Emails:</span>
              <a href="mailto:info@al-ektefa.com">info@al-ektefa.com</a>
              <a href="mailto:sales@al-ektefa.com">sales@al-ektefa.com</a>
            </div>
            <div class="channel">
              <span class="channel-label">Hotlines:</span>
              <a href="tel:+96555877609">+965 558 77609</a>
              <a href="tel:+96555812616">+965 558 12616</a>
            </div>
          </div>
        </div>
      </div>

      <div class="form-wrapper">
        <p class="tag text-center">MAKE AN INQUIRY</p>
        <h2 class="form-heading text-center">Let's Talk Trade</h2>
        
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
              <input id="name" type="text" required placeholder="Your name" bind:value={formData.name} />
            </div>
            <div class="form-group">
              <label for="email">Email Address *</label>
              <input id="email" type="email" required placeholder="you@company.com" bind:value={formData.email} />
            </div>
            <div class="form-group full-width">
              <label for="product">Product Interest *</label>
              <select id="product" required bind:value={formData.product}>
                <option value="">Select a product family</option>
                <option value="coffee">Coffee Beans (Arabica/Robusta)</option>
                <option value="spices">Spices (Whole/Powders/Blends)</option>
                <option value="rice">Rice (Basmati/Long Grain)</option>
                <option value="lentils">Lentils & Pulses</option>
                <option value="other">Other Sourcing Inquiry</option>
              </select>
            </div>
            <div class="form-group full-width">
              <label for="message">Message</label>
              <textarea id="message" rows="5" placeholder="Specify quantity, grade requirements, and destination port..." bind:value={formData.message}></textarea>
            </div>
          </div>
          <button type="submit" class="btn btn-primary form-submit">Submit Inquiry
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
          </button>
        </form>
      </div>
    </div>
  </div>
</section>

<style>
  .trade-hero {
    min-height: 100vh;
    display: flex;
    align-items: center;
    background: linear-gradient(135deg, #091C11 0%, #112F1F 50%, #081D12 100%);
    position: relative;
    overflow: hidden;
  }
  .hero-container {
    max-width: 1280px;
    margin: 0 auto;
    padding: 0 24px;
    display: grid;
    grid-template-columns: 1.1fr 0.9fr;
    gap: 60px;
    align-items: center;
    width: 100%;
    position: relative;
    z-index: 1;
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
    color: rgba(255, 255, 255, 0.75);
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
    height: 500px;
    background: radial-gradient(circle at center, rgba(201, 168, 76, 0.15) 0%, transparent 70%), url('/hero.png') no-repeat center right;
    background-size: cover;
    border-radius: var(--radius);
    opacity: 0.9;
  }
  .bg-alt {
    background: var(--bg-secondary);
  }

  /* SNAPSHOT SECTION */
  .snapshot-grid {
    display: grid;
    grid-template-columns: 1.1fr 0.9fr;
    gap: 80px;
    align-items: center;
  }
  .snapshot-desc {
    font-size: 16px;
    line-height: 1.8;
    color: var(--text-muted);
    margin-bottom: 32px;
  }
  .milestone-box {
    display: flex;
    align-items: center;
    gap: 24px;
    padding: 24px;
    background: var(--bg-secondary);
    border-left: 4px solid var(--gold);
    border-radius: 0 var(--radius) var(--radius) 0;
  }
  .milestone-year {
    font-family: 'Playfair Display', serif;
    font-size: 40px;
    font-weight: 700;
    color: var(--gold);
  }
  .milestone-text {
    font-size: 14px;
    line-height: 1.6;
    color: var(--navy);
    font-weight: 500;
  }
  .snapshot-right {
    display: flex;
    flex-direction: column;
    gap: 24px;
  }
  .pillar-item {
    display: flex;
    gap: 20px;
    padding: 24px;
    background: var(--bg-primary);
    border: 1px solid rgba(13, 27, 62, 0.05);
    border-radius: var(--radius);
    transition: all var(--transition);
  }
  .pillar-item:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 30px rgba(13, 27, 62, 0.05);
    border-color: rgba(201, 168, 76, 0.2);
  }
  .pillar-icon {
    width: 48px;
    height: 48px;
    background: rgba(201, 168, 76, 0.08);
    border-radius: 12px;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }
  .pillar-info h4 {
    font-size: 16px;
    font-weight: 600;
    color: var(--navy);
    margin-bottom: 4px;
  }
  .pillar-info p {
    font-size: 14px;
    line-height: 1.5;
    color: var(--text-muted);
  }

  /* PORTFOLIO SECTION */
  .section-title {
    font-size: 44px;
    font-weight: 700;
    color: var(--navy);
    margin-bottom: 8px;
  }
  .section-subtitle {
    font-size: 16px;
    color: var(--text-muted);
    max-width: 800px;
    margin: 0 auto 48px;
  }
  .portfolio-tabs {
    display: flex;
    justify-content: center;
    gap: 16px;
    margin-bottom: 48px;
    flex-wrap: wrap;
  }
  .tab-btn {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 14px 28px;
    font-size: 15px;
    font-weight: 600;
    color: var(--text-muted);
    background: var(--bg-primary);
    border: 1px solid rgba(13, 27, 62, 0.06);
    border-radius: 30px;
    transition: all var(--transition);
  }
  .tab-btn:hover {
    color: var(--navy);
    border-color: var(--navy);
  }
  .tab-btn.active {
    background: var(--navy);
    color: var(--white);
    border-color: var(--navy);
    box-shadow: 0 8px 24px rgba(13, 27, 62, 0.15);
  }
  .tab-num {
    font-size: 12px;
    color: var(--gold);
    background: rgba(201, 168, 76, 0.1);
    padding: 2px 6px;
    border-radius: 4px;
  }
  .tab-btn.active .tab-num {
    background: rgba(255, 255, 255, 0.15);
    color: var(--white);
  }
  .tab-content {
    background: var(--bg-primary);
    border-radius: var(--radius);
    padding: 48px;
    border: 1px solid rgba(13, 27, 62, 0.05);
    box-shadow: 0 10px 40px rgba(13, 27, 62, 0.03);
  }
  .tab-header {
    margin-bottom: 36px;
    border-bottom: 1px solid rgba(13, 27, 62, 0.06);
    padding-bottom: 24px;
  }
  .tab-header h3 {
    font-size: 28px;
    font-weight: 700;
    color: var(--navy);
    margin-bottom: 6px;
  }
  .tab-header p {
    font-size: 15px;
    color: var(--text-muted);
  }
  .reveal-animation {
    animation: fadeIn 0.4s ease-in-out;
  }
  @keyframes fadeIn {
    from { opacity: 0; transform: translateY(10px); }
    to { opacity: 1; transform: translateY(0); }
  }

  /* COFFEE STYLES */
  .info-split {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 32px;
    margin-bottom: 48px;
  }
  .variant-card {
    padding: 32px;
    border: 1px solid rgba(13, 27, 62, 0.06);
    border-radius: var(--radius);
    background: var(--bg-secondary);
  }
  .card-tag {
    font-size: 11px;
    font-weight: 700;
    color: var(--gold);
    letter-spacing: 2px;
    margin-bottom: 8px;
  }
  .variant-card h4 {
    font-size: 22px;
    font-weight: 700;
    color: var(--navy);
    margin-bottom: 12px;
  }
  .variant-desc {
    font-size: 14px;
    line-height: 1.6;
    color: var(--text-muted);
    margin-bottom: 24px;
  }
  .spec-grid {
    display: grid;
    grid-template-columns: 1fr;
    gap: 16px;
  }
  .spec-item {
    display: flex;
    flex-direction: column;
    gap: 4px;
    font-size: 13px;
  }
  .spec-item strong {
    color: var(--navy);
    font-weight: 600;
  }
  .spec-item span {
    color: var(--text-muted);
  }

  /* JOURNEY STYLES */
  .journey-wrapper {
    background: var(--bg-secondary);
    padding: 36px;
    border-radius: var(--radius);
    border: 1px solid rgba(13, 27, 62, 0.05);
  }
  .journey-title {
    font-size: 18px;
    font-weight: 700;
    color: var(--navy);
    margin-bottom: 28px;
    text-align: center;
  }
  .journey-steps {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 24px;
    position: relative;
  }
  .journey-step {
    text-align: center;
    position: relative;
  }
  .step-badge {
    width: 44px;
    height: 44px;
    border-radius: 50%;
    background: var(--navy);
    color: var(--white);
    font-family: 'Playfair Display', serif;
    font-size: 18px;
    font-weight: 700;
    display: flex;
    align-items: center;
    justify-content: center;
    margin: 0 auto 16px;
    border: 2px solid var(--gold);
  }
  .journey-step h5 {
    font-size: 15px;
    font-weight: 600;
    color: var(--navy);
    margin-bottom: 8px;
  }
  .journey-step p {
    font-size: 12px;
    line-height: 1.5;
    color: var(--text-muted);
  }

  /* SPICES STYLES */
  .spices-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 28px;
  }
  .spice-category {
    background: var(--bg-secondary);
    padding: 36px 28px;
    border-radius: var(--radius);
    border: 1px solid rgba(13, 27, 62, 0.05);
  }
  .spice-cat-icon {
    width: 48px;
    height: 48px;
    background: rgba(201, 168, 76, 0.08);
    border-radius: 12px;
    display: flex;
    align-items: center;
    justify-content: center;
    margin-bottom: 20px;
  }
  .spice-category h4 {
    font-size: 20px;
    font-weight: 700;
    color: var(--navy);
    margin-bottom: 8px;
  }
  .spice-category p {
    font-size: 13px;
    color: var(--text-muted);
    margin-bottom: 20px;
  }
  .spice-list {
    list-style: none;
    display: flex;
    flex-direction: column;
    gap: 12px;
  }
  .spice-list li {
    font-size: 13px;
    line-height: 1.5;
    color: var(--text-muted);
    padding-left: 14px;
    position: relative;
  }
  .spice-list li::before {
    content: '';
    position: absolute;
    left: 0; top: 7px;
    width: 6px; height: 6px;
    border-radius: 50%;
    background: var(--gold);
  }

  /* RICE STYLES */
  .rice-details-card {
    display: grid;
    grid-template-columns: 0.8fr 1.2fr;
    gap: 48px;
    align-items: center;
  }
  .rice-img-placeholder {
    height: 350px;
    background: linear-gradient(135deg, rgba(201, 168, 76, 0.15) 0%, rgba(13, 27, 62, 0.08) 100%),
                repeating-linear-gradient(45deg, transparent, transparent 10px, rgba(201, 168, 76, 0.05) 10px, rgba(201, 168, 76, 0.05) 11px);
    border-radius: var(--radius);
    border: 1px solid rgba(13, 27, 62, 0.05);
  }
  .rice-info h4 {
    font-size: 22px;
    font-weight: 700;
    color: var(--navy);
    margin-bottom: 12px;
  }
  .rice-desc {
    font-size: 15px;
    color: var(--text-muted);
    margin-bottom: 24px;
  }
  .rice-types {
    display: flex;
    flex-direction: column;
    gap: 20px;
  }
  .rice-type-item {
    display: flex;
    gap: 16px;
  }
  .rice-badge {
    width: 32px;
    height: 32px;
    background: rgba(201, 168, 76, 0.1);
    color: var(--gold);
    font-family: 'Playfair Display', serif;
    font-size: 14px;
    font-weight: 700;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 8px;
    flex-shrink: 0;
    margin-top: 2px;
  }
  .rice-type-item h5 {
    font-size: 15px;
    font-weight: 600;
    color: var(--navy);
    margin-bottom: 4px;
  }
  .rice-type-item p {
    font-size: 13px;
    color: var(--text-muted);
  }

  /* PULSES STYLES */
  .pulses-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 28px;
  }
  .pulse-card {
    background: var(--bg-secondary);
    padding: 40px 32px;
    border-radius: var(--radius);
    border: 1px solid rgba(13, 27, 62, 0.05);
    text-align: left;
    transition: all var(--transition);
  }
  .pulse-card:hover {
    transform: translateY(-4px);
    border-color: rgba(201, 168, 76, 0.2);
  }
  .pulse-number {
    font-family: 'Playfair Display', serif;
    font-size: 32px;
    font-weight: 700;
    color: var(--gold);
    display: block;
    margin-bottom: 16px;
  }
  .pulse-card h4 {
    font-size: 20px;
    font-weight: 700;
    color: var(--navy);
    margin-bottom: 8px;
  }
  .pulse-card p {
    font-size: 14px;
    line-height: 1.6;
    color: var(--text-muted);
  }

  /* MISSION SECTION */
  .mission-header h2 {
    font-size: 40px;
    font-weight: 700;
    color: var(--navy);
    margin-bottom: 8px;
  }
  .mission-subtitle {
    font-size: 16px;
    color: var(--text-muted);
    max-width: 700px;
    margin: 0 auto 48px;
  }
  .mv-boxes {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 32px;
    margin-bottom: 48px;
  }
  .mv-box {
    background: var(--bg-secondary);
    padding: 36px;
    border-radius: var(--radius);
    border: 1px solid rgba(13, 27, 62, 0.05);
  }
  .mv-title {
    display: flex;
    align-items: center;
    gap: 16px;
    margin-bottom: 16px;
  }
  .mv-badge {
    width: 36px;
    height: 36px;
    background: var(--navy);
    color: var(--white);
    font-family: 'Playfair Display', serif;
    font-size: 18px;
    font-weight: 700;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 8px;
  }
  .mv-box h3 {
    font-size: 20px;
    font-weight: 700;
    color: var(--navy);
  }
  .mv-box p {
    font-size: 15px;
    line-height: 1.6;
    color: var(--text-muted);
  }
  .values-grid {
    display: grid;
    grid-template-columns: repeat(5, 1fr);
    gap: 20px;
  }
  .value-card {
    text-align: center;
    padding: 24px 16px;
    background: var(--bg-primary);
    border: 1px solid rgba(13, 27, 62, 0.05);
    border-radius: var(--radius);
  }
  .value-card h5 {
    font-size: 16px;
    font-weight: 600;
    color: var(--navy);
    margin-bottom: 8px;
  }
  .value-card p {
    font-size: 12px;
    line-height: 1.5;
    color: var(--text-muted);
  }

  /* CONTACT SPLIT */
  .contact-split {
    display: grid;
    grid-template-columns: 1.1fr 0.9fr;
    gap: 60px;
    align-items: flex-start;
  }
  .contact-info-block h2 {
    font-size: 40px;
    font-weight: 700;
    color: var(--navy);
    margin-bottom: 16px;
    line-height: 1.2;
  }
  .contact-lead-text {
    font-size: 16px;
    line-height: 1.7;
    color: var(--text-muted);
    margin-bottom: 36px;
  }
  .reach-features {
    display: flex;
    flex-direction: column;
    gap: 24px;
    margin-bottom: 40px;
  }
  .reach-feature {
    display: flex;
    gap: 16px;
  }
  .rf-icon {
    width: 40px;
    height: 40px;
    background: rgba(201, 168, 76, 0.08);
    border-radius: 10px;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    color: var(--gold);
  }
  .reach-feature h6 {
    font-size: 15px;
    font-weight: 600;
    color: var(--navy);
    margin-bottom: 4px;
  }
  .reach-feature p {
    font-size: 13px;
    color: var(--text-muted);
  }
  .official-contacts {
    background: var(--navy);
    padding: 32px;
    border-radius: var(--radius);
    color: var(--white);
    border: 1px solid rgba(201, 168, 76, 0.15);
  }
  .official-contacts h5 {
    font-size: 18px;
    font-weight: 700;
    color: var(--white);
    margin-bottom: 4px;
  }
  .birthplace {
    font-size: 11px;
    font-weight: 700;
    color: var(--gold);
    letter-spacing: 2px;
    display: block;
    margin-bottom: 24px;
  }
  .contact-channels {
    display: flex;
    flex-direction: column;
    gap: 20px;
  }
  .channel {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }
  .channel-label {
    font-size: 12px;
    font-weight: 700;
    color: var(--gold);
    text-transform: uppercase;
    letter-spacing: 1px;
  }
  .channel a {
    font-size: 14px;
    color: rgba(255, 255, 255, 0.85);
    transition: color var(--transition);
  }
  .channel a:hover {
    color: var(--gold-light);
  }

  @media (max-width: 1024px) {
    .values-grid {
      grid-template-columns: repeat(3, 1fr);
    }
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
    .snapshot-grid { grid-template-columns: 1fr; gap: 40px; }
    .snapshot-left h2 { font-size: 30px; }
    .section-title { font-size: 32px; }
    .tab-btn { padding: 10px 16px; font-size: 13px; }
    .info-split { grid-template-columns: 1fr; }
    .journey-steps { grid-template-columns: 1fr; gap: 28px; }
    .spices-grid { grid-template-columns: 1fr; }
    .rice-details-card { grid-template-columns: 1fr; gap: 24px; }
    .pulses-grid { grid-template-columns: 1fr; }
    .mission-header h2 { font-size: 30px; }
    .mv-boxes { grid-template-columns: 1fr; }
    .values-grid { grid-template-columns: 1fr; }
    .contact-split { grid-template-columns: 1fr; gap: 40px; }
    .contact-info-block h2 { font-size: 30px; }
  }
</style>
