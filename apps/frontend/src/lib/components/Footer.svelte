<script>
  const currentYear = new Date().getFullYear();
</script>

<footer class="footer">
  <div class="footer-container">
    <div class="brands-row">
      <span class="brand-name">AL-EKTEFA ACCOUNTING</span>
      <span class="brand-separator">
        <svg width="8" height="8" viewBox="0 0 8 8" fill="var(--gold)" xmlns="http://www.w3.org/2000/svg"><circle cx="4" cy="4" r="4"/></svg>
      </span>
      <span class="brand-name">AL-EKTEFA TRADING</span>
      <span class="brand-separator">
        <svg width="8" height="8" viewBox="0 0 8 8" fill="var(--gold)" xmlns="http://www.w3.org/2000/svg"><circle cx="4" cy="4" r="4"/></svg>
      </span>
      <span class="brand-name">JAMICORE TECHNOLOGY</span>
    </div>

    <p class="tagline">ONE GROUP. MULTIPLE SOLUTIONS.</p>

    <div class="bottom-row">
      <p class="copyright">&copy; {currentYear} Al-Ektefa Group. All rights reserved.</p>
      <nav class="footer-links">
        <a href="/trade">Agricultural Trade</a>
        <a href="/jamicore">Jamicore SaaS</a>
        <a href="/accounting">Accounting</a>
        <a href="/#contact">Contact</a>
      </nav>
    </div>
  </div>
</footer>

<style>
  .footer {
    background: #080E22;
    padding: 64px 24px 32px;
    border-top: 1px solid rgba(201, 168, 76, 0.1);
  }
  .footer-container {
    max-width: 1200px;
    margin: 0 auto;
    text-align: center;
  }
  .brands-row {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 16px;
    flex-wrap: wrap;
    margin-bottom: 16px;
  }
  .brand-name {
    font-family: 'Playfair Display', serif;
    font-size: 16px;
    font-weight: 600;
    color: var(--white);
    letter-spacing: 2px;
  }
  .brand-separator {
    display: flex;
    align-items: center;
  }
  .tagline {
    font-size: 13px;
    font-weight: 600;
    color: var(--gold);
    text-transform: uppercase;
    letter-spacing: 5px;
    margin-bottom: 40px;
  }
  .bottom-row {
    padding-top: 32px;
    border-top: 1px solid rgba(255, 255, 255, 0.06);
    display: flex;
    justify-content: space-between;
    align-items: center;
    flex-wrap: wrap;
    gap: 16px;
  }
  .copyright {
    font-size: 13px;
    color: var(--text-muted);
  }
  .footer-links {
    display: flex;
    gap: 24px;
  }
  .footer-links a {
    font-size: 13px;
    color: var(--text-muted);
    transition: color var(--transition);
  }
  .footer-links a:hover {
    color: var(--gold);
  }

  @media (max-width: 768px) {
    .footer {
      padding: 48px 16px 28px;
    }
    .brands-row {
      flex-direction: column;
      gap: 12px;
    }
    .brand-name {
      font-size: 14px;
    }
    .brand-separator {
      display: none;
    }
    .bottom-row {
      flex-direction: column;
      text-align: center;
    }
    .footer-links {
      flex-wrap: wrap;
      justify-content: center;
      gap: 16px;
    }
  }
</style>
