import {describe, it} from "node:test";
import assert from "node:assert";
import reactive from "./index.js";

describe("html parsing", () => {
    const jsx = reactive.html;

    it("sould return 'undefined' on empty string", () => {
        assert.equal(jsx``, undefined);
    });

    it("should return the provided string if no HTML code is present", () => {
        assert.equal(jsx`Hello World`, "Hello World");
    });

    it("should return single VDOM nodes", () => {
        assert.deepStrictEqual(jsx`<div />`, {tag: "div", props: {}, children: []});
        assert.deepStrictEqual(jsx`<span />`, {tag: "span", props: {}, children: []});
        assert.deepStrictEqual(jsx`<h1 />`, {tag: "h1", props: {}, children: []});
        assert.deepStrictEqual(jsx`<foo />`, {tag: "foo", props: {}, children: []});
    });

    it("should return nodes with empty content", () => {
        assert.deepStrictEqual(jsx`<div></div>`, {tag: "div", props: {}, children: []});
    });

    it("should return nodes with text content", () => {
        assert.deepStrictEqual(jsx`<div>Hello</div>`, {tag: "div", props: {}, children: ["Hello"]});
    });

    it("should return nodes with dynamic content", () => {
        assert.deepStrictEqual(jsx`<div>Hello ${"World"}</div>`, {tag: "div", props: {}, children: ["Hello ", "World"]});
    });

    it("should return nodes with inner nodes", () => {
        assert.deepStrictEqual(jsx`<div>Hello <b>Bob</b></div>`, {tag: "div", props: {}, children: ["Hello ", {tag: "b", props: {}, children: ["Bob"]}]});
    });

    it("should parse string props", () => {
        assert.deepStrictEqual(jsx`<div align="center">Hello</div>`, {tag: "div", props: {align: "center"}, children: ["Hello"]});
        assert.deepStrictEqual(jsx`<div align="center"/>`, {tag: "div", props: {align: "center"}, children: []});
        assert.deepStrictEqual(jsx`<a title="Hello World"/>`, {tag: "a", props: {title: "Hello World"}, children: []});
        assert.deepStrictEqual(jsx`<a href="https://example.com">Link</a>`, {tag: "a", props: {href: "https://example.com"}, children: ["Link"]});
        assert.deepStrictEqual(jsx`<a href="https://example.com" target="_blank">Link</a>`, {tag: "a", props: {href: "https://example.com", target: "_blank"}, children: ["Link"]});
    });

    it("should parse empty string props", () => {
        assert.deepStrictEqual(jsx`<a href="">Hello</a>`, {tag: "a", props: {href: ""}, children: ["Hello"]});
    });

    it("should parse boolean props", () => {
        assert.deepStrictEqual(jsx`<input disabled />`, {tag: "input", props: {disabled: true}, children: []});
        assert.deepStrictEqual(jsx`<input disabled/>`, {tag: "input", props: {disabled: true}, children: []});
        assert.deepStrictEqual(jsx`<a disabled></a>`, {tag: "a", props: {disabled: true}, children: []});
    });

    it("should parse props with dynamic values", () => {
        assert.deepStrictEqual(jsx`<input disabled=${false} />`, {tag: "input", props: {disabled: false}, children: []});
        assert.deepStrictEqual(jsx`<a href="${"localhost"}" />`, {tag: "a", props: {href: "localhost"}, children: []});
        assert.deepStrictEqual(jsx`<div style="${{color: "white"}}">Hello</div>`, {tag: "div", props: {style: {color: "white"}}, children: ["Hello"]});
    });

    it("should parse with multines", () => {
        const vdom = jsx`
            <div className="foo">bar</div>
        `;
        assert.deepStrictEqual(vdom, {tag: "div", props: {className: "foo"}, children: ["bar"]});
    });
});
