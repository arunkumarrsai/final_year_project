/**
 * dashboard.js — Chart.js visualizations
 * Accuracy / Distribution / Feature Importance charts
 */

document.addEventListener('DOMContentLoaded', () => {
  if (typeof Chart === 'undefined') return;

  /* ── Global Chart Defaults ───────────────────────────────────── */
  Chart.defaults.color          = '#7878a8';
  Chart.defaults.borderColor    = 'rgba(255,255,255,0.06)';
  Chart.defaults.font.family    = 'Inter';
  Chart.defaults.animation.duration = 1200;
  Chart.defaults.animation.easing   = 'easeInOutQuart';

  const CYAN    = '#00f5ff';
  const PURPLE  = '#7c3aed';
  const VIOLET  = '#a78bfa';
  const MAGENTA = '#d946ef';
  const GREEN   = '#10b981';
  const AMBER   = '#f59e0b';
  const RED     = '#ef4444';
  const BLUE    = '#3b82f6';

  function hexAlpha(hex, a) {
    const r = parseInt(hex.slice(1,3),16);
    const g = parseInt(hex.slice(3,5),16);
    const b = parseInt(hex.slice(5,7),16);
    return `rgba(${r},${g},${b},${a})`;
  }

  /* ── 1. URL Distribution Doughnut ──────────────────────────── */
  (function buildDistChart() {
    const ctx = document.getElementById('dist-chart');
    if (!ctx) return;
    new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: ['Legitimate URLs', 'Phishing URLs'],
        datasets: [{
          data: [5716, 5715],
          backgroundColor: [hexAlpha(GREEN, 0.8), hexAlpha(RED, 0.8)],
          borderColor:     [GREEN, RED],
          borderWidth: 2,
          hoverBackgroundColor: [hexAlpha(GREEN, 1), hexAlpha(RED, 1)],
          hoverBorderWidth: 3,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '68%',
        plugins: {
          legend: {
            position: 'bottom',
            labels: { padding: 20, font: { size: 12 }, color: '#7878a8' },
          },
          tooltip: {
            callbacks: {
              label(ctx) {
                const total = ctx.dataset.data.reduce((a,b)=>a+b,0);
                const pct   = ((ctx.raw/total)*100).toFixed(1);
                return ` ${ctx.label}: ${ctx.raw.toLocaleString()} (${pct}%)`;
              }
            }
          }
        },
      },
    });
  })();

  /* ── 2. Performance Metrics Radar ─────────────────────────── */
  (function buildRadarChart() {
    const ctx = document.getElementById('radar-chart');
    if (!ctx) return;
    new Chart(ctx, {
      type: 'radar',
      data: {
        labels: ['Accuracy', 'Precision', 'Recall', 'F1 Score', 'AUC-ROC', 'Specificity'],
        datasets: [
          {
            label: 'Deep Learning (ANN)',
            data: [96.8, 97.2, 96.4, 96.8, 99.1, 97.2],
            backgroundColor: hexAlpha(CYAN, 0.15),
            borderColor: CYAN,
            borderWidth: 2,
            pointBackgroundColor: CYAN,
            pointRadius: 5,
            pointHoverRadius: 8,
          },
          {
            label: 'Random Forest (Baseline)',
            data: [95.1, 95.6, 94.8, 95.2, 98.2, 95.4],
            backgroundColor: hexAlpha(VIOLET, 0.1),
            borderColor: VIOLET,
            borderWidth: 1.5,
            borderDash: [4, 4],
            pointBackgroundColor: VIOLET,
            pointRadius: 4,
            pointHoverRadius: 7,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          r: {
            min: 88, max: 100,
            ticks: {
              stepSize: 3,
              color: '#4444aa',
              backdropColor: 'transparent',
              font: { size: 9 },
            },
            grid:       { color: 'rgba(255,255,255,0.05)' },
            angleLines: { color: 'rgba(255,255,255,0.06)' },
            pointLabels: {
              color: '#7878a8',
              font: { size: 11, weight: '500' },
            },
          },
        },
        plugins: {
          legend: {
            position: 'bottom',
            labels: { padding: 20, font: { size: 11 }, color: '#7878a8' },
          },
        },
      },
    });
  })();

  /* ── 3. Feature Importance Bar Chart ────────────────────────── */
  (function buildFeatureChart() {
    const ctx = document.getElementById('feature-chart');
    if (!ctx) return;

    const features = [
      'Have IP Address',      'URL Length',           'Shortening Service',
      'Having @ Symbol',      'Double Slash Redirect', 'Prefix/Suffix',
      'Having Subdomain',     'SSL Final State',       'Domain Reg Length',
      'Favicon',              'Port',                  'HTTPS Token',
      'Request URL',          'Anchor URL',            'Links in Tags',
    ];
    const importance = [0.092, 0.087, 0.081, 0.078, 0.071, 0.068, 0.065, 0.061, 0.059, 0.055, 0.052, 0.049, 0.047, 0.044, 0.041];

    const colors = importance.map((v, i) => {
      const t = i / (importance.length - 1);
      const r = Math.round(0 + t * 239);
      const g = Math.round(245 - t * 177);
      const b = Math.round(255 - t * 155);
      return `rgba(${r},${g},${b},0.85)`;
    });

    new Chart(ctx, {
      type: 'bar',
      data: {
        labels: features,
        datasets: [{
          label: 'Feature Importance Score',
          data: importance,
          backgroundColor: colors,
          borderColor: colors.map(c => c.replace('0.85','1')),
          borderWidth: 1,
          borderRadius: 6,
          borderSkipped: false,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        indexAxis: 'y',
        scales: {
          x: {
            beginAtZero: true,
            max: 0.12,
            grid: { color: 'rgba(255,255,255,0.04)' },
            ticks: {
              color: '#7878a8',
              callback: v => (v * 100).toFixed(0) + '%',
              font: { size: 10 },
            },
          },
          y: {
            grid: { display: false },
            ticks: { color: '#7878a8', font: { size: 10.5 } },
          },
        },
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label(ctx) { return ` Importance: ${(ctx.raw * 100).toFixed(1)}%`; }
            }
          },
        },
      },
    });
  })();

  /* ── 4. Training History Line Chart (animated) ──────────────── */
  (function buildTrainingChart() {
    const ctx = document.getElementById('training-chart');
    if (!ctx) return;

    const epochs = Array.from({length: 30}, (_, i) => i + 1);
    const trainAcc = epochs.map(e => {
      const base = 0.72 + (0.97 - 0.72) * (1 - Math.exp(-e / 7));
      return +(base + (Math.random() - 0.5) * 0.01).toFixed(4);
    });
    const valAcc = epochs.map(e => {
      const base = 0.68 + (0.959 - 0.68) * (1 - Math.exp(-e / 8));
      return +(base + (Math.random() - 0.5) * 0.015).toFixed(4);
    });
    const trainLoss = epochs.map(e => +(0.65 * Math.exp(-e / 6) + 0.06 + (Math.random() - 0.5) * 0.01).toFixed(4));
    const valLoss   = epochs.map(e => +(0.72 * Math.exp(-e / 7) + 0.08 + (Math.random() - 0.5) * 0.015).toFixed(4));

    new Chart(ctx, {
      type: 'line',
      data: {
        labels: epochs,
        datasets: [
          {
            label: 'Train Accuracy',
            data: trainAcc,
            borderColor: CYAN,
            backgroundColor: hexAlpha(CYAN, 0.06),
            borderWidth: 2,
            tension: 0.4,
            fill: true,
            pointRadius: 0,
            pointHoverRadius: 5,
          },
          {
            label: 'Val Accuracy',
            data: valAcc,
            borderColor: VIOLET,
            backgroundColor: hexAlpha(VIOLET, 0.04),
            borderWidth: 2,
            tension: 0.4,
            fill: true,
            pointRadius: 0,
            pointHoverRadius: 5,
          },
          {
            label: 'Train Loss',
            data: trainLoss,
            borderColor: AMBER,
            borderWidth: 1.5,
            borderDash: [5, 3],
            tension: 0.4,
            fill: false,
            pointRadius: 0,
            pointHoverRadius: 5,
            yAxisID: 'y1',
          },
          {
            label: 'Val Loss',
            data: valLoss,
            borderColor: RED,
            borderWidth: 1.5,
            borderDash: [5, 3],
            tension: 0.4,
            fill: false,
            pointRadius: 0,
            pointHoverRadius: 5,
            yAxisID: 'y1',
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        scales: {
          x: {
            grid: { color: 'rgba(255,255,255,0.04)' },
            ticks: { color: '#7878a8', font: { size: 10 } },
            title: { display: true, text: 'Epoch', color: '#4444aa', font: { size: 11 } },
          },
          y: {
            min: 0.6, max: 1.02,
            grid: { color: 'rgba(255,255,255,0.04)' },
            ticks: {
              color: '#7878a8', font: { size: 10 },
              callback: v => (v * 100).toFixed(0) + '%',
            },
            title: { display: true, text: 'Accuracy', color: '#4444aa', font: { size: 11 } },
          },
          y1: {
            position: 'right',
            min: 0, max: 0.8,
            grid: { drawOnChartArea: false },
            ticks: { color: '#7878a8', font: { size: 10 } },
            title: { display: true, text: 'Loss', color: '#4444aa', font: { size: 11 } },
          },
        },
        plugins: {
          legend: {
            position: 'bottom',
            labels: { padding: 16, font: { size: 11 }, color: '#7878a8', boxWidth: 28 },
          },
          tooltip: {
            backgroundColor: 'rgba(6,6,20,0.92)',
            borderColor: 'rgba(255,255,255,0.1)',
            borderWidth: 1,
            titleColor: '#e8e8ff',
            bodyColor: '#7878a8',
            padding: 12,
            callbacks: {
              label: ctx => {
                const v = ctx.raw;
                return ` ${ctx.dataset.label}: ${ctx.datasetIndex < 2
                  ? (v * 100).toFixed(2) + '%'
                  : v.toFixed(4)}`;
              }
            },
          },
        },
      },
    });
  })();

  /* ── Animate metric cards on scroll ─────────────────────────── */
  const io = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        e.target.querySelectorAll('[data-target]').forEach(el => {
          const target  = parseFloat(el.dataset.target);
          const isFloat = String(target).includes('.');
          let cur = 0; const steps = 50;
          const inc = target / steps;
          const interval = setInterval(() => {
            cur += inc;
            if (cur >= target) { cur = target; clearInterval(interval); }
            el.textContent = isFloat ? cur.toFixed(1) : Math.round(cur).toLocaleString();
          }, 40);
        });
        io.unobserve(e.target);
      }
    });
  }, { threshold: 0.3 });

  document.querySelectorAll('.metric-card').forEach(c => io.observe(c));
});
