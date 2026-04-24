// drawing.js - Canvas drawing, shapes, and animations

const drawing = {
  canvas: null,
  ctx: null,
  isDrawing: false,
  tool: 'cursor', // cursor, pen, pencil, eraser
  color: 'var(--chalk)',
  thickness: 4,
  shapes: [],

  init() {
    this.canvas = document.getElementById('drawCanvas');
    this.ctx = this.canvas.getContext('2d');
    
    // Resize canvas to match the scrollable content area
    this.resizeCanvas();
    window.addEventListener('resize', () => this.resizeCanvas());
    
    // Mutation observer to resize canvas if content grows
    const observer = new MutationObserver(() => this.resizeCanvas());
    observer.observe(document.getElementById('boardContent'), { childList: true, subtree: true, attributes: true });

    // Event listeners for drawing
    this.canvas.addEventListener('mousedown', this.startDraw.bind(this));
    this.canvas.addEventListener('mousemove', this.draw.bind(this));
    this.canvas.addEventListener('mouseup', this.stopDraw.bind(this));
    this.canvas.addEventListener('mouseout', this.stopDraw.bind(this));

    // Touch support
    this.canvas.addEventListener('touchstart', e => { e.preventDefault(); this.startDraw(e.touches[0]); }, { passive: false });
    this.canvas.addEventListener('touchmove', e => { e.preventDefault(); this.draw(e.touches[0]); }, { passive: false });
    this.canvas.addEventListener('touchend', this.stopDraw.bind(this));
  },

  resizeCanvas() {
    const content = document.getElementById('boardContent');
    this.canvas.width = content.scrollWidth;
    this.canvas.height = Math.max(content.scrollHeight, content.clientHeight);
    this.ctx.lineCap = 'round';
    this.ctx.lineJoin = 'round';
  },

  setTool(newTool) {
    this.tool = newTool;
    document.querySelectorAll('.tool-btn').forEach(b => b.classList.remove('active'));
    document.getElementById('tool-' + newTool).classList.add('active');

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
    const content = document.getElementById('boardContent');
    const x = e.clientX - rect.left + content.scrollLeft;
    const y = e.clientY - rect.top + content.scrollTop;
    
    this.ctx.moveTo(x, y);
    this.draw(e);
  },

  draw(e) {
    if (!this.isDrawing || this.tool === 'cursor') return;
    
    const rect = this.canvas.getBoundingClientRect();
    const content = document.getElementById('boardContent');
    const x = e.clientX - rect.left + content.scrollLeft;
    const y = e.clientY - rect.top + content.scrollTop;

    this.ctx.lineTo(x, y);

    if (this.tool === 'eraser') {
      this.ctx.globalCompositeOperation = 'destination-out';
      this.ctx.lineWidth = this.thickness * 4;
      this.ctx.stroke();
    } else {
      this.ctx.globalCompositeOperation = 'source-over';
      this.ctx.strokeStyle = this.getActualColor();
      this.ctx.lineWidth = this.thickness;
      
      if (this.tool === 'pencil') {
        this.ctx.globalAlpha = 0.3;
        this.ctx.shadowBlur = 2;
        this.ctx.shadowColor = this.ctx.strokeStyle;
      } else { // pen
        this.ctx.globalAlpha = 0.9;
        this.ctx.shadowBlur = 0;
      }
      
      this.ctx.stroke();
    }
    
    // reset path to avoid overlapping opacity
    this.ctx.beginPath();
    this.ctx.moveTo(x, y);
  },

  stopDraw() {
    if (!this.isDrawing) return;
    this.isDrawing = false;
    this.ctx.closePath();
    this.ctx.globalAlpha = 1.0;
  },

  clearCanvas() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    // Also remove shapes
    this.shapes.forEach(s => s.remove());
    this.shapes = [];
  },

  insertShape(type) {
    if (!type) return;
    
    const content = document.getElementById('boardContent');
    const el = document.createElement('div');
    el.className = 'shape-obj';
    
    const size = 100;
    const col = this.getActualColor();
    
    // Initial position
    const top = content.scrollTop + 100;
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
      el.style.borderLeft = `${size/2}px solid transparent`;
      el.style.borderRight = `${size/2}px solid transparent`;
      el.style.borderBottom = `${size}px solid ${col}`;
      el.style.backgroundColor = 'transparent';
    } else if (type === 'cube') {
      // simulated 3D using shadows
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

    // Dragging logic
    let isDragging = false;
    let startX, startY, initX, initY;
    
    el.addEventListener('mousedown', e => {
      if (this.tool !== 'cursor') return;
      isDragging = true;
      startX = e.clientX; startY = e.clientY;
      initX = parseInt(el.style.left);
      initY = parseInt(el.style.top);
      e.stopPropagation();
    });

    window.addEventListener('mousemove', e => {
      if (!isDragging) return;
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;
      el.style.left = (initX + dx) + 'px';
      el.style.top = (initY + dy) + 'px';
    });

    window.addEventListener('mouseup', () => { isDragging = false; });
    
    // Double click for effect
    el.addEventListener('dblclick', () => {
      if (this.tool !== 'cursor') return;
      
      const fx = ['fx-fall', 'fx-roll', 'fx-bounce'];
      const currentFx = Array.from(el.classList).find(c => fx.includes(c));
      
      el.classList.remove(...fx);
      void el.offsetWidth; // trigger reflow
      
      if (!currentFx) el.classList.add('fx-fall');
      else if (currentFx === 'fx-fall') el.classList.add('fx-roll');
      else if (currentFx === 'fx-roll') el.classList.add('fx-bounce');
      // if bounce, it removes it
    });

    content.appendChild(el);
    this.shapes.push(el);
    
    // Switch to cursor tool automatically to drag the shape
    this.setTool('cursor');
  }
};
