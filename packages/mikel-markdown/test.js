import {describe, it} from "node:test";
import assert from "node:assert";
import markdown from "./index.js";
import mikel from "../../index.js";

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

    describe("code blocks", () => {
        it("should format code blocks", () => {
            const code = "```\nThis is my code\n```";
            assert.equal(mk(code), "<pre>This is my code</pre>");
        });

        it("should get language from code block", () => {
            const code = "```html\nCode\n```";
            const result = mk(code, {
                expressions: {
                    ...markdown.expressions,
                    pre: {
                        regex: markdown.expressions.pre.regex,
                        replace: args => {
                            assert.equal(args[1], "html");
                            assert.equal(args[2], "Code");
                            return markdown.render("pre", {}, args[2]);
                        },
                    },
                },
            });
            assert.equal(result, "<pre>Code</pre>");
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
                assert.equal(mk(`${h} Heading ${i}`), `<h${i} id="heading-${i}">Heading ${i}</h${i}>`);
            });
        });

        it("should support styling headings", () => {
            const opt = {
                classNames: {
                    heading: "base",
                    heading1: "text-1xl",
                },
            };
            assert.equal(mk(`# Heading`, opt), `<h1 class="base text-1xl" id="heading">Heading</h1>`);
            assert.equal(mk(`## Heading`, opt), `<h2 class="base" id="heading">Heading</h2>`);
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

        it("should ignore empty lines", () => {
            const lines = [" ", "This is a line"];
            const result = mk(lines.join("\n\n")).split("\n");
            assert.equal(result[0], "");
            assert.equal(result[1], `<p>${lines[1]}</p>`);
        });

        it("should join lines without empty line between", () => {
            const lines = [
                "This is the content of the line 1",
                "This is the content of the line 2",
                "",
                "This is the content of the line 3",
            ];
            const result = mk(lines.join("\n")).split("\n");
            assert.equal(result[0], `<p>${lines[0]}${lines[1]}</p>`);
            assert.equal(result[1], `<p>${lines[3]}</p>`);
        });

        it("should ignore lines starting with block tags", () => {
            const lines = [
                "<div>This is a div</div>",
                "<h1>This is a heading</h1>",
                "<p>This is a paragraph</p>",
                "<ul><li>Item 1</li><li>Item 2</li></ul>",
                "<!-- This is a comment -->",
                "",
                "This is a normal line",
            ];
            const result = mk(lines.join("\n\n")).split("\n");
            lines.forEach((line, index) => {
                if (index < 5) {
                    assert.equal(result[index], line);
                } else if (index === 5 || index === 6) {
                    assert.equal(result[index], "");
                } else {
                    assert.equal(result[index], `<p>${line}</p>`);
                }
            });
        });

        it("should not ignore lines starting with inline tags", () => {
            const lines = [
                "<span>This is a span</span>",
                "<a href='#'>This is a link</a>",
                "<strong>This is strong text</strong>",
                "<em>This is emphasized text</em>",
                "This is a normal line",
            ];
            const result = mk(lines.join("\n\n")).split("\n");
            lines.forEach((line, index) => {
                assert.equal(result[index], `<p>${line}</p>`);
            });
        });
    });

    describe("lists", () => {
        it("should parse unordered lists", () => {
            const lines = [
                "- Item 1",
                "- Item 2",
            ];
            const result = mk(lines.join("\n")).split("\n");
            assert.equal(result[0], `<ul><li>Item 1</li><li>Item 2</li></ul>`);
        });

        it("should parse ordered lists", () => {
            const lines = [
                "1. Item 1",
                "2. Item 2",
            ];
            const result = mk(lines.join("\n")).split("\n");
            assert.equal(result[0], `<ol><li>Item 1</li><li>Item 2</li></ol>`);
        });

        it("should parse ordered lists with inline markdown", () => {
            const lines = [
                "1. **Item 1**",
                "2. *Item 2*",
            ];
            const result = mk(lines.join("\n")).split("\n");
            assert.equal(result[0], `<ol><li><strong>Item 1</strong></li><li><em>Item 2</em></li></ol>`);
        });

        it("should parse unordered lists with inline markdown", () => {
            const lines = [
                "- **Item 1**",
                "- *Item 2*",
            ];
            const result = mk(lines.join("\n")).split("\n");
            assert.equal(result[0], `<ul><li><strong>Item 1</strong></li><li><em>Item 2</em></li></ul>`);
        });

        it("should parse ordered lists with custom class applied", () => {
            const lines = [
                "- Item 1",
                "- Item 2",
            ];
            const result = mk(lines.join("\n"), {
                classNames: {
                    list: "my-list",
                    listItem: "my-list-item"
                }
            }).split("\n");
            assert.equal(result[0], `<ul class="my-list"><li class="my-list-item">Item 1</li><li class="my-list-item">Item 2</li></ul>`);
        });

        it("should parse unordered lists with custom class applied", () => {
            const lines = [
                "1. Item 1",
                "2. Item 2",
            ];
            const result = mk(lines.join("\n"), {
                classNames: {
                    list: "my-list",
                    listItem: "my-list-item"
                }
            }).split("\n");
            assert.equal(result[0], `<ol class="my-list"><li class="my-list-item">Item 1</li><li class="my-list-item">Item 2</li></ol>`);
        });
    });

    describe("embedded html blocks", () => {
        it("should support embedding html code", () => {
            assert.equal(mk("<div>hello</div>"), "<div>hello</div>");
        });
    });
});

describe("hooks", () => {
    const mk = markdown.parser;

    it("should allow to provide a hook to preprocess markdown content", () => {
        const result = mk("**Bob**", {
            hooks: {
                preprocess: str => "Hello " + str,
            },
        });
        assert.equal(result, "<p>Hello <strong>Bob</strong></p>");
    });

    it("should allow to provide a hook to postprocess markdown content", () => {
        const result = mk("**Bob**", {
            hooks: {
                postprocess: str => "Hello " + str,
            },
        });
        assert.equal(result, "Hello <p><strong>Bob</strong></p>");
    });

    it("should allow to modify the render arguments using the beforeRender hook", () => {
        const result = mk("Hello **Bob**", {
            hooks: {
                beforeRender: (type, args) => {
                    return type === "strong" ? [args[0], "Susan"] : args;
                },
            },
        });
        assert.equal(result, "<p>Hello <strong>Susan</strong></p>");
    });

    it("should allow to modify the result of the render using the afterRender hook", () => {
        const result = mk("Hello **Bob**", {
            hooks: {
                afterRender: (value, type) => {
                    return type === "strong" ? "<b>Bob</b>" : value;
                },
            },
        });
        assert.equal(result, "<p>Hello <b>Bob</b></p>");
    });
});

describe("{{#markdown}}", () => {
    const m = mikel.create();
    m.use(markdown());

    it("should parse markdown code", () => {
        assert.equal(m("{{#markdown}}This is `inline code`{{/markdown}}", {}), "<p>This is <code>inline code</code></p>");
    });

    it("should generate a toc", () => {
        const code = [
            `{{#markdown}}`,
            `# Heading-1`,
            `This is some text`,
            `## Heading-2`,
            `### Heading-3`,
            `{{/markdown}}`,
            `{{#each @toc}}`,
            `:: level={{this.level}} text={{this.text}} slug={{this.slug}}`,
            `{{/each}}`,
        ];
        const expectedValues = [
            {level: "1", text: "Heading-1", slug: "heading-1"},
            {level: "2", text: "Heading-2", slug: "heading-2"},
            {level: "3", text: "Heading-3", slug: "heading-3"},
        ];

        m(code.join("\n"), {})
            .split("\n")
            .filter(line => line.trim().startsWith("::"))
            .forEach((line, index) => {
                const expectedValue = expectedValues[index];
                line.slice(2).trim().split(" ").forEach(item => {
                    const [key, value] = item.split("=");
                    assert.equal(value, expectedValue[key]);
                });
            });
    });
});

describe("{{#inlineMarkdown}}", () => {
    const m = mikel.create();
    m.use(markdown());

    it("should parse inline markdown code", () => {
        assert.equal(m("{{#inlineMarkdown}}This is `inline code`{{/inlineMarkdown}}", {}), "This is <code>inline code</code>");
    });

    it("should parse inline markdown code with HTML", () => {
        assert.equal(m("{{#inlineMarkdown}}This is `<hr>`{{/inlineMarkdown}}", {}), "This is <code>&lt;hr&gt;</code>");
    });

    it("should parse inline markdown with links", () => {
        assert.equal(m("{{#inlineMarkdown}}[Home](home.html){{/inlineMarkdown}}", {}), `<a href="home.html">Home</a>`);
    });

    it("should parse inline markdown with strong", () => {
        assert.equal(m("{{#inlineMarkdown}}This is **bold**{{/inlineMarkdown}}", {}), "This is <strong>bold</strong>");
    });

    it("should parse inline markdown with italic", () => {
        assert.equal(m("{{#inlineMarkdown}}This is *italic*{{/inlineMarkdown}}", {}), "This is <em>italic</em>");
    });
});
