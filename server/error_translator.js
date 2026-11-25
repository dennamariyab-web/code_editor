/**
 * Smart Error Translator for NovaCode
 * Intercepts cryptic compiler and runtime error outputs (Python, Node.js, Java, C/C++)
 * and translates them into plain-English, supportive, actionable diagnostic cards for beginners.
 */

function translateError(rawStderr, rawStdout, language, sourceCode) {
  const combined = (rawStderr || '') + '\n' + (rawStdout || '');
  if (!combined.trim()) {
    return null;
  }

  const lang = (language || '').toLowerCase();

  if (lang === 'python' || lang === 'py') {
    return translatePythonError(combined, sourceCode);
  } else if (lang === 'javascript' || lang === 'js' || lang === 'node') {
    return translateJavaScriptError(combined, sourceCode);
  } else if (lang === 'java') {
    return translateJavaError(combined, sourceCode);
  } else if (lang === 'c' || lang === 'cpp' || lang === 'c++') {
    return translateCppError(combined, sourceCode);
  }

  // Fallback generic error extractor
  return extractGenericError(combined);
}

// ----------------------------------------------------
// PYTHON ERROR TRANSLATOR
// ----------------------------------------------------
function translatePythonError(text, sourceCode) {
  // Extract line number: File "...", line X
  const lineMatch = text.match(/File\s+["'][^"']+["'],\s+line\s+(\d+)/i);
  const lineNum = lineMatch ? parseInt(lineMatch[1], 10) : null;

  // Extract error class and message (last line usually: NameError: name 'foo' is not defined)
  const errMatch = text.match(/([a-zA-Z0-9_]+Error|[a-zA-Z0-9_]+Exception):\s*(.*)/i);
  const errorType = errMatch ? errMatch[1] : 'Python Error';
  const errorMessage = errMatch ? errMatch[2].trim() : text.trim().split('\n').pop();

  let codeSnippet = '';
  if (sourceCode && lineNum) {
    const lines = sourceCode.split('\n');
    if (lines[lineNum - 1] !== undefined) {
      codeSnippet = lines[lineNum - 1].trim();
    }
  }

  let diagnostic = {
    language: 'Python',
    errorType,
    rawMessage: errorMessage,
    line: lineNum,
    codeSnippet,
    whatHappened: 'An unexpected issue occurred while Python was running your code.',
    whyItHappened: 'Python stopped because it encountered an instruction it could not execute.',
    howToFix: 'Check the line where the error occurred and verify the syntax and variable names.',
    badgeClass: 'error',
    autoFix: null
  };

  switch (errorType) {
    case 'SyntaxError':
      diagnostic.whatHappened = 'Python found a spelling or punctuation mistake that violates the rules of the language.';
      if (/invalid syntax/i.test(errorMessage)) {
        diagnostic.whyItHappened = 'You might have forgotten a colon `:` at the end of an `if`, `for`, `while`, or `def` line, or have an unclosed bracket or quote.';
        diagnostic.howToFix = '1. Look at line ' + (lineNum || '') + ' and the line directly above it.\n2. Ensure every `if`, `elif`, `else`, `def`, `for`, and `while` ends with a colon `:`.';
        if (codeSnippet && !codeSnippet.endsWith(':') && /^(if|elif|else|for|while|def|class)\b/.test(codeSnippet)) {
          diagnostic.autoFix = {
            description: 'Add missing colon `:` at end of line',
            replacement: codeSnippet + ':'
          };
        }
      } else if (/was never closed|unmatched/i.test(errorMessage)) {
        diagnostic.whyItHappened = 'A bracket `(`, `[`, `{` or quotation mark `"` was opened but never closed.';
        diagnostic.howToFix = 'Make sure every opening quote or parenthesis has a matching closing pair on the same line or block.';
      }
      break;

    case 'IndentationError':
      diagnostic.whatHappened = 'The spacing or tabs at the start of your code lines are uneven.';
      diagnostic.whyItHappened = 'In Python, spaces matter! Statements inside a loop, function, or `if` statement must be indented (typically 4 spaces).';
      diagnostic.howToFix = 'Select line ' + (lineNum || '') + ' and press the Tab key to indent it under its parent statement, or ensure you are not mixing tabs and spaces.';
      break;

    case 'NameError':
      const varMatch = errorMessage.match(/name\s+['"]([^'"]+)['"]\s+is not defined/i);
      const varName = varMatch ? varMatch[1] : 'this variable';
      diagnostic.whatHappened = `Python cannot find a variable or function called "${varName}".`;
      diagnostic.whyItHappened = `Usually this means "${varName}" was either:\n• Misspelled (e.g. \`pint\` instead of \`print\`)\n• Used before you assigned a value to it\n• Created inside a function and not accessible outside (scope).`;
      diagnostic.howToFix = `1. Check your spelling of "${varName}".\n2. Make sure you defined \`${varName} = ...\` before using it.\n3. Python is case-sensitive: \`myVar\` is different from \`myvar\`.`;
      if (varName === 'pint') {
        diagnostic.autoFix = {
          description: 'Change "pint" to "print"',
          replacement: codeSnippet.replace(/\bpint\b/g, 'print')
        };
      }
      break;

    case 'TypeError':
      diagnostic.whatHappened = 'An operation was attempted on an incompatible data type.';
      if (/can only concatenate str/i.test(errorMessage)) {
        diagnostic.whyItHappened = 'You tried to combine text (str) and a number (int) directly with `+` without converting the number first.';
        diagnostic.howToFix = 'Wrap your number in `str(number)` or use an f-string: `f"My score is {score}"`.';
      } else if (/not callable/i.test(errorMessage)) {
        diagnostic.whyItHappened = 'You used parentheses `()` on something that is a variable rather than a function.';
        diagnostic.howToFix = 'Check if you accidentally named a variable the same as a function, or used `()` instead of square brackets `[]`.';
      } else {
        diagnostic.whyItHappened = 'A function expected one kind of data (like a string) but received something else (like a list or number).';
        diagnostic.howToFix = 'Check the types of your variables using `print(type(your_variable))` before line ' + (lineNum || '');
      }
      break;

    case 'IndexError':
      diagnostic.whatHappened = 'You tried to access an item position in a list that does not exist.';
      diagnostic.whyItHappened = 'Remember that Python lists start counting at index 0! If a list has 3 items, the valid indices are 0, 1, and 2. Asking for index 3 causes this error.';
      diagnostic.howToFix = 'Check the size of your list using `len(my_list)` before accessing items, or ensure your loop index is `< len(my_list)`.';
      break;

    case 'KeyError':
      diagnostic.whatHappened = 'You looked for a key in a dictionary that does not exist.';
      diagnostic.whyItHappened = 'The dictionary does not contain the key specified inside brackets `dict[key]`.';
      diagnostic.howToFix = 'Use `my_dict.get(key, "default")` to safely retrieve values, or check `if key in my_dict:` first.';
      break;

    case 'ZeroDivisionError':
      diagnostic.whatHappened = 'Your program tried to divide a number by zero.';
      diagnostic.whyItHappened = 'Division by zero is mathematically undefined. A variable used as the denominator evaluated to 0.';
      diagnostic.howToFix = 'Add a check before dividing: `if denominator != 0:` to handle the zero case safely.';
      break;

    case 'AttributeError':
      diagnostic.whatHappened = 'You tried to use a method or property that this object does not have.';
      diagnostic.whyItHappened = 'For example, Python lists use `.append()`, not `.add()`. Strings use `.upper()`, but numbers do not.';
      diagnostic.howToFix = 'Check the data type of the variable and verify which methods it supports.';
      if (codeSnippet && /\.add\s*\(/.test(codeSnippet)) {
        diagnostic.autoFix = {
          description: 'Change .add() to .append() for list',
          replacement: codeSnippet.replace(/\.add\s*\(/g, '.append(')
        };
      }
      break;

    case 'ModuleNotFoundError':
      diagnostic.whatHappened = 'Python cannot find the library or module you asked to `import`.';
      diagnostic.whyItHappened = 'The package might not be installed on this computer, or its name might be misspelled.';
      diagnostic.howToFix = 'Verify spelling. If it is an external package, install it using `pip install <package_name>`.';
      break;
  }

  return diagnostic;
}

// ----------------------------------------------------
// JAVASCRIPT / NODE ERROR TRANSLATOR
// ----------------------------------------------------
function translateJavaScriptError(text, sourceCode) {
  // Typical Node error: /path/file.js:12:5
  const lineMatch = text.match(/[:\s](\d+):(\d+)/i) || text.match(/at\s+.*:(\d+):(\d+)/i);
  const lineNum = lineMatch ? parseInt(lineMatch[1], 10) : null;
  const colNum = lineMatch ? parseInt(lineMatch[2], 10) : null;

  const errMatch = text.match(/([a-zA-Z0-9_]+Error):\s*(.*)/i);
  const errorType = errMatch ? errMatch[1] : 'JavaScript Error';
  const errorMessage = errMatch ? errMatch[2].trim() : text.trim().split('\n')[0];

  let codeSnippet = '';
  if (sourceCode && lineNum) {
    const lines = sourceCode.split('\n');
    if (lines[lineNum - 1] !== undefined) {
      codeSnippet = lines[lineNum - 1].trim();
    }
  }

  let diagnostic = {
    language: 'JavaScript',
    errorType,
    rawMessage: errorMessage,
    line: lineNum,
    column: colNum,
    codeSnippet,
    whatHappened: 'A JavaScript runtime error was encountered.',
    whyItHappened: 'The JavaScript engine stopped execution due to an unhandled exception.',
    howToFix: 'Check line ' + (lineNum || '') + ' for variable declarations or syntax errors.',
    badgeClass: 'error',
    autoFix: null
  };

  switch (errorType) {
    case 'ReferenceError':
      diagnostic.whatHappened = `A variable or function is being used before it was declared.`;
      diagnostic.whyItHappened = `JavaScript cannot find this identifier in the current scope. You might have forgotten \`let\`, \`const\`, or misspelled the name.`;
      diagnostic.howToFix = `1. Check your spelling.\n2. Ensure you declared the variable: \`let myVariable = ...\`\n3. Note JavaScript is case-sensitive (\`UserName\` vs \`username\`).`;
      break;

    case 'TypeError':
      if (/cannot read propert|is not a function/i.test(errorMessage)) {
        diagnostic.whatHappened = 'You tried to access a property or call a method on `undefined` or `null`.';
        diagnostic.whyItHappened = 'The object before the dot `.` does not hold real data yet (it is `undefined` or `null`).';
        diagnostic.howToFix = 'Use optional chaining like `user?.name` or check `if (object) { ... }` before accessing its properties.';
      } else if (/assignment to constant variable/i.test(errorMessage)) {
        diagnostic.whatHappened = 'You attempted to reassign a variable declared with `const`.';
        diagnostic.whyItHappened = 'Variables declared with `const` are constant and cannot be reassigned with `=` later.';
        diagnostic.howToFix = 'Change `const` to `let` when you initially declare the variable if you plan to update its value.';
      }
      break;

    case 'SyntaxError':
      diagnostic.whatHappened = 'JavaScript found code that doesn\'t follow grammatical syntax rules.';
      diagnostic.whyItHappened = 'Often a missing curly brace `}`, closing parenthesis `)`, bracket, or quote.';
      diagnostic.howToFix = 'Check line ' + (lineNum || '') + ' and make sure all brackets and quotes come in matching pairs.';
      break;

    case 'RangeError':
      if (/maximum call stack/i.test(errorMessage)) {
        diagnostic.whatHappened = 'Call Stack Overflow (Infinite Recursion).';
        diagnostic.whyItHappened = 'A function is repeatedly calling itself without reaching a stopping condition (base case).';
        diagnostic.howToFix = 'Add an `if` check inside the function to stop recursion when the task is done (e.g., `if (n <= 1) return 1;`).';
      }
      break;
  }

  return diagnostic;
}

// ----------------------------------------------------
// JAVA ERROR TRANSLATOR
// ----------------------------------------------------
function translateJavaError(text, sourceCode) {
  const lineMatch = text.match(/[:\s](\d+):\s*error:/i) || text.match(/\.java:(\d+)/i);
  const lineNum = lineMatch ? parseInt(lineMatch[1], 10) : null;

  let whatHappened = 'Java compilation or runtime error.';
  let whyItHappened = 'Java enforces strict static types and object-oriented rules.';
  let howToFix = 'Inspect line ' + (lineNum || '') + ' for type mismatches, missing semicolons, or import statements.';
  let errorType = 'Java Error';

  if (/cannot find symbol/i.test(text)) {
    errorType = 'Cannot Find Symbol';
    whatHappened = 'The Java compiler cannot recognize a variable, class, or method.';
    whyItHappened = 'Either the name was misspelled, the variable was not declared, or an `import` statement (like `import java.util.Scanner;`) is missing.';
    howToFix = '1. Check spelling and capitalization.\n2. Ensure you declared the variable with its type (e.g. `int count = 0;`).\n3. Add necessary imports at top of file.';
  } else if (/';' expected/i.test(text)) {
    errorType = 'Missing Semicolon';
    whatHappened = 'A semicolon `;` was expected at the end of a statement.';
    whyItHappened = 'Every standalone statement in Java must terminate with a semicolon `;`.';
    howToFix = 'Add a `;` to the end of line ' + (lineNum || '');
  } else if (/class .* is public, should be declared in a file/i.test(text)) {
    errorType = 'Class Name Mismatch';
    whatHappened = 'The public class name does not match the file name.';
    whyItHappened = 'In Java, a `public class Main` must be saved in a file named `Main.java`.';
    howToFix = 'Rename your file to match the public class name, or change the class name.';
  } else if (/NullPointerException/i.test(text)) {
    errorType = 'NullPointerException';
    whatHappened = 'Your code tried to use an object reference that currently points to `null` (nothing).';
    whyItHappened = 'An object was declared but not initialized with `new`, or a method returned `null`.';
    howToFix = 'Initialize the variable before using it (e.g., `List list = new ArrayList();`), or add a check: `if (obj != null) { ... }`.';
  }

  return {
    language: 'Java',
    errorType,
    rawMessage: text.trim().split('\n')[0],
    line: lineNum,
    codeSnippet: '',
    whatHappened,
    whyItHappened,
    howToFix,
    badgeClass: 'error',
    autoFix: null
  };
}

// ----------------------------------------------------
// C / C++ ERROR TRANSLATOR
// ----------------------------------------------------
function translateCppError(text, sourceCode) {
  const lineMatch = text.match(/[:\s](\d+):(\d+):\s*error:/i);
  const lineNum = lineMatch ? parseInt(lineMatch[1], 10) : null;

  let whatHappened = 'C/C++ compilation or runtime error.';
  let whyItHappened = 'The GCC/Clang compiler encountered code that violates C/C++ grammar or type rules.';
  let howToFix = 'Check line ' + (lineNum || '') + ' for syntax errors or missing header includes.';
  let errorType = 'C/C++ Error';

  if (/expected ';' before/i.test(text)) {
    errorType = 'Missing Semicolon';
    whatHappened = 'Missing semicolon `;` at the end of a statement.';
    whyItHappened = 'C and C++ require every statement to end with a semicolon.';
    howToFix = 'Add a `;` at the end of line ' + (lineNum || '');
  } else if (/was not declared in this scope/i.test(text)) {
    errorType = 'Undeclared Variable/Function';
    whatHappened = 'The compiler encountered a variable or function it has never seen.';
    whyItHappened = 'In C/C++, all variables must be declared with their type (e.g. `int x = 5;`) before use.';
    howToFix = 'Declare the variable with its type, or check `#include <iostream>` and `using namespace std;`.';
  } else if (/undefined reference to `main'/i.test(text)) {
    errorType = 'Missing main() Function';
    whatHappened = 'The linker could not find the starting entry point `main()`.';
    whyItHappened = 'Every C and C++ program must have an `int main() { ... return 0; }` function.';
    howToFix = 'Ensure your program defines `int main() { ... }`.';
  } else if (/segmentation fault/i.test(text)) {
    errorType = 'Segmentation Fault';
    whatHappened = 'The program crashed because it tried to read or write memory it does not own.';
    whyItHappened = 'Common causes: accessing an array out of bounds, dereferencing a NULL pointer, or infinite recursion overflowing the stack.';
    howToFix = 'Check your array loop limits and verify all pointers are valid before using them.';
  }

  return {
    language: 'C/C++',
    errorType,
    rawMessage: text.trim().split('\n')[0],
    line: lineNum,
    codeSnippet: '',
    whatHappened,
    whyItHappened,
    howToFix,
    badgeClass: 'error',
    autoFix: null
  };
}

function extractGenericError(text) {
  const lineMatch = text.match(/line\s+(\d+)/i) || text.match(/:(\d+):/i);
  const lineNum = lineMatch ? parseInt(lineMatch[1], 10) : null;

  return {
    language: 'Code',
    errorType: 'Runtime / Compilation Output',
    rawMessage: text.trim().split('\n').slice(-3).join('\n'),
    line: lineNum,
    codeSnippet: '',
    whatHappened: 'The program produced an error during execution or compilation.',
    whyItHappened: 'Review the output terminal for detailed compiler diagnostics.',
    howToFix: 'Check the line indicated in the output and verify correct syntax and variable definitions.',
    badgeClass: 'error',
    autoFix: null
  };
}

module.exports = {
  translateError
};
