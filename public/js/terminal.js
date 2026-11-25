/**
 * NovaCode Integrated Output & Interactive Input Terminal
 * Handles color-coded stdout, stderr, execution timers, exit codes,
 * and live interactive STDIN prompt for programs using input().
 */

class NovaTerminal {
  constructor(containerEl, options = {}) {
    this.container = containerEl;
    this.currentExecId = null;
    this.startTime = null;
    this.timerInterval = null;
    this.onStopClick = options.onStopClick || null;
    this.onInputSubmit = options.onInputSubmit || null;

    this.initDOM();
    this.bindEvents();
  }

  initDOM() {
    this.container.innerHTML = `
      <div class="terminal-container">
        <div class="terminal-toolbar">
          <div class="terminal-meta">
            <span class="exec-badge" id="terminal-badge">Ready</span>
            <span id="terminal-timer" style="color: var(--text-muted); font-size: 0.75rem;"></span>
          </div>
          <div style="display: flex; gap: 8px;">
            <button class="btn btn-sm btn-outline" id="term-copy-btn" title="Copy console output">Copy Output</button>
            <button class="btn btn-sm btn-outline" id="term-clear-btn" title="Clear console">Clear</button>
          </div>
        </div>
        <div class="terminal-output" id="terminal-output">
          <span class="terminal-system-msg">NovaCode Terminal ready. Click "Run" or press Ctrl+Enter to execute.</span>
        </div>
        <!-- Interactive STDIN bar -->
        <div class="terminal-stdin-bar" id="stdin-bar" style="display: none;">
          <span class="stdin-prompt-label">↵ Input:</span>
          <input type="text" class="stdin-input" id="stdin-input-box" placeholder="Program is waiting for your input... Type here and press Enter" />
          <button class="btn btn-sm btn-primary" id="stdin-send-btn">Send</button>
        </div>
      </div>
    `;

    this.badge = this.container.querySelector('#terminal-badge');
    this.timerEl = this.container.querySelector('#terminal-timer');
    this.outputEl = this.container.querySelector('#terminal-output');
    this.stdinBar = this.container.querySelector('#stdin-bar');
    this.stdinInput = this.container.querySelector('#stdin-input-box');
  }

  bindEvents() {
    this.container.querySelector('#term-clear-btn').addEventListener('click', () => this.clear());
    this.container.querySelector('#term-copy-btn').addEventListener('click', () => this.copyOutput());

    const sendInput = () => {
      const val = this.stdinInput.value;
      if (this.currentExecId && this.onInputSubmit) {
        this.appendStdout(val + '\n');
        this.onInputSubmit(this.currentExecId, val);
        this.stdinInput.value = '';
      }
    };

    this.container.querySelector('#stdin-send-btn').addEventListener('click', sendInput);
    this.stdinInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        sendInput();
      }
    });
  }

  startExecution(execId, language) {
    this.currentExecId = execId;
    this.startTime = Date.now();
    this.badge.className = 'exec-badge running';
    this.badge.innerHTML = `● Running ${language || ''}...`;
    this.timerEl.innerText = '0.0s';
    this.stdinBar.style.display = 'flex';
    this.stdinInput.focus();

    clearInterval(this.timerInterval);
    this.timerInterval = setInterval(() => {
      const elapsed = ((Date.now() - this.startTime) / 1000).toFixed(1);
      this.timerEl.innerText = `${elapsed}s`;
    }, 100);
  }

  endExecution(exitCode, durationMs) {
    clearInterval(this.timerInterval);
    this.stdinBar.style.display = 'none';

    const isSuccess = exitCode === 0;
    this.badge.className = `exec-badge ${isSuccess ? 'success' : 'error'}`;
    this.badge.innerHTML = isSuccess ? '✔ Success' : `✖ Exit code ${exitCode}`;

    const timeStr = durationMs !== undefined ? `${durationMs}ms` : this.timerEl.innerText;
    this.timerEl.innerText = `Finished in ${timeStr}`;

    this.currentExecId = null;
  }

  appendStdout(text) {
    const span = document.createElement('span');
    span.className = 'stdout-line';
    span.textContent = text;
    this.outputEl.appendChild(span);
    this.scrollToBottom();

    // If text ends with a prompt like ": " or "? ", focus stdin
    if (/[?:>]\s*$/.test(text)) {
      this.stdinBar.style.display = 'flex';
      this.stdinInput.focus();
    }
  }

  appendStderr(text) {
    const span = document.createElement('span');
    span.className = 'stderr-line';
    span.textContent = text;
    this.outputEl.appendChild(span);
    this.scrollToBottom();
  }

  appendSystem(text) {
    const div = document.createElement('div');
    div.className = 'terminal-system-msg';
    div.textContent = text;
    this.outputEl.appendChild(div);
    this.scrollToBottom();
  }

  clear() {
    this.outputEl.innerHTML = '';
    this.badge.className = 'exec-badge';
    this.badge.innerText = 'Ready';
    this.timerEl.innerText = '';
    this.stdinBar.style.display = 'none';
  }

  copyOutput() {
    const text = this.outputEl.innerText;
    navigator.clipboard.writeText(text).then(() => {
      const btn = this.container.querySelector('#term-copy-btn');
      const orig = btn.innerText;
      btn.innerText = 'Copied!';
      setTimeout(() => btn.innerText = orig, 1500);
    });
  }

  scrollToBottom() {
    this.outputEl.scrollTop = this.outputEl.scrollHeight;
  }
}

if (typeof module !== 'undefined') {
  module.exports = NovaTerminal;
}
