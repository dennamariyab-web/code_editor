// ⚡ C++ Starter Program for NovaCode
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
