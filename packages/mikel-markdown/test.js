import {describe, it} from "node:test";
import assert from "node:assert";
import markdown from "./index.js";

describe("parser", () => {
    const mk = markdown.parser;

    describe("text formatting", () => {
        it("should parse bold with **", () => {
            assert.equal(mk("This **text** is bold"), "<p>This <strong>text</strong> is bold</p>");
        });

        it("should parse italic with *", () => {
            assert.equal(mk("This *text* is italic"), "<p>This <em>text</em> is italic</p>");
        });
    });

    describe("code", () => {
        it("should parse inline code with `", () => {
            assert.equal(mk("This `text` is code"), "<p>This <code>text</code> is code</p>");
        });

        it("should escape HTML characters", () => {
            assert.equal(mk("Text `<hr>` text"), "<p>Text <code>%3Chr%3E</code> text</p>");
        });
    });

    describe("links", () => {
        it("should parse links", () => {
            assert.equal(mk("[Home](home.html)"), `<p><a href="home.html">Home</a></p>`);
        });
    });

    describe("images", () => {
        it("should parse images", () => {
            assert.equal(mk("![image](./image.png)"), `<p><img alt="image" src="./image.png" /></p>`);
        });

        it("should parse images without alt text", () => {
            assert.equal(mk("![](./image.png)"), `<p><img src="./image.png" /></p>`);
        });

        it("should parse images with links", () => {
            assert.equal(mk("[![](./image.png)](page.html)"), `<p><a href="page.html"><img src="./image.png" /></a></p>`);
        });
    });

    describe("headings", () => {
        ["#", "##", "###", "####", "#####", "######"].forEach(h => {
            const i = h.length;
            it(`should parse h${i}`, () => {
                assert.equal(mk(`${h} Heading ${i}`), `<h${i}>Heading ${i}</h${i}>`);
            });
        });
    });
});
