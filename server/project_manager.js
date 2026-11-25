const fs = require('fs');
const path = require('path');

const META_DIR = path.join(__dirname, '..', '.novacode_meta');
const RECOVERY_DIR = path.join(META_DIR, 'recovery');
const RECENT_FILE = path.join(META_DIR, 'recent_projects.json');

if (!fs.existsSync(META_DIR)) fs.mkdirSync(META_DIR, { recursive: true });
if (!fs.existsSync(RECOVERY_DIR)) fs.mkdirSync(RECOVERY_DIR, { recursive: true });

// Load recent projects
function getRecentProjects() {
  try {
    if (fs.existsSync(RECENT_FILE)) {
      const data = fs.readFileSync(RECENT_FILE, 'utf8');
      return JSON.parse(data);
    }
  } catch (e) {
    // fallback
  }
  return [];
}

function addRecentProject(projectPath, projectName, language = 'general') {
  try {
    let recents = getRecentProjects();
    recents = recents.filter(p => p.path !== projectPath);
    recents.unshift({
      name: projectName || path.basename(projectPath),
      path: projectPath,
      language,
      lastOpened: new Date().toISOString()
    });
    // keep at most 15
    recents = recents.slice(0, 15);
    fs.writeFileSync(RECENT_FILE, JSON.stringify(recents, null, 2), 'utf8');
    return recents;
  } catch (e) {
    return [];
  }
}

function removeRecentProject(projectPath) {
  try {
    let recents = getRecentProjects();
    recents = recents.filter(p => p.path !== projectPath);
    fs.writeFileSync(RECENT_FILE, JSON.stringify(recents, null, 2), 'utf8');
    return recents;
  } catch (e) {
    return [];
  }
}

// List files in directory (safe tree representation)
function listDirectoryFiles(dirPath, maxDepth = 3, currentDepth = 0) {
  if (!fs.existsSync(dirPath)) {
    throw new Error(`Directory does not exist: ${dirPath}`);
  }

  const entries = fs.readdirSync(dirPath, { withFileTypes: true });
  const result = [];

  for (const entry of entries) {
    // Ignore hidden git and node_modules
    if (entry.name.startsWith('.') || entry.name === 'node_modules') continue;

    const fullPath = path.join(dirPath, entry.name);
    const isDir = entry.isDirectory();

    const item = {
      name: entry.name,
      path: fullPath,
      isDirectory: isDir,
      extension: isDir ? '' : path.extname(entry.name).toLowerCase()
    };

    if (isDir && currentDepth < maxDepth) {
      item.children = listDirectoryFiles(fullPath, maxDepth, currentDepth + 1);
    }

    result.push(item);
  }

  // Sort directories first, then alphabetical
  return result.sort((a, b) => {
    if (a.isDirectory === b.isDirectory) return a.name.localeCompare(b.name);
    return a.isDirectory ? -1 : 1;
  });
}

// Read file
function readFileContent(filePath) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`File does not exist: ${filePath}`);
  }
  const content = fs.readFileSync(filePath, 'utf8');
  return {
    path: filePath,
    filename: path.basename(filePath),
    extension: path.extname(filePath).toLowerCase(),
    content
  };
}

// Save file
function saveFileContent(filePath, content) {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(filePath, content, 'utf8');
  return { success: true, path: filePath, savedAt: new Date().toISOString() };
}

// Auto-save recovery snapshot
function saveRecoverySnapshot(filename, content) {
  try {
    const safeName = filename.replace(/[^a-zA-Z0-9_.-]/g, '_');
    const snapshotFile = path.join(RECOVERY_DIR, `${safeName}.bak`);
    fs.writeFileSync(snapshotFile, JSON.stringify({
      filename,
      content,
      timestamp: Date.now()
    }), 'utf8');
    return { success: true };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

function getRecoverySnapshots() {
  try {
    const files = fs.readdirSync(RECOVERY_DIR);
    const snapshots = [];
    for (const f of files) {
      if (f.endsWith('.bak')) {
        const full = path.join(RECOVERY_DIR, f);
        const data = JSON.parse(fs.readFileSync(full, 'utf8'));
        snapshots.push(data);
      }
    }
    return snapshots;
  } catch (e) {
    return [];
  }
}

// Create sample projects if not already present
function initSampleProjects() {
  const samplesDir = path.join(__dirname, '..', 'sample_projects');
  if (!fs.existsSync(samplesDir)) {
    fs.mkdirSync(samplesDir, { recursive: true });
  }

  // 1. Python Starter
  const pyDir = path.join(samplesDir, 'python_starter');
  if (!fs.existsSync(pyDir)) {
    fs.mkdirSync(pyDir, { recursive: true });
    fs.writeFileSync(path.join(pyDir, 'hello_game.py'), `# 🌟 Welcome to Python in NovaCode!
# Press the green "Run" button (or Ctrl+Enter) to execute this code.

import random
import time

print("=" * 45)
print("🚀 WELCOME TO THE NOVA NUMBER GUESSING GAME! 🚀")
print("=" * 45)

# Generate a secret random number between 1 and 20
secret_number = random.randint(1, 20)
print("I'm thinking of a number between 1 and 20...")
time.sleep(0.5)

attempts = 0
max_attempts = 5

# Interactive loop
while attempts < max_attempts:
    attempts += 1
    remaining = max_attempts - attempts + 1
    
    # Notice: NovaCode supports interactive input!
    try:
        user_input = input(f"Attempt {attempts}/{max_attempts} - Enter your guess: ")
        guess = int(user_input)
    except ValueError:
        print("⚠️ Oops! Please enter a whole number.")
        continue

    if guess == secret_number:
        print(f"🎉 AMAZING! You guessed {secret_number} correctly in {attempts} tries!")
        break
    elif guess < secret_number:
        print("📈 Too low! Try a higher number.")
    else:
        print("📉 Too high! Try a lower number.")
else:
    print(f"Game over! The secret number was {secret_number}. Better luck next time!")

print("\\n✨ Great job! Try modifying this code to change the number range.")
`, 'utf8');

    fs.writeFileSync(path.join(pyDir, 'math_calculator.py'), `# 🧮 Beginner Math Calculator & Functions
# Demonstrates functions, conditionals, and formatting in Python.

def add(a, b):
    return a + b

def subtract(a, b):
    return a - b

def multiply(a, b):
    return a * b

def divide(a, b):
    # NovaCode Tip: Notice how we protect against division by zero!
    if b == 0:
        return "Error: Cannot divide by zero!"
    return a / b

print("--- Calculator Demo ---")
x = 24
y = 6

print(f"{x} + {y} = {add(x, y)}")
print(f"{x} - {y} = {subtract(x, y)}")
print(f"{x} * {y} = {multiply(x, y)}")
print(f"{x} / {y} = {divide(x, y)}")

# Try dividing by zero safely
print(f"{x} / 0 = {divide(x, 0)}")
`, 'utf8');
  }

  // 2. JavaScript Starter
  const jsDir = path.join(samplesDir, 'javascript_starter');
  if (!fs.existsSync(jsDir)) {
    fs.mkdirSync(jsDir, { recursive: true });
    fs.writeFileSync(path.join(jsDir, 'student_grades.js'), `// 🎓 JavaScript Array & Object Mastery Demo
// Run this with Node.js in NovaCode!

const students = [
  { name: 'Alex', score: 92 },
  { name: 'Maya', score: 88 },
  { name: 'Jordan', score: 76 },
  { name: 'Taylor', score: 95 },
  { name: 'Sam', score: 84 }
];

console.log("=== Student Grade Report ===");

// 1. Calculate the class average
const totalScore = students.reduce((acc, curr) => acc + curr.score, 0);
const average = totalScore / students.length;

console.log(\`Class Size: \${students.length} students\`);
console.log(\`Class Average: \${average.toFixed(1)}%\`);

// 2. Assign letter grades
console.log("\\nIndividual Results:");
students.forEach(student => {
  let grade = 'F';
  if (student.score >= 90) grade = 'A';
  else if (student.score >= 80) grade = 'B';
  else if (student.score >= 70) grade = 'C';
  else if (student.score >= 60) grade = 'D';

  console.log(\`  • \${student.name.padEnd(10)}: \${student.score}% (Grade: \${grade})\`);
});

// 3. Find top performer
const topStudent = students.reduce((highest, current) => 
  current.score > highest.score ? current : highest
);
console.log(\`\\n🏆 Top Student: \${topStudent.name} with \${topStudent.score}%!\`);
`, 'utf8');
  }

  // 3. Web HTML/CSS Starter
  const webDir = path.join(samplesDir, 'web_portfolio_starter');
  if (!fs.existsSync(webDir)) {
    fs.mkdirSync(webDir, { recursive: true });
    fs.writeFileSync(path.join(webDir, 'index.html'), `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>My First Web Project</title>
  <style>
    :root {
      --primary: #6366f1;
      --bg: #0f172a;
      --card: #1e293b;
      --text: #f8fafc;
      --accent: #38bdf8;
    }
    body {
      margin: 0;
      padding: 40px 20px;
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      background: var(--bg);
      color: var(--text);
      display: flex;
      flex-direction: column;
      align-items: center;
      min-height: 100vh;
      box-sizing: border-box;
    }
    .card {
      background: var(--card);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 16px;
      padding: 32px;
      max-width: 480px;
      width: 100%;
      text-align: center;
      box-shadow: 0 10px 30px rgba(0,0,0,0.4);
    }
    h1 {
      margin-top: 0;
      color: var(--accent);
      font-size: 1.8rem;
    }
    p {
      line-height: 1.6;
      color: #94a3b8;
    }
    .counter-display {
      font-size: 3.5rem;
      font-weight: bold;
      color: #22c55e;
      margin: 20px 0;
      font-family: monospace;
    }
    .btn-group {
      display: flex;
      gap: 12px;
      justify-content: center;
    }
    button {
      background: var(--primary);
      color: white;
      border: none;
      padding: 12px 24px;
      border-radius: 8px;
      font-size: 1rem;
      font-weight: 600;
      cursor: pointer;
      transition: transform 0.1s, background 0.2s;
    }
    button:hover {
      background: #4f46e5;
      transform: translateY(-2px);
    }
    button:active {
      transform: translateY(0);
    }
    .reset-btn {
      background: #475569;
    }
    .reset-btn:hover {
      background: #334155;
    }
    .badge {
      display: inline-block;
      background: rgba(99, 102, 241, 0.2);
      color: #818cf8;
      padding: 4px 12px;
      border-radius: 999px;
      font-size: 0.85rem;
      margin-bottom: 16px;
      font-weight: 500;
    }
  </style>
</head>
<body>
  <div class="card">
    <div class="badge">Live Web Sandbox</div>
    <h1>Interactive Counter App</h1>
    <p>This page runs live in NovaCode's sandboxed web preview. Click the buttons below to interact!</p>
    
    <div class="counter-display" id="count">0</div>
    
    <div class="btn-group">
      <button onclick="decrement()">- Subtract</button>
      <button class="reset-btn" onclick="reset()">Reset</button>
      <button onclick="increment()">+ Add</button>
    </div>
  </div>

  <script>
    let count = 0;
    const countEl = document.getElementById('count');

    function updateDisplay() {
      countEl.innerText = count;
      if (count > 0) countEl.style.color = '#22c55e';
      else if (count < 0) countEl.style.color = '#ef4444';
      else countEl.style.color = '#94a3b8';
    }

    function increment() {
      count++;
      updateDisplay();
    }

    function decrement() {
      count--;
      updateDisplay();
    }

    function reset() {
      count = 0;
      updateDisplay();
    }
  </script>
</body>
</html>
`, 'utf8');
  }

  // 4. Java Starter
  const javaDir = path.join(samplesDir, 'java_starter');
  if (!fs.existsSync(javaDir)) {
    fs.mkdirSync(javaDir, { recursive: true });
    fs.writeFileSync(path.join(javaDir, 'Main.java'), `// ☕ Java Starter Program for NovaCode
// In Java, public class name MUST match the filename (Main -> Main.java)

public class Main {
    public static void main(String[] args) {
        System.out.println("========================================");
        System.out.println(" Hello from Java in NovaCode! ");
        System.out.println("========================================");

        String[] skills = {"Variables", "Conditionals", "Loops", "Classes"};
        
        System.out.println("Topics we will conquer:");
        for (int i = 0; i < skills.length; i++) {
            System.out.println("  " + (i + 1) + ". " + skills[i]);
        }

        int score = calculateScore(85, 95);
        System.out.println("\\nCalculated Final Score: " + score);
    }

    public static int calculateScore(int test1, int test2) {
        return (test1 + test2) / 2;
    }
}
`, 'utf8');
  }

  // 5. C++ Starter
  const cppDir = path.join(samplesDir, 'cpp_starter');
  if (!fs.existsSync(cppDir)) {
    fs.mkdirSync(cppDir, { recursive: true });
    fs.writeFileSync(path.join(cppDir, 'main.cpp'), `// ⚡ C++ Starter Program for NovaCode
#include <iostream>
#include <vector>
#include <string>

using namespace std;

int main() {
    cout << "========================================" << endl;
    cout << " Welcome to Modern C++ in NovaCode! " << endl;
    cout << "========================================" << endl;

    vector<string> concepts = {"Pointers", "References", "Vectors", "Classes"};

    cout << "Core C++ Concepts:" << endl;
    for (size_t i = 0; i < concepts.size(); ++i) {
        cout << "  [" << (i + 1) << "] " << concepts[i] << endl;
    }

    int a = 15;
    int b = 27;
    cout << endl << "Sum of " << a << " + " << b << " = " << (a + b) << endl;

    return 0;
}
`, 'utf8');
  }
}

initSampleProjects();

module.exports = {
  getRecentProjects,
  addRecentProject,
  removeRecentProject,
  listDirectoryFiles,
  readFileContent,
  saveFileContent,
  saveRecoverySnapshot,
  getRecoverySnapshots,
  initSampleProjects
};
