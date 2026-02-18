import {describe, it} from "node:test";
import assert from "node:assert";
import evaluate from "./index.js";
import m from "../../index.js";

describe("evaluate", () => {
    const e = evaluate.evaluate;
    m.use(evaluate());

    describe("math operations", () => {
        it("should evaluate addition", () => {
            assert.equal(e("1 + 2"), 3);
        });

        it("should evaluate subtraction", () => {
            assert.equal(e("5 - 3"), 2);
        });

        it("should evaluate multiplication", () => {
            assert.equal(e("4 * 2"), 8);
        });

        it("should evaluate division", () => {
            assert.equal(e("8 / 2"), 4);
        });

        it("should evaluate exponentiation", () => {
            assert.equal(e("2 ^ 3"), 8);
        });

        it("should evaluate expressions with parentheses", () => {
            assert.equal(e("(1 + 2) * 3"), 9);
            assert.equal(e("4 / (2 + 2)"), 1);
        });

        it("should handle negative numbers", () => {
            assert.equal(e("-1 + 2"), 1);
            assert.equal(e("3 - -2"), 5);
        });

        it("should evaluate mixed operations", () => {
            assert.equal(e("1 + 2 * 3 - 4 / 2"), 5);
            assert.equal(e("(2 + 3) * (4 - 1)"), 15);
        });

        it("should handle operator precedence", () => {
            assert.equal(e("2 + 3 * 4"), 14); // multiplication before addition
            assert.equal(e("10 - 2 ^ 3"), 2); // exponentiation before subtraction
        });
    });

    describe("string operations", () => {
        it("should concatenate strings", () => {
            assert.equal(e("'Hello' + ' World'"), "Hello World");
        });

        it("should replace substrings", () => {
            assert.equal(e("replace('Hello World', 'World', 'Mikel')"), "Hello Mikel");
            assert.equal(e("replace('Hello World', 'World')"), "Hello ");
        });
    });

    describe("boolean operations", () => {
        it("should evaluate logical AND", () => {
            assert.equal(e("true && false"), false);
            assert.equal(e("true && true"), true);
        });

        it("should evaluate logical OR", () => {
            assert.equal(e("true || false"), true);
            assert.equal(e("false || false"), false);
        });

        it("should evaluate logical NOT", () => {
            assert.equal(e("!true"), false);
            assert.equal(e("!false"), true);
        });

        it("should evaluate comparisons", () => {
            assert.equal(e("1 < 2"), true);
            assert.equal(e("2 > 1"), true);
            assert.equal(e("1 <= 1"), true);
            assert.equal(e("2 >= 2"), true);
            assert.equal(e("1 == 1"), true);
            assert.equal(e("'a' == 'a'"), true);
            assert.equal(e("'a' != 'b'"), true);
        });
    });

    describe("default functions", () => {
        it("should evaluate default math functions", () => {
            assert.equal(e("abs(-5)"), 5);
            assert.equal(e("sqrt(16)"), 4);
            assert.equal(e("max(1, 2, 3)"), 3);
            assert.equal(e("min(1, 2, 3)"), 1);
            assert.equal(e("round(2.5)"), 3);
            assert.equal(e("ceil(2.1)"), 3);
            assert.equal(e("floor(2.9)"), 2);
        });

        it("should evaluate string functions", () => {
            assert.equal(e("replace('Hello World', 'World', 'Mikel')"), "Hello Mikel");
            assert.equal(e("len('Hello')"), 5);
            assert.equal(e("toUpperCase('hello')"), "HELLO");
            assert.equal(e("toLowerCase('HELLO')"), "hello");
            assert.equal(e("trim('  Hello  ')"), "Hello");
            assert.equal(e("startsWith('Hello', 'He')"), true);
            assert.equal(e("endsWith('Hello', 'lo')"), true);
            assert.equal(e("in('Hello', 'lo')"), true);
        });

        it("should evaluate array functions", () => {
            assert.equal(e("len([1, 2, 3])"), 3);
            assert.equal(e("indexOf([1, 2, 3], 2)"), 1);
            assert.equal(e("join([1, 2, 3], ', ')"), "1, 2, 3");
            assert.equal(e("in([1, 2, 3], 2)"), true);
        });

        it("should evaluate 'if' function", () => {
            assert.equal(e("if(true, 'Yes', 'No')"), "Yes");
            assert.equal(e("if(false, 'Yes', 'No')"), "No");
            assert.equal(e("if(1 > 0, 'Positive', 'Negative')"), "Positive");
        });
    });
});

describe("{{=eval}}", () => {
    it("should evaluate expressions", () => {
        assert.equal(m(`{{=eval "1 + 1"}}`, {}), "2");
        assert.equal(m(`{{=eval "'Hello' + ' ' + 'World'"}}`, {}), "Hello World");
    });

    it("should evaluate expressions with variables", () => {
        assert.equal(m(`{{=eval "x + 1"}}`, { x: 1 }), "2");
        assert.equal(m(`{{=eval "x * y"}}`, { x: 2, y: 3 }), "6");
        assert.equal(m(`{{=eval "x + y"}}`, { x: 5, y: 10 }), "15");
        assert.equal(m(`{{=eval "'Hello ' + name"}}`, { name: "Bob" }), "Hello Bob");
        assert.equal(m(`{{=eval "replace('Hello', 'Hello', name)"}}`, { name: "Alice" }), "Alice");
    });
});

describe("{{#when}}", () => {
    it("should render content if expression is true", () => {
        assert.equal(m(`{{#when "1 + 1"}}True{{/when}}`, {}), "True");
        assert.equal(m(`{{#when "x > 1"}}Greater{{/when}}`, { x: 2 }), "Greater");
        assert.equal(m(`{{#when "'aa' == 'aa'"}}Equal{{/when}}`, {}), "Equal");
    });

    it("should not render content if expression is false", () => {
        assert.equal(m(`{{#when "(1 + 1) == 3"}}True{{/when}}`, {}), "");
        assert.equal(m(`{{#when "x < 1"}}Less{{/when}}`, { x: 2 }), "");
        assert.equal(m(`{{#when "'aa' != 'aa'"}}Not Equal{{/when}}`, {}), "");
    });
});
