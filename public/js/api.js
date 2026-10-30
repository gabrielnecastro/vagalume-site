// Small helpers used across several pages.
const QA = {
  TOKEN_KEY: "qa_token",

  getToken() {
    return localStorage.getItem(this.TOKEN_KEY);
  },
  setToken(token) {
    localStorage.setItem(this.TOKEN_KEY, token);
  },
  clearToken() {
    localStorage.removeItem(this.TOKEN_KEY);
  },

  async api(path, options = {}) {
    const headers = Object.assign({ "Content-Type": "application/json" }, options.headers || {});
    const token = this.getToken();
    if (token) headers.Authorization = `Bearer ${token}`;
    const res = await fetch(path, { ...options, headers, credentials: "include" });
    let body = null;
    const text = await res.text();
    try {
      body = text ? JSON.parse(text) : null;
    } catch (e) {
      body = text;
    }
    return { status: res.status, ok: res.ok, body, headers: res.headers };
  },
};
