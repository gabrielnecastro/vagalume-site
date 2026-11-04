// Shared helpers: header/footer, light/dark theme, toasts, websocket, cookie banner.
const Store = {
  CONSENT_KEY: "vagalume_cookie_consent",
  THEME_KEY: "vagalume_theme",
  CART_KEY: "vagalume_cart",
  SAVED_JOBS_KEY: "vagalume_saved_jobs",

  // Text typed by users (job and company fields) is shown as text, never as HTML.
  escapeHtml(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  },

  // ---------- saved jobs (local bookmark flag, per browser) ----------
  // Each entry is { id, title, company }. Title and company are kept so a job that is
  // deleted later can still be shown in "Saved jobs". Older entries
  // saved as a plain id are still read; they simply have no title or company.
  getSavedJobEntries() {
    let raw;
    try { raw = JSON.parse(localStorage.getItem(this.SAVED_JOBS_KEY)) || []; } catch (e) { raw = []; }
    if (!Array.isArray(raw)) raw = [];
    return raw
      .map((e) => (e && typeof e === "object"
        ? { id: Number(e.id), title: e.title || "", company: e.company || "" }
        : { id: Number(e), title: "", company: "" }))
      .filter((e) => Number.isFinite(e.id));
  },
  getSavedJobs() {
    return this.getSavedJobEntries().map((e) => e.id);
  },
  isJobSaved(jobId) {
    return this.getSavedJobs().includes(Number(jobId));
  },
  toggleSavedJob(jobId, info) {
    const entries = this.getSavedJobEntries();
    const idx = entries.findIndex((e) => e.id === Number(jobId));
    if (idx === -1) {
      entries.push({ id: Number(jobId), title: (info && info.title) || "", company: (info && info.company) || "" });
    } else {
      entries.splice(idx, 1);
    }
    localStorage.setItem(this.SAVED_JOBS_KEY, JSON.stringify(entries));
    return idx === -1;
  },

  // ---------- applications ----------
  // Ids of the jobs the signed-in candidate has applied to, so the screens can show
  // the applied state as soon as they load.
  async getAppliedJobIds() {
    const { ok, body } = await QA.api("/api/applications/me");
    return ok ? new Set(body.data.map((a) => a.jobId)) : new Set();
  },

  // ---------- course cart ----------
  getCart() {
    try { return JSON.parse(localStorage.getItem(this.CART_KEY)) || []; } catch (e) { return []; }
  },
  setCart(items) {
    localStorage.setItem(this.CART_KEY, JSON.stringify(items));
    this.updateCartBadge();
  },
  addToCart(courseId) {
    const cart = this.getCart();
    if (!cart.some((i) => i.courseId === courseId)) cart.push({ courseId });
    this.setCart(cart);
  },
  removeFromCart(courseId) {
    this.setCart(this.getCart().filter((i) => i.courseId !== courseId));
  },
  inCart(courseId) {
    return this.getCart().some((i) => i.courseId === courseId);
  },
  cartCount() {
    return this.getCart().length;
  },
  updateCartBadge() {
    const el = document.getElementById("cart-count");
    if (el) el.textContent = this.cartCount();
  },

  // ---------- light/dark theme ----------
  effectiveTheme() {
    const stored = document.documentElement.getAttribute("data-theme");
    if (stored) return stored;
    return window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  },
  applyTheme(theme) {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem(this.THEME_KEY, theme);
    this.reflectThemeButton();
  },
  toggleTheme() {
    this.applyTheme(this.effectiveTheme() === "dark" ? "light" : "dark");
  },
  reflectThemeButton() {
    const btn = document.getElementById("theme-toggle");
    if (!btn) return;
    const dark = this.effectiveTheme() === "dark";
    btn.textContent = dark ? "☀️" : "🌙";
    btn.setAttribute("aria-pressed", String(dark));
    btn.title = dark ? "Switch to light theme" : "Switch to dark theme";
  },

  // ---------- toasts ----------
  toast(message, type = "ok") {
    let stack = document.getElementById("toast-stack");
    if (!stack) {
      stack = document.createElement("div");
      stack.id = "toast-stack";
      document.body.appendChild(stack);
    }
    const el = document.createElement("div");
    el.className = "toast" + (type === "err" ? " err" : "");
    el.dataset.testid = "toast";
    el.textContent = message;
    stack.appendChild(el);
    setTimeout(() => el.remove(), 4500);
  },

  // The WebSocket connection (notifications, online counter,
  // and help center chat) was removed.

  // ---------- header / footer ----------
  async renderChrome() {
    const header = document.getElementById("site-header");
    const footer = document.getElementById("site-footer");
    if (header) {
      header.outerHTML = `
        <header class="site-header" id="site-header">
          <div class="header-inner">
            <a class="brand" href="/"><img src="/img/logo-icon.png" alt="Vagalume" class="brand-icon" /><span>Vagalume</span></a>
            <form class="header-search" action="/" method="get">
              <input type="search" name="q" placeholder="Search jobs, companies..." data-testid="header-search" />
            </form>
            <nav class="header-nav">
              <a href="/">Jobs</a>
              <a href="/pages/empresas.html">Companies</a>
              <a href="/pages/cursos.html">Courses</a>
              <a href="/pages/ajuda.html">Help</a>
              <button class="theme-toggle" id="theme-toggle" data-testid="theme-toggle" aria-label="Toggle theme" title="Toggle theme"></button>
              <a href="/pages/carrinho.html" data-testid="cart-link">🛒 <span class="cart-count" id="cart-count">0</span></a>
              <a href="/pages/entrar.html" id="account-link" data-testid="account-link">Sign in</a>
            </nav>
          </div>
        </header>`;
      this.updateCartBadge();
      this.reflectThemeButton();
      document.getElementById("theme-toggle").addEventListener("click", () => this.toggleTheme());
      try {
        const res = await fetch("/api/auth/me", { credentials: "include" });
        if (res.ok) {
          const { data } = await res.json();
          const link = document.getElementById("account-link");
          if (link) {
            link.textContent = data.name.split(" ")[0];
            link.href = data.role === "employer" ? "/pages/empresa/painel.html" : "/pages/candidato/painel.html";
          }
        }
      } catch (e) { /* stays logged out */ }
    }
    if (footer) {
      footer.outerHTML = `
        <footer class="site-footer" id="site-footer">
          <div>
            <a href="/pages/termos.html" target="_blank" rel="noopener">Terms of Use</a>
            <a href="/pages/privacidade.html" target="_blank" rel="noopener">Privacy Policy</a>
            <a href="/pages/qa-docs.html">QA Guide</a>
            <a href="/admin">Admin panel</a>
          </div>
          <p class="mt-8">Vagalume is a fictional platform created only to practice automated testing.</p>
        </footer>`;
    }
    this.renderCookieBanner();
  },

  renderCookieBanner() {
    if (localStorage.getItem(this.CONSENT_KEY)) return;
    const el = document.createElement("div");
    el.id = "cookie-banner";
    el.setAttribute("data-testid", "cookie-banner");
    el.innerHTML = `
      <p>We use cookies to remember your session and preferences. See our <a href="/pages/privacidade.html" target="_blank">privacy policy</a>.</p>
      <div class="pill-row">
        <button class="secondary" id="cookie-reject" data-testid="cookie-reject">Reject</button>
        <button id="cookie-accept" data-testid="cookie-accept">Accept</button>
      </div>`;
    document.body.appendChild(el);
    document.getElementById("cookie-accept").addEventListener("click", () => { localStorage.setItem(this.CONSENT_KEY, "accepted"); el.remove(); });
    document.getElementById("cookie-reject").addEventListener("click", () => { localStorage.setItem(this.CONSENT_KEY, "rejected"); el.remove(); });
  },
};

document.addEventListener("DOMContentLoaded", () => Store.renderChrome());
