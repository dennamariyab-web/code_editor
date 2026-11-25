/**
 * NovaCode Modular Syntax Highlighter
 * Ultra-lightweight, zero-dependency tokenizer and highlighter for
 * Python, JavaScript, HTML, CSS, Java, C/C++, JSON, and Markdown.
 */

const Highlighter = (() => {

  function escapeHtml(str) {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  // Keywords definitions
  const PYTHON_KEYWORDS = /\b(and|as|assert|async|await|break|class|continue|def|del|elif|else|except|finally|for|from|global|if|import|in|is|lambda|nonlocal|not|or|pass|raise|return|try|while|with|yield|True|False|None)\b/g;
  const PYTHON_BUILTINS = /\b(abs|all|any|bin|bool|dict|enumerate|float|help|input|int|len|list|max|min|open|print|range|round|set|sorted|str|sum|tuple|type|zip)\b/g;

  const JS_KEYWORDS = /\b(async|await|break|case|catch|class|const|continue|debugger|default|delete|do|else|export|extends|finally|for|function|if|import|in|instanceof|let|new|return|super|switch|this|throw|try|typeof|var|void|while|with|yield|true|false|null|undefined)\b/g;
  const JS_BUILTINS = /\b(console|document|window|Math|JSON|Promise|Array|Object|String|Number|Boolean|Set|Map|setTimeout|setInterval)\b/g;

  const JAVA_KEYWORDS = /\b(abstract|assert|boolean|break|byte|case|catch|char|class|const|continue|default|do|double|else|enum|extends|final|finally|float|for|goto|if|implements|import|instanceof|int|interface|long|native|new|package|private|protected|public|return|short|static|strictfp|super|switch|synchronized|this|throw|throws|transient|try|void|volatile|while|true|false|null)\b/g;

  const CPP_KEYWORDS = /\b(alignas|alignof|and|and_eq|asm|auto|bitand|bitor|bool|break|case|catch|char|char8_t|char16_t|char32_t|class|compl|concept|const|consteval|constexpr|constinit|const_cast|continue|co_await|co_return|co_yield|decltype|default|delete|do|double|dynamic_cast|else|enum|explicit|export|extern|false|float|for|friend|goto|if|inline|int|long|mutable|namespace|new|noexcept|not|not_eq|nullptr|operator|or|or_eq|private|protected|public|register|reinterpret_cast|requires|return|short|signed|sizeof|static|static_assert|static_cast|struct|switch|template|this|thread_local|throw|true|try|typedef|typeid|typename|union|unsigned|using|virtual|void|volatile|wchar_t|while|xor|xor_eq)\b/g;

  function highlightPython(code) {
    let out = '';
    const lines = code.split('\n');

    lines.forEach((line, idx) => {
      // Comments
      let commentIdx = line.indexOf('#');
      let commentPart = '';
      let codePart = line;

      // Ensure '#' is not inside a string
      if (commentIdx !== -1) {
        const quoteMatches = line.match(/(['"])(?:(?=(\\?))\2.)*?\1/g);
        let insideString = false;
        if (quoteMatches) {
          // simplified: check if commentIdx is within quote
          let cursor = 0;
          for (const m of quoteMatches) {
            const start = line.indexOf(m, cursor);
            const end = start + m.length;
            if (commentIdx >= start && commentIdx < end) {
              insideString = true;
              break;
            }
            cursor = end;
          }
        }
        if (!insideString) {
          codePart = line.substring(0, commentIdx);
          commentPart = line.substring(commentIdx);
        }
      }

      let formatted = escapeHtml(codePart);

      // Strings
      formatted = formatted.replace(/(f?&quot;.*?&quot;|f?&#39;.*?&#39;|f?&quot;&quot;&quot;[\s\S]*?&quot;&quot;&quot;|f?&#39;&#39;&#39;[\s\S]*?&#39;&#39;&#39;)/g, '<span class="token-string">$1</span>');
      // Python raw string pattern before html escape
      formatted = formatted.replace(/(&quot;[^&]*&quot;|&#39;[^&#]*&#39;)/g, '<span class="token-string">$1</span>');

      // Keywords & Builtins
      formatted = formatted.replace(PYTHON_KEYWORDS, '<span class="token-keyword">$1</span>');
      formatted = formatted.replace(PYTHON_BUILTINS, '<span class="token-function">$1</span>');

      // Numbers
      formatted = formatted.replace(/\b(\d+(\.\d+)?)\b/g, '<span class="token-number">$1</span>');

      // Operators
      formatted = formatted.replace(/([+\-*\/%=<>!&|^~]+)/g, '<span class="token-operator">$1</span>');

      if (commentPart) {
        formatted += `<span class="token-comment">${escapeHtml(commentPart)}</span>`;
      }

      out += (idx > 0 ? '\n' : '') + formatted;
    });

    return out;
  }

  function highlightJavaScript(code) {
    let out = escapeHtml(code);

    // Multi-line and single-line comments
    const comments = [];
    out = out.replace(/\/\*[\s\S]*?\*\/|\/\/.*/g, (match) => {
      comments.push(match);
      return `___COMMENT_${comments.length - 1}___`;
    });

    // Strings (double, single, backtick template literals)
    const strings = [];
    out = out.replace(/`[\s\S]*?`|"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'/g, (match) => {
      strings.push(match);
      return `___STRING_${strings.length - 1}___`;
    });

    // Keywords
    out = out.replace(JS_KEYWORDS, '<span class="token-keyword">$1</span>');
    out = out.replace(JS_BUILTINS, '<span class="token-type">$1</span>');

    // Numbers
    out = out.replace(/\b(\d+(\.\d+)?)\b/g, '<span class="token-number">$1</span>');

    // Functions
    out = out.replace(/\b([a-zA-Z_$][a-zA-Z0-9_$]*)(?=\s*\()/g, '<span class="token-function">$1</span>');

    // Restore strings
    out = out.replace(/___STRING_(\d+)___/g, (_, i) => `<span class="token-string">${strings[i]}</span>`);

    // Restore comments
    out = out.replace(/___COMMENT_(\d+)___/g, (_, i) => `<span class="token-comment">${comments[i]}</span>`);

    return out;
  }

  function highlightHTML(code) {
    let out = escapeHtml(code);

    // HTML Comments
    out = out.replace(/&lt;!--[\s\S]*?--&gt;/g, '<span class="token-comment">$&</span>');

    // Tags
    out = out.replace(/&lt;(\/?[a-zA-Z0-9\-]+)([\s\S]*?)&gt;/g, (match, tagName, attrs) => {
      let attrHighlight = attrs.replace(/([a-zA-Z0-9\-]+)(=)(&quot;.*?&quot;|&#39;.*?&#39;)?/g,
        '<span class="token-attribute">$1</span>$2<span class="token-string">$3</span>');
      return `&lt;<span class="token-tag">${tagName}</span>${attrHighlight}&gt;`;
    });

    return out;
  }

  function highlightJava(code) {
    let out = escapeHtml(code);

    // Comments
    const comments = [];
    out = out.replace(/\/\*[\s\S]*?\*\/|\/\/.*/g, (match) => {
      comments.push(match);
      return `___COMMENT_${comments.length - 1}___`;
    });

    // Strings
    const strings = [];
    out = out.replace(/"(?:[^"\\]|\\.)*"/g, (match) => {
      strings.push(match);
      return `___STRING_${strings.length - 1}___`;
    });

    // Keywords
    out = out.replace(JAVA_KEYWORDS, '<span class="token-keyword">$1</span>');

    // Types
    out = out.replace(/\b(String|System|Scanner|List|ArrayList|Map|HashMap|Math|Integer|Double)\b/g, '<span class="token-type">$1</span>');

    // Numbers
    out = out.replace(/\b(\d+(\.\d+)?f?)\b/g, '<span class="token-number">$1</span>');

    // Functions
    out = out.replace(/\b([a-zA-Z0-9_]+)(?=\s*\()/g, '<span class="token-function">$1</span>');

    // Restore
    out = out.replace(/___STRING_(\d+)___/g, (_, i) => `<span class="token-string">${strings[i]}</span>`);
    out = out.replace(/___COMMENT_(\d+)___/g, (_, i) => `<span class="token-comment">${comments[i]}</span>`);

    return out;
  }

  function highlightCpp(code) {
    let out = escapeHtml(code);

    // Preprocessor directives
    out = out.replace(/(#include|#define|#ifdef|#ifndef|#endif)\b.*/g, '<span class="token-attribute">$&</span>');

    // Comments
    const comments = [];
    out = out.replace(/\/\*[\s\S]*?\*\/|\/\/.*/g, (match) => {
      comments.push(match);
      return `___COMMENT_${comments.length - 1}___`;
    });

    // Strings
    const strings = [];
    out = out.replace(/"(?:[^"\\]|\\.)*"/g, (match) => {
      strings.push(match);
      return `___STRING_${strings.length - 1}___`;
    });

    // Keywords
    out = out.replace(CPP_KEYWORDS, '<span class="token-keyword">$1</span>');

    // Common STL
    out = out.replace(/\b(std|cout|cin|endl|vector|string|map|set|pair)\b/g, '<span class="token-type">$1</span>');

    // Numbers
    out = out.replace(/\b(\d+(\.\d+)?)\b/g, '<span class="token-number">$1</span>');

    // Restore
    out = out.replace(/___STRING_(\d+)___/g, (_, i) => `<span class="token-string">${strings[i]}</span>`);
    out = out.replace(/___COMMENT_(\d+)___/g, (_, i) => `<span class="token-comment">${comments[i]}</span>`);

    return out;
  }

  function highlight(code, language) {
    if (!code) return '';
    const lang = (language || 'python').toLowerCase();

    switch (lang) {
      case 'python':
      case 'py':
        return highlightPython(code);
      case 'javascript':
      case 'js':
      case 'json':
        return highlightJavaScript(code);
      case 'html':
      case 'html_css':
      case 'css':
        return highlightHTML(code);
      case 'java':
        return highlightJava(code);
      case 'c':
      case 'cpp':
      case 'c++':
        return highlightCpp(code);
      default:
        return escapeHtml(code);
    }
  }

  return {
    highlight,
    escapeHtml
  };
})();

if (typeof module !== 'undefined') {
  module.exports = Highlighter;
}
