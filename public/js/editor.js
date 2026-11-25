/**
 * NovaCode Core Lightweight Code Editor
 * Fast, responsive, beginner-optimized editor with auto-indent,
 * auto-closing brackets, syntax highlighting, gutter markers, and find/replace.
 */

class NovaEditor {
  constructor(containerEl, options = {}) {
    this.container = containerEl;
    this.language = options.language || 'python';
    this.fontSize = options.fontSize || 14;
    this.fontFamily = options.fontFamily || "'JetBrains Mono', Consolas, monospace";
    this.tabSpaces = 4;
    this.autoCloseBrackets = true;
    this.onChange = options.onChange || null;
    this.onCursorMove = options.onCursorMove || null;

    this.activeLine = 1;
    this.errorLine = null;
    this.findMatches = [];
    this.currentFindIndex = -1;

    this.initDOM();
    this.bindEvents();
    this.applyStyles();
  }

  initDOM() {
    this.container.innerHTML = `
      <div class="editor-wrapper">
        <div class="editor-gutter" id="editor-gutter"></div>
        <div class="editor-scroll-container" id="editor-scroll">
          <div class="code-layer-container" id="code-layer">
            <div class="active-line-highlight" id="active-line-bg"></div>
            <pre class="editor-highlight-display" id="highlight-display"></pre>
            <textarea class="editor-textarea" id="editor-input" spellcheck="false" autocomplete="off" autocapitalize="off"></textarea>
          </div>
        </div>

        <!-- Find & Replace Floating Bar -->
        <div class="find-replace-bar" id="find-bar">
          <div class="find-row">
            <input type="text" class="find-input" id="find-search-input" placeholder="Find text..." />
            <span class="find-matches-count" id="find-count">0/0</span>
            <button class="btn btn-sm btn-outline btn-icon" id="find-prev-btn" title="Previous match (Shift+Enter)">▲</button>
            <button class="btn btn-sm btn-outline btn-icon" id="find-next-btn" title="Next match (Enter)">▼</button>
            <button class="btn btn-sm btn-outline btn-icon" id="find-close-btn" title="Close (Esc)">✕</button>
          </div>
          <div class="find-row">
            <input type="text" class="find-input" id="find-replace-input" placeholder="Replace with..." />
            <button class="btn btn-sm btn-outline" id="replace-one-btn">Replace</button>
            <button class="btn btn-sm btn-outline" id="replace-all-btn">Replace All</button>
          </div>
        </div>

        <!-- Keyword Explanation Tooltip -->
        <div class="keyword-tooltip" id="kw-tooltip">
          <div class="keyword-tooltip-title" id="kw-title">Keyword</div>
          <div class="keyword-tooltip-analogy" id="kw-analogy">Analogy</div>
          <div class="keyword-tooltip-why" id="kw-why">Why we use it</div>
        </div>
      </div>
    `;

    this.gutter = this.container.querySelector('#editor-gutter');
    this.scrollContainer = this.container.querySelector('#editor-scroll');
    this.codeLayer = this.container.querySelector('#code-layer');
    this.activeLineBg = this.container.querySelector('#active-line-bg');
    this.highlightDisplay = this.container.querySelector('#highlight-display');
    this.textarea = this.container.querySelector('#editor-input');
    this.findBar = this.container.querySelector('#find-bar');
    this.kwTooltip = this.container.querySelector('#kw-tooltip');
  }

  bindEvents() {
    // Sync scrolling between textarea, highlight pre, and gutter
    this.scrollContainer.addEventListener('scroll', () => {
      this.gutter.scrollTop = this.scrollContainer.scrollTop;
    });

    // Content change
    this.textarea.addEventListener('input', () => {
      this.render();
      if (this.onChange) this.onChange(this.getValue());
    });

    // Key handling (Indent, Auto-close brackets, Tab)
    this.textarea.addEventListener('keydown', (e) => this.handleKeyDown(e));

    // Cursor position tracking
    const updateCursor = () => {
      this.updateActiveLine();
      if (this.onCursorMove) {
        const pos = this.getCursorPosition();
        this.onCursorMove(pos.line, pos.column);
      }
    };
    this.textarea.addEventListener('keyup', updateCursor);
    this.textarea.addEventListener('click', updateCursor);

    // Find & Replace actions
    const findSearchInput = this.container.querySelector('#find-search-input');
    const findReplaceInput = this.container.querySelector('#find-replace-input');

    findSearchInput.addEventListener('input', () => {
      this.searchFindMatches(findSearchInput.value);
    });

    findSearchInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        if (e.shiftKey) this.navigateFindMatch(-1);
        else this.navigateFindMatch(1);
      } else if (e.key === 'Escape') {
        this.hideFindReplace();
      }
    });

    this.container.querySelector('#find-next-btn').addEventListener('click', () => this.navigateFindMatch(1));
    this.container.querySelector('#find-prev-btn').addEventListener('click', () => this.navigateFindMatch(-1));
    this.container.querySelector('#find-close-btn').addEventListener('click', () => this.hideFindReplace());

    this.container.querySelector('#replace-one-btn').addEventListener('click', () => {
      this.replaceCurrentMatch(findReplaceInput.value);
    });
    this.container.querySelector('#replace-all-btn').addEventListener('click', () => {
      this.replaceAllMatches(findSearchInput.value, findReplaceInput.value);
    });
  }

  handleKeyDown(e) {
    const val = this.textarea.value;
    const start = this.textarea.selectionStart;
    const end = this.textarea.selectionEnd;

    // 1. Tab Key: Insert 4 spaces or indent
    if (e.key === 'Tab') {
      e.preventDefault();
      const spaces = ' '.repeat(this.tabSpaces);
      this.insertTextAtCursor(spaces);
      return;
    }

    // 2. Auto-closing brackets and quotes
    if (this.autoCloseBrackets && !e.ctrlKey && !e.metaKey) {
      const pairs = {
        '(': ')',
        '[': ']',
        '{': '}',
        '"': '"',
        "'": "'",
        '`': '`'
      };

      if (pairs[e.key]) {
        // If text is selected, wrap it
        if (start !== end) {
          e.preventDefault();
          const selectedText = val.substring(start, end);
          const replacement = e.key + selectedText + pairs[e.key];
          this.textarea.value = val.substring(0, start) + replacement + val.substring(end);
          this.textarea.selectionStart = start + 1;
          this.textarea.selectionEnd = end + 1;
          this.render();
          return;
        }

        // Auto close quote or bracket
        e.preventDefault();
        const closeChar = pairs[e.key];
        this.textarea.value = val.substring(0, start) + e.key + closeChar + val.substring(end);
        this.textarea.selectionStart = this.textarea.selectionEnd = start + 1;
        this.render();
        return;
      }

      // Skip over closing bracket if typed right before it
      const nextChar = val[start];
      if ([')', ']', '}', '"', "'", '`'].includes(e.key) && nextChar === e.key) {
        e.preventDefault();
        this.textarea.selectionStart = this.textarea.selectionEnd = start + 1;
        return;
      }
    }

    // 3. Smart Indentation on Enter
    if (e.key === 'Enter') {
      e.preventDefault();
      // Find indentation of current line
      const lineStart = val.lastIndexOf('\n', start - 1) + 1;
      const currentLine = val.substring(lineStart, start);
      const indentMatch = currentLine.match(/^\s*/);
      let indent = indentMatch ? indentMatch[0] : '';

      // If line ends with `:`, `{`, `(`, or `[`, add an extra level of indentation!
      const trimmedBeforeCursor = currentLine.trim();
      if (trimmedBeforeCursor.endsWith(':') || trimmedBeforeCursor.endsWith('{') ||
          trimmedBeforeCursor.endsWith('(') || trimmedBeforeCursor.endsWith('[')) {
        indent += ' '.repeat(this.tabSpaces);
      }

      const insert = '\n' + indent;
      this.textarea.value = val.substring(0, start) + insert + val.substring(end);
      this.textarea.selectionStart = this.textarea.selectionEnd = start + insert.length;
      this.render();
      return;
    }

    // 4. Find shortcut: Ctrl+F
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'f') {
      e.preventDefault();
      this.showFindReplace();
      return;
    }
  }

  insertTextAtCursor(text) {
    const start = this.textarea.selectionStart;
    const end = this.textarea.selectionEnd;
    const val = this.textarea.value;
    this.textarea.value = val.substring(0, start) + text + val.substring(end);
    this.textarea.selectionStart = this.textarea.selectionEnd = start + text.length;
    this.render();
    if (this.onChange) this.onChange(this.getValue());
  }

  getValue() {
    return this.textarea.value;
  }

  setValue(newCode) {
    this.textarea.value = newCode;
    this.render();
    this.updateActiveLine();
  }

  setLanguage(lang) {
    this.language = lang;
    this.render();
  }

  setFontSize(size) {
    this.fontSize = Math.max(10, Math.min(32, size));
    this.applyStyles();
    this.render();
  }

  applyStyles() {
    this.container.style.setProperty('--editor-font-size', `${this.fontSize}px`);
  }

  render() {
    const code = this.textarea.value;
    const lines = code.split('\n');

    // 1. Update Gutter Line Numbers
    let gutterHTML = '';
    for (let i = 1; i <= lines.length; i++) {
      let classes = 'gutter-line';
      if (i === this.activeLine) classes += ' active';
      if (i === this.errorLine) classes += ' error-line';
      gutterHTML += `<div class="${classes}" data-line="${i}">${i}</div>`;
    }
    this.gutter.innerHTML = gutterHTML;

    // 2. Syntax Highlight
    let highlighted = Highlighter.highlight(code, this.language);
    // Append trailing newline space so cursor matches height
    this.highlightDisplay.innerHTML = highlighted + (code.endsWith('\n') ? '<br>' : '');

    // 3. Keep dimensions in sync
    this.syncLayerDimensions();
  }

  syncLayerDimensions() {
    const text = this.textarea.value;
    const lines = text.split('\n');
    const lineHeight = 24;
    const minHeight = Math.max(lines.length * lineHeight + 40, this.scrollContainer.clientHeight);
    this.codeLayer.style.minHeight = `${minHeight}px`;
    this.textarea.style.height = `${minHeight}px`;
    this.highlightDisplay.style.height = `${minHeight}px`;
  }

  getCursorPosition() {
    const text = this.textarea.value.substring(0, this.textarea.selectionStart);
    const lines = text.split('\n');
    return {
      line: lines.length,
      column: lines[lines.length - 1].length + 1
    };
  }

  updateActiveLine() {
    const pos = this.getCursorPosition();
    this.activeLine = pos.line;

    // Position active line highlight bar
    const lineHeight = 24;
    const top = (pos.line - 1) * lineHeight + 12; // 12px padding top
    this.activeLineBg.style.top = `${top}px`;

    // Highlight active line number in gutter
    const prevActive = this.gutter.querySelector('.gutter-line.active');
    if (prevActive) prevActive.classList.remove('active');
    const currLine = this.gutter.querySelector(`.gutter-line[data-line="${pos.line}"]`);
    if (currLine) currLine.classList.add('active');
  }

  jumpToLine(lineNum) {
    if (!lineNum || lineNum < 1) return;
    const lines = this.textarea.value.split('\n');
    if (lineNum > lines.length) lineNum = lines.length;

    let charCount = 0;
    for (let i = 0; i < lineNum - 1; i++) {
      charCount += lines[i].length + 1; // +1 for '\n'
    }

    this.textarea.focus();
    this.textarea.selectionStart = charCount;
    this.textarea.selectionEnd = charCount + lines[lineNum - 1].length;

    const lineHeight = 24;
    const scrollTarget = (lineNum - 1) * lineHeight - 60;
    this.scrollContainer.scrollTop = Math.max(0, scrollTarget);

    this.setErrorLine(lineNum);
    this.updateActiveLine();
  }

  setErrorLine(lineNum) {
    this.errorLine = lineNum;
    this.render();
  }

  clearErrorLine() {
    this.errorLine = null;
    this.render();
  }

  // Code Formatter (Tidy indentation)
  formatCode() {
    const code = this.textarea.value;
    const lines = code.split('\n');
    let indentLevel = 0;
    const formattedLines = [];

    lines.forEach((line) => {
      const trimmed = line.trim();
      if (!trimmed) {
        formattedLines.push('');
        return;
      }

      // Closing braces reduce indent
      if (trimmed.startsWith('}') || trimmed.startsWith(']') || trimmed.startsWith(')')) {
        indentLevel = Math.max(0, indentLevel - 1);
      }

      formattedLines.push(' '.repeat(indentLevel * this.tabSpaces) + trimmed);

      // Opening braces or colon increase indent
      if (trimmed.endsWith('{') || trimmed.endsWith('[') || trimmed.endsWith('(') || trimmed.endsWith(':')) {
        indentLevel++;
      }
    });

    this.setValue(formattedLines.join('\n'));
  }

  // Find and Replace
  showFindReplace() {
    this.findBar.classList.add('active');
    const input = this.container.querySelector('#find-search-input');
    input.focus();
    input.select();
  }

  hideFindReplace() {
    this.findBar.classList.remove('active');
    this.findMatches = [];
    this.currentFindIndex = -1;
    this.textarea.focus();
  }

  searchFindMatches(term) {
    const countEl = this.container.querySelector('#find-count');
    if (!term) {
      this.findMatches = [];
      this.currentFindIndex = -1;
      countEl.innerText = '0/0';
      return;
    }

    const code = this.textarea.value;
    const matches = [];
    let pos = 0;
    const lowerCode = code.toLowerCase();
    const lowerTerm = term.toLowerCase();

    while ((pos = lowerCode.indexOf(lowerTerm, pos)) !== -1) {
      matches.push({ start: pos, end: pos + term.length });
      pos += term.length;
    }

    this.findMatches = matches;
    if (matches.length > 0) {
      this.currentFindIndex = 0;
      this.highlightMatch(this.currentFindIndex);
      countEl.innerText = `1/${matches.length}`;
    } else {
      this.currentFindIndex = -1;
      countEl.innerText = '0/0';
    }
  }

  navigateFindMatch(direction) {
    if (this.findMatches.length === 0) return;
    this.currentFindIndex += direction;
    if (this.currentFindIndex >= this.findMatches.length) this.currentFindIndex = 0;
    if (this.currentFindIndex < 0) this.currentFindIndex = this.findMatches.length - 1;

    this.highlightMatch(this.currentFindIndex);
    this.container.querySelector('#find-count').innerText = `${this.currentFindIndex + 1}/${this.findMatches.length}`;
  }

  highlightMatch(idx) {
    const match = this.findMatches[idx];
    if (!match) return;
    this.textarea.focus();
    this.textarea.selectionStart = match.start;
    this.textarea.selectionEnd = match.end;

    // Scroll to selection
    const textBefore = this.textarea.value.substring(0, match.start);
    const lineNum = textBefore.split('\n').length;
    this.scrollContainer.scrollTop = (lineNum - 1) * 24 - 50;
  }

  replaceCurrentMatch(replacement) {
    if (this.currentFindIndex === -1 || !this.findMatches[this.currentFindIndex]) return;
    const match = this.findMatches[this.currentFindIndex];
    const val = this.textarea.value;
    this.textarea.value = val.substring(0, match.start) + replacement + val.substring(match.end);
    this.render();
    const searchInput = this.container.querySelector('#find-search-input');
    this.searchFindMatches(searchInput.value);
  }

  replaceAllMatches(term, replacement) {
    if (!term) return;
    const val = this.textarea.value;
    const regex = new RegExp(term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
    this.textarea.value = val.replace(regex, replacement);
    this.render();
    this.searchFindMatches(term);
  }
}

if (typeof module !== 'undefined') {
  module.exports = NovaEditor;
}
