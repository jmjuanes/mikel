import {describe, it} from "node:test";
import assert from "node:assert";
import m from "./index.js";

describe("templating", () => {
    describe("{{ xyz }}", () => {
        it("should replace variables", () => {
            const data = {name: "Bob"};
            assert.equal(m("Hello {{ name }}!", data), "Hello Bob!");
        });

        it("should escape variables", () => {
            const data = {tag: "<div>"};
            assert.equal(m("Tag is {{ tag }}", data), "Tag is &lt;div&gt;");
        });

        it("should allow fallback values", () => {
            assert.equal(m(`Hello {{name || "world"}}!`, {}), "Hello world!");
        });
    });

    describe("{{! xyz }}", () => {
        it("should not escape variables", () => {
            const data = {tag: "<div>"};
            assert.equal(m("Tag is {{! tag }}", data), "Tag is <div>");
        });

        it("should allow fallback values", () => {
            assert.equal(m(`Hello {{!name || !"<world>"}}!`, {}), "Hello <world>!");
        });
    });

    describe("{{# xyz }}", () => {
        it("should be displayed when truthy", () => {
            const data = {visible: true};
            assert.equal(m("{{# visible}}Yes!{{/ visible}}", data), "Yes!");
        });

        it("should not be visible when falsy", () => {
            const data = {visible: false};
            assert.equal(m("{{# visible}}Yes!{{/ visible}}", data), "");
        });

        it("should not be visible when null", () => {
            const data = {name: null};
            assert.equal(m("{{#name}}Hello {{name}}{{/name}}", data), "");
        });

        it("should not be visible when undefined", () => {
            const data = {};
            assert.equal(m("{{#name}}Hello {{name}}{{/name}}", data), "");
        });

        it("should parse variables inside", () => {
            const data = {visible: true, name: "Bob"};
            assert.equal(m("{{#visible}}Hello {{name}}!{{/visible}}", data), "Hello Bob!");
        });

        it("should support nested conditionals", () => {
            const data = {visible1: true, visible2: true, name: "Bob"};
            assert.equal(m("{{#visible1}}{{#visible2}}{{name}}{{/visible2}}{{/visible1}}", data), "Bob");
        });

        it("should iterate simple arrays", () => {
            const data = {
                items: ["1", "2", "3"],
            };
            assert.equal(m("{{#items}}{{.}}{{/items}}", data), "123");
        });

        it("should iterate arrays of objects", () => {
            const data = {
                items: [{name: "Susan"},{name: "Bob"}],
                name: "Phil",
            };
            assert.equal(m("{{#items}}{{name}}-{{/items}}", data), "Susan-Bob-");
        });

        it("should not iterate over an empty array", () => {
            const data = {
                items: [],
            };
            assert.equal(m("List of items: {{#items}}{{.}},{{/items}}", data), "List of items: ");
        });

        it("should throw an error for unmatched end of section", () => {
            const data = {name: "Bob"};
            try {
                m("{{#name}}Hello {{name}}!{{/foo}}", data);
            }
            catch (error) {
                assert.equal(error.message, "Unmatched section end: {{/foo}}");
            }
        });
    });

    describe("{{^ xyz }}", () => {
        it("should be rendered if variable is falsy", () => {
            const data = {visible: false};
            assert.equal(m("{{^visible}}Yeah!{{/visible}}", data), "Yeah!");
        });

        it("should not be rendered if variable is truthy", () => {
            const data = {visible: true};
            assert.equal(m("{{^visible}}Yeah!{{/visible}}", data), "");
        });
    });

    describe("{{> xyz }}", () => {
        it("should render provided partials", () => {
            const partials = {
                foo: "Hello World!",
            };
            assert.equal(m("Message: '{{> foo}}'", {}, {partials}), "Message: 'Hello World!'");
        });

        it("should forward context to partials", () => {
            const data = {name: "Bob"};
            const partials = {
                foo: "Hello {{name}}!",
            };
            assert.equal(m("Message: '{{> foo}}'", data, {partials}), "Message: 'Hello Bob!'");
        });

        it("should ignore partial section if partial is not defined", () => {
            assert.equal(m("Hello {{> foo}}", {}, {}), "Hello ");
        });

        it("should allow to provide custom context to partial", () => {
            const data = {
                author: {
                    name: "Bob",
                },
            };
            const partials = {
                foo: "Hello {{name}}!",
            };
            assert.equal(m("Message: '{{> foo author}}'", data, {partials}), "Message: 'Hello Bob!'");
        });

        it("should allow to provide keyword arguments to partials", () => {
            const data = {
                name: "Bob"
            };
            const partials = {
                foo: "Hello {{userName}}!",
            };
            assert.equal(m("{{>foo userName=name}}", data, {partials}), "Hello Bob!");
        });
    });

    describe("{{#each }}", () => {
        it("should do nothing if value is not an array or object", () => {
            assert.equal(m("x{{#each values}}{{.}}{{/each}}x", {values: null}), "xx");
            assert.equal(m("x{{#each values}}{{.}}{{/each}}x", {values: []}), "xx");
            assert.equal(m("x{{#each values}}{{.}}{{/each}}x", {values: {}}), "xx");
            assert.equal(m("x{{#each values}}{{.}}{{/each}}x", {values: "aa"}), "xx");
        });

        it("should iterate over an array of items", () => {
            assert.equal(m("{{#each values}}{{.}}{{/each}}", {values: ["a", "b"]}), "ab");
            assert.equal(m("{{#each values}}{{@index}}:{{.}},{{/each}}", {values: ["a", "b"]}), "0:a,1:b,");
        });

        it("should iterate over an object", () => {
            assert.equal(m("{{#each values}}{{.}},{{/each}}", {values: {foo: "bar"}}), "bar,");
            assert.equal(m("{{#each values}}{{@key}}:{{@value}},{{/each}}", {values: {foo: "bar"}}), "foo:bar,");
        });

        it("should register @first variable", () => {
            assert.equal(m("{{#each values}}{{.}}:{{@first}};{{/each}}", {values: [0, 1, 2]}), "0:true;1:false;2:false;");
        });

        it("should register @last variable", () => {
            assert.equal(m("{{#each values}}{{.}}:{{@last}};{{/each}}", {values: [0, 1, 2]}), "0:false;1:false;2:true;");
        });

        it("should allow to limit the number of iterations using the limit option", () => {
            assert.equal(m("{{#each values limit=2}}{{.}}{{/each}}", {values: [0, 1, 2]}), "01");
        });

        it("should allow to change the start index using the skip option", () => {
            assert.equal(m("{{#each values skip=2}}{{.}}{{/each}}", {values: [0, 1, 2, 3]}), "23");
        });

        it("should allow to change the start index and limit the number of iterations", () => {
            assert.equal(m("{{#each values skip=1 limit=2}}{{.}}{{/each}}", {values: [0, 1, 2, 3]}), "12");
        });
    });

    describe("{{#if }}", () => {
        it("should include content if value is true", () => {
            assert.equal(m("_{{#if value}}Yes!{{/if}}_", {value: true}), "_Yes!_");
        });

        it("should not include content if value is false", () => {
            assert.equal(m("_{{#if value}}Yes!{{/if}}_", {value: false}), "__");
        });

        it("should read value from runtime variables", () => {
            assert.equal(m("{{#each items}}{{#if @first}}.{{/if}}{{.}}{{/each}}", {items: [0, 1, 2]}), ".012");
        });
    });

    describe("{{#unless }}", () => {
        it("should not include content if value is true", () => {
            assert.equal(m("_{{#unless value}}Yes!{{/unless}}_", {value: true}), "__");
        });

        it("should include content if value is false", () => {
            assert.equal(m("_{{#unless value}}Yes!{{/unless}}_", {value: false}), "_Yes!_");
        });

        it("should read value from runtime variables", () => {
            assert.equal(m("{{#each items}}{{.}}{{#unless @last}},{{/unless}}{{/each}}", {items: [0, 1, 2]}), "0,1,2");
        });
    });

    describe("{{#eq }}", () => {
        it("should render block if two values are equal", () => {
            assert.equal(m(`{{#eq value "a"}}yes!{{/eq}}`, {value: "a"}), "yes!");
            assert.equal(m(`{{#eq value true}}yes!{{/eq}}`, {value: true}), "yes!");
            assert.equal(m(`{{#eq value 0}}yes!{{/eq}}`, {value: 0}), "yes!");
        });

        it("should not render block if two values are not equal", () => {
            assert.equal(m(`{{#eq value "a"}}yes!{{/eq}}`, {value: "b"}), "");
            assert.equal(m(`{{#eq value true}}yes!{{/eq}}`, {value: false}), "");
            assert.equal(m(`{{#eq value 0}}yes!{{/eq}}`, {value: 1}), "");
        });
    });

    describe("{{#ne }}", () => {
        it("should not render block if two values are equal", () => {
            assert.equal(m(`{{#ne value "a"}}yes!{{/ne}}`, {value: "a"}), "");
            assert.equal(m(`{{#ne value true}}yes!{{/ne}}`, {value: true}), "");
            assert.equal(m(`{{#ne value 0}}yes!{{/ne}}`, {value: 0}), "");
        });

        it("should render block if two values are not equal", () => {
            assert.equal(m(`{{#ne value "a"}}yes!{{/ne}}`, {value: "b"}), "yes!");
            assert.equal(m(`{{#ne value true}}yes!{{/ne}}`, {value: false}), "yes!");
            assert.equal(m(`{{#ne value 0}}yes!{{/ne}}`, {value: 1}), "yes!");
        });
    });

    describe("{{#with }}", () => {
        it("should change the context of the block", () => {
            const data = {
                value: "no",
                subdata: {
                    value: "yes",
                },
            };
            assert.equal(m("result: {{#with subdata}}{{value}}{{/with}}", data), "result: yes");
        });
    });

    describe("{{#customHelper }}", () => {
        it("should allow to execute a simple custom helper", () => {
            const options = {
                helpers: {
                    hello: params => `Hello ${params.args[0]}!!`,
                },
            };
            assert.equal(m("{{#hello name}}{{/hello}}", {name: "Bob"}, options), "Hello Bob!!");
        });

        it("should allow to provide multiple values to custom helper", () => {
            const options = {
                helpers: {
                    concat: params => params.args.join(" "),
                },
            };
            assert.equal(m("{{#concat a b}}{{/concat}}!", {a: "hello", b: "world"}, options), "hello world!");
        });

        it("should allow to provide fixed arguments values", () => {
            const options = {
                helpers: {
                    customEqual: params => params.args[0] === params.args[1] ? params.fn(params.context) : "",
                },
            };
            assert.equal(m(`{{#customEqual value "yes"}}Yes!!{{/customEqual}}`, {value: "yes"}, options), "Yes!!");
            assert.equal(m(`{{#customEqual value "no"}}Yes!!{{/customEqual}}`, {value: "yes"}, options), "");
            assert.equal(m(`{{#customEqual value false}}Yes!!{{/customEqual}}`, {value: "yes"}, options), "");
        });

        it("should allow to provide keyword arguments", () => {
            const options = {
                helpers: {
                    concat: params => params.args.join(params.opt.delimiter || " "),
                },
            };
            assert.equal(m(`{{#concat a b delimiter=","}}{{/concat}}`, {a: "hello", b: "world"}, options), "hello,world");
        });
    });

    describe("{{@root}}", () => {
        it("should reference the global context", () => {
            assert.equal(m("{{#each values}}{{@root.key}}{{/each}}", {values: ["a", "b"], key: "c"}), "cc");
        });
    });

    describe("{{@index}}", () => {
        it("should reference current index in the array", () => {
            assert.equal(m("{{#each values}}{{@index}}{{/each}}", {values: ["a", "b", "c"]}), "012");
        });
    });

    describe("{{@key}}", () => {
        it("should reference current key when looping throug an object", () => {
            assert.equal(m("{{#each values}}{{@key}},{{/each}}", {values: {foo: 1, bar: 2}}), "foo,bar,");
        });
    });

    describe("{{@value}}", () => {
        it("should reference current value when looping throug an object", () => {
            assert.equal(m("{{#each values}}{{@value}},{{/each}}", {values: {foo: 1, bar: 2}}), "1,2,");
        });
    });

    describe("{{=function }}", () => {
        const options = {
            functions: {
                toUpperCase: params => params.args[0].toUpperCase(),
                concat: params => params.args.join(params.opt.delimiter || " "),
            },
        };

        it("should allow executing a function to return a value", () => {
            assert.equal(m("{{=toUpperCase value}}!!", {value: "Bob"}, options), "BOB!!");
        });

        it("should support multiple arguments", () => {
            assert.equal(m("{{=concat a b}}", {a: "Hello", b: "World"}, options), "Hello World");
        });

        it("should render nothing if no function is provided", () => {
            assert.equal(m("Result: {{=noop value}}", {value: "a"}), "Result: ");
        });

        it("should allow to provide fixed arguments values", () => {
            assert.equal(m(`{{=concat "Hello" "World"}}!`, {}, options), "Hello World!");
        });

        it("should allow to execute funcions inside helpers blocks", () => {
            assert.equal(m(`{{#each names}}{{=toUpperCase .}}, {{/each}}`, {names: ["bob", "susan"]}, options), "BOB, SUSAN, ");
        });

        it("should support keywods in function arguments", () => {
            assert.equal(m(`{{=concat a b delimiter=","}}`, {a: "Hello", b: "World"}, options), "Hello,World");
        });

        it("should support context variables as keyword arguments", () => {
            const data = {
                name: "Bob",
                surname: "Doe",
            };
            const options = {
                functions: {
                    sayWelcome: ({args, opt}) => {
                        return `Welcome, ${[args[0], opt.surname || ""].filter(Boolean).join(" ")}`;
                    },
                },
            };
            assert.equal(m("{{=sayWelcome name surname=surname}}", data, options), "Welcome, Bob Doe");
        });
    });
});

describe("utils", () => {
    describe("frontmatter", () => {
        const frontmatter = lines => m.frontmatter(lines.join("\n"));

        it("should return empty data if no frontmatter is present", () => {
            const result = frontmatter([
                `Hello world`,
            ]);
            assert.equal(result.body, "Hello world");
            assert.equal(Object.keys(result.data).length, 0);
        });

        it("should return parsed frontmatter", () => {
            const result = frontmatter([
                `---`,
                `DATA`,
                `---`,
                `Hello world`,
            ]);
            assert.equal(result.body, "Hello world");
            assert.equal(result.data, "DATA");
        });
    });
});
