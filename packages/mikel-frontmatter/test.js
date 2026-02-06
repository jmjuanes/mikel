import { describe, it, beforeEach } from "node:test";
import assert from "node:assert";
import mikelFrontmatter from "./index.js";
import mikel from "../../index.js";

describe("yamlParser", () => {
    const parseYAML = mikelFrontmatter.yamlParser;
    const joinLines = (lines = []) => lines.join("\n");

    describe("basic types", () => {
        it("should parse strings", () => {
            const result = parseYAML("name: John Doe");
            assert.deepEqual(result, { name: "John Doe" });
        });

        it("should parse quoted strings", () => {
            const result = parseYAML('title: "Hello World"');
            assert.deepEqual(result, { title: "Hello World" });
        });

        it("should parse single-quoted strings", () => {
            const result = parseYAML("title: 'Hello World'");
            assert.deepEqual(result, { title: "Hello World" });
        });

        it("should parse integers", () => {
            const result = parseYAML("age: 25");
            assert.deepEqual(result, { age: 25 });
        });

        it("should parse negative integers", () => {
            const result = parseYAML("temperature: -5");
            assert.deepEqual(result, { temperature: -5 });
        });

        it("should parse floats", () => {
            const result = parseYAML("price: 19.99");
            assert.deepEqual(result, { price: 19.99 });
        });

        it("should parse booleans (true)", () => {
            const result = parseYAML("published: true");
            assert.deepEqual(result, { published: true });
        });

        it("should parse booleans (false)", () => {
            const result = parseYAML("active: false");
            assert.deepEqual(result, { active: false });
        });

        it("should parse booleans (yes/no)", () => {
            const result = parseYAML("enabled: yes\ndisabled: no");
            assert.deepEqual(result, { enabled: true, disabled: false });
        });

        it("should parse null", () => {
            const result = parseYAML("value: null");
            assert.deepEqual(result, { value: null });
        });

        it("should parse empty value as null", () => {
            const result = parseYAML("value:");
            assert.deepEqual(result, { value: null });
        });
    });

    describe("objects", () => {
        it("should parse nested objects", () => {
            const yaml = joinLines([
                "author:",
                "  name: John Doe",
                "  email: john@example.com",
            ]);
            const result = parseYAML(yaml);
            assert.deepEqual(result, {
                author: {
                    name: "John Doe",
                    email: "john@example.com",
                },
            });
        });

        it("should parse deeply nested objects", () => {
            const yaml = joinLines([
                "user:",
                "  profile:",
                "    name: Alice",
                "    settings:",
                "      theme: dark",
            ]);
            const result = parseYAML(yaml);
            assert.deepEqual(result, {
                user: {
                    profile: {
                        name: "Alice",
                        settings: {
                            theme: "dark",
                        },
                    },
                },
            });
        });
    });

    describe("arrays", () => {
        it("should parse simple arrays", () => {
            const yaml = joinLines([
                "tags:",
                "  - javascript",
                "  - nodejs",
                "  - template",
            ]);
            const result = parseYAML(yaml);
            assert.deepEqual(result, {
                tags: ["javascript", "nodejs", "template"],
            });
        });

        it("should parse arrays with numbers", () => {
            const yaml = joinLines([
                "numbers:",
                "  - 1",
                "  - 2",
                "  - 3",
            ]);
            const result = parseYAML(yaml);
            assert.deepEqual(result, {
                numbers: [1, 2, 3],
            });
        });

        it("should parse arrays with booleans", () => {
            const yaml = joinLines([
                "flags:",
                "  - true",
                "  - false",
                "  - true",
            ]);
            const result = parseYAML(yaml);
            assert.deepEqual(result, {
                flags: [true, false, true],
            });
        });

        it("should parse arrays of objects", () => {
            const yaml = joinLines([
                "users:",
                "  - name: Alice",
                "    role: admin",
                "  - name: Bob",
                "    role: user",
            ]);
            const result = parseYAML(yaml);
            assert.deepEqual(result, {
                users: [
                    { name: "Alice", role: "admin" },
                    { name: "Bob", role: "user" },
                ],
            });
        });

        it("should parse inline arrays", () => {
            assert.deepEqual(parseYAML(`items: [apple, banana, cherry]`), {
                items: ["apple", "banana", "cherry"],
            });
            assert.deepEqual(parseYAML(`colors: [green, red, blue]`), {
                colors: ["green", "red", "blue"],
            });
            assert.deepEqual(parseYAML(`colors: [ green ,  red ,  blue ]`), {
                colors: ["green", "red", "blue"],
            });
            assert.deepEqual(parseYAML(`colors: [red, green, blue]`), {
                colors: ["red", "green", "blue"],
            });
            assert.deepEqual(parseYAML(`numbers: [1, 2, 3, 4]`), {
                numbers: [1, 2, 3, 4],
            });
            assert.deepEqual(parseYAML(`flags: [true, false, true]`), {
                flags: [true, false, true],
            });
        });
    });

    describe("complex structures", () => {
        it("should parse mixed structures", () => {
            const yaml = joinLines([
                "title: My Blog Post",
                "author:",
                "  name: Jane Doe",
                "  email: jane@example.com",
                "tags:",
                "  - javascript",
                "  - tutorial",
                "published: true",
                "views: 1234",
            ]);
            const result = parseYAML(yaml);
            assert.deepEqual(result, {
                title: "My Blog Post",
                author: {
                    name: "Jane Doe",
                    email: "jane@example.com",
                },
                tags: ["javascript", "tutorial"],
                published: true,
                views: 1234,
            });
        });
    });

    describe("edge cases", () => {
        it("should handle empty lines", () => {
            const yaml = joinLines([
                "name: John",
                "",
                "age: 30",
            ]);
            const result = parseYAML(yaml);
            assert.deepEqual(result, { name: "John", age: 30 });
        });

        it("should handle comments", () => {
            const yaml = joinLines([
                "# This is a comment",
                "name: John",
                "# Another comment",
                "age: 30",
            ]);
            const result = parseYAML(yaml);
            assert.deepEqual(result, { name: "John", age: 30 });
        });

        it("should return empty object for empty string", () => {
            const result = parseYAML("");
            assert.deepEqual(result, {});
        });
    });
});

describe("tomlParser", () => {
    const parseTOML = mikelFrontmatter.tomlParser;
    const joinLines = (lines = []) => lines.join("\n");

    describe("basic types", () => {
        it("should parse strings", () => {
            const result = parseTOML("name = \"John Doe\"");
            assert.deepEqual(result, { name: "John Doe" });
        });

        it("should parse integers", () => {
            const result = parseTOML("age = 25");
            assert.deepEqual(result, { age: 25 });
        });

        it("should parse floats", () => {
            const result = parseTOML("price = 19.99");
            assert.deepEqual(result, { price: 19.99 });
        });

        it("should parse booleans", () => {
            const result = parseTOML("active = true\nvisible = false");
            assert.deepEqual(result, { active: true, visible: false });
        });

        it("should parse null", () => {
            const result = parseTOML("value = null");
            assert.deepEqual(result, { value: null });
        });
    });

    describe("tables", () => {
        it("should parse simple tables", () => {
            const toml = joinLines([
                "[author]",
                "name = \"John Doe\"",
                "email = \"john@example.com\"",
            ]);
            const result = parseTOML(toml);
            assert.deepEqual(result, {
                author: {
                    name: "John Doe",
                    email: "john@example.com",
                },
            });
        });

        it("should parse nested tables", () => {
            const toml = joinLines([
                "[user.profile]",
                "name = \"Alice\"",
                "[user.settings]",
                "theme = \"dark\"",
            ]);
            const result = parseTOML(toml);
            assert.deepEqual(result, {
                user: {
                    profile: { name: "Alice" },
                    settings: { theme: "dark" },
                },
            });
        });
    });

    describe("complex structures", () => {
        it("should parse inline arrays", () => {
            const result = parseTOML("tags = [\"js\", \"node\", \"toml\"]");
            assert.deepEqual(result, {
                tags: ["js", "node", "toml"],
            });
        });

        it("should parse inline objects", () => {
            const result = parseTOML("user = { name: \"John\", age: 30 }");
            assert.deepEqual(result, {
                user: { name: "John", age: 30 },
            });
        });
    });

    describe("edge cases", () => {
        it("should handle empty lines", () => {
            const toml = joinLines([
                "name = \"John\"",
                "",
                "age = 30",
            ]);
            const result = parseTOML(toml);
            assert.deepEqual(result, { name: "John", age: 30 });
        });

        it("should handle comments", () => {
            const toml = joinLines([
                "# This is a comment",
                "name = \"John\"",
                "# Another comment",
                "age = 30",
            ]);
            const result = parseTOML(toml);
            assert.deepEqual(result, { name: "John", age: 30 });
        });

        it("should handle key-value pairs with different spacing", () => {
            const result = parseTOML("a=1\nb = 2\nc  =  3");
            assert.deepEqual(result, { a: 1, b: 2, c: 3 });
        });
    });
});

describe("mikelFrontmatter plugin", () => {
    const joinLines = (lines = []) => lines.join("\n");
    let render;

    beforeEach(() => {
        render = mikel.create();
        render.use(mikelFrontmatter());
    });

    describe("YAML format", () => {
        describe("basic usage", () => {
            it("should extract frontmatter and store in @frontmatter", () => {
                const template = joinLines([
                    "{{#frontmatter}}",
                    "title: Hello World",
                    "author: John Doe",
                    "{{/frontmatter}}",
                    "Title: {{@frontmatter.title}}",
                    "Author: {{@frontmatter.author}}",
                ]);

                const result = render(template, {}).trim();

                assert.equal(result, "Title: Hello World\nAuthor: John Doe");
            });

            it("should not render frontmatter block content", () => {
                const template = joinLines([
                    "{{#frontmatter}}",
                    "title: Test",
                    "{{/frontmatter}}",
                    "Content here",
                ]);

                const result = render(template, {}).trim();

                assert.equal(result, "Content here");
            });

            it("should handle complex frontmatter", () => {
                const template = joinLines([
                    "{{#frontmatter}}",
                    "title: My Post",
                    "meta:",
                    "  description: A great post",
                    "  keywords:",
                    "    - javascript",
                    "    - tutorial",
                    "settings:",
                    "  published: true",
                    "  views: 100",
                    "{{/frontmatter}}",
                    "{{@frontmatter.title}} - {{@frontmatter.meta.description}}",
                ]);

                const result = render(template, {}).trim();

                assert.equal(result, "My Post - A great post");
            });
        });

        describe("custom variable name", () => {
            it("should use custom variable name with 'as' option", () => {
                const template = joinLines([
                    "{{#frontmatter as=\"meta\"}}",
                    "title: Custom Variable",
                    "author: Jane",
                    "{{/frontmatter}}",
                    "Title: {{@meta.title}}",
                    "Author: {{@meta.author}}",
                ]);

                const result = render(template, {}).trim();

                assert.equal(result, "Title: Custom Variable\nAuthor: Jane");
            });

            it("should use different custom names in different blocks", () => {
                const template = joinLines([
                    "{{#frontmatter as=\"page\"}}",
                    "title: Page Title",
                    "{{/frontmatter}}",
                    "{{#frontmatter as=\"meta\"}}",
                    "description: Page Description",
                    "{{/frontmatter}}",
                    "{{@page.title}} - {{@meta.description}}",
                ]);

                const result = render(template, {}).trim();

                assert.equal(result, "Page Title - Page Description");
            });
        });

        describe("multiple blocks", () => {
            it("should overwrite with second frontmatter block", () => {
                const template = joinLines([
                    "{{#frontmatter}}",
                    "title: First Title",
                    "author: John",
                    "{{/frontmatter}}",
                    "{{#frontmatter}}",
                    "title: Second Title",
                    "status: draft",
                    "{{/frontmatter}}",
                    "Title: {{@frontmatter.title}}",
                    "Status: {{@frontmatter.status}}",
                ]);

                const result = render(template, {}).trim();

                assert.equal(result, "Title: Second Title\nStatus: draft");
            });

            it("should handle multiple blocks with custom names", () => {
                const template = joinLines([
                    "{{#frontmatter as=\"config\"}}",
                    "theme: dark",
                    "{{/frontmatter}}",
                    "{{#frontmatter as=\"config\"}}",
                    "theme: light",
                    "layout: wide",
                    "{{/frontmatter}}",
                    "Theme: {{@config.theme}}",
                    "Layout: {{@config.layout}}",
                ]);

                const result = render(template, {}).trim();

                assert.equal(result, "Theme: light\nLayout: wide");
            });
        });

        describe("integration with other helpers", () => {
            it("should work with #each", () => {
                const template = joinLines([
                    "{{#frontmatter}}",
                    "tags:",
                    "  - javascript",
                    "  - nodejs",
                    "  - template",
                    "{{/frontmatter}}",
                    "Tags: {{#each @frontmatter.tags}}{{this}}{{#unless @last}}, {{/unless}}{{/each}}",
                ]);

                const result = render(template, {}).trim();

                assert.equal(result, "Tags: javascript, nodejs, template");
            });

            it("should work with #if", () => {
                const template = joinLines([
                    "{{#frontmatter}}",
                    "published: true",
                    "featured: false",
                    "{{/frontmatter}}",
                    "{{#if @frontmatter.published}}Published{{/if}}",
                    "{{#unless @frontmatter.featured}}Not Featured{{/unless}}",
                ]);

                const result = render(template, {}).trim();

                assert.equal(result, "Published\nNot Featured");
            });
        });
    });

    describe("JSON format", () => {
        describe("basic usage", () => {
            it("should extract JSON frontmatter and store in @frontmatter", () => {
                const template = joinLines([
                    "{{#frontmatter}}",
                    "{",
                    "  \"title\": \"Hello World\",",
                    "  \"author\": \"John Doe\"",
                    "}",
                    "{{/frontmatter}}",
                    "Title: {{@frontmatter.title}}",
                    "Author: {{@frontmatter.author}}",
                ]);

                const result = render(template, {}).trim();

                assert.equal(result, "Title: Hello World\nAuthor: John Doe");
            });

            it("should handle complex JSON frontmatter", () => {
                const template = joinLines([
                    "{{#frontmatter}}",
                    "{",
                    "  \"title\": \"My Post\",",
                    "  \"meta\": {",
                    "    \"description\": \"A great post\",",
                    "    \"keywords\": [\"javascript\", \"tutorial\"]",
                    "  },",
                    "  \"settings\": {",
                    "    \"published\": true,",
                    "    \"views\": 100",
                    "  }",
                    "}",
                    "{{/frontmatter}}",
                    "{{@frontmatter.title}} - {{@frontmatter.meta.description}}",
                ]);

                const result = render(template, {}).trim();

                assert.equal(result, "My Post - A great post");
            });

            it("should handle arrays in JSON", () => {
                const template = joinLines([
                    "{{#frontmatter}}",
                    "{",
                    "  \"tags\": [\"javascript\", \"nodejs\", \"template\"]",
                    "}",
                    "{{/frontmatter}}",
                    "Tags: {{#each @frontmatter.tags}}{{this}}{{#unless @last}}, {{/unless}}{{/each}}",
                ]);

                const result = render(template, {}).trim();

                assert.equal(result, "Tags: javascript, nodejs, template");
            });
        });

        describe("custom variable name", () => {
            it("should use custom variable name with JSON format", () => {
                const template = joinLines([
                    "{{#frontmatter as=\"meta\"}}",
                    "{",
                    "  \"title\": \"Custom Variable\",",
                    "  \"author\": \"Jane\"",
                    "}",
                    "{{/frontmatter}}",
                    "Title: {{@meta.title}}",
                    "Author: {{@meta.author}}",
                ]);

                const result = render(template, {}).trim();

                assert.equal(result, "Title: Custom Variable\nAuthor: Jane");
            });
        });

        describe("data types", () => {
            it("should handle various JSON data types", () => {
                const template = joinLines([
                    "{{#frontmatter}}",
                    "{",
                    "  \"string\": \"text\",",
                    "  \"number\": 42,",
                    "  \"float\": 3.14,",
                    "  \"boolean\": true,",
                    "  \"nullValue\": null",
                    "}",
                    "{{/frontmatter}}",
                    "String: {{@frontmatter.string}}",
                    "Number: {{@frontmatter.number}}",
                    "Float: {{@frontmatter.float}}",
                ]);

                const result = render(template, {}).trim();

                assert.equal(result, "String: text\nNumber: 42\nFloat: 3.14");
            });
        });
    });

    describe("TOML format", () => {
        beforeEach(() => {
            render = mikel.create();
            render.use(mikelFrontmatter({
                parser: mikelFrontmatter.tomlParser,
            }));
        });

        it("should extract TOML frontmatter and store in @frontmatter", () => {
            const template = joinLines([
                "{{#frontmatter}}",
                "title = \"Hello World\"",
                "author = \"John Doe\"",
                "{{/frontmatter}}",
                "Title: {{@frontmatter.title}}",
                "Author: {{@frontmatter.author}}",
            ]);

            const result = render(template, {}).trim();

            assert.equal(result, "Title: Hello World\nAuthor: John Doe");
        });

        it("should handle tables in TOML frontmatter", () => {
            const template = joinLines([
                "{{#frontmatter}}",
                "[meta]",
                "title = \"My Post\"",
                "description = \"A great post\"",
                "{{/frontmatter}}",
                "{{@frontmatter.meta.title}} - {{@frontmatter.meta.description}}",
            ]);

            const result = render(template, {}).trim();

            assert.equal(result, "My Post - A great post");
        });
    });
});
