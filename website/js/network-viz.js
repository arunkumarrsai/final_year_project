/**
 * Neural Network Canvas Visualizer
 * 2D canvas render of the DL model architecture.
 * Supports animated data-flow highlighting during prediction.
 */
class NetworkVisualizer {
  constructor(canvasId) {
    this.canvas = document.getElementById(canvasId);
    if (!this.canvas) return;
    this.ctx    = this.canvas.getContext('2d');
    this.W      = 0;
    this.H      = 0;
    this.dpr    = window.devicePixelRatio || 1;

    // Architecture: [label, nodeCount, color]
    this.layers = [
      { name: 'Input',    nodes: 5,  color: '#00f5ff' },
      { name: 'Dense 1', nodes: 64, color: '#7c3aed' },
      { name: 'Dense 2', nodes: 32, color: '#a78bfa' },
      { name: 'Dense 3', nodes: 16, color: '#d946ef' },
      { name: 'Output',  nodes: 2,  color: '#10b981' },
    ];

    // Clamp visible nodes for drawing (dense layers would be huge)
    this.drawConfig = [
      { label: 'Input Layer',    draw: 5,  actual: 5,   color: '#00f5ff' },
      { label: 'Hidden Layer 1', draw: 8,  actual: 64,  color: '#7c3aed' },
      { label: 'Hidden Layer 2', draw: 6,  actual: 32,  color: '#a78bfa' },
      { label: 'Hidden Layer 3', draw: 4,  actual: 16,  color: '#d946ef' },
      { label: 'Output Layer',   draw: 2,  actual: 2,   color: '#10b981' },
    ];

    this.nodePositions = [];  // [layer][node] = {x, y}
    this.activeSet     = new Set(); // "l-n" keys
    this.dataParticles = [];
    this.time          = 0;

    this._buildLayerInfo();
    this._resize();
    window.addEventListener('resize', () => this._resize());
    this._loop();

    // Auto run idle animation
    setInterval(() => this._idleParticle(), 600);
  }

  /* ── Resize & Recompute ─────────────────────────────────────── */
  _resize() {
    const rect = this.canvas.getBoundingClientRect();
    this.W = rect.width;
    this.H = rect.height;
    this.canvas.width  = this.W * this.dpr;
    this.canvas.height = this.H * this.dpr;
    this.ctx.scale(this.dpr, this.dpr);
    this._computePositions();
  }

  _computePositions() {
    this.nodePositions = [];
    const PAD_X = 60, PAD_Y = 40;
    const usableW = this.W - PAD_X * 2;
    const usableH = this.H - PAD_Y * 2;
    const layerSpacingX = usableW / (this.drawConfig.length - 1);

    this.drawConfig.forEach((layer, li) => {
      const x = PAD_X + li * layerSpacingX;
      const nodeSpacingY = usableH / (layer.draw + 1);
      const nodes = [];
      for (let ni = 0; ni < layer.draw; ni++) {
        const y = PAD_Y + nodeSpacingY * (ni + 1);
        nodes.push({ x, y });
      }
      this.nodePositions.push(nodes);
    });
  }

  /* ── Main Draw Loop ─────────────────────────────────────────── */
  _loop() {
    requestAnimationFrame(() => this._loop());
    this.time += 0.016;
    this._draw();
  }

  _draw() {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.W, this.H);

    // Background grid (subtle)
    this._drawGrid(ctx);

    // Edges
    for (let l = 0; l < this.nodePositions.length - 1; l++) {
      const fromLayer = this.nodePositions[l];
      const toLayer   = this.nodePositions[l + 1];
      fromLayer.forEach((from, fi) => {
        toLayer.forEach((to, ti) => {
          const isActive = this.activeSet.has(`${l}-${fi}`) && this.activeSet.has(`${l+1}-${ti}`);
          ctx.save();
          ctx.beginPath();
          ctx.moveTo(from.x, from.y);
          ctx.lineTo(to.x, to.y);
          if (isActive) {
            ctx.strokeStyle = this._alpha(this.drawConfig[l].color, 0.6);
            ctx.lineWidth   = 1.5;
            ctx.shadowBlur  = 8;
            ctx.shadowColor = this.drawConfig[l].color;
          } else {
            ctx.strokeStyle = 'rgba(80,80,160,0.12)';
            ctx.lineWidth   = 0.6;
          }
          ctx.stroke();
          ctx.restore();
        });
      });
    }

    // Data particles
    this.dataParticles = this.dataParticles.filter(p => {
      p.t += p.speed;
      if (p.t >= 1) return false;
      const from = this.nodePositions[p.fromL][p.fromN];
      const to   = this.nodePositions[p.toL][p.toN];
      if (!from || !to) return false;
      const px = from.x + (to.x - from.x) * p.t;
      const py = from.y + (to.y - from.y) * p.t;

      const alpha   = Math.sin(p.t * Math.PI);
      const radius  = 4;
      const grd     = ctx.createRadialGradient(px, py, 0, px, py, radius * 3);
      grd.addColorStop(0, this._alpha(p.color, alpha));
      grd.addColorStop(1, this._alpha(p.color, 0));

      ctx.save();
      ctx.beginPath();
      ctx.arc(px, py, radius * 3, 0, Math.PI * 2);
      ctx.fillStyle = grd;
      ctx.fill();

      ctx.beginPath();
      ctx.arc(px, py, radius * 0.6, 0, Math.PI * 2);
      ctx.fillStyle = this._alpha('#ffffff', alpha * 0.9);
      ctx.fill();
      ctx.restore();
      return true;
    });

    // Nodes
    this.nodePositions.forEach((layer, li) => {
      const cfg      = this.drawConfig[li];
      const hasDots  = cfg.actual > cfg.draw;
      layer.forEach((node, ni) => {
        const key      = `${li}-${ni}`;
        const isActive = this.activeSet.has(key);
        const pulse    = isActive
          ? 1.0 + Math.sin(this.time * 6 + ni) * 0.3
          : 0.5 + Math.sin(this.time * 1.5 + ni * 0.7) * 0.1;

        this._drawNode(ctx, node.x, node.y, cfg.color, isActive, pulse);
      });

      // Ellipsis for large layers
      if (hasDots) {
        const last = layer[layer.length - 1];
        ctx.fillStyle = 'rgba(150,150,200,0.5)';
        ctx.font      = '18px Inter';
        ctx.textAlign = 'center';
        ctx.fillText('⋮', last.x, last.y + 30);
      }
    });

    // Layer labels
    this.drawConfig.forEach((cfg, li) => {
      const firstNode = this.nodePositions[li]?.[0];
      if (!firstNode) return;
      ctx.save();
      ctx.font      = `600 11px Inter`;
      ctx.fillStyle = this._alpha(cfg.color, 0.75);
      ctx.textAlign = 'center';
      ctx.fillText(cfg.label, firstNode.x, 22);
      ctx.fillStyle = 'rgba(150,150,200,0.4)';
      ctx.font      = '10px JetBrains Mono';
      ctx.fillText(`(${cfg.actual})`, firstNode.x, 36);
      ctx.restore();
    });
  }

  _drawNode(ctx, x, y, color, isActive, pulse) {
    const R = isActive ? 9 : 7;

    // Glow halo
    if (isActive) {
      const grd = ctx.createRadialGradient(x, y, 0, x, y, R * 4 * pulse);
      grd.addColorStop(0, this._alpha(color, 0.4 * pulse));
      grd.addColorStop(1, this._alpha(color, 0));
      ctx.beginPath();
      ctx.arc(x, y, R * 4 * pulse, 0, Math.PI * 2);
      ctx.fillStyle = grd;
      ctx.fill();
    }

    // Outer ring
    ctx.beginPath();
    ctx.arc(x, y, R, 0, Math.PI * 2);
    ctx.strokeStyle = this._alpha(color, isActive ? 1 : 0.5);
    ctx.lineWidth   = isActive ? 2 : 1;
    if (isActive) { ctx.shadowBlur = 12; ctx.shadowColor = color; }
    ctx.stroke();
    ctx.shadowBlur = 0;

    // Fill
    ctx.beginPath();
    ctx.arc(x, y, R - 2, 0, Math.PI * 2);
    ctx.fillStyle = isActive ? this._alpha(color, 0.85) : this._alpha(color, 0.2);
    ctx.fill();
  }

  _drawGrid(ctx) {
    const step = 48;
    ctx.save();
    ctx.strokeStyle = 'rgba(60,60,120,0.12)';
    ctx.lineWidth   = 0.5;
    for (let x = 0; x < this.W; x += step) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, this.H); ctx.stroke();
    }
    for (let y = 0; y < this.H; y += step) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(this.W, y); ctx.stroke();
    }
    ctx.restore();
  }

  _alpha(hex, a) {
    const r = parseInt(hex.slice(1,3),16);
    const g = parseInt(hex.slice(3,5),16);
    const b = parseInt(hex.slice(5,7),16);
    return `rgba(${r},${g},${b},${a})`;
  }

  /* ── Particle Spawn ─────────────────────────────────────────── */
  _spawnParticle(fromL, fromN, toL, toN, color) {
    const fNodes = this.nodePositions[fromL];
    const tNodes = this.nodePositions[toL];
    if (!fNodes || !tNodes || !fNodes[fromN] || !tNodes[toN]) return;
    this.dataParticles.push({
      fromL, fromN, toL, toN,
      color: color || this.drawConfig[fromL].color,
      t: 0, speed: 0.012 + Math.random() * 0.012
    });
  }

  // Idle: random particles keep the network "alive"
  _idleParticle() {
    const l = Math.floor(Math.random() * (this.drawConfig.length - 1));
    const fn = Math.floor(Math.random() * this.drawConfig[l].draw);
    const tn = Math.floor(Math.random() * this.drawConfig[l + 1].draw);
    this._spawnParticle(l, fn, l + 1, tn, this.drawConfig[l].color);
  }

  /* ── Layer info sidebar update ──────────────────────────────── */
  _buildLayerInfo() {
    const el = document.getElementById('layer-list');
    if (!el) return;
    el.innerHTML = '';
    this.drawConfig.forEach((cfg, li) => {
      const item = document.createElement('div');
      item.className = 'layer-item';
      item.id = `layer-item-${li}`;
      item.innerHTML = `
        <div class="layer-dot" style="background:${cfg.color};box-shadow:0 0 6px ${cfg.color}"></div>
        <span class="layer-name">${cfg.label}</span>
        <span class="layer-size">${cfg.actual} units</span>
      `;
      el.appendChild(item);
    });
  }

  /* ── Public: run a forward-pass animation ───────────────────── */
  runForwardPass(isPhishing = false) {
    this.activeSet.clear();
    this.dataParticles = [];
    const highlightColor = isPhishing ? '#ef4444' : '#10b981';
    const totalLayers = this.drawConfig.length;

    let delay = 0;
    for (let l = 0; l < totalLayers; l++) {
      const layerDelay  = delay;
      const cfg         = this.drawConfig[l];
      const nodesInLayer= cfg.draw;

      // Highlight all nodes in this layer
      setTimeout(() => {
        for (let ni = 0; ni < nodesInLayer; ni++) {
          this.activeSet.add(`${l}-${ni}`);
          document.getElementById(`layer-item-${l}`)?.classList.add('active-layer');
        }
        // Spawn particles to next layer
        if (l < totalLayers - 1) {
          const nextCfg = this.drawConfig[l + 1];
          for (let ni = 0; ni < nodesInLayer; ni++) {
            const toN = Math.floor(Math.random() * nextCfg.draw);
            setTimeout(() => {
              this._spawnParticle(l, ni, l + 1, toN,
                l === totalLayers - 2 ? highlightColor : cfg.color);
            }, ni * 40);
          }
        }
      }, layerDelay);

      delay += 600;
    }

    // Clear after animation
    setTimeout(() => {
      this.activeSet.clear();
      document.querySelectorAll('.layer-item').forEach(el => el.classList.remove('active-layer'));
    }, delay + 800);
  }

  /* ── Public: reset ──────────────────────────────────────────── */
  reset() {
    this.activeSet.clear();
    this.dataParticles = [];
    document.querySelectorAll('.layer-item').forEach(el => el.classList.remove('active-layer'));
  }
}

// Instantiate after DOM is ready
let networkViz;
document.addEventListener('DOMContentLoaded', () => {
  networkViz = new NetworkVisualizer('network-canvas');
});
