// board.js - Board layout, presentation, typing engine, TTS

const board = {
  isWriting: false,
  activeTimeouts: [], // ✅ Track ALL timeouts instead of single writeTimeout
  speechUtterance: null,
  voices: [],

  setTextSize(value) {
    document.documentElement.style.setProperty('--board-text-size', value + 'px');
  },

  loadVoices() {
    this.voices = speechSynthesis.getVoices();
    const sel = document.getElementById('voiceSelect');
    sel.innerHTML = '';
    const preferred = ['Google UK English Male','Google UK English Female','Daniel','Alex','Karen','Samantha'];
    let sorted = [...this.voices].sort((a, b) => {
      const ai = preferred.findIndex(p => a.name.includes(p));
      const bi = preferred.findIndex(p => b.name.includes(p));
      if (ai === -1 && bi === -1) return 0;
      if (ai === -1) return 1;
      if (bi === -1) return -1;
      return ai - bi;
    });
    sorted.forEach(v => {
      const opt = document.createElement('option');
      opt.value = v.name;
      opt.textContent = v.name + (v.lang ? ` (${v.lang})` : '');
      sel.appendChild(opt);
    });
  },

  getCharDelay() {
    const v = parseInt(document.getElementById('speedSlider').value);
    return Math.round(200 - v);
  },

  // ✅ Fixed sleep — registers every timeout so stopPresentation can cancel all
  sleep(ms) {
    return new Promise(resolve => {
      const id = setTimeout(resolve, ms);
      this.activeTimeouts.push(id);
    });
  },

  async startPresentation() {
    if (this.isWriting) return;
    const q = document.getElementById('questionInput').value.trim();
    const s = document.getElementById('solutionInput').value.trim();
    if (!q && !s) { alert('Please enter a question or solution.'); return; }

    this.clearBoard();
    this.isWriting = true;
    document.getElementById('playBtn').disabled = true;

    if (q) {
      document.getElementById('qLabel').style.display = 'block';
      await this.typeText('questionDisplay', q, 'yellow');
    }

    if (q && s) {
      await this.sleep(400);
      const div = document.getElementById('divider');
      div.style.width = '60%';
      await this.sleep(700);
    }

    if (s) {
      document.getElementById('sLabel').style.display = 'block';
      await this.sleep(300);
      await this.typeText('solutionDisplay', s, 'white');
    }

    this.isWriting = false;
    document.getElementById('playBtn').disabled = false;
    app.setStatus('done', 'Done');
  },

  // ✅ Fixed stop — cancels every pending timeout, not just the last one
  stopPresentation() {
    this.isWriting = false;
    this.activeTimeouts.forEach(id => clearTimeout(id));
    this.activeTimeouts = [];
    if (speechSynthesis.speaking) speechSynthesis.cancel();
    document.getElementById('playBtn').disabled = false;
    app.setStatus('idle', 'Stopped');
  },

  clearBoard() {
    this.stopPresentation();
    document.getElementById('questionDisplay').innerHTML = '';
    document.getElementById('solutionDisplay').innerHTML = '';
    document.getElementById('divider').style.width = '0';
    document.getElementById('qLabel').style.display = 'none';
    document.getElementById('sLabel').style.display = 'none';

    if (window.drawing) drawing.clearCanvas();

    app.setStatus('idle', 'Ready');
  },

  async typeText(elId, text, cursorColor) {
    const el = document.getElementById(elId);
    el.innerHTML = '';
    const segments = this.parseSegments(text);

    app.setStatus('writing', 'Writing...');

    if (document.getElementById('speechToggle').checked) {
      this.speakText(this.stripLatex(text));
    }

    for (const seg of segments) {
      if (!this.isWriting) break;

      if (seg.type === 'latex') {
        const span = document.createElement('span');
        span.className = 'math-inline';
        try {
          katex.render(seg.content, span, { throwOnError: false, displayMode: false });
        } catch (e) {
          span.textContent = seg.content;
        }
        el.appendChild(span);
        this.scrollToBottom();
        await this.sleep(this.getCharDelay() * 3);
      } else {
        for (let i = 0; i < seg.content.length; i++) {
          if (!this.isWriting) break;
          const ch = seg.content[i];

          if (ch === '\n') {
            el.appendChild(document.createElement('br'));
          } else {
            const span = document.createElement('span');
            span.textContent = ch;
            el.appendChild(span);
          }

          if (i % 10 === 0) this.scrollToBottom();
          await this.sleep(this.getCharDelay());
        }
      }
    }
    this.scrollToBottom();
  },

  scrollToBottom() {
    const content = document.getElementById('boardContent');
    if (content) content.scrollTop = content.scrollHeight;
  },

  parseSegments(text) {
    const segs = [];
    const regex = /\$([^$]+)\$/g;
    let last = 0, m;
    while ((m = regex.exec(text)) !== null) {
      if (m.index > last) {
        segs.push({ type: 'text', content: text.slice(last, m.index) });
      }
      segs.push({ type: 'latex', content: m[1] });
      last = regex.lastIndex;
    }
    if (last < text.length) {
      segs.push({ type: 'text', content: text.slice(last) });
    }
    return segs;
  },

  stripLatex(text) {
    return text.replace(/\$([^$]+)\$/g, (_, l) => {
      return l
        .replace(/\\frac\{([^}]+)\}\{([^}]+)\}/g, '$1 over $2')
        .replace(/\\sqrt\{([^}]+)\}/g, 'square root of $1')
        .replace(/\\lambda/g, 'lambda')
        .replace(/\\Sigma/g, 'Sigma')
        .replace(/\\pi/g, 'pi')
        .replace(/\\int/g, 'integral')
        .replace(/\\infty/g, 'infinity')
        .replace(/\\Delta/g, 'delta')
        .replace(/\\theta/g, 'theta')
        .replace(/\\alpha/g, 'alpha')
        .replace(/\\beta/g, 'beta')
        .replace(/\\mu/g, 'mu')
        .replace(/\\omega/g, 'omega')
        .replace(/\^/g, ' to the power ')
        .replace(/_/g, ' subscript ')
        .replace(/[{}\\]/g, '');
    });
  },

  // ✅ Fixed speakText — 100ms debounce after cancel prevents Chrome Web Speech deadlock
  speakText(text) {
    if (!window.speechSynthesis) return;
    speechSynthesis.cancel();
    setTimeout(() => {
      // Guard: check isWriting is still true before speaking
      if (!this.isWriting) return;
      const utter = new SpeechSynthesisUtterance(text);
      const selName = document.getElementById('voiceSelect').value;
      const voice = this.voices.find(v => v.name === selName);
      if (voice) utter.voice = voice;
      utter.rate = 0.88;
      utter.pitch = 1.05;
      utter.onstart = () => app.setStatus('speaking', 'Narrating...');
      utter.onend = () => app.setStatus('done', 'Done');
      utter.onerror = (e) => {
        // Silently ignore interrupted errors (common when stop is called)
        if (e.error !== 'interrupted') {
          console.warn('Speech error:', e.error);
        }
      };
      speechSynthesis.speak(utter);
      this.speechUtterance = utter;
    }, 100);
  }
};
