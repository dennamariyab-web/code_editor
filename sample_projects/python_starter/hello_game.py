# 🌟 Welcome to Python in NovaCode!
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

print("\n✨ Great job! Try modifying this code to change the number range.")
