/**
 * app.js — Main application logic
 * - Loading screen
 * - Navigation scroll behaviour
 * - Counter animations
 * - Scroll reveal
 * - URL heuristic analyzer
 * - UI interactions
 */

/* ══════════════════════════════════════════════════════════════════
   LOADING SCREEN
══════════════════════════════════════════════════════════════════ */
(function initLoading() {
  const messages = [
    'LOADING NEURAL NETWORK WEIGHTS...',
    'EXTRACTING URL FEATURES...',
    'COMPILING MODEL LAYERS...',
    'CALIBRATING DETECTION THRESHOLDS...',
    'INITIALIZING SECURITY ENGINE...',
    'ALL SYSTEMS READY ✓',
  ];
  const bar    = document.getElementById('loading-bar');
  const status = document.getElementById('loading-status');
  let pct = 0;
  let msgIdx = 0;

  const tick = setInterval(() => {
    pct += Math.random() * 18 + 4;
    if (pct > 100) pct = 100;

    bar.style.width = pct + '%';

    const mIdx = Math.min(Math.floor(pct / 18), messages.length - 1);
    if (mIdx !== msgIdx) {
      msgIdx = mIdx;
      status.textContent = messages[msgIdx];
    }

    if (pct >= 100) {
      clearInterval(tick);
      status.textContent = messages[messages.length - 1];
      setTimeout(() => {
        document.getElementById('loading-screen').classList.add('hidden');
      }, 600);
    }
  }, 200);
})();

/* ══════════════════════════════════════════════════════════════════
   NAVIGATION
══════════════════════════════════════════════════════════════════ */
(function initNav() {
  const navbar = document.getElementById('navbar');
  window.addEventListener('scroll', () => {
    navbar.classList.toggle('scrolled', window.scrollY > 40);
  });

  // Hamburger (mobile)
  const ham = document.getElementById('hamburger');
  const mobileMenu = document.getElementById('mobile-menu');
  if (ham && mobileMenu) {
    ham.addEventListener('click', () => {
      mobileMenu.classList.toggle('open');
    });
  }

  // Active link highlight
  const sections = document.querySelectorAll('section[id]');
  const links    = document.querySelectorAll('.nav-links a');
  const io = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        links.forEach(a => a.classList.remove('active'));
        const active = document.querySelector(`.nav-links a[href="#${e.target.id}"]`);
        if (active) active.classList.add('active');
      }
    });
  }, { threshold: 0.4 });
  sections.forEach(s => io.observe(s));
})();

/* ══════════════════════════════════════════════════════════════════
   SCROLL REVEAL
══════════════════════════════════════════════════════════════════ */
(function initReveal() {
  const io = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        e.target.classList.add('visible');
        io.unobserve(e.target);
      }
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });

  document.querySelectorAll('.reveal, .flow-step').forEach(el => io.observe(el));
})();

/* ══════════════════════════════════════════════════════════════════
   COUNTER ANIMATION
══════════════════════════════════════════════════════════════════ */
function animateCounter(el) {
  const target   = parseFloat(el.dataset.target);
  const isFloat  = String(target).includes('.');
  const decimals = isFloat ? 1 : 0;
  const duration = 2000;
  const steps    = 60;
  const increment= target / steps;
  let current    = 0;
  let step       = 0;

  const interval = setInterval(() => {
    step++;
    current += increment;
    if (step >= steps) {
      current = target;
      clearInterval(interval);
    }
    el.textContent = current.toFixed(decimals);
  }, duration / steps);
}

(function initCounters() {
  const io = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        e.target.querySelectorAll('[data-target]').forEach(animateCounter);
        io.unobserve(e.target);
      }
    });
  }, { threshold: 0.3 });

  document.querySelectorAll('#hero, #dashboard').forEach(s => io.observe(s));
})();

/* ══════════════════════════════════════════════════════════════════
   HELPER UTILITIES
══════════════════════════════════════════════════════════════════ */
function scrollToSection(id) {
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
}

function scrollToChecker() { scrollToSection('checker'); }

/* ══════════════════════════════════════════════════════════════════
   URL HEURISTIC ANALYZER
   Simulates a deep learning model's feature extraction + scoring.
══════════════════════════════════════════════════════════════════ */
function analyzeURL(rawUrl) {
  let url = rawUrl.trim();
  if (!/^https?:\/\//i.test(url)) url = 'http://' + url;

  let score = 0;
  const flagged = [];
  const clean   = [];
  let parsed;

  try { parsed = new URL(url); }
  catch { return { error: 'Please enter a valid URL (e.g., https://example.com)' }; }

  const hostname = parsed.hostname.toLowerCase();
  const full     = url.toLowerCase();
  const path     = parsed.pathname.toLowerCase();
  const domParts = hostname.split('.');
  const domCore  = domParts.length >= 2 ? domParts[domParts.length - 2] : hostname;

  /* ── Features ─────────────────────────────────────────────────── */

  // F1: HTTPS
  if (parsed.protocol !== 'https:') {
    score += 22; flagged.push('No HTTPS — connection is unencrypted');
  } else {
    clean.push('Secure HTTPS connection (SSL/TLS)');
  }

  // F2: IP address as host
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(hostname)) {
    score += 35; flagged.push('IP address used instead of domain name');
  }

  // F3: URL length
  if (url.length > 100) {
    score += 15; flagged.push(`Suspiciously long URL (${url.length} characters)`);
  } else if (url.length > 75) {
    score += 8;  flagged.push(`Long URL detected (${url.length} characters)`);
  }

  // F4: Suspicious TLDs
  const badTLDs = ['.tk','.ml','.ga','.cf','.gq','.xyz','.top','.work','.loan','.win','.racing','.review','.country','.stream','.link','.click','.download','.gdn'];
  if (badTLDs.some(t => hostname.endsWith(t))) {
    score += 28; flagged.push('High-risk top-level domain (TLD) detected');
  } else if (['.com','.org','.net','.edu','.gov'].some(t => hostname.endsWith(t))) {
    clean.push('Trusted top-level domain');
  }

  // F5: @ symbol
  if (full.includes('@')) {
    score += 30; flagged.push('@ symbol in URL — redirects to different destination');
  }

  // F6: Subdomains
  const subCount = domParts.length - 2;
  if (subCount > 3) {
    score += 20; flagged.push(`Excessive subdomains (${subCount} levels deep)`);
  } else if (subCount > 2) {
    score += 10; flagged.push(`Multiple subdomains detected (${subCount} levels)`);
  }

  // F7: Hyphens in domain core
  const hyphens = (domCore.match(/-/g) || []).length;
  if (hyphens >= 3) {
    score += 15; flagged.push(`Many hyphens in domain name (${hyphens})`);
  } else if (hyphens >= 2) {
    score += 8;
  }

  // F8: Brand keywords in a non-brand domain
  const brands = ['paypal','amazon','apple','google','microsoft','netflix','facebook','instagram','twitter','steam','ebay','chase','wellsfargo','bankofamerica','linkedin'];
  const impersonated = brands.filter(b => domCore.includes(b) && !hostname.endsWith(b + '.com'));
  if (impersonated.length > 0) {
    score += 35 * impersonated.length;
    flagged.push(`Brand impersonation: "${impersonated.join(', ')}" in domain`);
  }

  // F9: Numbers in domain core
  if (/\d/.test(domCore) && !['1password','mp3','mp4'].some(ok => domCore.includes(ok))) {
    score += 10; flagged.push('Digits present in domain core');
  }

  // F10: URL shorteners
  const shorteners = ['bit.ly','tinyurl.com','t.co','goo.gl','ow.ly','short.link','rebrand.ly','buff.ly'];
  if (shorteners.some(s => hostname.includes(s))) {
    score += 22; flagged.push('URL shortener detected — hides true destination');
  }

  // F11: Phishing path keywords
  const pathKw = ['login','signin','verify','update','confirm','account','secure','banking','credential','password','reset','suspend'];
  const foundPathKw = pathKw.filter(k => (path + full).includes(k));
  if (foundPathKw.length >= 2) {
    score += 18; flagged.push(`Phishing keywords in URL path: ${foundPathKw.slice(0,3).join(', ')}`);
  } else if (foundPathKw.length === 1) {
    score += 8;
  }

  // F12: Double slash in path
  if (path.includes('//')) {
    score += 10; flagged.push('Unusual double-slash in URL path');
  }

  // F13: Long query string
  if (parsed.search.length > 100) {
    score += 8; flagged.push('Excessively long query parameters');
  }

  score = Math.min(Math.round(score), 100);

  // Safe notes
  if (clean.length < 2) {
    clean.push('URL structure appears normal');
    clean.push('No known malicious patterns detected');
  }

  const isPhishing = score >= 35;
  const confidence = isPhishing ? score : 100 - score;

  return {
    url: rawUrl,
    isPhishing,
    score,           // raw phishing score (0-100)
    confidence,      // confidence in the verdict (0-100)
    reasons: isPhishing ? flagged : clean,
    features: {
      'URL Length':    url.length,
      'Uses HTTPS':   parsed.protocol === 'https:' ? '✓ Yes' : '✗ No',
      'Subdomain Depth': subCount,
      'Hyphens in Domain': hyphens,
      'Path Keywords': foundPathKw.length,
      'Brand Spoof':   impersonated.length > 0 ? '⚠ Yes' : '✓ No',
    },
  };
}

/* ══════════════════════════════════════════════════════════════════
   URL CHECKER — UI
══════════════════════════════════════════════════════════════════ */
let isAnalyzing = false;

async function checkURL() {
  if (isAnalyzing) return;
  const input = document.getElementById('url-input');
  const url   = input.value.trim();

  if (!url) {
    input.focus();
    input.style.borderColor = '#ef4444';
    setTimeout(() => (input.style.borderColor = ''), 1500);
    return;
  }

  isAnalyzing  = true;
  const btn    = document.getElementById('check-btn');
  const origTxt= btn.innerHTML;
  btn.innerHTML= `<span class="spinner"></span><span>Analyzing…</span>`;
  btn.disabled = true;

  // Show steps UI
  const stepsEl = document.getElementById('analysis-steps');
  const resultEl = document.getElementById('result-area');
  stepsEl.classList.add('show');
  resultEl.classList.remove('show');
  resultEl.innerHTML = '';

  // Reset previous step states
  const steps = ['step-parse','step-extract','step-infer','step-result'];
  const labels= ['URL Parsing', 'Feature Extraction', 'Model Inference', 'Result'];
  steps.forEach(id => {
    const el = document.getElementById(id);
    el?.classList.remove('active', 'done');
  });

  // Animate steps sequentially
  for (let i = 0; i < steps.length; i++) {
    await sleep(600);
    document.getElementById(steps[i])?.classList.add('active');
  }

  await sleep(400);

  // Run analysis locally to maintain UI format
  const result = analyzeURL(url);

  if (result.error) {
    stepsEl.classList.remove('show');
    isAnalyzing = false;
    btn.innerHTML = origTxt; btn.disabled = false;
    showToast(result.error, 'error');
    return;
  }

  // Connect to the new FastAPI Backend
  try {
    const api_res = await fetch('/api/predict', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url_or_prompt: url, session_id: "web-user" })
    });
    const data = await api_res.json();
    
    // Merge the AI Database Backend response seamlessly!
    if (data.status === 'success' && data.response) {
      // Format the text properly for the HTML reasons list
      const formattedResponse = "<strong>AI DATABASE AGENT VERDICT:</strong><br/>" + data.response.replace(/\n/g, '<br/>');
      result.reasons.unshift(formattedResponse);
      
      // Update classification based on the powerful AI response
      if (data.response.includes('WARNING') || data.response.includes('PHISHING')) {
        result.isPhishing = true;
        result.confidence = Math.max(result.confidence, 98);
      }
    }
  } catch (err) {
    console.warn("Backend API not reachable or not running. Using local simulated analysis only.", err);
  }

  // Mark all steps done
  steps.forEach(id => {
    const el = document.getElementById(id);
    el?.classList.remove('active');
    el?.classList.add('done');
  });

  // Render result
  renderResult(result, resultEl);
  resultEl.classList.add('show');

  // Trigger neural network forward pass
  if (typeof networkViz !== 'undefined') {
    networkViz.reset();
    setTimeout(() => networkViz.runForwardPass(result.isPhishing), 400);
    scrollToSection('neural-viz');
  }

  // Pulse hero scene
  if (typeof heroScene !== 'undefined') heroScene.pulseAll();

  isAnalyzing = false;
  btn.innerHTML = origTxt; btn.disabled = false;
}

function renderResult(result, container) {
  const cls   = result.isPhishing ? 'phishing' : 'safe';
  const icon  = result.isPhishing ? '🚨' : '✅';
  const label = result.isPhishing ? 'PHISHING DETECTED' : 'SAFE WEBSITE';
  const confBg= `width: ${result.confidence}%`;

  // Feature pills
  const featurePills = Object.entries(result.features).map(([k, v]) => {
    const isBad = String(v).includes('✗') || String(v).includes('⚠');
    return `<div class="feature-item">
      <div class="feature-dot ${isBad ? 'bad' : 'good'}"></div>
      <span><strong>${k}:</strong> ${v}</span>
    </div>`;
  }).join('');

  // Reasons list
  const reasonItems = result.reasons.map(r => `<li>${r}</li>`).join('');

  container.innerHTML = `
    <div class="result-verdict ${cls}">
      <div class="verdict-icon">${icon}</div>
      <div class="verdict-text">
        <h3 style="${result.isPhishing ? 'animation:neonFlicker 3s ease infinite' : ''}">${label}</h3>
        <p style="font-size:0.85rem;color:var(--text-secondary);margin:0">
          ${result.isPhishing
            ? '⚠️ Do NOT enter any personal information on this site.'
            : 'No significant threats detected. Stay vigilant.'}
        </p>
      </div>
      <div class="confidence-bar-wrap">
        <span class="confidence-label">Confidence</span>
        <div class="confidence-pct">${result.confidence}%</div>
        <div class="conf-bar-outer">
          <div class="conf-bar-inner" style="${confBg}"></div>
        </div>
      </div>
    </div>

    <div class="result-features">${featurePills}</div>

    <div class="reasons-list">
      <h4>${result.isPhishing ? '🔍 Risk Factors Identified' : '✅ Safety Indicators'}</h4>
      <ul>${reasonItems}</ul>
    </div>

    ${result.isPhishing ? `
    <div style="margin-top:16px;padding:16px 20px;border-radius:12px;background:rgba(239,68,68,0.08);border:1px solid rgba(239,68,68,0.3)">
      <h4 style="color:var(--accent-red);font-size:0.82rem;letter-spacing:0.08em;text-transform:uppercase;margin-bottom:10px">
        🛡️ Protection Steps
      </h4>
      <ul style="list-style:none;display:flex;flex-direction:column;gap:6px">
        <li style="font-size:0.83rem;color:var(--text-secondary)">⛔ Do NOT enter passwords, credit cards, or personal info</li>
        <li style="font-size:0.83rem;color:var(--text-secondary)">🚫 Avoid clicking any links or downloading files</li>
        <li style="font-size:0.83rem;color:var(--text-secondary)">📴 Close this site immediately</li>
        <li style="font-size:0.83rem;color:var(--text-secondary)">🔔 Report to Google Safe Browsing or your ISP</li>
        <li style="font-size:0.83rem;color:var(--text-secondary)">🔐 Enable 2FA on your important accounts</li>
      </ul>
    </div>` : ''}
  `;
}

function testURL(url) {
  document.getElementById('url-input').value = url;
  checkURL();
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

/* ── Toast ──────────────────────────────────────────────────────── */
function showToast(msg, type = 'info') {
  const t = document.createElement('div');
  t.className = 'toast';
  t.textContent = msg;
  t.style.cssText = `
    position:fixed;bottom:28px;left:50%;transform:translateX(-50%) translateY(20px);
    background:${type === 'error' ? 'rgba(239,68,68,0.95)' : 'rgba(10,10,30,0.95)'};
    color:#fff;padding:12px 24px;border-radius:50px;font-size:0.88rem;font-weight:500;
    box-shadow:0 8px 30px rgba(0,0,0,0.4);z-index:9000;
    transition:all 0.4s ease;opacity:0;
  `;
  document.body.appendChild(t);
  requestAnimationFrame(() => {
    t.style.opacity = '1'; t.style.transform = 'translateX(-50%) translateY(0)';
  });
  setTimeout(() => {
    t.style.opacity = '0'; t.style.transform = 'translateX(-50%) translateY(10px)';
    setTimeout(() => t.remove(), 400);
  }, 3000);
}

/* ══════════════════════════════════════════════════════════════════
   KEYBOARD SUPPORT
══════════════════════════════════════════════════════════════════ */
document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('url-input')?.addEventListener('keydown', e => {
    if (e.key === 'Enter') checkURL();
  });

  // Viz controls
  document.getElementById('btn-run-demo')?.addEventListener('click', () => {
    if (typeof networkViz !== 'undefined') {
      networkViz.reset();
      setTimeout(() => networkViz.runForwardPass(Math.random() > 0.5), 100);
    }
  });

  document.getElementById('btn-reset-viz')?.addEventListener('click', () => {
    if (typeof networkViz !== 'undefined') networkViz.reset();
  });
});
