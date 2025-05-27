import {describe, it} from "node:test";
import assert from "node:assert";
import evaluate from "./index.js";
import m from "../../index.js";

describe("evaluate", () => {
    const e = evaluate.evaluate;

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
        });
    });
});

describe("{{=eval}}", () => {
    const options = evaluate();
    it("should evaluate expressions", () => {
        assert.equal(m(`{{=eval "1 + 1"}}`, {}, options), "2");
        assert.equal(m(`{{=eval "'Hello' + ' ' + 'World'"}}`, {}, options), "Hello World");
    });

    it("should evaluate expressions with variables", () => {
        assert.equal(m(`{{=eval "x + 1"}}`, {x: 1}, options), "2");
        assert.equal(m(`{{=eval "'Hello ' + name"}}`, {name: "Bob"}, options), "Hello Bob");
    });
});
