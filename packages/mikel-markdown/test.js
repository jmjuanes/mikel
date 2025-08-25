import {describe, it} from "node:test";
import assert from "node:assert";
import markdown from "./index.js";
import m from "../../index.js";

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
            assert.equal(mk("Text `<hr>` text"), "<p>Text <code>&lt;hr&gt;</code> text</p>");
        });

        it("should handle asterisks in code", () => {
            assert.equal(mk("This `*text*` is code"), "<p>This <code>*text*</code> is code</p>");
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

    describe("rule", () => {
        it("should parse horizontal rules", () => {
            assert.equal(mk("---"), `<p><hr /></p>`);
        });
    });

    describe("paragraphs", () => {
        it("should wrap lines into <p>", () => {
            const lines = [
                "This is the content of the line 1",
                "This is the content of the line 2",
            ];
            const result = mk(lines.join("\n\n")).split("\n");
            lines.forEach((line, index) => {
                assert.equal(result[index], `<p>${line}</p>`);
            });
        });
    });

    describe("embedded html blocks", () => {
        it("should support embedding html code", () => {
            assert.equal(mk("<div>hello</div>"), "<div>hello</div>");
        });
    });
});

describe("{{#markdown}}", () => {
    const options = markdown();

    it("should parse markdown code", () => {
        assert.equal(m("{{#markdown}}This is `inline code`{{/markdown}}", {}, options), "<p>This is <code>inline code</code></p>");
    });
});

describe("{{#inlineMarkdown}}", () => {
    const options = markdown();

    it("should parse inline markdown code", () => {
        assert.equal(m("{{#inlineMarkdown}}This is `inline code`{{/inlineMarkdown}}", {}, options), "This is <code>inline code</code>");
    });

    it("should parse inline markdown code with HTML", () => {
        assert.equal(m("{{#inlineMarkdown}}This is `<hr>`{{/inlineMarkdown}}", {}, options), "This is <code>&lt;hr&gt;</code>");
    });

    it("should parse inline markdown with links", () => {
        assert.equal(m("{{#inlineMarkdown}}[Home](home.html){{/inlineMarkdown}}", {}, options), `<a href="home.html">Home</a>`);
    });

    it("should parse inline markdown with strong", () => {
        assert.equal(m("{{#inlineMarkdown}}This is **bold**{{/inlineMarkdown}}", {}, options), "This is <strong>bold</strong>");
    });

    it("should parse inline markdown with italic", () => {
        assert.equal(m("{{#inlineMarkdown}}This is *italic*{{/inlineMarkdown}}", {}, options), "This is <em>italic</em>");
    });
});
