/**
 * NovaCode Live Sandboxed Web Preview Engine
 * Provides live execution and preview of HTML/CSS/JavaScript with
 * responsive device frames and console log mirroring.
 */

class WebPreview {
  constructor(containerEl, options = {}) {
    this.container = containerEl;
    this.onConsoleLog = options.onConsoleLog || null;
    this.onConsoleError = options.onConsoleError || null;
    this.currentDevice = 'desktop'; // desktop | tablet | mobile

    this.initDOM();
    this.bindEvents();
  }

  initDOM() {
    this.container.innerHTML = `
      <div class="web-preview-container">
        <div class="web-preview-toolbar">
          <div style="display: flex; align-items: center; gap: 8px;">
            <span style="font-weight: 700; color: #475569;">🌐 Live Web Engine</span>
            <span style="font-size: 0.72rem; background: #e2e8f0; padding: 2px 6px; border-radius: 4px; color: #64748b;">Sandboxed</span>
          </div>
          <div style="display: flex; align-items: center; gap: 6px;">
            <button class="btn btn-sm btn-outline device-btn active" data-device="desktop" title="Desktop view">🖥️ Desktop</button>
            <button class="btn btn-sm btn-outline device-btn" data-device="tablet" title="Tablet view (768px)">📱 Tablet</button>
            <button class="btn btn-sm btn-outline device-btn" data-device="mobile" title="Mobile view (375px)">📲 Mobile</button>
            <button class="btn btn-sm btn-outline" id="web-refresh-btn" title="Reload preview">🔄 Reload</button>
          </div>
        </div>
        <div class="preview-iframe-wrapper">
          <iframe id="preview-frame" class="preview-iframe" sandbox="allow-scripts allow-modals allow-forms allow-same-origin"></iframe>
        </div>
      </div>
    `;

    this.iframe = this.container.querySelector('#preview-frame');
    this.deviceBtns = this.container.querySelectorAll('.device-btn');
  }

  bindEvents() {
    this.deviceBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        this.deviceBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const device = btn.getAttribute('data-device');
        this.setDevice(device);
      });
    });

    this.container.querySelector('#web-refresh-btn').addEventListener('click', () => {
      this.refresh();
    });

    // Listen to messages from iframe console forwarder
    window.addEventListener('message', (event) => {
      if (!event.data || event.data.source !== 'novacode-preview') return;

      if (event.data.type === 'log' && this.onConsoleLog) {
        this.onConsoleLog(`[Web Console] ${event.data.args.join(' ')}\n`);
      } else if (event.data.type === 'error' && this.onConsoleError) {
        this.onConsoleError(`[Web Error] ${event.data.message}\n`);
      }
    });
  }

  setDevice(device) {
    this.currentDevice = device;
    if (device === 'mobile') {
      this.iframe.style.width = '375px';
      this.iframe.style.border = '1px solid #cbd5e1';
      this.iframe.style.boxShadow = '0 4px 20px rgba(0,0,0,0.15)';
    } else if (device === 'tablet') {
      this.iframe.style.width = '768px';
      this.iframe.style.border = '1px solid #cbd5e1';
      this.iframe.style.boxShadow = '0 4px 20px rgba(0,0,0,0.15)';
    } else {
      this.iframe.style.width = '100%';
      this.iframe.style.border = 'none';
      this.iframe.style.boxShadow = 'none';
    }
  }

  updateContent(htmlCode) {
    this.lastHtml = htmlCode;

    // Inject console forwarder script into head of user code
    const consoleInterceptor = `
      <script>
        (function() {
          const origLog = console.log;
          const origWarn = console.warn;
          const origErr = console.error;

          console.log = function(...args) {
            origLog.apply(console, args);
            window.parent.postMessage({
              source: 'novacode-preview',
              type: 'log',
              args: args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a))
            }, '*');
          };

          console.error = function(...args) {
            origErr.apply(console, args);
            window.parent.postMessage({
              source: 'novacode-preview',
              type: 'error',
              message: args.join(' ')
            }, '*');
          };

          window.onerror = function(msg, url, line, col) {
            window.parent.postMessage({
              source: 'novacode-preview',
              type: 'error',
              message: msg + ' (Line ' + line + ':' + col + ')'
            }, '*');
            return false;
          };
        })();
      <\\/script>
    `;

    let injected = htmlCode;
    if (/<head>/i.test(injected)) {
      injected = injected.replace(/<head>/i, `<head>${consoleInterceptor}`);
    } else {
      injected = consoleInterceptor + injected;
    }

    const doc = this.iframe.contentDocument || (this.iframe.contentWindow && this.iframe.contentWindow.document);
    if (doc) {
      doc.open();
      doc.write(injected);
      doc.close();
    }
  }

  refresh() {
    if (this.lastHtml) {
      this.updateContent(this.lastHtml);
    }
  }
}

if (typeof module !== 'undefined') {
  module.exports = WebPreview;
}
