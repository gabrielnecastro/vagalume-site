// Web component with Shadow DOM: <star-rating value="4" readonly></star-rating>
// Without "readonly" it becomes a clickable selector that fires the "rating-change" event.
class StarRating extends HTMLElement {
  static get observedAttributes() { return ["value"]; }

  constructor() {
    super();
    this.shadow = this.attachShadow({ mode: "open" });
  }

  connectedCallback() { this.render(); }
  attributeChangedCallback() { this.render(); }

  get value() { return parseFloat(this.getAttribute("value")) || 0; }
  set value(v) { this.setAttribute("value", v); }

  render() {
    const readonly = this.hasAttribute("readonly");
    // N-17 (10/17/2026): read-only stars show half stars — x.25 to x.74 is a half star,
    // below x.25 rounds down, and x.75 or more rounds up. The selector keeps whole stars.
    let full = Math.round(this.value);
    let half = false;
    if (readonly) {
      const whole = Math.floor(this.value);
      const frac = Math.round((this.value - whole) * 100) / 100;
      full = frac >= 0.75 ? whole + 1 : whole;
      half = frac >= 0.25 && frac < 0.75;
    }
    const stars = [1, 2, 3, 4, 5]
      .map((n) => {
        const cls = n <= full ? "filled" : half && n === full + 1 ? "half" : "";
        return `<span class="star ${cls}" data-n="${n}" data-testid="star-${n}">★</span>`;
      })
      .join("");

    this.shadow.innerHTML = `
      <style>
        .stars { display: inline-flex; gap: 2px; font-size: 1.3rem; line-height: 1; }
        .star { color: #d8d6cf; ${readonly ? "" : "cursor: pointer;"} }
        .star.filled { color: #f2a900; }
        .star.half { background: linear-gradient(90deg, #f2a900 50%, #d8d6cf 50%); -webkit-background-clip: text; background-clip: text; color: transparent; }
      </style>
      <div class="stars" data-testid="star-rating">${stars}</div>
    `;

    if (!readonly) {
      this.shadow.querySelectorAll(".star").forEach((el) => {
        el.addEventListener("click", () => {
          this.value = Number(el.dataset.n);
          this.dispatchEvent(new CustomEvent("rating-change", { detail: { value: this.value }, bubbles: true }));
        });
      });
    }
  }
}
customElements.define("star-rating", StarRating);
