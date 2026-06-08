<script>
  let menuOpen = $state(false);
  let dropdownOpen = $state(false);
  let dropdownTimeout = $state(null);

  function showDropdown() {
    if (dropdownTimeout) clearTimeout(dropdownTimeout);
    dropdownOpen = true;
  }

  function hideDropdown() {
    dropdownTimeout = setTimeout(() => { dropdownOpen = false; }, 200);
  }

  function closeMobileMenu() {
    menuOpen = false;
  }

  let scrolled = $state(false);

  $effect(() => {
    if (typeof window === 'undefined') return;

    function handleScroll() {
      scrolled = window.scrollY > 20;
    }

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  });
</script>

<nav class="navbar" class:scrolled={scrolled}>
  <div class="nav-container">
    <a href="/" class="logo">
      <img src="/logo.png" alt="Al-Ektefa Group" class="logo-img" />
    </a>

    <ul class="nav-links">
      <li><a href="/" onclick={closeMobileMenu}>Home</a></li>
      <li><a href="/#about" onclick={closeMobileMenu}>About Us</a></li>
      <li
        class="dropdown-wrapper"
        onmouseenter={showDropdown}
        onmouseleave={hideDropdown}
      >
        <span class="dropdown-trigger">
          Our Divisions
          <svg width="10" height="6" viewBox="0 0 10 6" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M1 1L5 5L9 1" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </span>
        <div class="dropdown" class:open={dropdownOpen}>
          <a href="/trade" onclick={closeMobileMenu}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--gold)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
            </svg>
            <span>Agricultural Trade</span>
          </a>
          <a href="/jamicore" onclick={closeMobileMenu}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--gold)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <rect x="2" y="3" width="20" height="14" rx="2" ry="2"/>
              <line x1="8" y1="21" x2="16" y2="21"/>
              <line x1="12" y1="17" x2="12" y2="21"/>
            </svg>
            <span>Jamicore Technology</span>
          </a>
          <a href="/accounting" onclick={closeMobileMenu}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--gold)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
              <polyline points="14 2 14 8 20 8"/>
              <line x1="16" y1="13" x2="8" y2="13"/>
              <line x1="16" y1="17" x2="8" y2="17"/>
              <polyline points="10 9 9 9 8 9"/>
            </svg>
            <span>Accounting</span>
          </a>
        </div>
      </li>
      <li><a href="/#why-us" onclick={closeMobileMenu}>Why Us</a></li>
      <li><a href="/#contact" onclick={closeMobileMenu}>Contact</a></li>
    </ul>

    <a href="/#contact" class="cta-btn">Get in Touch <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg></a>

    <button class="hamburger" class:active={menuOpen} onclick={() => menuOpen = !menuOpen} aria-label="Toggle menu">
      <span></span><span></span><span></span>
    </button>
  </div>
</nav>

<!-- Mobile Overlay -->
<div class="mobile-overlay" class:active={menuOpen}>
  <div class="mobile-menu">
    <a href="/" onclick={closeMobileMenu}>Home</a>
    <a href="/#about" onclick={closeMobileMenu}>About Us</a>
    <div class="mobile-division-title">Our Divisions</div>
    <a href="/trade" class="mobile-sub" onclick={closeMobileMenu}>Agricultural Trade</a>
    <a href="/jamicore" class="mobile-sub" onclick={closeMobileMenu}>Jamicore Technology</a>
    <a href="/accounting" class="mobile-sub" onclick={closeMobileMenu}>Accounting</a>
    <a href="/#why-us" onclick={closeMobileMenu}>Why Us</a>
    <a href="/#contact" onclick={closeMobileMenu}>Contact</a>
    <a href="/#contact" class="mobile-cta" onclick={closeMobileMenu}>Get in Touch</a>
  </div>
</div>

<style>
  .navbar {
    position: fixed;
    top: 0; left: 0; right: 0;
    z-index: 1000;
    padding: 16px 0;
    transition: all var(--transition);
    background: transparent;
  }
  .navbar.scrolled {
    background: rgba(13, 27, 62, 0.92);
    backdrop-filter: blur(16px);
    -webkit-backdrop-filter: blur(16px);
    padding: 10px 0;
    box-shadow: 0 1px 0 rgba(201, 168, 76, 0.1);
  }
  .nav-container {
    max-width: 1280px;
    margin: 0 auto;
    padding: 0 24px;
    display: flex;
    align-items: center;
    justify-content: space-between;
  }
  .logo {
    display: flex;
    align-items: center;
    z-index: 1001;
  }
  .logo-img {
    height: 48px;
    width: auto;
    display: block;
  }
  .nav-links {
    display: flex;
    align-items: center;
    gap: 32px;
    list-style: none;
  }
  .nav-links a, .dropdown-trigger {
    font-size: 14px;
    font-weight: 500;
    color: var(--text-muted);
    transition: color var(--transition);
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 4px;
  }
  .nav-links a:hover, .dropdown-trigger:hover {
    color: var(--gold);
  }
  .nav-links a:hover {
    color: var(--white);
  }
  .dropdown-wrapper {
    position: relative;
  }
  .dropdown {
    position: absolute;
    top: 100%;
    left: -16px;
    padding-top: 12px;
    min-width: 240px;
    opacity: 0;
    visibility: hidden;
    transform: translateY(8px);
    transition: all 0.25s ease;
  }
  .dropdown.open {
    opacity: 1;
    visibility: visible;
    transform: translateY(0);
  }
  .dropdown a {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 10px 16px;
    font-size: 14px;
    color: var(--text-muted);
    background: var(--navy-light);
    border-radius: 6px;
    margin-bottom: 2px;
    transition: all var(--transition);
  }
  .dropdown a:hover {
    background: var(--navy);
    color: var(--white);
  }
  .dropdown a:first-child { border-radius: 8px 8px 6px 6px; }
  .dropdown a:last-child { border-radius: 6px 6px 8px 8px; margin-bottom: 0; }
  .cta-btn {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 10px 24px;
    font-size: 14px;
    font-weight: 600;
    color: var(--white);
    background: var(--navy-light);
    border: 1px solid rgba(201, 168, 76, 0.2);
    border-radius: 8px;
    transition: all var(--transition);
    white-space: nowrap;
  }
  .cta-btn:hover {
    background: var(--navy);
    border-color: var(--gold);
    color: var(--gold-light);
  }
  .hamburger {
    display: none;
    flex-direction: column;
    gap: 5px;
    background: none;
    border: none;
    padding: 4px;
    z-index: 1001;
    cursor: pointer;
  }
  .hamburger span {
    display: block;
    width: 24px;
    height: 2px;
    background: var(--white);
    transition: all 0.3s ease;
    border-radius: 1px;
  }
  .hamburger.active span:nth-child(1) {
    transform: translateY(7px) rotate(45deg);
    background: var(--gold);
  }
  .hamburger.active span:nth-child(2) {
    opacity: 0;
  }
  .hamburger.active span:nth-child(3) {
    transform: translateY(-7px) rotate(-45deg);
    background: var(--gold);
  }

  .mobile-overlay {
    display: none;
    position: fixed;
    inset: 0;
    background: rgba(13, 27, 62, 0.98);
    backdrop-filter: blur(20px);
    z-index: 999;
    align-items: center;
    justify-content: center;
  }
  .mobile-overlay.active {
    display: flex;
  }
  .mobile-menu {
    display: flex;
    flex-direction: column;
    gap: 8px;
    text-align: center;
  }
  .mobile-menu a {
    font-size: 20px;
    font-weight: 500;
    color: var(--text-muted);
    padding: 10px 0;
    transition: color var(--transition);
  }
  .mobile-menu a:hover {
    color: var(--gold);
  }
  .mobile-sub {
    font-size: 16px !important;
    padding-left: 20px;
  }
  .mobile-division-title {
    font-size: 13px;
    color: var(--gold);
    text-transform: uppercase;
    letter-spacing: 3px;
    padding: 12px 0 4px;
  }
  .mobile-cta {
    margin-top: 16px;
    padding: 14px 36px !important;
    background: var(--gold);
    color: var(--navy) !important;
    border-radius: 8px;
    font-size: 16px !important;
    font-weight: 600 !important;
    display: inline-block;
  }

  @media (max-width: 768px) {
    .nav-links, .cta-btn {
      display: none;
    }
    .hamburger {
      display: flex;
    }
    .logo-img {
      height: 40px;
    }
  }
</style>
