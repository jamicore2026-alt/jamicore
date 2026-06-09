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
  <title>Premium Agricultural Trade — Al-Ektefa Group</title>
  <meta name="description" content="Al-Ektefa Group specializes in the trade of premium coffee beans, spices, rice, lentils, and pulses. Sourcing quality commodities globally from our base in Kuwait." />
</svelte:head>

<!-- ============ SLIDE 1: HERO (PDF Page 1) ============ -->
<section class="slide-section slide-light">
  <div class="slide-container hero-slide-grid">
    <div class="slide-content">
      <span class="slide-tag gold-text">PREMIUM AGRICULTURAL TRADE</span>
      <h1 class="hero-title">Where Quality<br />Meets Trust</h1>
      <div class="title-divider"></div>
      <p class="hero-intro-text">
        Specializing in the trade of premium coffee beans, spices, rice, lentils, and pulses.
      </p>
      <div class="slide-meta">
        <strong>COMPANY PROFILE</strong>
        <span class="meta-separator">|</span>
        <span class="gold-text">BORN IN KUWAIT</span>
      </div>
      <div class="hero-actions">
        <a href="#slide-2" class="btn btn-primary">View Company Snapshot</a>
      </div>
    </div>
    
    <div class="hero-visual-circles">
      <div class="circle-main">
        <div class="circle-overlay circle-coffee">
          <span>Coffee<br />Beans</span>
        </div>
        <div class="circle-overlay circle-spices">
          <span>Spices</span>
        </div>
        <div class="circle-overlay circle-pulses">
          <span>Rice &<br />Pulses</span>
        </div>
      </div>
    </div>
  </div>
  <div class="slide-footer-strip">
    <span>RELIABLE SOURCING • CONSISTENT QUALITY • GLOBAL PARTNERSHIPS</span>
  </div>
</section>

<!-- ============ SLIDE 2: SNAPSHOT (PDF Page 2) ============ -->
<section id="slide-2" class="slide-section slide-bg-secondary">
  <div class="slide-container split-grid-50">
    <div class="snapshot-left">
      <span class="slide-tag">COMPANY SNAPSHOT</span>
      <h2>Al-Ektefa: A Trusted Partner<br />in Global Food Trade</h2>
      <p class="snapshot-text">
        Al-Ektefa is a dynamic import and export company specializing in premium agricultural products for international markets, with a focused portfolio designed for buyers who value consistency, quality, and dependable service.
      </p>
      <div class="snapshot-milestone">
        <span class="milestone-num">2020</span>
        <p>Established to connect global supply with customer-focused trading partnerships.</p>
      </div>
    </div>
    
    <div class="snapshot-right pillars-stack">
      <div class="pillar-box">
        <div class="pillar-icon-box">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>
        </div>
        <div class="pillar-content">
          <h4>Focused Product Portfolio</h4>
          <p>Coffee beans, spices, rice, lentils, and pulses selected for high market relevance.</p>
        </div>
      </div>

      <div class="pillar-box">
        <div class="pillar-icon-box">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
        </div>
        <div class="pillar-content">
          <h4>Global Sourcing Mindset</h4>
          <p>Reliable supplier relationships support product access across international trade channels.</p>
        </div>
      </div>

      <div class="pillar-box">
        <div class="pillar-icon-box">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
        </div>
        <div class="pillar-content">
          <h4>Customer-Centered Trading</h4>
          <p>Pricing, delivery, and communication are aligned to practical buyer requirements.</p>
        </div>
      </div>

      <div class="pillar-box">
        <div class="pillar-icon-box">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
        </div>
        <div class="pillar-content">
          <h4>Built on Trust</h4>
          <p>The company prioritizes transparency, long-term relationships, and service excellence.</p>
        </div>
      </div>
    </div>
  </div>
</section>

<!-- ============ SLIDE 3: PRODUCT FAMILIES (PDF Page 3) ============ -->
<section class="slide-section slide-light">
  <div class="slide-container">
    <div class="text-center slide-header-margin">
      <span class="slide-tag">PORTFOLIO OVERVIEW</span>
      <h2>Four Product Families, One Trade Partner</h2>
      <p class="slide-subtitle">Al-Ektefa presents a visual product portfolio across coffee beans, spices, rice, lentils and pulses for international sourcing discussions.</p>
    </div>

    <div class="product-families-grid">
      <!-- 01: Coffee Beans -->
      <div class="family-panel">
        <div class="family-visual visual-coffee"></div>
        <div class="family-text-block">
          <span class="family-number">01</span>
          <h3>Coffee Beans</h3>
          <p>Arabica, Robusta, green beans and origin-based sourcing conversations.</p>
        </div>
      </div>

      <!-- 02: Spices -->
      <div class="family-panel">
        <div class="family-visual visual-spices"></div>
        <div class="family-text-block">
          <span class="family-number">02</span>
          <h3>Spices</h3>
          <p>Whole spices, powdered spices and masala blends with clear category visuals.</p>
        </div>
      </div>

      <!-- 03: Rice -->
      <div class="family-panel">
        <div class="family-visual visual-rice"></div>
        <div class="family-text-block">
          <span class="family-number">03</span>
          <h3>Rice</h3>
          <p>Basmati, long grain, parboiled and other staple rice options.</p>
        </div>
      </div>

      <!-- 04: Lentils & Pulses -->
      <div class="family-panel">
        <div class="family-visual visual-lentils"></div>
        <div class="family-text-block">
          <span class="family-number">04</span>
          <h3>Lentils & Pulses</h3>
          <p>Beans, lentils, chickpeas, peas and everyday cooking staples.</p>
        </div>
      </div>
    </div>
  </div>
  <div class="slide-footer-strip gold-bg">
    <span class="navy-text font-bold">AL-EKTEFA | COFFEE, SPICES, RICE, LENTILS AND PULSES PRESENTED IN A TRUE SLIDE STYLE</span>
  </div>
</section>

<!-- ============ SLIDE 4: COFFEE JOURNEY (PDF Page 4) ============ -->
<section class="slide-section slide-light no-padding-bottom">
  <div class="slide-container split-grid-40-60">
    <div class="navy-panel-dark">
      <span class="slide-tag gold-text">COFFEE BEAN STORY</span>
      <h2 class="white-text">From Cherry to<br />Green Bean</h2>
      <p class="white-text-muted">
        Al-Ektefa presents coffee as a complete sourcing journey: careful cherry selection, farm-level handling, controlled processing, and green beans prepared for roasters and traders.
      </p>
      <div class="panel-bottom-strip">
        <span class="gold-text font-bold text-xs">BETTER VISUALS. CLEARER STORY. STRONGER BUYER CONFIDENCE.</span>
      </div>
    </div>

    <div class="journey-content-panel">
      <div class="journey-header-row">
        <h3>A visual coffee process that explains quality before the product list begins.</h3>
        <span class="btn-origin-pill">ORIGIN TO EXPORT</span>
      </div>

      <div class="journey-2x2-grid">
        <div class="journey-process-box">
          <div class="process-img img-cherry"></div>
          <div class="process-text">
            <strong>01. Coffee Cherries</strong>
            <p>Quality begins with ripe cherries selected at origin.</p>
          </div>
        </div>

        <div class="journey-process-box">
          <div class="process-img img-farmer"></div>
          <div class="process-text">
            <strong>02. Farmer Harvesting</strong>
            <p>Farmers and cooperatives shape consistency at the source.</p>
          </div>
        </div>

        <div class="journey-process-box">
          <div class="process-img img-ferment"></div>
          <div class="process-text">
            <strong>03. Processing & Fermentation</strong>
            <p>Processing choices influence cup character and buyer preference.</p>
          </div>
        </div>

        <div class="journey-process-box">
          <div class="process-img img-drying"></div>
          <div class="process-text">
            <strong>04. Drying & Green Beans</strong>
            <p>Prepared beans move toward grading, export, and roasting.</p>
          </div>
        </div>
      </div>
    </div>
  </div>
  <div class="slide-footer-strip">
    <span>AL-EKTEFA IMPORT & EXPORT | COFFEE BEANS, SPICES, RICE, LENTILS AND PULSES</span>
  </div>
</section>

<!-- ============ SLIDE 5: ARABICA PROFILE (PDF Page 5) ============ -->
<section class="slide-section slide-light">
  <div class="slide-container split-grid-50 align-center">
    <div class="visual-gallery">
      <div class="gallery-large large-arabica"></div>
      <div class="gallery-row">
        <div class="gallery-small small-arabica-1"></div>
        <div class="gallery-small small-arabica-2"></div>
      </div>
    </div>

    <div class="slide-info-panel">
      <span class="slide-tag">COFFEE BEANS PORTFOLIO</span>
      <h2>Arabica for Refined Flavor Profiles</h2>
      <p class="lead-desc">
        Al-Ektefa positions Arabica as the premium choice for buyers seeking aroma, clarity, sweetness, and differentiated origin character.
      </p>

      <div class="specs-2x2-grid">
        <div class="spec-card">
          <h5>Origin Character</h5>
          <p>Best suited for roasters who want traceable profiles and distinctive sensory notes.</p>
        </div>

        <div class="spec-card">
          <h5>Specialty Appeal</h5>
          <p>Supports higher-value applications where flavor complexity matters more than intensity.</p>
        </div>

        <div class="spec-card">
          <h5>Green Bean Options</h5>
          <p>Available discussions can be structured around grade, processing style, and buyer requirements.</p>
        </div>

        <div class="spec-card">
          <h5>Buyer Fit</h5>
          <p>Ideal for specialty roasting, café blends, premium private labels, and selective wholesale channels.</p>
        </div>
      </div>
    </div>
  </div>
  <div class="slide-footer-strip navy-bg">
    <span class="gold-text font-bold">AL-EKTEFA SUPPLIES ARABICA WITH A QUALITY-FIRST SOURCING APPROACH</span>
  </div>
</section>

<!-- ============ SLIDE 6: ROBUSTA PROFILE (PDF Page 6) ============ -->
<section class="slide-section slide-light no-padding-bottom">
  <div class="slide-container split-grid-40-60 align-center">
    <div class="navy-panel-dark flex-column justify-between">
      <div>
        <span class="slide-tag gold-text">COFFEE BEANS PORTFOLIO</span>
        <h2 class="white-text">Robusta for Strength, Body and Crema</h2>
        <p class="white-text-muted">
          Al-Ektefa presents Robusta as a commercially powerful option for buyers who need intensity, structure, and dependable blend performance.
        </p>
      </div>

      <div class="specs-vertical-stack">
        <div class="stack-item">
          <span class="stack-num">01</span>
          <div>
            <h5 class="white-text">Blend Backbone</h5>
            <p class="white-text-muted">Supports espresso blends and value-focused roasting programs.</p>
          </div>
        </div>

        <div class="stack-item">
          <span class="stack-num">02</span>
          <div>
            <h5 class="white-text">Strong Cup Impact</h5>
            <p class="white-text-muted">Delivers body, bitterness balance, and higher perceived intensity.</p>
          </div>
        </div>

        <div class="stack-item">
          <span class="stack-num">03</span>
          <div>
            <h5 class="white-text">Practical Supply Fit</h5>
            <p class="white-text-muted">Useful for instant coffee, foodservice, and wholesale requirements.</p>
          </div>
        </div>
      </div>
    </div>

    <div class="visual-gallery">
      <div class="gallery-large large-robusta"></div>
      <div class="gallery-row">
        <div class="gallery-small small-robusta-1"></div>
        <div class="gallery-small small-robusta-2"></div>
      </div>
      <div class="gallery-caption">
        <strong>GREEN COFFEE SELECTION</strong>
        <span>Structured for roasters, traders, and commercial buyers.</span>
      </div>
    </div>
  </div>
  <div class="slide-footer-strip">
    <span>AL-EKTEFA IMPORT & EXPORT | COFFEE BEANS, SPICES, RICE, LENTILS AND PULSES</span>
  </div>
</section>

<!-- ============ SLIDE 7: SPICES OVERVIEW (PDF Page 7) ============ -->
<section class="slide-section slide-light no-padding-bottom">
  <div class="slide-container split-grid-40-60 align-stretch">
    <div class="navy-panel-dark flex-column justify-between">
      <div>
        <span class="slide-tag gold-text">SPICE COLLECTION</span>
        <h2 class="white-text">Color, Aroma and Everyday Demand</h2>
        <p class="white-text-muted">
          Al-Ektefa brings spices into the presentation as a clear product family: whole spices, powdered spices, and masala blends.
        </p>
      </div>

      <div class="panel-pill-holder">
        <span class="pill-outline">WHOLE | POWDERED | BLENDED</span>
      </div>
    </div>

    <div class="spices-display-container">
      <div class="spice-hero-img"></div>
      
      <div class="spices-3-cols">
        <div class="spice-col-card">
          <div class="col-img img-spice-whole"></div>
          <div class="col-text">
            <h5>Whole Spices</h5>
            <p>Distinctive aromatics for restaurants, retail packs, and wholesale trade.</p>
          </div>
        </div>

        <div class="spice-col-card">
          <div class="col-img img-spice-powder"></div>
          <div class="col-text">
            <h5>Powdered Spices</h5>
            <p>Everyday essentials selected for color, freshness, and culinary consistency.</p>
          </div>
        </div>

        <div class="spice-col-card">
          <div class="col-img img-spice-blend"></div>
          <div class="col-text">
            <h5>Masala Blends</h5>
            <p>Practical blended options that match regular household and foodservice demand.</p>
          </div>
        </div>
      </div>
    </div>
  </div>
  <div class="slide-footer-strip">
    <span>AL-EKTEFA IMPORT & EXPORT | SPICE SOURCING FOR INTERNATIONAL MARKETS</span>
  </div>
</section>

<!-- ============ SLIDE 8: WHOLE SPICES (PDF Page 8) ============ -->
<section class="slide-section slide-light">
  <div class="slide-container split-grid-50 align-center">
    <div class="slide-info-panel">
      <span class="slide-tag">WHOLE SPICE RANGE</span>
      <h2>Distinctive Aroma in Every Whole Spice</h2>
      <p class="lead-desc">
        Al-Ektefa organizes whole spices into clear commercial groups so buyers can understand the range quickly and select products with confidence.
      </p>

      <div class="specs-2x2-grid">
        <div class="spec-card navy-bg-light">
          <h5 class="gold-text">Aromatic Seeds</h5>
          <p class="white-text-muted">Cumin, fennel, coriander and similar seeds for everyday culinary demand.</p>
        </div>

        <div class="spec-card navy-bg-light">
          <h5 class="gold-text">Premium Aromatics</h5>
          <p class="white-text-muted">Cardamom, cloves, cinnamon, black pepper and bay leaves.</p>
        </div>

        <div class="spec-card navy-bg-light">
          <h5 class="gold-text">Chili Products</h5>
          <p class="white-text-muted">Whole red chilies and chili varieties for color, heat, and flavor impact.</p>
        </div>

        <div class="spec-card navy-bg-light">
          <h5 class="gold-text">Trade Supply</h5>
          <p class="white-text-muted">Suitable for distributors, processors, retailers, and foodservice buyers.</p>
        </div>
      </div>
    </div>

    <div class="visual-gallery">
      <div class="gallery-large large-spices-plate"></div>
      <div class="gallery-row">
        <div class="gallery-small small-spices-1"></div>
        <div class="gallery-small small-spices-2"></div>
      </div>
    </div>
  </div>
  <div class="slide-footer-strip gold-bg">
    <span class="navy-text font-bold">AL-EKTEFA | WHOLE SPICE PORTFOLIO FOR GLOBAL BUYERS</span>
  </div>
</section>

<!-- ============ SLIDE 9: POWDERED SPICES & MASALAS (PDF Page 9) ============ -->
<section class="slide-section slide-navy-full">
  <div class="slide-container">
    <div class="text-center slide-header-margin">
      <span class="slide-tag gold-text">POWDERS & MASALAS</span>
      <h2 class="white-text">Ready-to-Use Spice Products for Daily Demand</h2>
      <p class="white-text-muted max-w-xl">
        Al-Ektefa presents powdered spices and masala blends as practical, high-turnover products for retailers, foodservice buyers, distributors, and processors.
      </p>
    </div>

    <div class="spice-products-3-grid">
      <div class="product-item-card">
        <div class="product-item-img img-powders-essential"></div>
        <div class="product-item-desc">
          <h4>Essential Powders</h4>
          <p>Turmeric, red chili, coriander, cumin and other everyday spice powders.</p>
          <span class="product-item-tag">COLOR + FRESHNESS</span>
        </div>
      </div>

      <div class="product-item-card">
        <div class="product-item-img img-powders-warm"></div>
        <div class="product-item-desc">
          <h4>Warm Spice Powders</h4>
          <p>Black pepper, cinnamon, clove, cardamom and related aromatic powders.</p>
          <span class="product-item-tag">AROMA + DEPTH</span>
        </div>
      </div>

      <div class="product-item-card">
        <div class="product-item-img img-powders-masalas"></div>
        <div class="product-item-desc">
          <h4>Masala Blends</h4>
          <p>Blended seasoning options for daily household cooking and foodservice menus.</p>
          <span class="product-item-tag">CONVENIENCE + TASTE</span>
        </div>
      </div>
    </div>
  </div>
  <div class="slide-footer-strip gold-bg">
    <span class="navy-text font-bold">AL-EKTEFA | SPICE PRODUCTS PRESENTED WITH CLEAR CATEGORIES AND STRONG VISUALS</span>
  </div>
</section>

<!-- ============ SLIDE 10: RICE, LENTILS & PULSES (PDF Page 10) ============ -->
<section class="slide-section slide-light">
  <div class="slide-container split-grid-50 align-center">
    <div class="slide-info-panel">
      <span class="slide-tag">STAPLE FOODS</span>
      <h2>Rice, Lentils and Pulses for Everyday Markets</h2>
      <p class="lead-desc">
        Al-Ektefa presents staple foods as dependable, high-demand products that support households, retailers, wholesalers, and foodservice channels.
      </p>
      
      <div class="core-products-navy-box">
        <span class="box-tag">CORE PRODUCTS BUILT AROUND</span>
        <h3>NUTRITION, VOLUME AND RELIABILITY</h3>
      </div>
    </div>

    <div class="visual-gallery">
      <div class="gallery-large large-staples-bag"></div>
      <div class="gallery-row">
        <div class="gallery-small small-staples-1"></div>
        <div class="gallery-small small-staples-2"></div>
      </div>
    </div>
  </div>
  <div class="slide-footer-strip">
    <span>AL-EKTEFA | RICE, LENTILS, BEANS AND PULSES PORTFOLIO</span>
  </div>
</section>

<!-- ============ SLIDE 11: STAPLES PORTFOLIO (PDF Page 11) ============ -->
<section class="slide-section slide-navy-full">
  <div class="slide-container">
    <div class="text-center slide-header-margin">
      <span class="slide-tag gold-text">RICE, LENTILS AND PULSES</span>
      <h2 class="white-text">A Clear Portfolio for Everyday Food Supply</h2>
    </div>

    <div class="staples-portfolio-2x2">
      <!-- 01 Rice -->
      <div class="staple-panel-card">
        <div class="staple-card-img img-staple-rice"></div>
        <div class="staple-card-text">
          <span class="staple-card-num">01</span>
          <h4>Rice</h4>
          <p>Basmati, long grain, parboiled and other buyer specific rice options.</p>
        </div>
      </div>

      <!-- 02 Lentils & Dal -->
      <div class="staple-panel-card">
        <div class="staple-card-img img-staple-lentils"></div>
        <div class="staple-card-text">
          <span class="staple-card-num">02</span>
          <h4>Lentils & Dal</h4>
          <p>Red lentils, yellow split lentils, moong dal, chana dal and related staples.</p>
        </div>
      </div>

      <!-- 03 Beans -->
      <div class="staple-panel-card">
        <div class="staple-card-img img-staple-beans"></div>
        <div class="staple-card-text">
          <span class="staple-card-num">03</span>
          <h4>Beans</h4>
          <p>Kidney beans, black beans, white beans and assorted cooking beans.</p>
        </div>
      </div>

      <!-- 04 Pulses & Peas -->
      <div class="staple-panel-card">
        <div class="staple-card-img img-staple-pulses"></div>
        <div class="staple-card-text">
          <span class="staple-card-num">04</span>
          <h4>Pulses & Peas</h4>
          <p>Chickpeas, green peas, split peas and additional pulse categories.</p>
        </div>
      </div>
    </div>
  </div>
  <div class="slide-footer-strip gold-bg">
    <span class="navy-text font-bold">AL-EKTEFA | ORGANIZED SUPPLY CATEGORIES FOR WHOLESALE AND EXPORT DISCUSSIONS</span>
  </div>
</section>

<!-- ============ SLIDE 12: MISSION, VISION & VALUES (PDF Page 12) ============ -->
<section class="slide-section slide-light">
  <div class="slide-container split-grid-40-60 align-stretch">
    <div class="navy-panel-dark flex-column justify-between">
      <div>
        <span class="slide-tag gold-text">MISSION & VISION</span>
        <h2 class="white-text">Driven by Quality, Sustainability and Trust</h2>
      </div>

      <div class="mv-block-stack">
        <div class="mv-block-item">
          <h4 class="gold-text">MISSION</h4>
          <p class="white-text-muted">To provide premium agricultural products with quality, sustainability, and customer satisfaction in every transaction.</p>
        </div>
        
        <div class="mv-block-item">
          <h4 class="gold-text">VISION</h4>
          <p class="white-text-muted">To become a leading player in the global trade of rice, coffee beans, and spices by delivering top-notch products and long-term partnerships.</p>
        </div>
      </div>
    </div>

    <div class="values-list-panel">
      <h3>Al-Ektefa’s values are presented as practical commitments that buyers can expect in every business relationship.</h3>
      
      <div class="values-divider-list">
        <div class="value-row-item">
          <strong>QUALITY</strong>
          <span>Products selected and supplied with consistent standards.</span>
        </div>

        <div class="value-row-item">
          <strong>SUSTAINABILITY</strong>
          <span>Responsible sourcing with respect for long-term supply chains.</span>
        </div>

        <div class="value-row-item">
          <strong>INTEGRITY</strong>
          <span>Transparent business practices and dependable commitments.</span>
        </div>

        <div class="value-row-item">
          <strong>CUSTOMER FOCUS</strong>
          <span>Solutions aligned to client needs, markets, and timelines.</span>
        </div>

        <div class="value-row-item">
          <strong>GLOBAL NETWORK</strong>
          <span>Reliable suppliers and partners across international markets.</span>
        </div>
      </div>
    </div>
  </div>
</section>

<!-- ============ SLIDE 13: GLOBAL REACH & FORM (PDF Page 13) ============ -->
<section id="contact" class="slide-section slide-light">
  <div class="slide-container split-grid-50 align-stretch">
    <div class="global-reach-contacts">
      <span class="slide-tag">GLOBAL REACH</span>
      <h2>Ready to Supply International Markets</h2>
      <p class="reach-desc">
        Born in Kuwait, Al-Ektefa works with reliable suppliers and partners to serve customers across global food trade channels with a focused product portfolio and responsive business communication.
      </p>

      <div class="reach-3-bullets">
        <div class="bullet-item">
          <div class="bullet-icon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
          </div>
          <div>
            <strong>Global Sourcing Network</strong>
            <p>Reliable partners support access to market-ready agricultural products.</p>
          </div>
        </div>

        <div class="bullet-item">
          <div class="bullet-icon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="1" y="3" width="15" height="13"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>
          </div>
          <div>
            <strong>Timely Delivery Focus</strong>
            <p>Shipment planning is aligned with buyer needs and business timelines.</p>
          </div>
        </div>

        <div class="bullet-item">
          <div class="bullet-icon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>
          </div>
          <div>
            <strong>Partnership Mindset</strong>
            <p>Open to importers, wholesalers, distributors, retailers, and food-service clients.</p>
          </div>
        </div>
      </div>

      <div class="inquiry-info-box">
        <h4>For Inquiries and Partnerships</h4>
        <span class="office-tag">COMPANY BIRTHPLACE: KUWAIT</span>
        <div class="inquiry-channels">
          <div class="ch-block">
            <strong>Emails:</strong>
            <a href="mailto:info@al-ektefa.com">info@al-ektefa.com</a>
            <a href="mailto:finance@al-ektefa.com">finance@al-ektefa.com</a>
            <a href="mailto:sales@al-ektefa.com">sales@al-ektefa.com</a>
          </div>
          <div class="ch-block">
            <strong>Hotlines:</strong>
            <a href="tel:+96555877609">+965 558 77609</a>
            <a href="tel:+96555812616">+965 558 12616</a>
          </div>
        </div>
      </div>
    </div>

    <!-- Web Inquiry Form Card -->
    <div class="form-wrapper-slide">
      <span class="form-tag">SUBMIT AN INQUIRY</span>
      <h3>Let's Build Partnerships</h3>
      <p class="form-sub-desc">Interested in sourcing from Al-Ektefa? Send us your requirements and destination port details below.</p>
      
      {#if formSubmitted}
        <div class="toast">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--green-dark)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
          Inquiry submitted successfully! Our trade desk will contact you soon.
        </div>
      {/if}

      <form onsubmit={handleSubmit}>
        <div class="form-group-slide">
          <label for="name">Full Name *</label>
          <input id="name" type="text" required placeholder="Enter your full name" bind:value={formData.name} />
        </div>
        
        <div class="form-group-slide">
          <label for="email">Email Address *</label>
          <input id="email" type="email" required placeholder="you@company.com" bind:value={formData.email} />
        </div>
        
        <div class="form-group-slide">
          <label for="product">Product Interest *</label>
          <select id="product" required bind:value={formData.product}>
            <option value="">Select product family</option>
            <option value="coffee">Coffee Beans (Arabica/Robusta)</option>
            <option value="spices">Spices (Whole/Powders/Blends)</option>
            <option value="rice">Rice (Basmati/Long Grain)</option>
            <option value="lentils">Lentils & Pulses</option>
          </select>
        </div>

        <div class="form-group-slide">
          <label for="message">Message / Sourcing Requirements</label>
          <textarea id="message" rows="4" placeholder="Describe quantity, grade specifications, and delivery terms..." bind:value={formData.message}></textarea>
        </div>

        <button type="submit" class="btn-slide-submit">Submit Inquiry
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
        </button>
      </form>
    </div>
  </div>
  <div class="slide-footer-strip gold-bg">
    <span class="navy-text font-bold">LET’S BUILD RELIABLE FOOD TRADE PARTNERSHIPS</span>
  </div>
</section>

<style>
  /* GLOBAL SLIDE STRUCTURE */
  .slide-section {
    position: relative;
    padding: 100px 24px 110px; /* space for absolute footer strip */
    min-height: 100vh;
    display: flex;
    align-items: center;
    overflow: hidden;
    border-bottom: 2px solid rgba(13, 27, 62, 0.04);
  }
  .slide-light {
    background: var(--bg-primary);
  }
  .slide-bg-secondary {
    background: var(--bg-secondary);
  }
  .slide-navy-full {
    background: var(--navy);
  }
  .slide-container {
    max-width: 1280px;
    margin: 0 auto;
    width: 100%;
    position: relative;
    z-index: 2;
  }
  .slide-tag {
    font-size: 12px;
    font-weight: 700;
    color: var(--gold);
    letter-spacing: 3px;
    text-transform: uppercase;
    display: block;
    margin-bottom: 16px;
  }
  .slide-header-margin {
    margin-bottom: 56px;
  }
  .slide-subtitle {
    font-size: 16px;
    color: var(--text-muted);
    max-width: 750px;
    margin: 12px auto 0;
  }
  .slide-footer-strip {
    position: absolute;
    bottom: 0; left: 0; right: 0;
    padding: 16px 24px;
    background: var(--bg-secondary);
    border-top: 1px solid rgba(13, 27, 62, 0.05);
    text-align: center;
    font-size: 12px;
    font-weight: 600;
    color: var(--navy);
    letter-spacing: 2px;
  }
  .slide-footer-strip.gold-bg {
    background: var(--gold);
    border-top: none;
  }
  .slide-footer-strip.navy-bg {
    background: var(--navy);
    border-top: none;
    color: var(--white);
  }
  .navy-text { color: var(--navy) !important; }
  .white-text { color: var(--white) !important; }
  .white-text-muted { color: rgba(255, 255, 255, 0.7) !important; }
  .gold-text { color: var(--gold) !important; }
  .font-bold { font-weight: 700; }
  .text-xs { font-size: 11px; }

  /* SPLIT GRIDS */
  .split-grid-50 {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 80px;
  }
  .split-grid-40-60 {
    display: grid;
    grid-template-columns: 0.8fr 1.2fr;
    gap: 60px;
  }
  .align-center { align-items: center; }
  .align-stretch { align-items: stretch; }
  .justify-between { justify-content: space-between; }
  .flex-column { display: flex; flex-direction: column; }
  .no-padding-bottom { padding-bottom: 70px; }

  /* SLIDE 1: HERO */
  .hero-slide-grid {
    display: grid;
    grid-template-columns: 1.1fr 0.9fr;
    gap: 80px;
    align-items: center;
  }
  .hero-title {
    font-size: 68px;
    font-weight: 700;
    line-height: 1.12;
    color: var(--navy);
    margin-bottom: 20px;
  }
  .title-divider {
    width: 100px;
    height: 3px;
    background: var(--gold);
    margin: 24px 0;
  }
  .hero-intro-text {
    font-size: 20px;
    line-height: 1.6;
    color: var(--text-muted);
    margin-bottom: 40px;
  }
  .slide-meta {
    font-size: 13px;
    font-weight: 700;
    color: var(--navy);
    letter-spacing: 2px;
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 32px;
  }
  .meta-separator {
    color: rgba(13, 27, 62, 0.2);
  }
  .hero-visual-circles {
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
    height: 500px;
  }
  .circle-main {
    width: 380px;
    height: 380px;
    border-radius: 50%;
    background: linear-gradient(135deg, rgba(201, 168, 76, 0.1) 0%, rgba(13, 27, 62, 0.05) 100%), url('/trade-hero-circle.jpg') no-repeat center center;
    background-size: cover;
    border: 3px solid var(--gold);
    position: relative;
    box-shadow: 0 20px 50px rgba(13, 27, 62, 0.1);
  }
  .circle-overlay {
    position: absolute;
    width: 120px;
    height: 120px;
    border-radius: 50%;
    background: var(--bg-primary);
    border: 2px solid var(--gold);
    display: flex;
    align-items: center;
    justify-content: center;
    text-align: center;
    font-size: 14px;
    font-weight: 700;
    color: var(--navy);
    box-shadow: 0 8px 20px rgba(13, 27, 62, 0.08);
    transition: transform 0.3s ease;
  }
  .circle-overlay:hover {
    transform: scale(1.08);
  }
  .circle-coffee {
    top: -40px;
    right: 50px;
  }
  .circle-spices {
    right: -50px;
    top: 50%;
    transform: translateY(-50%);
  }
  .circle-spices:hover {
    transform: translateY(-50%) scale(1.08);
  }
  .circle-pulses {
    bottom: -30px;
    left: 50px;
  }

  /* SLIDE 2: SNAPSHOT */
  .snapshot-milestone {
    display: flex;
    align-items: center;
    gap: 28px;
    background: var(--navy);
    color: var(--white);
    padding: 28px;
    border-radius: var(--radius);
    border-left: 5px solid var(--gold);
    box-shadow: 0 12px 30px rgba(13, 27, 62, 0.15);
  }
  .milestone-num {
    font-family: 'Playfair Display', serif;
    font-size: 48px;
    font-weight: 700;
    color: var(--gold);
  }
  .snapshot-milestone p {
    font-size: 14px;
    line-height: 1.6;
    color: rgba(255, 255, 255, 0.85);
  }
  .pillars-stack {
    display: flex;
    flex-direction: column;
    gap: 20px;
  }
  .pillar-box {
    display: flex;
    gap: 20px;
    background: var(--bg-primary);
    padding: 24px;
    border-radius: var(--radius);
    border: 1px solid rgba(13, 27, 62, 0.05);
    transition: all var(--transition);
  }
  .pillar-box:hover {
    transform: translateX(6px);
    border-color: var(--gold);
    box-shadow: 0 8px 24px rgba(13, 27, 62, 0.04);
  }
  .pillar-icon-box {
    width: 44px;
    height: 44px;
    background: rgba(201, 168, 76, 0.08);
    border-radius: 10px;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    color: var(--gold);
  }
  .pillar-content h4 {
    font-size: 16px;
    font-weight: 600;
    color: var(--navy);
    margin-bottom: 4px;
  }
  .pillar-content p {
    font-size: 14px;
    line-height: 1.5;
    color: var(--text-muted);
  }

  /* SLIDE 3: PRODUCT FAMILIES */
  .product-families-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 32px;
  }
  .family-panel {
    display: grid;
    grid-template-columns: 1fr 1fr;
    border-radius: var(--radius);
    overflow: hidden;
    box-shadow: 0 10px 30px rgba(13, 27, 62, 0.04);
    border: 1px solid rgba(13, 27, 62, 0.05);
  }
  .family-visual {
    background-size: cover;
    background-position: center;
    min-height: 220px;
  }
  .visual-coffee {
    background-image: linear-gradient(135deg, rgba(13,27,62,0.1), rgba(201,168,76,0.1)), url('/trade-family-coffee.jpg');
  }
  .visual-spices {
    background-image: linear-gradient(135deg, rgba(26,71,49,0.1), rgba(201,168,76,0.1)), url('/trade-family-spices.jpg');
  }
  .visual-rice {
    background-image: linear-gradient(135deg, rgba(45,27,94,0.1), rgba(201,168,76,0.1)), url('/trade-family-rice.jpg');
  }
  .visual-lentils {
    background-image: linear-gradient(135deg, rgba(13,27,62,0.15), rgba(201,168,76,0.15)), url('/trade-family-lentils.jpg');
  }
  .family-text-block {
    background: var(--navy);
    padding: 36px 28px;
    display: flex;
    flex-direction: column;
    justify-content: center;
    color: var(--white);
  }
  .family-number {
    font-family: 'Playfair Display', serif;
    font-size: 24px;
    font-weight: 700;
    color: var(--gold);
    display: block;
    margin-bottom: 12px;
  }
  .family-text-block h3 {
    font-size: 22px;
    font-weight: 700;
    color: var(--white);
    margin-bottom: 8px;
  }
  .family-text-block p {
    font-size: 13px;
    line-height: 1.6;
    color: rgba(255, 255, 255, 0.75);
  }

  /* SLIDE 4: COFFEE JOURNEY */
  .navy-panel-dark {
    background: var(--navy);
    padding: 56px 44px;
    border-radius: var(--radius);
    border: 1.5px solid rgba(201, 168, 76, 0.2);
    box-shadow: 0 15px 40px rgba(13, 27, 62, 0.25);
    position: relative;
  }
  .panel-bottom-strip {
    margin-top: 56px;
    border-top: 1px solid rgba(255, 255, 255, 0.1);
    padding-top: 24px;
  }
  .journey-content-panel {
    padding-left: 24px;
    display: flex;
    flex-direction: column;
    justify-content: center;
  }
  .journey-header-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 32px;
    margin-bottom: 40px;
  }
  .journey-header-row h3 {
    font-size: 20px;
    font-weight: 700;
    color: var(--navy);
    line-height: 1.4;
  }
  .btn-origin-pill {
    padding: 8px 20px;
    background: var(--gold);
    color: var(--navy);
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 2px;
    border-radius: 20px;
    white-space: nowrap;
  }
  .journey-2x2-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 28px;
  }
  .journey-process-box {
    background: var(--bg-secondary);
    border-radius: var(--radius);
    overflow: hidden;
    border: 1px solid rgba(13, 27, 62, 0.05);
  }
  .process-img {
    height: 120px;
    background-size: cover;
    background-position: center;
  }
  .img-cherry { background-image: linear-gradient(135deg, rgba(13,27,62,0.1), rgba(201,168,76,0.1)), url('/trade-journey-cherry.jpg'); }
  .img-farmer { background-image: linear-gradient(135deg, rgba(26,71,49,0.1), rgba(201,168,76,0.1)), url('/trade-journey-harvest.jpg'); }
  .img-ferment { background-image: linear-gradient(135deg, rgba(45,27,94,0.1), rgba(201,168,76,0.1)), url('/trade-journey-ferment.jpg'); }
  .img-drying { background-image: linear-gradient(135deg, rgba(13,27,62,0.1), rgba(201,168,76,0.1)), url('/trade-journey-drying.jpg'); }
  
  .process-text {
    padding: 20px;
  }
  .process-text strong {
    font-size: 14px;
    color: var(--navy);
    display: block;
    margin-bottom: 6px;
  }
  .process-text p {
    font-size: 12px;
    color: var(--text-muted);
    line-height: 1.5;
  }

  /* VISUAL GALLERY SYSTEM */
  .visual-gallery {
    display: flex;
    flex-direction: column;
    gap: 20px;
  }
  .gallery-large {
    height: 300px;
    border-radius: var(--radius);
    background-size: cover;
    background-position: center;
    border: 1px solid rgba(13, 27, 62, 0.06);
  }
  .large-arabica { background-image: linear-gradient(135deg, rgba(13,27,62,0.1), transparent), url('/trade-large-arabica.jpg'); }
  .large-robusta { background-image: linear-gradient(135deg, rgba(13,27,62,0.15), transparent), url('/trade-large-robusta.jpg'); }
  .large-spices-plate { background-image: linear-gradient(135deg, rgba(13,27,62,0.1), transparent), url('/trade-large-spices-plate.jpg'); }
  .large-staples-bag { background-image: linear-gradient(135deg, rgba(13,27,62,0.1), transparent), url('/trade-large-staples-bag.jpg'); }
  
  .gallery-row {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 20px;
  }
  .gallery-small {
    height: 140px;
    border-radius: var(--radius);
    background-size: cover;
    background-position: center;
    border: 1px solid rgba(13, 27, 62, 0.05);
  }
  .small-arabica-1 { background-image: url('/trade-small-arabica-1.jpg'); }
  .small-arabica-2 { background-image: url('/trade-small-arabica-2.jpg'); }
  .small-robusta-1 { background-image: url('/trade-small-robusta-1.jpg'); }
  .small-robusta-2 { background-image: url('/trade-small-robusta-2.jpg'); }
  .small-spices-1 { background-image: url('/trade-small-spices-1.jpg'); }
  .small-spices-2 { background-image: url('/trade-small-spices-2.jpg'); }
  .small-staples-1 { background-image: url('/trade-small-staples-1.jpg'); }
  .small-staples-2 { background-image: url('/trade-small-staples-2.jpg'); }

  .gallery-caption {
    font-size: 13px;
    border-top: 1px solid rgba(13, 27, 62, 0.08);
    padding-top: 14px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    color: var(--navy);
  }
  .gallery-caption span { color: var(--text-muted); }

  /* SLIDE 5: ARABICA */
  .slide-info-panel h2 {
    font-size: 40px;
    font-weight: 700;
    color: var(--navy);
    line-height: 1.2;
    margin-bottom: 16px;
  }
  .lead-desc {
    font-size: 16px;
    line-height: 1.7;
    color: var(--text-muted);
    margin-bottom: 36px;
  }
  .specs-2x2-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 28px;
  }
  .spec-card {
    background: var(--bg-secondary);
    padding: 24px;
    border-radius: var(--radius);
    border: 1px solid rgba(13, 27, 62, 0.05);
  }
  .spec-card.navy-bg-light {
    background: var(--navy-light);
    border-color: rgba(255, 255, 255, 0.05);
  }
  .spec-card h5 {
    font-size: 16px;
    font-weight: 600;
    color: var(--navy);
    margin-bottom: 8px;
  }
  .spec-card p {
    font-size: 13px;
    line-height: 1.5;
    color: var(--text-muted);
  }

  /* SLIDE 6: ROBUSTA */
  .specs-vertical-stack {
    display: flex;
    flex-direction: column;
    gap: 24px;
    margin-top: 40px;
  }
  .stack-item {
    display: flex;
    gap: 20px;
    align-items: flex-start;
  }
  .stack-num {
    font-family: 'Playfair Display', serif;
    font-size: 28px;
    font-weight: 700;
    color: var(--gold);
    line-height: 1;
    margin-top: 2px;
  }
  .stack-item h5 {
    font-size: 15px;
    font-weight: 600;
    margin-bottom: 4px;
  }
  .stack-item p {
    font-size: 13px;
    line-height: 1.5;
  }

  /* SLIDE 7: SPICES OVERVIEW */
  .panel-pill-holder {
    margin-top: 40px;
  }
  .pill-outline {
    display: inline-block;
    padding: 10px 24px;
    border: 1.5px solid var(--gold);
    color: var(--gold);
    border-radius: 30px;
    font-size: 12px;
    font-weight: 700;
    letter-spacing: 2px;
  }
  .spices-display-container {
    display: flex;
    flex-direction: column;
    gap: 24px;
    padding-left: 20px;
  }
  .spice-hero-img {
    height: 220px;
    border-radius: var(--radius);
    background-size: cover;
    background-position: center;
    background-image: linear-gradient(135deg, rgba(13,27,62,0.1), transparent), url('/trade-spices-overview-header.jpg');
    border: 1px solid rgba(13, 27, 62, 0.06);
  }
  .spices-3-cols {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 20px;
  }
  .spice-col-card {
    background: var(--navy);
    color: var(--white);
    border-radius: var(--radius);
    overflow: hidden;
    border: 1px solid rgba(255, 255, 255, 0.05);
    display: flex;
    flex-direction: column;
  }
  .col-img {
    height: 100px;
    background-size: cover;
    background-position: center;
  }
  .img-spice-whole { background-image: url('/trade-spices-overview-whole.jpg'); }
  .img-spice-powder { background-image: url('/trade-spices-overview-powder.jpg'); }
  .img-spice-blend { background-image: url('/trade-spices-overview-blend.jpg'); }
  
  .col-text {
    padding: 20px;
    text-align: left;
  }
  .col-text h5 {
    font-size: 15px;
    font-weight: 600;
    color: var(--white);
    margin-bottom: 6px;
  }
  .col-text p {
    font-size: 12px;
    line-height: 1.5;
    color: rgba(255, 255, 255, 0.7);
  }

  /* SLIDE 9: POWDERED SPICES & MASALAS */
  .spice-products-3-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 32px;
  }
  .product-item-card {
    background: var(--navy-light);
    border: 1px solid rgba(255, 255, 255, 0.06);
    border-radius: var(--radius);
    overflow: hidden;
    display: flex;
    flex-direction: column;
    box-shadow: 0 15px 45px rgba(0, 0, 0, 0.2);
    transition: all var(--transition);
  }
  .product-item-card:hover {
    transform: translateY(-6px);
    border-color: var(--gold);
  }
  .product-item-img {
    height: 180px;
    background-size: cover;
    background-position: center;
  }
  .img-powders-essential { background-image: linear-gradient(to bottom, transparent, rgba(0,0,0,0.4)), url('/trade-powders-essential.jpg'); }
  .img-powders-warm { background-image: linear-gradient(to bottom, transparent, rgba(0,0,0,0.4)), url('/trade-powders-warm.jpg'); }
  .img-powders-masalas { background-image: linear-gradient(to bottom, transparent, rgba(0,0,0,0.4)), url('/trade-powders-masalas.jpg'); }
  
  .product-item-desc {
    padding: 32px;
    background: var(--bg-primary);
    text-align: left;
    display: flex;
    flex-direction: column;
    height: 100%;
  }
  .product-item-desc h4 {
    font-size: 20px;
    font-weight: 700;
    color: var(--navy);
    margin-bottom: 10px;
  }
  .product-item-desc p {
    font-size: 13px;
    line-height: 1.6;
    color: var(--text-muted);
    margin-bottom: 24px;
    flex-grow: 1;
  }
  .product-item-tag {
    font-size: 11px;
    font-weight: 700;
    color: var(--gold);
    letter-spacing: 2px;
    border-top: 1px solid rgba(13, 27, 62, 0.08);
    padding-top: 16px;
  }

  /* SLIDE 10: RICE, LENTILS & PULSES */
  .core-products-navy-box {
    background: var(--navy);
    padding: 32px;
    border-radius: var(--radius);
    color: var(--white);
    border-left: 5px solid var(--gold);
    margin-top: 40px;
    box-shadow: 0 10px 30px rgba(13, 27, 62, 0.1);
  }
  .box-tag {
    font-size: 11px;
    font-weight: 700;
    color: var(--gold);
    letter-spacing: 2px;
    display: block;
    margin-bottom: 8px;
  }
  .core-products-navy-box h3 {
    font-family: 'Playfair Display', serif;
    font-size: 22px;
    font-weight: 700;
    color: var(--white);
    letter-spacing: 1px;
  }

  /* SLIDE 11: STAPLES PORTFOLIO */
  .staples-portfolio-2x2 {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 32px;
  }
  .staple-panel-card {
    display: grid;
    grid-template-columns: 0.9fr 1.1fr;
    background: var(--bg-primary);
    border-radius: var(--radius);
    overflow: hidden;
    border: 1px solid rgba(255, 255, 255, 0.05);
    box-shadow: 0 15px 40px rgba(0, 0, 0, 0.2);
  }
  .staple-card-img {
    background-size: cover;
    background-position: center;
    min-height: 200px;
  }
  .img-staple-rice { background-image: url('/trade-staple-rice.jpg'); }
  .img-staple-lentils { background-image: url('/trade-staple-lentils.jpg'); }
  .img-staple-beans { background-image: url('/trade-staple-beans.jpg'); }
  .img-staple-pulses { background-image: url('/trade-staple-pulses.jpg'); }
  
  .staple-card-text {
    padding: 36px 28px;
    display: flex;
    flex-direction: column;
    justify-content: center;
    text-align: left;
  }
  .staple-card-num {
    font-family: 'Playfair Display', serif;
    font-size: 22px;
    font-weight: 700;
    color: var(--gold);
    display: block;
    margin-bottom: 8px;
  }
  .staple-card-text h4 {
    font-size: 20px;
    font-weight: 700;
    color: var(--navy);
    margin-bottom: 6px;
  }
  .staple-card-text p {
    font-size: 13px;
    line-height: 1.6;
    color: var(--text-muted);
  }

  /* SLIDE 12: MISSION & VALUES */
  .mv-block-stack {
    display: flex;
    flex-direction: column;
    gap: 32px;
    margin-top: 48px;
  }
  .mv-block-item {
    border-top: 1px solid rgba(255, 255, 255, 0.1);
    padding-top: 20px;
  }
  .mv-block-item h4 {
    font-size: 14px;
    font-weight: 700;
    letter-spacing: 2px;
    margin-bottom: 8px;
  }
  .mv-block-item p {
    font-size: 14px;
    line-height: 1.6;
  }
  .values-list-panel {
    padding-left: 20px;
    display: flex;
    flex-direction: column;
    justify-content: center;
  }
  .values-list-panel h3 {
    font-size: 20px;
    font-weight: 700;
    color: var(--navy);
    line-height: 1.4;
    margin-bottom: 36px;
  }
  .values-divider-list {
    display: flex;
    flex-direction: column;
  }
  .value-row-item {
    display: grid;
    grid-template-columns: 0.8fr 1.2fr;
    gap: 32px;
    padding: 20px 0;
    border-top: 1px solid rgba(13, 27, 62, 0.08);
    align-items: center;
    font-size: 14px;
  }
  .value-row-item:last-child {
    border-bottom: 1px solid rgba(13, 27, 62, 0.08);
  }
  .value-row-item strong {
    color: var(--navy);
    font-weight: 700;
    letter-spacing: 2px;
  }
  .value-row-item span {
    color: var(--text-muted);
    line-height: 1.5;
  }

  /* SLIDE 13: GLOBAL REACH & CONTACTS */
  .global-reach-contacts {
    padding-right: 20px;
    display: flex;
    flex-direction: column;
    justify-content: center;
  }
  .reach-desc {
    font-size: 16px;
    line-height: 1.7;
    color: var(--text-muted);
    margin-bottom: 36px;
  }
  .reach-3-bullets {
    display: flex;
    flex-direction: column;
    gap: 24px;
    margin-bottom: 40px;
  }
  .bullet-item {
    display: flex;
    gap: 16px;
    align-items: flex-start;
  }
  .bullet-icon {
    width: 36px;
    height: 36px;
    background: rgba(201, 168, 76, 0.08);
    border-radius: 8px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--gold);
    flex-shrink: 0;
  }
  .bullet-item strong {
    font-size: 15px;
    font-weight: 600;
    color: var(--navy);
    display: block;
    margin-bottom: 4px;
  }
  .bullet-item p {
    font-size: 13px;
    color: var(--text-muted);
  }
  .inquiry-info-box {
    background: var(--navy);
    color: var(--white);
    padding: 32px;
    border-radius: var(--radius);
    border: 1px solid rgba(201, 168, 76, 0.15);
  }
  .inquiry-info-box h4 {
    font-size: 18px;
    font-weight: 700;
    color: var(--white);
    margin-bottom: 4px;
  }
  .office-tag {
    font-size: 11px;
    font-weight: 700;
    color: var(--gold);
    letter-spacing: 2px;
    display: block;
    margin-bottom: 24px;
  }
  .inquiry-channels {
    display: flex;
    flex-direction: column;
    gap: 20px;
  }
  .ch-block {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }
  .ch-block strong {
    font-size: 12px;
    font-weight: 700;
    color: var(--gold);
    text-transform: uppercase;
    letter-spacing: 1px;
  }
  .ch-block a {
    font-size: 14px;
    color: rgba(255, 255, 255, 0.85);
    transition: color var(--transition);
  }
  .ch-block a:hover {
    color: var(--gold-light);
  }

  /* WEB INQUIRY FORM */
  .form-wrapper-slide {
    background: var(--bg-secondary);
    border: 1px solid rgba(13, 27, 62, 0.05);
    border-radius: var(--radius);
    padding: 44px 36px;
    box-shadow: 0 15px 45px rgba(13, 27, 62, 0.04);
    display: flex;
    flex-direction: column;
    justify-content: center;
  }
  .form-tag {
    font-size: 11px;
    font-weight: 700;
    color: var(--gold);
    letter-spacing: 2px;
    display: block;
    margin-bottom: 8px;
  }
  .form-wrapper-slide h3 {
    font-size: 28px;
    font-weight: 700;
    color: var(--navy);
    margin-bottom: 8px;
  }
  .form-sub-desc {
    font-size: 14px;
    color: var(--text-muted);
    margin-bottom: 28px;
    line-height: 1.5;
  }
  .form-group-slide {
    display: flex;
    flex-direction: column;
    gap: 6px;
    margin-bottom: 16px;
    text-align: left;
  }
  .form-group-slide label {
    font-size: 12px;
    font-weight: 700;
    color: var(--navy);
    text-transform: uppercase;
    letter-spacing: 1px;
  }
  .form-group-slide input, .form-group-slide select, .form-group-slide textarea {
    padding: 12px 16px;
    background: var(--white);
    border: 1px solid rgba(13, 27, 62, 0.12);
    border-radius: 8px;
    font-size: 15px;
    color: var(--navy);
    transition: border-color var(--transition);
    width: 100%;
  }
  .form-group-slide input:focus, .form-group-slide select:focus, .form-group-slide textarea:focus {
    outline: none;
    border-color: var(--gold);
  }
  .form-group-slide textarea { resize: vertical; }
  .btn-slide-submit {
    margin-top: 16px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    padding: 14px 32px;
    font-weight: 600;
    font-size: 15px;
    border-radius: 8px;
    background: var(--navy);
    color: var(--white);
    transition: all var(--transition);
  }
  .btn-slide-submit:hover {
    background: var(--gold);
    color: var(--navy);
    transform: translateY(-2px);
    box-shadow: 0 6px 16px rgba(201, 168, 76, 0.25);
  }
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

  /* MEDIA RESPONSIVE */
  @media (max-width: 1024px) {
    .product-families-grid { grid-template-columns: 1fr; }
    .staples-portfolio-2x2 { grid-template-columns: 1fr; }
  }

  @media (max-width: 768px) {
    .slide-section { padding: 60px 16px 80px; min-height: auto; }
    .split-grid-50 { grid-template-columns: 1fr; gap: 40px; }
    .split-grid-40-60 { grid-template-columns: 1fr; gap: 40px; }
    .hero-slide-grid { grid-template-columns: 1fr; text-align: center; }
    .hero-title { font-size: 44px; }
    .title-divider { margin: 24px auto; }
    .slide-meta { justify-content: center; }
    .hero-visual-circles { display: none; }
    .snapshot-milestone { flex-direction: column; text-align: center; }
    .snapshot-left h2 { font-size: 28px; }
    .journey-content-panel { padding-left: 0; }
    .journey-header-row { flex-direction: column; text-align: center; gap: 16px; }
    .journey-2x2-grid { grid-template-columns: 1fr; }
    .specs-2x2-grid { grid-template-columns: 1fr; }
    .slide-info-panel h2 { font-size: 30px; }
    .spices-display-container { padding-left: 0; }
    .spices-3-cols { grid-template-columns: 1fr; }
    .spice-products-3-grid { grid-template-columns: 1fr; }
    .value-row-item { grid-template-columns: 1fr; gap: 8px; text-align: left; }
    .value-row-item strong { letter-spacing: 1px; }
    .form-wrapper-slide { padding: 32px 24px; }
  }
</style>
