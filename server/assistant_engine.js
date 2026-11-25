/**
 * Beginner Assistant & Learning Engine for NovaCode
 * Empowers students and new coders with plain-language code explanations,
 * keyword glossaries, Socratic debugging guidance, and cheat sheets.
 */

// Keyword Glossary with real-world analogies
const KEYWORD_GLOSSARY = {
  // C / C++ Keywords
  printf: {
    language: 'C / C++',
    keyword: 'printf',
    title: 'Print Formatted Text',
    analogy: 'Like filling in blanks on a printed form. You provide a template with %d or %s placeholders, and C fills in the values.',
    why: 'Standard way in C to display text, numbers, and data to the console.',
    example: '#include <stdio.h>\n\nint age = 16;\nprintf("I am %d years old.\\n", age);',
    pitfall: 'Don\'t forget \\n for a new line, and make sure your format specifier (%d for integers, %f for floats, %s for strings) matches the variable type!'
  },
  scanf: {
    language: 'C',
    keyword: 'scanf',
    title: 'Scan Formatted User Input',
    analogy: 'Like handing someone an empty box and asking them to put something in it. You give scanf the address of your variable (&variable).',
    why: 'Allows your C program to read input typed by the user on the keyboard.',
    example: 'int score;\nprintf("Enter score: ");\nscanf("%d", &score);',
    pitfall: 'You MUST put an ampersand `&` before standard variables (like `&score`) so scanf knows where to store the answer in memory!'
  },
  include: {
    language: 'C / C++',
    keyword: '#include',
    title: 'Include Header File',
    analogy: 'Like inserting a library textbook into your backpack before class starts.',
    why: 'Tells the C preprocessor to load standard functions like printf (from <stdio.h>) or math tools (from <math.h>).',
    example: '#include <stdio.h>\n#include <stdlib.h>',
    pitfall: 'Angle brackets `<stdio.h>` are used for standard system libraries; quotation marks `"my_file.h"` are for your own files.'
  },
  main: {
    language: 'C / C++ / Java',
    keyword: 'main',
    title: 'Program Entry Point',
    analogy: 'The front door of a building. No matter how large the house is, visitors must always enter through the front door first.',
    why: 'The operating system always begins executing your C program at the `main()` function.',
    example: 'int main() {\n    printf("Starting here!\\n");\n    return 0;\n}',
    pitfall: 'Every C and C++ program must have exactly ONE `main()` function. Having zero or more than one causes a linker error.'
  },
  struct: {
    language: 'C / C++',
    keyword: 'struct',
    title: 'Custom Grouped Data Structure',
    analogy: 'Like a student ID card holding multiple pieces of information together: name, grade, and ID number.',
    why: 'Allows you to bundle different data types together into one custom record.',
    example: 'struct Student {\n    char name[50];\n    int age;\n    float gpa;\n};',
    pitfall: 'Remember to end the `struct` definition with a semicolon `;` after the closing brace `};`!'
  },
  sizeof: {
    language: 'C / C++',
    keyword: 'sizeof',
    title: 'Size in Memory Bytes',
    analogy: 'Like placing an object on a digital scale to see how much computer memory (in bytes) it weighs.',
    why: 'Returns the number of bytes occupied by a variable or data type in RAM.',
    example: 'printf("Int size: %zu bytes\\n", sizeof(int)); // 4 bytes',
    pitfall: 'sizeof is evaluated at compile time, not runtime.'
  },
  def: {
    language: 'Python',
    keyword: 'def',
    title: 'Define a Function',
    analogy: 'Like creating a reusable recipe card. Once you write the recipe, you can make the dish whenever you want just by calling its name!',
    why: 'Functions group code into reusable blocks so you don\'t have to copy and paste the same instructions.',
    example: 'def greet(name):\n    print(f"Hello, {name}!")\n\ngreet("Maya")',
    pitfall: 'Don\'t forget the colon `:` at the end of the `def` line, and remember to indent the lines inside the function.'
  },
  return: {
    language: 'All Languages',
    keyword: 'return',
    title: 'Return a Value',
    analogy: 'Like ordering at a bakery: you give an order (input), the baker bakes it, and hands back the bread (return value).',
    why: 'Sends a computed result back to whatever line of code called the function, and immediately exits the function.',
    example: 'def add(a, b):\n    return a + b\n\nresult = add(5, 3) # result is 8',
    pitfall: 'Code written inside a function below a `return` statement will never be reached!'
  },
  import: {
    language: 'Python / JS / Java',
    keyword: 'import',
    title: 'Import a Module or Library',
    analogy: 'Like borrowing a specialized power tool from a library instead of building the tool from scratch yourself.',
    why: 'Allows you to use powerful pre-written code created by experts (like math functions, random numbers, or web tools).',
    example: 'import math\nimport random\n\nprint(random.randint(1, 10))',
    pitfall: 'Import statements should usually be placed at the very top of your file.'
  },
  class: {
    language: 'All Languages',
    keyword: 'class',
    title: 'Blueprint for Objects (OOP)',
    analogy: 'Like an architectural blueprint for a house. The blueprint defines rooms and windows; each actual house built from it is an "object".',
    why: 'Bundles related data (attributes) and actions (methods) together into a single custom type.',
    example: 'class Pet:\n    def __init__(self, name):\n        self.name = name\n\ndog = Pet("Buddy")',
    pitfall: 'Remember that `class` defines the blueprint; you still need to create an instance (like `dog = Pet(...)`).'
  },
  for: {
    language: 'All Languages',
    keyword: 'for',
    title: 'For Loop (Iteration)',
    analogy: 'Like a teacher calling roll down a student list, one student at a time until the list ends.',
    why: 'Repeats a block of code for every item in a collection or a specific number of times.',
    example: 'for (int i = 0; i < 5; i++) {\n    printf("%d\\n", i);\n}',
    pitfall: 'In loops that count from 0 to N with `<`, remember the loop runs N times but stops at N-1.'
  },
  while: {
    language: 'All Languages',
    keyword: 'while',
    title: 'While Loop (Condition-based Loop)',
    analogy: 'Like playing outside WHILE it is still daylight. Once the sun sets, you come inside.',
    why: 'Repeats instructions continuously as long as a condition remains `True`.',
    example: 'int count = 3;\nwhile (count > 0) {\n    printf("%d\\n", count);\n    count--;\n}',
    pitfall: 'Always ensure something inside the loop changes so the condition eventually becomes `False`, otherwise you create an infinite loop!'
  },
  if: {
    language: 'All Languages',
    keyword: 'if / else',
    title: 'Conditional Decision Making',
    analogy: 'Like a fork in the road: "IF it is raining, take an umbrella; ELSE wear sunglasses."',
    why: 'Allows your program to make intelligent choices based on data.',
    example: 'int score = 85;\nif (score >= 90) {\n    printf("Grade A\\n");\n} else {\n    printf("Passing\\n");\n}',
    pitfall: 'Use `==` to compare two values (`if (x == 5)`). A single `=` assigns values instead of comparing!'
  },
  const: {
    language: 'JavaScript / C / C++',
    keyword: 'const',
    title: 'Constant Variable',
    analogy: 'Like writing in permanent marker. Once you write the value, it cannot be erased or reassigned.',
    why: 'Prevents accidental bugs where a value is unintentionally overwritten.',
    example: 'const int MAX_USERS = 100;',
    pitfall: 'You must give `const` an initial value immediately when you declare it.'
  },
  let: {
    language: 'JavaScript',
    keyword: 'let',
    title: 'Block-Scoped Variable',
    analogy: 'Like writing in pencil with an eraser. You can erase and update the value whenever needed.',
    why: 'Modern, safe way in JavaScript to store values that change over time.',
    example: 'let score = 0;\nscore += 10;',
    pitfall: 'Avoid the old `var` keyword; `let` avoids confusing scope bugs.'
  },
  static: {
    language: 'Java / C / C++',
    keyword: 'static',
    title: 'Class-Level Member',
    analogy: 'Like the school bell: it belongs to the entire school building, not to any individual student.',
    why: 'Allows a method or variable to be accessed directly without needing to create an instance of the class.',
    example: 'public static void main(String[] args)',
    pitfall: 'Static methods cannot directly access non-static variables because no object instance exists yet.'
  },
  void: {
    language: 'Java / C / C++',
    keyword: 'void',
    title: 'No Return Value',
    analogy: 'Like shouting "Hello!". You made a sound, but you didn\'t hand anyone an object in return.',
    why: 'Tells the compiler that this function performs actions but does not return any data value.',
    example: 'void printWelcome() {\n    printf("Welcome!\\n");\n}',
    pitfall: 'You cannot assign the result of a `void` method to a variable.'
  }
};

/**
 * Explain user code line by line with clear educational descriptions
 */
function explainCode(code, language = 'python') {
  if (!code || !code.trim()) {
    return {
      summary: 'No code provided yet. Type or paste your code in the editor, then click Explain Code!',
      breakdown: []
    };
  }

  const lines = code.split('\n');
  const breakdown = [];
  let summary = '';
  let lineCount = 0;
  let hasLoops = false;
  let hasFunctions = false;
  let hasConditions = false;

  lines.forEach((rawLine, idx) => {
    const lineNum = idx + 1;
    const line = rawLine.trim();
    if (!line) return;

    lineCount++;
    let explanation = '';
    let category = 'general';

    if (line.startsWith('#') || line.startsWith('//')) {
      category = 'comment';
      explanation = 'A developer comment. The computer ignores this line; it is written to help humans understand the code.';
    } else if (/^(#include|import\b|from\b)/.test(line)) {
      category = 'import';
      explanation = `Imports header file or external library so your program can use its pre-built functions.`;
    } else if (/^(def\b|function\b|public\s+static\s+void|int\s+main|void\s+[a-zA-Z0-9_]+|int\s+[a-zA-Z0-9_]+\s*\()/.test(line)) {
      category = 'function';
      hasFunctions = true;
      const fnName = line.match(/(?:def|function)\s+([a-zA-Z0-9_]+)/) || line.match(/([a-zA-Z0-9_]+)\s*\(/);
      const name = fnName ? fnName[1] : 'function';
      explanation = `Defines a function named "${name}". In C/C++, code inside main() runs when the program starts.`;
    } else if (/^(if\b|elif\b|else\b|else\s+if)/.test(line)) {
      category = 'condition';
      hasConditions = true;
      explanation = 'A decision branch. Tests if a condition is true; if so, executes the block underneath.';
    } else if (/^(for\b|while\b)/.test(line)) {
      category = 'loop';
      hasLoops = true;
      explanation = 'A loop that repeats instructions. Helps automate repetitive tasks without duplicate code.';
    } else if (/^(return\b)/.test(line)) {
      category = 'return';
      explanation = 'Finishes the function and sends the result back (in main, return 0 means successful execution).';
    } else if (/(printf\s*\(|print\s*\(|console\.log|System\.out\.print|cout\s*<<)/.test(line)) {
      category = 'io';
      explanation = 'Prints formatted text or data to the terminal output console.';
    } else if (/(scanf\s*\(|input\s*\(|prompt\s*\(|cin\s*>>|scanner\.)/.test(line)) {
      category = 'input';
      explanation = 'Pauses program execution and reads input typed on the keyboard into variable memory.';
    } else if (/[a-zA-Z0-9_]+\s*=\s*/.test(line) && !line.includes('==')) {
      category = 'variable';
      const varName = line.split('=')[0].trim().replace(/^(let|const|var|int|float|double|char|String)\s+/, '');
      explanation = `Assigns a value to variable "${varName}".`;
    } else {
      explanation = 'Executes an expression or statement.';
    }

    breakdown.push({
      line: lineNum,
      code: line,
      category,
      explanation
    });
  });

  const concepts = [];
  if (hasFunctions) concepts.push('functions');
  if (hasLoops) concepts.push('loops');
  if (hasConditions) concepts.push('conditional logic');

  summary = `This ${language.toUpperCase()} program contains ${lineCount} active lines of code. ` +
    (concepts.length > 0
      ? `It utilizes ${concepts.join(', ')} to organize and execute its instructions step-by-step.`
      : 'It performs direct sequential statements from top to bottom.');

  return {
    summary,
    lineCount,
    breakdown: breakdown.slice(0, 30)
  };
}

function getDebuggingWalkthrough(code, language, errorMsg) {
  return {
    title: 'Nova Socratic Debugger: Step-by-Step Guide',
    philosophy: 'Debugging is like being a detective! Instead of guessing, follow these 5 systematic clues:',
    steps: [
      {
        number: 1,
        title: 'Check the Output and Pinpoint the Line',
        action: 'Look at the line number reported in the terminal. The bug is almost always on that line, or on the line directly above it.'
      },
      {
        number: 2,
        title: 'Check Spacing and Punctuation (Syntax)',
        action: 'Did you close all quotes (`""`)? Did you close all parentheses (`()`)? In C/C++, did you end your statement with a semicolon `;`?'
      },
      {
        number: 3,
        title: 'Inspect Variable Names & Types',
        action: 'Programming languages are strictly case-sensitive. Check if you typed `total` instead of `Total`, or used an uninitialized variable.'
      },
      {
        number: 4,
        title: 'Use Print Detective Statements',
        action: 'Insert a temporary line like `printf("DEBUG: %d\\n", var);` right before the line that crashes to see what values your variables hold!'
      },
      {
        number: 5,
        title: 'Test One Small Change at a Time',
        action: 'Don\'t rewrite the whole file at once. Change one line, click Run, and see if the output changes.'
      }
    ]
  };
}

function getStarterTemplates() {
  return [
    {
      id: 'c_hello',
      language: 'c',
      title: 'C Language: Hello World & Math',
      filename: 'main.c',
      badge: 'C Programming',
      description: 'Standard C programming with stdio.h, variables, math, and formatted printf.',
      code: `// ⚡ Welcome to C Programming in NovaCode!
// Press "Run" (or Ctrl+Enter) to execute.

#include <stdio.h>

int main() {
    printf("========================================\\n");
    printf("   Hello, World from C in NovaCode!    \\n");
    printf("========================================\\n");

    int a = 12;
    int b = 8;
    int sum = a + b;

    printf("The sum of %d + %d is: %d\\n", a, b, sum);

    if (sum > 15) {
        printf("Result is greater than 15!\\n");
    } else {
        printf("Result is 15 or less.\\n");
    }

    return 0;
}
`
    },
    {
      id: 'py_hello',
      language: 'python',
      title: 'Python: Interactive Hello & Math',
      filename: 'main.py',
      badge: 'Python',
      description: 'Variables, user input, math, and formatted strings in Python.',
      code: `# 🌟 Python Starter Template
# Press "Run" (or Ctrl+Enter) to execute!

name = input("What is your name? ")
print(f"Hello, {name}! Welcome to NovaCode.")

num1 = 12
num2 = 8
total = num1 + num2

print(f"{num1} + {num2} = {total}")

if total > 15:
    print("The sum is greater than 15!")
else:
    print("The sum is 15 or less.")
`
    },
    {
      id: 'py_loop',
      language: 'python',
      title: 'Python: Loops & Lists',
      filename: 'lists_demo.py',
      badge: 'Python',
      description: 'Learn how to store multiple items in a list and iterate through them.',
      code: `# 📋 Python Lists and Loops
fruits = ["Apple", "Banana", "Cherry", "Mango"]

print(f"Total fruits: {len(fruits)}")
print("My favorite fruit list:")

for index, fruit in enumerate(fruits, start=1):
    print(f"  {index}. {fruit}")

fruits.append("Orange")
print(f"\\nAfter adding Orange, we have: {fruits}")
`
    },
    {
      id: 'js_intro',
      language: 'javascript',
      title: 'JavaScript: Modern ES6 Basics',
      filename: 'script.js',
      badge: 'Node.js',
      description: 'Arrays, arrow functions, and object destructuring in Node.js.',
      code: `// 🚀 Modern JavaScript Basics
const coder = {
  name: "Alex",
  level: "Beginner",
  xp: 150
};

console.log(\`Coder \${coder.name} has \${coder.xp} XP!\`);

const skills = ["C", "Python", "JavaScript", "HTML/CSS"];
console.log("\\nSkills to master:");
skills.forEach((skill, idx) => {
  console.log(\`  [\${idx + 1}] \${skill}\`);
});
`
    },
    {
      id: 'web_card',
      language: 'html_css',
      title: 'HTML & CSS: Interactive Web Page',
      filename: 'index.html',
      badge: 'Live Preview',
      description: 'Interactive responsive card that runs in NovaCode\'s Live Web Sandbox.',
      code: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>My Cool Card</title>
  <style>
    body {
      margin: 0;
      min-height: 100vh;
      display: grid;
      place-items: center;
      background: #0f172a;
      font-family: sans-serif;
      color: #f8fafc;
    }
    .card {
      background: #1e293b;
      padding: 32px;
      border-radius: 16px;
      box-shadow: 0 10px 25px rgba(0,0,0,0.5);
      text-align: center;
      max-width: 320px;
    }
    button {
      background: #6366f1;
      color: white;
      border: none;
      padding: 10px 20px;
      border-radius: 8px;
      cursor: pointer;
      font-size: 1rem;
      margin-top: 16px;
      transition: background 0.2s;
    }
    button:hover {
      background: #4f46e5;
    }
  </style>
</head>
<body>
  <div class="card">
    <h2>Hello, World! 🚀</h2>
    <p>This is rendered live in NovaCode's sandboxed web preview.</p>
    <button onclick="alert('You clicked the magic button!')">Click Me</button>
  </div>
</body>
</html>
`
    },
    {
      id: 'cpp_basic',
      language: 'cpp',
      title: 'C++: Fast Console I/O & Vectors',
      filename: 'main.cpp',
      badge: 'C++',
      description: 'Standard C++ iostream, vectors, and calculation.',
      code: `#include <iostream>
#include <vector>

using namespace std;

int main() {
    cout << "Welcome to C++ in NovaCode!" << endl;
    
    vector<int> numbers = {2, 4, 6, 8, 10};
    int total = 0;
    
    for (int n : numbers) {
        total += n;
    }
    
    cout << "Sum of array elements: " << total << endl;
    return 0;
}
`
    },
    {
      id: 'java_basic',
      language: 'java',
      title: 'Java: Standard Main Class',
      filename: 'Main.java',
      badge: 'Java',
      description: 'Classic Java class with methods, variables, and System.out.',
      code: `public class Main {
    public static void main(String[] args) {
        System.out.println("Hello from Java in NovaCode!");
        
        int a = 10;
        int b = 25;
        int sum = add(a, b);
        
        System.out.println("Sum of " + a + " + " + b + " = " + sum);
    }
    
    public static int add(int x, int y) {
        return x + y;
    }
}
`
    }
  ];
}

function getCheatSheets() {
  return [
    {
      topic: 'Variables & Data Types',
      summary: 'Variables are labeled containers that hold information in computer memory.',
      table: [
        { name: 'Integer (Whole #)', python: 'age = 15', js: 'let age = 15;', java: 'int age = 15;' },
        { name: 'Floating Point', python: 'price = 9.99', js: 'let price = 9.99;', java: 'double price = 9.99;' },
        { name: 'Character / Text', python: 'ch = "A"', js: 'let ch = "A";', java: 'char ch = \'A\';' },
        { name: 'Boolean (True/False)', python: 'is_active = True', js: 'let isActive = true;', java: 'boolean isActive = true;' }
      ]
    },
    {
      topic: 'Conditionals (If / Else)',
      summary: 'Execute different code blocks depending on whether a condition is true or false.',
      table: [
        { check: 'Equals', python: 'if x == 5:', js: 'if (x === 5) {', java: 'if (x == 5) {' },
        { check: 'Not Equals', python: 'if x != 5:', js: 'if (x !== 5) {', java: 'if (x != 5) {' },
        { check: 'Greater Than', python: 'if x > 5:', js: 'if (x > 5) {', java: 'if (x > 5) {' },
        { check: 'Both (AND)', python: 'if x > 0 and x < 10:', js: 'if (x > 0 && x < 10) {', java: 'if (x > 0 && x < 10) {' },
        { check: 'Either (OR)', python: 'if x == 1 or x == 2:', js: 'if (x === 1 || x === 2) {', java: 'if (x == 1 || x == 2) {' }
      ]
    },
    {
      topic: 'Loops',
      summary: 'Repeat code multiple times without rewriting it.',
      table: [
        { type: 'Count N times', python: 'for i in range(5):', js: 'for (let i = 0; i < 5; i++) {', java: 'for (int i = 0; i < 5; i++) {' },
        { type: 'Loop over items', python: 'for item in items:', js: 'for (const item of items) {', java: 'for (String item : items) {' },
        { type: 'While condition', python: 'while count > 0:', js: 'while (count > 0) {', java: 'while (count > 0) {' }
      ]
    }
  ];
}

module.exports = {
  KEYWORD_GLOSSARY,
  explainCode,
  explainKeyword: (kw) => KEYWORD_GLOSSARY[kw.toLowerCase()] || null,
  getDebuggingWalkthrough,
  getStarterTemplates,
  getCheatSheets
};
