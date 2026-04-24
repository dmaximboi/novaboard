// app.js - Main Application Logic & Initialization

const app = {
  currentSubject: 'Physics',
  symbols: [
    { label: 'λ', latex: '\\lambda' },
    { label: 'Σ', latex: '\\Sigma' },
    { label: 'π', latex: '\\pi' },
    { label: '√', latex: '\\sqrt{}' },
    { label: '½', latex: '\\frac{1}{2}' },
    { label: 'x²', latex: 'x^{2}' },
    { label: '∫', latex: '\\int' },
    { label: '∞', latex: '\\infty' },
    { label: 'Δ', latex: '\\Delta' },
    { label: 'θ', latex: '\\theta' },
    { label: 'α', latex: '\\alpha' },
    { label: 'β', latex: '\\beta' },
    { label: 'μ', latex: '\\mu' },
    { label: 'ω', latex: '\\omega' },
    { label: '÷', latex: '\\div' },
    { label: '≠', latex: '\\neq' },
    { label: '≤', latex: '\\leq' },
    { label: '≥', latex: '\\geq' },
    { label: '→', latex: '\\rightarrow' },
    { label: '°', latex: '^{\\circ}' },
  ],

  init() {
    this.buildSymbolBar();
    board.loadVoices();
    if (speechSynthesis.onvoiceschanged !== undefined) {
      speechSynthesis.onvoiceschanged = () => board.loadVoices();
    }
    this.updateSpeedLabel();
    
    // Load saved API key
    const savedKey = localStorage.getItem('nc_groq_key');
    if (savedKey) document.getElementById('groqKey').value = savedKey;
    document.getElementById('groqKey').addEventListener('change', e => {
      localStorage.setItem('nc_groq_key', e.target.value);
    });

    drawing.init();
  },

  buildSymbolBar() {
    const bar = document.getElementById('symbolBar');
    this.symbols.forEach(s => {
      const btn = document.createElement('button');
      btn.className = 'sym-btn';
      btn.title = s.latex;
      btn.innerHTML = s.label;
      btn.onclick = () => this.insertSymbol(s.latex);
      bar.appendChild(btn);
    });
  },

  insertSymbol(latex) {
    const ta = document.getElementById('questionInput');
    const pos = ta.selectionStart;
    const val = ta.value;
    ta.value = val.slice(0, pos) + '$' + latex + '$' + val.slice(pos);
    ta.focus();
    ta.selectionStart = ta.selectionEnd = pos + latex.length + 2;
  },

  setSubject(el, name) {
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    el.classList.add('active');
    this.currentSubject = name;
    const icons = { Physics:'⚛️', Math:'📐', Chemistry:'🧪', English:'📖' };
    document.getElementById('subjectDisplay').textContent = icons[name] + ' ' + name;
  },

  updateSpeedLabel() {
    const v = parseInt(document.getElementById('speedSlider').value);
    const label = v <= 60 ? 'Slow' : v <= 120 ? 'Medium' : 'Fast';
    document.getElementById('speedLabel').textContent = label;
  },

  setStatus(type, msg) {
    const dot = document.getElementById('statusDot');
    const txt = document.getElementById('statusText');
    dot.className = 'status-dot';
    if (type === 'writing') dot.classList.add('writing');
    else if (type === 'speaking') dot.classList.add('speaking');
    else if (type === 'done') dot.classList.add('done');
    txt.textContent = msg;
  },

  async aiSolve() {
    const key = document.getElementById('groqKey').value.trim();
    if (!key) { alert('Please enter your Groq API key first.'); return; }
    const q = document.getElementById('questionInput').value.trim();
    if (!q) { alert('Please enter a question first.'); return; }

    const btn = document.getElementById('aiSolveBtn');
    btn.disabled = true;
    btn.textContent = '⏳ Solving...';
    this.setStatus('ai', 'AI is solving...');

    try {
      const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${key}`
        },
        body: JSON.stringify({
          model: 'llama3-70b-8192',
          messages: [
            {
              role: 'system',
              content: `You are a ${this.currentSubject} teacher solving exam questions for Nigerian SS3/JAMB/100-level university students. 
Solve step by step clearly. 
For math expressions use LaTeX wrapped in $ signs like $\\frac{1}{2}mv^2$. 
Write naturally as a teacher would speak/write on a chalkboard. 
Keep it clear, numbered steps, concise. Do NOT use markdown headers.`
            },
            { role: 'user', content: q }
          ],
          temperature: 0.3,
          max_tokens: 800
        })
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error?.message || 'Groq API error');
      }

      const data = await res.json();
      const solution = data.choices[0].message.content;
      document.getElementById('solutionInput').value = solution;
      this.setStatus('done', 'AI solved! Click "Start Presentation" to display.');
    } catch (e) {
      alert('Error: ' + e.message);
      this.setStatus('idle', 'Error — check API key or question');
    } finally {
      btn.disabled = false;
      btn.textContent = '🤖 AI Solve';
    }
  }
};

window.addEventListener('DOMContentLoaded', () => app.init());
