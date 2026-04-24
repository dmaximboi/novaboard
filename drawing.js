// drawing.js - Canvas drawing, shapes, and animations

const drawing = {
  canvas: null,
  ctx: null,
  isDrawing: false,
  tool: 'cursor', // cursor, pen, pencil, eraser
  color: 'var(--chalk)',
  thickness: 4,
  shapes: [],

  // ✅ Cached scroll values — updated on scroll event, NOT read inside draw()
  _scrollLeft: 0,
  _scrollTop: 0,

  init() {
    this.canvas = document.getElementById('drawCanvas');
    this.ctx = this.canvas.getContext('2d');

    this.resizeCanvas();

    // ✅ ResizeObserver instead of MutationObserver — won't loop when canvas changes
    const ro = new ResizeObserver(() => this.resizeCanvas());
    ro.observe(document.getElementById('boardContent'));

    window.addEventListener('resize', () => this.resizeCanvas());

    // ✅ Cache scroll position once on scroll — avoids layout reflow inside draw()
    const content = document.getElementById('boardContent');
    content.addEventListener('scroll', () => {
      this._scrollLeft = content.scrollLeft;
      this._scrollTop = content.scrollTop;
    });

    // Mouse events
    this.canvas.addEventListener('mousedown', this.startDraw.bind(this));
    this.canvas.addEventListener('mousemove', this.draw.bind(this));
    this.canvas.addEventListener('mouseup', this.stopDraw.bind(this));
    this.canvas.addEventListener('mouseout', this.stopDraw.bind(this));

    // Touch support
    this.canvas.addEventListener('touchstart', e => {
      e.preventDefault();
      this.startDraw(e.touches[0]);
    }, { passive: false });
    this.canvas.addEventListener('touchmove', e => {
      e.preventDefault();
      this.draw(e.touches[0]);
    }, { passive: false });
    this.canvas.addEventListener('touchend', this.stopDraw.bind(this));
  },

  resizeCanvas() {
    const content = document.getElementById('boardContent');
    if (!content) return;

    // Temporarily hide canvas so it doesn't affect scrollWidth/scrollHeight measurement
    this.canvas.style.display = 'none';
    const w = content.scrollWidth;
    const h = Math.max(content.scrollHeight, content.clientHeight);
    this.canvas.style.display = '';

    this.canvas.width = w;
    this.canvas.height = h;

    this.ctx.lineCap = 'round';
    this.ctx.lineJoin = 'round';
  },

  setTool(newTool) {
    this.tool = newTool;
    document.querySelectorAll('.tool-btn').forEach(b => b.classList.remove('active'));
    const btn = document.getElementById('tool-' + newTool);
    if (btn) btn.classList.add('active');

    if (newTool === 'cursor') {
      this.canvas.classList.remove('active');
    } else {
      this.canvas.classList.add('active');
    }
  },

  setColor(col, el) {
    this.color = col;
    document.querySelectorAll('.color-picker').forEach(b => b.classList.remove('active'));
    if (el) el.classList.add('active');

    if (this.tool === 'cursor' || this.tool === 'eraser') {
      this.setTool('pen');
    }
  },

  setThickness(val) {
    this.thickness = parseInt(val);
  },

  getActualColor() {
    if (this.color.startsWith('var(')) {
      const varName = this.color.slice(4, -1);
      return getComputedStyle(document.documentElement).getPropertyValue(varName).trim();
    }
    return this.color;
  },

  startDraw(e) {
    if (this.tool === 'cursor') return;
    this.isDrawing = true;
    this.ctx.beginPath();

    const rect = this.canvas.getBoundingClientRect();
    // ✅ Use cached scroll values — no reflow
    const x = e.clientX - rect.left + this._scrollLeft;
    const y = e.clientY - rect.top + this._scrollTop;

    this.ctx.moveTo(x, y);
    this.draw(e);
  },

  draw(e) {
    if (!this.isDrawing || this.tool === 'cursor') return;

    const rect = this.canvas.getBoundingClientRect();
    // ✅ Use cached scroll values — no reflow on every mousemove frame
    const x = e.clientX - rect.left + this._scrollLeft;
    const y = e.clientY - rect.top + this._scrollTop;

    this.ctx.lineTo(x, y);

    if (this.tool === 'eraser') {
      this.ctx.globalCompositeOperation = 'destination-out';
      this.ctx.lineWidth = this.thickness * 4;
      this.ctx.globalAlpha = 1.0;
      this.ctx.stroke();
    } else {
      this.ctx.globalCompositeOperation = 'source-over';
      this.ctx.strokeStyle = this.getActualColor();
      this.ctx.lineWidth = this.thickness;

      if (this.tool === 'pencil') {
        this.ctx.globalAlpha = 0.3;
        this.ctx.shadowBlur = 2;
        this.ctx.shadowColor = this.ctx.strokeStyle;
      } else {
        this.ctx.globalAlpha = 0.9;
        this.ctx.shadowBlur = 0;
      }

      this.ctx.stroke();
    }

    // Reset path to avoid overlapping opacity buildup
    this.ctx.beginPath();
    this.ctx.moveTo(x, y);
  },

  stopDraw() {
    if (!this.isDrawing) return;
    this.isDrawing = false;
    this.ctx.closePath();
    this.ctx.globalAlpha = 1.0;
    this.ctx.shadowBlur = 0;
    this.ctx.globalCompositeOperation = 'source-over';
  },

  clearCanvas() {
    if (this.ctx) {
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }
    this.shapes.forEach(s => {
      if (s.parentNode) s.parentNode.removeChild(s);
    });
    this.shapes = [];
  },

  insertShape(type) {
    if (!type) return;

    const content = document.getElementById('boardContent');
    const el = document.createElement('div');
    el.className = 'shape-obj';

    const size = 100;
    const col = this.getActualColor();

    const top = (this._scrollTop || 0) + 100;
    const left = content.clientWidth / 2 - size / 2;
    el.style.top = top + 'px';
    el.style.left = left + 'px';
    el.style.width = size + 'px';
    el.style.height = size + 'px';

    if (type === 'square') {
      el.style.border = `4px solid ${col}`;
    } else if (type === 'circle') {
      el.style.border = `4px solid ${col}`;
      el.style.borderRadius = '50%';
    } else if (type === 'triangle') {
      el.style.width = '0';
      el.style.height = '0';
      el.style.borderLeft = `${size / 2}px solid transparent`;
      el.style.borderRight = `${size / 2}px solid transparent`;
      el.style.borderBottom = `${size}px solid ${col}`;
      el.style.backgroundColor = 'transparent';
    } else if (type === 'cube') {
      el.style.backgroundColor = col;
      el.style.boxShadow = `
        10px -10px 0 -2px rgba(0,0,0,0.5),
        10px -10px 0 0 ${col},
        20px -20px 0 -2px rgba(0,0,0,0.3),
        20px -20px 0 0 ${col}
      `;
    } else if (type === 'sphere') {
      el.style.borderRadius = '50%';
      el.style.background = `radial-gradient(circle at 30% 30%, ${col}, #000)`;
    }

    // ✅ Drag logic — uses pointer events for better mobile + desktop support
    let isDragging = false;
    let startX, startY, initX, initY;

    el.addEventListener('mousedown', e => {
      if (this.tool !== 'cursor') return;
      isDragging = true;
      startX = e.clientX;
      startY = e.clientY;
      initX = parseInt(el.style.left) || 0;
      initY = parseInt(el.style.top) || 0;
      e.stopPropagation();
    });

    // Attach to window so dragging outside the element still works
    const onMouseMove = e => {
      if (!isDragging) return;
      el.style.left = (initX + e.clientX - startX) + 'px';
      el.style.top = (initY + e.clientY - startY) + 'px';
    };
    const onMouseUp = () => { isDragging = false; };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);

    // Double-click cycles through CSS animations
    const fxList = ['fx-fall', 'fx-roll', 'fx-bounce'];
    el.addEventListener('dblclick', () => {
      if (this.tool !== 'cursor') return;
      const current = fxList.find(f => el.classList.contains(f));
      el.classList.remove(...fxList);
      void el.offsetWidth; // force reflow to restart animation
      const next = fxList[(fxList.indexOf(current) + 1) % fxList.length];
      el.classList.add(next);
    });

    // ✅ Cleanup listeners when shape is removed
    el._cleanup = () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };

    content.appendChild(el);
    this.shapes.push(el);

    // Auto-switch to cursor so user can immediately drag the new shape
    this.setTool('cursor');
  },

  // ✅ Override clearCanvas to also clean up shape event listeners
  clearCanvas() {
    if (this.ctx) {
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }
    this.shapes.forEach(s => {
      if (typeof s._cleanup === 'function') s._cleanup();
      if (s.parentNode) s.parentNode.removeChild(s);
    });
    this.shapes = [];
  }
};
