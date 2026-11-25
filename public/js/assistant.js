/**
 * NovaCode Beginner Assistant & Learning Engine UI
 * Provides code breakdown, keyword analogies, Socratic debugging checklist,
 * and cheat sheet rendering.
 */

class NovaAssistant {
  constructor(containerEl, editorInstance) {
    this.container = containerEl;
    this.editor = editorInstance;
    this.currentView = 'explain'; // 'explain' | 'keywords' | 'debugger' | 'cheatsheets'
    this.initDOM();
  }

  initDOM() {
    this.container.innerHTML = `
      <div style="display: flex; flex-direction: column; height: 100%;">
        <!-- Assistant Sub-Navigation -->
        <div style="display: flex; gap: 8px; border-bottom: 1px solid var(--border-color); padding-bottom: 10px; margin-bottom: 12px;">
          <button class="btn btn-sm btn-outline active-subnav" id="subnav-explain">💡 Explain My Code</button>
          <button class="btn btn-sm btn-outline" id="subnav-debugger">🔍 Step-by-Step Debugger</button>
          <button class="btn btn-sm btn-outline" id="subnav-keywords">📖 Keyword Glossary</button>
          <button class="btn btn-sm btn-outline" id="subnav-cheats">📋 Cheat Sheets</button>
        </div>

        <!-- Assistant Dynamic Body -->
        <div id="assistant-body" style="flex: 1; overflow-y: auto;">
          <div class="assistant-welcome">
            <div class="assistant-avatar">🤖</div>
            <h4 style="margin-bottom: 6px; font-size: 1.1rem;">Hello! I'm Nova, your coding mentor.</h4>
            <p style="color: var(--text-secondary); font-size: 0.85rem; max-width: 480px; margin: 0 auto 16px;">
              I help you understand how your program works line-by-line, demystify keywords with real-world analogies, and guide you through debugging without overwhelming you.
            </p>
            <button class="btn btn-primary" id="btn-run-explain">Explain Current Code</button>
          </div>
        </div>
      </div>
    `;

    this.bodyEl = this.container.querySelector('#assistant-body');
    this.bindSubnav();
  }

  bindSubnav() {
    const explainBtn = this.container.querySelector('#subnav-explain');
    const debugBtn = this.container.querySelector('#subnav-debugger');
    const kwBtn = this.container.querySelector('#subnav-keywords');
    const cheatBtn = this.container.querySelector('#subnav-cheats');

    const setActive = (target) => {
      [explainBtn, debugBtn, kwBtn, cheatBtn].forEach(b => b.classList.remove('btn-primary', 'active-subnav'));
      target.classList.add('btn-primary', 'active-subnav');
    };

    explainBtn.addEventListener('click', () => {
      setActive(explainBtn);
      this.explainCurrentCode();
    });

    debugBtn.addEventListener('click', () => {
      setActive(debugBtn);
      this.showSocraticDebugger();
    });

    kwBtn.addEventListener('click', () => {
      setActive(kwBtn);
      this.showKeywordGlossary();
    });

    cheatBtn.addEventListener('click', () => {
      setActive(cheatBtn);
      this.showCheatSheets();
    });

    const runExplain = this.container.querySelector('#btn-run-explain');
    if (runExplain) {
      runExplain.addEventListener('click', () => {
        setActive(explainBtn);
        this.explainCurrentCode();
      });
    }
  }

  async explainCurrentCode() {
    const code = this.editor.getValue();
    const language = this.editor.language;

    this.bodyEl.innerHTML = `
      <div style="text-align: center; padding: 30px;">
        <div class="exec-badge running" style="font-size: 0.9rem;">Analyzing your code...</div>
      </div>
    `;

    try {
      const res = await fetch('/api/assistant/explain', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, language })
      });
      const data = await res.json();

      let breakdownHTML = '';
      if (data.breakdown && data.breakdown.length > 0) {
        breakdownHTML = data.breakdown.map(item => `
          <div class="breakdown-item">
            <span class="breakdown-line-num">L${item.line}</span>
            <div class="breakdown-text">
              <div style="color: var(--text-primary); font-weight: 500;">${item.explanation}</div>
              <div class="breakdown-code">${Highlighter.escapeHtml(item.code)}</div>
            </div>
          </div>
        `).join('');
      } else {
        breakdownHTML = '<p style="color: var(--text-muted); font-size: 0.85rem;">No active code lines found.</p>';
      }

      this.bodyEl.innerHTML = `
        <div style="margin-bottom: 16px;">
          <h4 style="font-size: 1rem; color: #818cf8; margin-bottom: 4px;">Code Summary</h4>
          <p style="font-size: 0.88rem; color: var(--text-primary); line-height: 1.5; background: var(--bg-surface); padding: 12px; border-radius: 8px;">
            ${data.summary}
          </p>
        </div>

        <div>
          <h4 style="font-size: 0.95rem; color: var(--text-secondary); margin-bottom: 8px;">Line-by-Line Breakdown:</h4>
          <div style="background: var(--bg-surface); border-radius: 8px; padding: 10px 14px; border: 1px solid var(--border-color);">
            ${breakdownHTML}
          </div>
        </div>
      `;
    } catch (e) {
      this.bodyEl.innerHTML = `<p style="color: var(--danger);">Failed to analyze code: ${e.message}</p>`;
    }
  }

  async showSocraticDebugger() {
    this.bodyEl.innerHTML = `
      <div style="margin-bottom: 16px;">
        <h4 style="font-size: 1.05rem; color: #818cf8; margin-bottom: 4px;">🕵️ Nova Socratic Debugger</h4>
        <p style="font-size: 0.85rem; color: var(--text-secondary);">
          Debugging is the superpower of finding why a computer is doing what you told it to do, instead of what you wanted it to do! Follow these 5 steps:
        </p>
      </div>

      <div class="socratic-step">
        <div class="step-circle">1</div>
        <div>
          <strong style="color: var(--text-primary); font-size: 0.88rem;">Identify the exact symptom</strong>
          <p style="font-size: 0.82rem; color: var(--text-muted); margin-top: 2px;">
            Did the code crash with a red message, loop forever, or print the wrong output? Knowing the exact symptom is half the battle.
          </p>
        </div>
      </div>

      <div class="socratic-step">
        <div class="step-circle">2</div>
        <div>
          <strong style="color: var(--text-primary); font-size: 0.88rem;">Pinpoint the target line</strong>
          <p style="font-size: 0.82rem; color: var(--text-muted); margin-top: 2px;">
            Check the line number mentioned in the error. Remember: computers execute instructions sequentially from top to bottom.
          </p>
        </div>
      </div>

      <div class="socratic-step">
        <div class="step-circle">3</div>
        <div>
          <strong style="color: var(--text-primary); font-size: 0.88rem;">Check spelling and punctuation</strong>
          <p style="font-size: 0.82rem; color: var(--text-muted); margin-top: 2px;">
            Are all brackets paired? Did you miss a colon <code>:</code> or semicolon <code>;</code>? Is the variable name spelled with the exact same uppercase/lowercase letters?
          </p>
        </div>
      </div>

      <div class="socratic-step">
        <div class="step-circle">4</div>
        <div>
          <strong style="color: var(--text-primary); font-size: 0.88rem;">Add detective print statements</strong>
          <p style="font-size: 0.82rem; color: var(--text-muted); margin-top: 2px;">
            Insert a temporary <code>print("DEBUG:", variable)</code> right before the crash to see what value the variable actually holds in memory!
          </p>
        </div>
      </div>

      <div class="socratic-step">
        <div class="step-circle">5</div>
        <div>
          <strong style="color: var(--text-primary); font-size: 0.88rem;">Test one change at a time</strong>
          <p style="font-size: 0.82rem; color: var(--text-muted); margin-top: 2px;">
            Make a single targeted fix, press Run, and verify. If it works, remove your debug print statements!
          </p>
        </div>
      </div>
    `;
  }

  async showKeywordGlossary() {
    this.bodyEl.innerHTML = `
      <div style="margin-bottom: 14px;">
        <h4 style="font-size: 1.05rem; color: #818cf8; margin-bottom: 4px;">📖 Programming Keywords with Real-World Analogies</h4>
        <p style="font-size: 0.85rem; color: var(--text-secondary); margin-bottom: 12px;">
          Keywords are special reserved words in programming. Click on any keyword below to see what it means:
        </p>
        <div style="display: flex; gap: 8px; flex-wrap: wrap;" id="kw-tags-row"></div>
      </div>

      <div id="kw-card-display" style="background: var(--bg-surface); border: 1px solid var(--border-color); border-radius: 8px; padding: 16px;">
        <p style="color: var(--text-muted); font-size: 0.85rem;">Click a keyword above to view its analogy and example!</p>
      </div>
    `;

    const row = this.bodyEl.querySelector('#kw-tags-row');
    const display = this.bodyEl.querySelector('#kw-card-display');

    try {
      const res = await fetch('/api/assistant/keywords');
      const data = await res.json();

      data.keywords.forEach(kw => {
        const btn = document.createElement('button');
        btn.className = 'btn btn-sm btn-outline';
        btn.textContent = kw;
        btn.addEventListener('click', async () => {
          const detailRes = await fetch(`/api/assistant/keyword/${kw}`);
          const detail = await detailRes.json();
          if (detail.found) {
            const k = detail.keyword;
            display.innerHTML = `
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                <h3 style="color: #818cf8; font-size: 1.15rem; margin: 0;">${k.keyword} - ${k.title}</h3>
                <span class="brand-pill">${k.language}</span>
              </div>
              <div style="margin-bottom: 8px;">
                <strong style="color: var(--text-primary); font-size: 0.85rem;">Real-World Analogy:</strong>
                <p style="color: var(--text-secondary); font-size: 0.85rem; margin-top: 2px;">${k.analogy}</p>
              </div>
              <div style="margin-bottom: 8px;">
                <strong style="color: var(--text-primary); font-size: 0.85rem;">Why We Use It:</strong>
                <p style="color: var(--text-secondary); font-size: 0.85rem; margin-top: 2px;">${k.why}</p>
              </div>
              <div style="margin-bottom: 8px;">
                <strong style="color: var(--text-primary); font-size: 0.85rem;">Example:</strong>
                <pre style="background: var(--bg-primary); padding: 8px; border-radius: 6px; font-family: var(--font-mono); font-size: 0.82rem; margin-top: 4px;">${Highlighter.escapeHtml(k.example)}</pre>
              </div>
              <div>
                <strong style="color: var(--warning); font-size: 0.85rem;">⚠️ Beginner Pitfall:</strong>
                <p style="color: var(--text-muted); font-size: 0.82rem; margin-top: 2px;">${k.pitfall}</p>
              </div>
            `;
          }
        });
        row.appendChild(btn);
      });
    } catch (e) {
      // ignore
    }
  }

  async showCheatSheets() {
    this.bodyEl.innerHTML = `
      <div style="margin-bottom: 14px;">
        <h4 style="font-size: 1.05rem; color: #818cf8; margin-bottom: 4px;">📋 Beginner Multi-Language Quick Reference</h4>
        <p style="font-size: 0.85rem; color: var(--text-secondary);">
          Compare how the same programming concept is written in Python, JavaScript, and Java side-by-side.
        </p>
      </div>
      <div id="cheatsheets-container">Loading cheat sheets...</div>
    `;

    const container = this.bodyEl.querySelector('#cheatsheets-container');
    try {
      const res = await fetch('/api/cheatsheets');
      const data = await res.json();

      let html = '';
      data.cheatSheets.forEach(sheet => {
        html += `
          <div style="background: var(--bg-surface); border: 1px solid var(--border-color); border-radius: 8px; padding: 14px; margin-bottom: 14px;">
            <h4 style="color: var(--text-primary); font-size: 0.95rem; margin-bottom: 4px;">${sheet.topic}</h4>
            <p style="color: var(--text-muted); font-size: 0.8rem; margin-bottom: 10px;">${sheet.summary}</p>
            <div style="overflow-x: auto;">
              <table style="width: 100%; border-collapse: collapse; font-size: 0.8rem; font-family: var(--font-mono);">
                <thead>
                  <tr style="border-bottom: 1px solid var(--border-color); text-align: left; color: var(--text-secondary);">
                    <th style="padding: 6px;">Concept</th>
                    <th style="padding: 6px;">Python</th>
                    <th style="padding: 6px;">JavaScript</th>
                    <th style="padding: 6px;">Java</th>
                  </tr>
                </thead>
                <tbody>
                  ${sheet.table.map(row => `
                    <tr style="border-bottom: 1px solid rgba(255,255,255,0.05);">
                      <td style="padding: 6px; font-weight: 600; color: #818cf8;">${row.name || row.check || row.type}</td>
                      <td style="padding: 6px; color: #4ade80;"><code>${Highlighter.escapeHtml(row.python)}</code></td>
                      <td style="padding: 6px; color: #38bdf8;"><code>${Highlighter.escapeHtml(row.js)}</code></td>
                      <td style="padding: 6px; color: #facc15;"><code>${Highlighter.escapeHtml(row.java)}</code></td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
          </div>
        `;
      });

      container.innerHTML = html;
    } catch (e) {
      container.innerHTML = `<p style="color: var(--danger);">Failed to load cheat sheets: ${e.message}</p>`;
    }
  }
}

if (typeof module !== 'undefined') {
  module.exports = NovaAssistant;
}
