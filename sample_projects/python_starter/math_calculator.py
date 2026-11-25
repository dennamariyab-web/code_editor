# 🧮 Beginner Math Calculator & Functions
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
