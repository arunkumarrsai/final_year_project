/**
 * Three.js Hero Scene
 * Renders an animated 3D neural network with glowing nodes,
 * flowing data particles, and star background.
 */
class HeroScene {
  constructor(canvasId) {
    this.canvas = document.getElementById(canvasId);
    if (!this.canvas || typeof THREE === 'undefined') return;

    // Scene setup
    this.scene    = new THREE.Scene();
    this.renderer = new THREE.WebGLRenderer({ canvas: this.canvas, antialias: true, alpha: true });
    this.camera   = new THREE.PerspectiveCamera(55, this.canvas.clientWidth / this.canvas.clientHeight, 0.1, 1000);

    // State
    this.mouse        = { x: 0, y: 0 };
    this.targetCamera = { x: 0, y: 0 };
    this.nodes        = [];
    this.edges        = [];
    this.dataParticles= [];
    this.clock        = new THREE.Clock();

    // Neural network architecture: [input, h1, h2, h3, output]
    this.layerSizes   = [5, 8, 10, 8, 2];
    this.layerColors  = [0x00f5ff, 0x7c3aed, 0xa78bfa, 0xd946ef, 0x10b981];
    this.nodePositions= []; // 2D array [layer][node]

    this.init();
  }

  init() {
    const w = window.innerWidth, h = window.innerHeight;
    this.renderer.setSize(w, h);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setClearColor(0x000000, 0);

    this.camera.position.set(0, 0, 18);
    this.camera.lookAt(0, 0, 0);

    // Fog for depth
    this.scene.fog = new THREE.FogExp2(0x04040f, 0.025);

    // Lights
    this.scene.add(new THREE.AmbientLight(0x4444ff, 0.8));
    const dLight = new THREE.DirectionalLight(0x00f5ff, 0.4);
    dLight.position.set(10, 10, 10);
    this.scene.add(dLight);

    this._buildNetwork();
    this._buildStars();
    this._buildEdgeParticles(); // persistent ambient particles on edges

    // Events
    window.addEventListener('mousemove', e => {
      this.mouse.x = (e.clientX / window.innerWidth  - 0.5) * 2;
      this.mouse.y = (e.clientY / window.innerHeight - 0.5) * 2;
    });
    window.addEventListener('resize', () => this._onResize());

    this._loop();
  }

  /* ── Neural Network ─────────────────────────────────────────── */
  _buildNetwork() {
    const LAYER_SPACING = 3.8;
    const totalW = (this.layerSizes.length - 1) * LAYER_SPACING;
    const startX = -totalW / 2;

    this.layerSizes.forEach((count, li) => {
      const layerNodes = [];
      const x = startX + li * LAYER_SPACING;
      const totalH = (count - 1) * 1.25;
      const startY = -totalH / 2;
      const color = this.layerColors[li];

      for (let ni = 0; ni < count; ni++) {
        const y = startY + ni * 1.25;
        const z = (Math.random() - 0.5) * 0.6; // slight z scatter

        // Outer glow sphere
        const glowGeo = new THREE.SphereGeometry(0.38, 12, 12);
        const glowMat = new THREE.MeshBasicMaterial({
          color, transparent: true, opacity: 0.12, side: THREE.BackSide
        });
        const glow = new THREE.Mesh(glowGeo, glowMat);

        // Node sphere
        const nGeo = new THREE.SphereGeometry(0.18, 16, 16);
        const nMat = new THREE.MeshPhongMaterial({
          color, emissive: color, emissiveIntensity: 0.7,
          transparent: true, opacity: 0.9, shininess: 120
        });
        const node = new THREE.Mesh(nGeo, nMat);
        node.position.set(x, y, z);
        node.add(glow);

        // Metadata for animation
        node.userData = {
          origPos: new THREE.Vector3(x, y, z),
          phase: Math.random() * Math.PI * 2,
          floatSpeed: 0.5 + Math.random() * 0.6,
          color, glowMat, nMat,
          li, ni
        };

        this.scene.add(node);
        this.nodes.push(node);
        layerNodes.push({ node, pos: node.position });
      }
      this.nodePositions.push(layerNodes);
    });

    // Edges between adjacent layers
    for (let l = 0; l < this.nodePositions.length - 1; l++) {
      this.nodePositions[l].forEach(({ pos: from }) => {
        this.nodePositions[l + 1].forEach(({ pos: to }) => {
          const pts = [from.clone(), to.clone()];
          const geo = new THREE.BufferGeometry().setFromPoints(pts);
          const mat = new THREE.LineBasicMaterial({
            color: 0x2222aa, transparent: true, opacity: 0.15
          });
          const line = new THREE.Line(geo, mat);
          this.scene.add(line);
          this.edges.push({ line, mat, from, to, l });
        });
      });
    }
  }

  /* ── Stars ──────────────────────────────────────────────────── */
  _buildStars() {
    const count = 1200;
    const pos   = new Float32Array(count * 3);
    const sizes = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      pos[i*3]   = (Math.random() - 0.5) * 120;
      pos[i*3+1] = (Math.random() - 0.5) * 80;
      pos[i*3+2] = (Math.random() - 0.5) * 60 - 10;
      sizes[i]   = Math.random() * 0.04 + 0.01;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('size',     new THREE.BufferAttribute(sizes, 1));
    const mat = new THREE.PointsMaterial({
      color: 0x8888bb, size: 0.06, transparent: true, opacity: 0.7,
      sizeAttenuation: true
    });
    this.stars = new THREE.Points(geo, mat);
    this.scene.add(this.stars);
  }

  /* ── Ambient edge particles (spawn periodically) ──────────────*/
  _buildEdgeParticles() {
    // A pool of small travel-spheres
    const geom = new THREE.SphereGeometry(0.06, 8, 8);
    this._particlePool = [];
    for (let i = 0; i < 40; i++) {
      const mat  = new THREE.MeshBasicMaterial({ color: 0x00f5ff, transparent: true, opacity: 0 });
      const mesh = new THREE.Mesh(geom, mat);
      mesh.visible = false;
      this.scene.add(mesh);
      this._particlePool.push({ mesh, mat, active: false, t: 0, speed: 0, from: null, to: null });
    }
    // Spawn interval
    setInterval(() => this._spawnDataParticle(), 180);
  }

  _spawnDataParticle() {
    const p = this._particlePool.find(p => !p.active);
    if (!p) return;
    // Pick random edge
    const edge = this.edges[Math.floor(Math.random() * this.edges.length)];
    const color= this.layerColors[edge.l % this.layerColors.length];
    p.from  = edge.from;
    p.to    = edge.to;
    p.t     = 0;
    p.speed = 0.008 + Math.random() * 0.01;
    p.mat.color.setHex(color);
    p.mat.opacity = 0.9;
    p.active = true;
    p.mesh.visible = true;
  }

  /* ── Animation Loop ─────────────────────────────────────────── */
  _loop() {
    requestAnimationFrame(() => this._loop());
    const t = this.clock.getElapsedTime();

    // Float nodes
    this.nodes.forEach(n => {
      const { origPos, phase, floatSpeed } = n.userData;
      n.position.y = origPos.y + Math.sin(t * floatSpeed + phase) * 0.12;
      // Pulse emissive
      const pulse = 0.55 + Math.sin(t * floatSpeed * 1.3 + phase) * 0.25;
      n.userData.nMat.emissiveIntensity = pulse;
      n.userData.glowMat.opacity = pulse * 0.18;
    });

    // Rotate stars slowly
    this.stars.rotation.y = t * 0.012;
    this.stars.rotation.x = t * 0.005;

    // Animate travel particles
    this._particlePool.forEach(p => {
      if (!p.active) return;
      p.t += p.speed;
      if (p.t >= 1) {
        p.active = false; p.mesh.visible = false; return;
      }
      p.mesh.position.lerpVectors(p.from, p.to, p.t);
      p.mat.opacity = Math.sin(p.t * Math.PI) * 0.9;
    });

    // Camera parallax: smooth mouse follow
    this.targetCamera.x += (this.mouse.x * 2.5 - this.targetCamera.x) * 0.04;
    this.targetCamera.y += (-this.mouse.y * 1.5 - this.targetCamera.y) * 0.04;
    this.camera.position.x = this.targetCamera.x;
    this.camera.position.y = this.targetCamera.y;

    // Gentle auto-rotation of whole scene
    this.scene.rotation.y = Math.sin(t * 0.08) * 0.12;
    this.scene.rotation.x = Math.sin(t * 0.06) * 0.06;

    this.camera.lookAt(0, 0, 0);
    this.renderer.render(this.scene, this.camera);
  }

  /* ── Resize ─────────────────────────────────────────────────── */
  _onResize() {
    const w = window.innerWidth, h = window.innerHeight;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
  }

  /* ── Public: Pulse all nodes (called after URL analysis) ──────*/
  pulseAll() {
    this.nodes.forEach((n, i) => {
      setTimeout(() => {
        const orig = n.userData.nMat.emissiveIntensity;
        n.userData.nMat.emissiveIntensity = 1.0;
        n.userData.glowMat.opacity = 0.5;
        setTimeout(() => {
          n.userData.nMat.emissiveIntensity = orig;
          n.userData.glowMat.opacity = 0.12;
        }, 400);
      }, i * 30);
    });
  }
}

// Initialise after DOM is ready
let heroScene;
document.addEventListener('DOMContentLoaded', () => {
  heroScene = new HeroScene('hero-canvas');
});
