// 🎓 JavaScript Array & Object Mastery Demo
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

console.log(`Class Size: ${students.length} students`);
console.log(`Class Average: ${average.toFixed(1)}%`);

// 2. Assign letter grades
console.log("\nIndividual Results:");
students.forEach(student => {
  let grade = 'F';
  if (student.score >= 90) grade = 'A';
  else if (student.score >= 80) grade = 'B';
  else if (student.score >= 70) grade = 'C';
  else if (student.score >= 60) grade = 'D';

  console.log(`  • ${student.name.padEnd(10)}: ${student.score}% (Grade: ${grade})`);
});

// 3. Find top performer
const topStudent = students.reduce((highest, current) => 
  current.score > highest.score ? current : highest
);
console.log(`\n🏆 Top Student: ${topStudent.name} with ${topStudent.score}%!`);
