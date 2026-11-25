/**
 * NovaCode Automated Unit & Integration Test Suite
 * Validates runtimes inspection, security scanner, smart error translator,
 * assistant engine, and code execution.
 */

const assert = require('assert');
const { inspectRuntimes } = require('../server/runtimes');
const { scanCodeSecurity } = require('../server/security');
const { translateError } = require('../server/error_translator');
const { explainCode, explainKeyword, getStarterTemplates, getCheatSheets } = require('../server/assistant_engine');
const { runCode } = require('../server/executor');
const { validateAndSimulateC } = require('../server/c_runner');

let passedTests = 0;
let totalTests = 0;

function test(name, fn) {
  totalTests++;
  try {
    fn();
    console.log(`  ✔ [PASS] ${name}`);
    passedTests++;
  } catch (err) {
    console.error(`  ✖ [FAIL] ${name}`);
    console.error(`     Error: ${err.message}`);
  }
}

async function runAllTests() {
  console.log('\n========================================');
  console.log('  NovaCode Automated Verification Suite ');
  console.log('========================================\n');

  // 1. RUNTIMES INSPECTION
  console.log('[1] Testing Runtime Inspector...');
  test('Inspects runtimes without crashing', () => {
    const runtimes = inspectRuntimes(true);
    assert(runtimes.c, 'C runtime entry should exist');
    assert(runtimes.cpp, 'C++ runtime entry should exist');
    assert(runtimes.python, 'Python runtime entry should exist');
    assert(runtimes.javascript, 'JavaScript runtime entry should exist');
    assert(runtimes.html_css, 'HTML/CSS runtime entry should exist');
    assert(runtimes.java, 'Java runtime entry should exist');
    assert.strictEqual(runtimes.html_css.available, true, 'HTML/CSS built-in should always be ready');
  });

  test('Accurately detects installed Python and Node.js', () => {
    const runtimes = inspectRuntimes(false);
    assert.strictEqual(runtimes.python.available, true, 'Python should be detected on this machine');
    assert.strictEqual(runtimes.javascript.available, true, 'Node.js should be detected on this machine');
    assert(runtimes.python.version.includes('3.'), 'Python version should be Python 3');
  });

  test('Accurately marks uninstalled compilers as missing with setup guide', () => {
    const runtimes = inspectRuntimes(false);
    if (!runtimes.c.available) {
      assert(runtimes.c.setupGuide, 'Missing C compiler should include setup guide');
      assert(runtimes.c.setupGuide.steps.length > 0, 'Setup guide should contain steps');
    }
  });

  // 2. SECURITY SCANNER
  console.log('\n[2] Testing Security & Safe-Code Scanner...');
  test('Identifies safe code as 100% safe', () => {
    const code = 'print("Hello, world!")\nx = 10\ny = 20\nprint(x + y)';
    const result = scanCodeSecurity(code, 'python');
    assert.strictEqual(result.safe, true);
    assert.strictEqual(result.dangerCount, 0);
    assert.strictEqual(result.score, 100);
  });

  test('Detects dangerous file deletion commands', () => {
    const code = 'import os\nos.remove("important_file.txt")';
    const result = scanCodeSecurity(code, 'python');
    assert.strictEqual(result.safe, false);
    assert(result.dangerCount > 0);
    assert(result.warnings.some(w => w.category === 'File System Operation'));
  });

  test('Detects unbounded infinite loops', () => {
    const code = 'while True:\n    x = 1';
    const result = scanCodeSecurity(code, 'python');
    assert(result.warningCount > 0);
    assert(result.warnings.some(w => w.category === 'Unbounded Infinite Loop'));
  });

  test('Detects unsafe dynamic eval() calls', () => {
    const code = 'user_data = "1 + 1"\nresult = eval(user_data)';
    const result = scanCodeSecurity(code, 'python');
    assert(result.warnings.some(w => w.category === 'Dynamic Code Execution'));
  });

  // 3. SMART ERROR TRANSLATOR
  console.log('\n[3] Testing Smart Error Translator...');
  test('Translates Python SyntaxError invalid syntax', () => {
    const rawStderr = 'File "test.py", line 4\n    if x == 5\n             ^\nSyntaxError: invalid syntax';
    const source = 'x = 5\nprint(x)\n# comment\nif x == 5';
    const diag = translateError(rawStderr, '', 'python', source);
    assert.strictEqual(diag.errorType, 'SyntaxError');
    assert.strictEqual(diag.line, 4);
    assert(diag.whatHappened.length > 0);
    assert(diag.whyItHappened.includes('colon'));
  });

  test('Translates Python NameError with auto-fix suggestion for pint -> print', () => {
    const rawStderr = 'File "main.py", line 2, in <module>\n    pint("hello")\nNameError: name \'pint\' is not defined';
    const source = 'x = 10\npint("hello")';
    const diag = translateError(rawStderr, '', 'python', source);
    assert.strictEqual(diag.errorType, 'NameError');
    assert.strictEqual(diag.line, 2);
    assert(diag.autoFix, 'AutoFix should be provided for pint');
    assert.strictEqual(diag.autoFix.replacement, 'print("hello")');
  });

  test('Translates JavaScript ReferenceError', () => {
    const rawStderr = 'ReferenceError: totalScore is not defined\n    at Object.<anonymous> (/app/test.js:15:3)';
    const diag = translateError(rawStderr, '', 'javascript', '');
    assert.strictEqual(diag.errorType, 'ReferenceError');
    assert.strictEqual(diag.line, 15);
    assert(diag.whatHappened.includes('declared'));
  });

  test('Translates Java cannot find symbol error', () => {
    const rawStderr = 'Main.java:6: error: cannot find symbol\n        int sum = add(a, b);';
    const diag = translateError(rawStderr, '', 'java', '');
    assert.strictEqual(diag.errorType, 'Cannot Find Symbol');
    assert.strictEqual(diag.line, 6);
    assert(diag.howToFix.includes('spelling'));
  });

  // 4. ASSISTANT & LEARNING ENGINE
  console.log('\n[4] Testing Assistant & Learning Engine...');
  test('Generates line-by-line code explanation', () => {
    const code = 'import math\ndef calc(radius):\n    return math.pi * radius * radius\n\nprint(calc(5))';
    const explanation = explainCode(code, 'python');
    assert(explanation.summary.length > 0);
    assert(explanation.breakdown.length >= 3);
    assert(explanation.breakdown.some(b => b.category === 'function'));
    assert(explanation.breakdown.some(b => b.category === 'import'));
  });

  test('Explains programming keywords with real-world analogies', () => {
    const defKw = explainKeyword('def');
    assert(defKw, 'Keyword def should exist in glossary');
    assert(defKw.analogy.includes('recipe'), 'Analogy should mention recipe card');

    const printfKw = explainKeyword('printf');
    assert(printfKw, 'Keyword printf should exist in glossary');
    assert(printfKw.analogy.includes('printed form'));
  });

  test('Returns ready-to-run starter templates and cheat sheets', () => {
    const templates = getStarterTemplates();
    assert(templates.some(t => t.language === 'c'), 'Should provide a C template');
    const cheatSheets = getCheatSheets();
    assert(cheatSheets.length >= 3, 'Should provide cheat sheets');
  });

  // 5. CODE EXECUTION (PYTHON, NODE.JS & C SIMULATOR)
  console.log('\n[5] Testing Safe Code Execution Engine...');
  test('Executes Python code and captures output', (done) => {
    let capturedStdout = '';
    const code = 'print("NovaCode Engine Test: " + str(10 * 7))';
    runCode(
      { code, language: 'python' },
      (out) => { capturedStdout += out; },
      (err) => {},
      (exitInfo) => {
        assert.strictEqual(exitInfo.exitCode, 0);
        assert(capturedStdout.includes('NovaCode Engine Test: 70'));
      }
    );
  });

  test('Executes JavaScript code and captures output', (done) => {
    let capturedStdout = '';
    const code = 'console.log("Node JS Test: " + [1, 2, 3].reduce((a, b) => a + b, 0));';
    runCode(
      { code, language: 'javascript' },
      (out) => { capturedStdout += out; },
      (err) => {},
      (exitInfo) => {
        assert.strictEqual(exitInfo.exitCode, 0);
        assert(capturedStdout.includes('Node JS Test: 6'));
      }
    );
  });

  test('Validates and simulates C code execution', () => {
    const cCode = `#include <stdio.h>\n\nint main() {\n    int a = 10;\n    int b = 25;\n    printf("Sum is %d\\n", a + b);\n    return 0;\n}`;
    const result = validateAndSimulateC(cCode);
    assert.strictEqual(result.success, true);
    assert(result.output.includes('Sum is 35'));
  });

  test('Catches missing semicolon in C code with exact line and auto-fix', () => {
    const badCode = `#include <stdio.h>\n\nint main() {\n    int a = 10\n    return 0;\n}`;
    const result = validateAndSimulateC(badCode);
    assert.strictEqual(result.success, false);
    assert.strictEqual(result.diagnostic.errorType, 'Syntax Error (Missing Semicolon)');
    assert.strictEqual(result.diagnostic.line, 4);
    assert(result.diagnostic.autoFix);
  });

  test('Handles Web (HTML/CSS) with zero configuration', () => {
    const result = runCode(
      { code: '<h1>Test</h1>', language: 'html_css' },
      () => {},
      () => {},
      () => {}
    );
    assert.strictEqual(result.status, 'web_preview');
  });

  console.log('\n----------------------------------------');
  console.log(`Tests finished: ${passedTests} passed out of ${totalTests}`);
  console.log('========================================\n');
}

runAllTests();
