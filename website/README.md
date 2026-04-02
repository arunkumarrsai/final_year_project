# PhishGuard AI — 3D Deep Learning Phishing Detection Website

A stunning, fully interactive 3D webpage showcasing a Deep Learning phishing URL detection system. Built with Three.js, Chart.js, and vanilla JavaScript.

---

## 🚀 How to Run Locally

### Option A — Python (built-in, zero install)
```bash
# From the website folder:
python -m http.server 5500 --directory .

# Then open:  http://localhost:5500
```

### Option B — Node.js (npx serve)
```bash
npx -y serve . -p 5500
# Open:  http://localhost:5500
```

### Option C — VS Code Live Server
Open `index.html` → right-click → **Open with Live Server**

> ⚠️ You MUST serve via HTTP (not `file://`) because Three.js and CDN scripts require it.

---

## 📁 File Structure

```
website/
├── index.html          # Main page (all sections)
├── css/
│   └── style.css       # Complete stylesheet (dark, glassmorphism, neon)
└── js/
    ├── app.js          # Loading, nav, URL analyzer logic, URL checker UI
    ├── three-hero.js   # Three.js 3D neural network hero scene
    ├── network-viz.js  # Canvas 2D neural network forward-pass visualizer
    └── dashboard.js    # Chart.js: distribution, radar, features, training
```

---

## ✨ Features

| Section | What it does |
|---|---|
| **Loading Screen** | Animated grid, progress bar with phased messages |
| **3D Hero** | Three.js neural network with animated nodes, data particles, stars, mouse parallax |
| **How It Works** | 4-step animated flow with glowing connectors |
| **URL Checker** | 13-feature heuristic analyzer with step-by-step animation and result card |
| **Neural Network Viz** | Live canvas animation of the 5-layer ANN, lights up during prediction |
| **Dashboard** | Doughnut, Radar, Feature Importance bar, Training history line charts |
| **Tech Stack** | Python, TensorFlow, scikit-learn, Pandas/NumPy cards |

---

## 🎨 Design

- **Theme**: Futuristic dark / cyberpunk  
- **Colors**: Cyan (`#00f5ff`), Purple (`#7c3aed`), Green (`#10b981`), Red (`#ef4444`)  
- **Effects**: Glassmorphism cards, neon glows, Three.js WebGL, smooth scroll reveals  
- **Fonts**: Orbitron (headings), Inter (body), JetBrains Mono (code)  
- **Responsive**: Mobile, tablet, and desktop

---

## 🛡️ URL Analyzer — Features Checked

1. HTTPS vs HTTP  
2. IP address as host  
3. URL total length  
4. Suspicious TLDs (`.tk`, `.ml`, `xyz`, etc.)  
5. `@` symbol in URL  
6. Subdomain depth  
7. Hyphens in domain core  
8. Brand name impersonation  
9. Digits in domain  
10. URL shortener service  
11. Phishing keywords in path  
12. Double-slash in path  
13. Excessively long query string  

> The analyzer simulates the DL model — for production, connect it to your trained Keras model via a FastAPI/Flask endpoint.

---

## 🔗 Connect to Your Real Backend

Replace the `analyzeURL()` function call in `app.js` with a `fetch()` call to your backend:

```js
// In app.js → checkURL() function
const response = await fetch('http://localhost:8000/predict', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ url }),
});
const result = await response.json();
```

Your backend should return:
```json
{
  "isPhishing": true,
  "confidence": 94,
  "score": 94,
  "reasons": ["Reason 1", "Reason 2"],
  "features": { "URL Length": 123, "Uses HTTPS": "✗ No" }
}
```
