// ☕ Java Starter Program for NovaCode
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
        System.out.println("\nCalculated Final Score: " + score);
    }

    public static int calculateScore(int test1, int test2) {
        return (test1 + test2) / 2;
    }
}
