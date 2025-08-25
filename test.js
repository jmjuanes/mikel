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

        it("should allow to use 'this' or '.' to access current data", () => {
            assert.equal(m(`Hello {{.}}`, "Bob"), "Hello bob");
            assert.equal(m(`Hello {{this}}`, "Bob"), "Hello bob");
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
            assert.equal(m("{{#items}}{{this}}{{/items}}", data), "123");
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

        it("should allow partial variables", () => {
            const partials = {
                foo: {
                    body: "Hello {{@partial.name}}!",
                    attributes: {
                        name: "Bob",
                    },
                },
            };
            assert.equal(m("{{>foo}}", {}, {partials}), "Hello Bob!");
        });

        it("should support spread operator in partial keyword arguments", () => {
            const data = {
                partialArgs: {
                    name: "Bob",
                    age: 30,
                },
            };
            const partials = {
                foo: "Hello {{name}}! You are {{age}} years old.",
            };
            assert.equal(m("{{>foo ...partialArgs}}", data, {partials}), "Hello Bob! You are 30 years old.");
        });
    });

    describe("{{>> xyz}}", () => {
        it("should allow providing a block to the partial", () => {
            const partials = {
                foo: "Hello {{@content}}!",
            };

            assert.equal(m("{{>>foo}}Bob{{/foo}}", {}, {partials}), "Hello Bob!");
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
            assert.equal(m("{{#each values}}{{this}}{{/each}}", {values: ["a", "b"]}), "ab");
            assert.equal(m("{{#each values}}{{@index}}:{{.}},{{/each}}", {values: ["a", "b"]}), "0:a,1:b,");
            assert.equal(m("{{#each values}}{{@index}}:{{this}},{{/each}}", {values: ["a", "b"]}), "0:a,1:b,");
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

    describe("{{#escape}}", () => {
        it("should escape provided content", () => {
            assert.equal(m("{{#escape}}<b>Hello</b>{{/escape}}"), "&lt;b&gt;Hello&lt;/b&gt;");
        });
    });

    describe("{{#raw}}", () => {
        it("should return raw content", () => {
            assert.equal(m("{{#raw}}{{foo}}{{/raw}}", {foo: "bar"}), "{{foo}}");
        });

        it("should return raw content with nested sections", () => {
            assert.equal(m("{{#raw}}{{#if condition}}Hello{{/if}}{{/raw}}", {}), "{{#if condition}}Hello{{/if}}");
        });

        it("should return raw content with nested sections and variables", () => {
            assert.equal(m("{{#raw}}Hello {{name}}!{{/raw}}", {name: "Bob"}), "Hello {{name}}!");
        });

        it("should return raw content with nested raw sections", () => {
            assert.equal(m("{{#raw}}{{#raw}}Hello {{name}}!{{/raw}}{{/raw}}", {name: "Bob"}), "{{#raw}}Hello {{name}}!{{/raw}}");
            assert.equal(m("{{#raw}}#raw{{name}}/raw{{/raw}}", {name: "Bob"}), "#raw{{name}}/raw");
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
                    customEval: params => {
                        const values = params.args[0].split(" == ");
                        return values[0] === values[1] ? params.fn(params.context) : "";
                    },
                },
            };
            assert.equal(m(`{{#customEqual value "yes"}}Yes!!{{/customEqual}}`, {value: "yes"}, options), "Yes!!");
            assert.equal(m(`{{#customEqual value "no"}}Yes!!{{/customEqual}}`, {value: "yes"}, options), "");
            assert.equal(m(`{{#customEqual value false}}Yes!!{{/customEqual}}`, {value: "yes"}, options), "");
            assert.equal(m(`{{#customEval "1 == 1"}}Equal!!{{/customEval}}`, {}, options), "Equal!!");
            assert.equal(m(`{{#customEval "1 == 2"}}Equal!!{{/customEval}}`, {}, options), "");
        });

        it("should allow to provide keyword arguments", () => {
            const options = {
                helpers: {
                    concat: params => params.args.join(params.opt.delimiter || " "),
                },
            };
            assert.equal(m(`{{#concat a b delimiter=","}}{{/concat}}`, {a: "hello", b: "world"}, options), "hello,world");
        });

        it("should support spread operator in helper arguments", () => {
            const data = {
                values: ["Hello", "World"],
            };
            const options = {
                helpers: {
                    concat: params => params.args.join(" "),
                },
            };
            assert.equal(m("{{#concat ...values}}{{/concat}}", data, options), "Hello World");
        });

        it("should support spread operator in helper arguments with keywords", () => {
            const data = {
                helperArgs: {
                    values: ["Hello", "World"],
                    delimiter: ",",
                },
            };
            const options = {
                helpers: {
                    concat: params => params.opt.values.join(params.opt.delimiter || " "),
                },
            };
            assert.equal(m("{{#concat ...helperArgs}}{{/concat}}", data, options), "Hello,World");
        });

        it("should support using the spread operator for both arguments and keyword arguments", () => {
            const data = {
                values: ["Hello", "World"],
                options: {
                    delimiter: ",",
                },
            };
            const options = {
                helpers: {
                    concat: params => params.args.join(params.opt.delimiter || " "),
                },
            };
            assert.equal(m("{{#concat ...values ...options}}{{/concat}}", data, options), "Hello,World");
        });

        it("should support accessing to variables in helper params", () => {
            const data = {
                name: "Bob",
            };
            const options = {
                helpers: {
                    greet: params => `Hello ${params.variables.root.name}!`,
                },
            };
            assert.equal(m("{{#greet}}{{/greet}}", data, options), "Hello Bob!");
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
                equal: params => {
                    const values = params.args[0].split(" == ");
                    return values[0] === values[1] ? "YES" : "NO";
                },
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
            assert.equal(m(`{{=equal "1 == 1"}}`, {}, options), "YES");
            assert.equal(m(`{{=equal "1 == 2"}}`, {}, options), "NO");
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

        it("should support spread operator in function arguments", () => {
            const data = {
                values: [1, 2, 3],
            };
            const options = {
                functions: {
                    sum: ({args}) => {
                        return args.reduce((a, b) => a + b, 0);
                    },
                },
            };
            assert.equal(m("result={{=sum ...values}}", data, options), "result=6");
        });

        it("should support spread operator in function arguments with keywords", () => {
            const data = {
                functionArgs: {
                    values: [1, 2, 3],
                    delimiter: ",",
                },
            };
            const options = {
                functions: {
                    concat: ({opt}) => {
                        return (opt.values || []).join(opt.delimiter || " ");
                    },
                },
            };
            assert.equal(m("result={{=concat ...functionArgs}}", data, options), "result=1,2,3");
        });

        it("should support accessing to variables in function params", () => {
            const data = {
                name: "Bob",
            };
            const options = {
                functions: {
                    greet: params => `Hello ${params.variables.root.name}!`,
                },
            };
            assert.equal(m("{{=greet}}", data, options), "Hello Bob!");
        });
    });
});

describe("mikel", () => {
    it("should be a function", () => {
        assert.equal(typeof m, "function");
    });

    it("should return a string", () => {
        const result = m("Hello {{ name }}!", {name: "Alice"});
        assert.equal(typeof result, "string");
    });

    it("should return the same result for the same input", () => {
        const template = "Hello {{ name }}!";
        const data = {name: "Alice"};
        const result1 = m(template, data);
        const result2 = m(template, data);
        assert.equal(result1, result2);
    });

    it("should allow to pass custom options", () => {
        const options = {
            helpers: {
                greet: () => "Hello World!",
            },
        };
        const result = m("{{#greet}}{{/greet}}", {}, options);
        assert.equal(result, "Hello World!");
    });
});

describe("mikel.create", () => {
    it("should create a new instance of mikel", () => {
        const mk = m.create();
        assert.equal(mk("Hello {{ name }}!", {name: "Alice"}), "Hello Alice!");
    });

    it("should allow providing custom helpers", () => {
        const mk = m.create({
            helpers: {
                name: () => "Bob",
            },
        });
        assert.equal(mk("Hello {{#name}}{{/name}}!", {}), "Hello Bob!");
    });

    it("should allow providing custom functions", () => {
        const mk = m.create({
            functions: {
                greet: () => "Hello World!",
            },
        });
        assert.equal(mk("{{=greet}}", {}), "Hello World!");
    });

    it("should allow providing custom partials", () => {
        const mk = m.create({
            partials: {
                foo: "Bar",
            },
        });
        assert.equal(mk("{{>foo}}", {}), "Bar");
    });
});

describe("mikel.use", () => {
    it("should allow registering new helpers", () => {
        const mk = m.create();
        mk.use({
            helpers: {
                foo: params => params.args[0],
            },
        });
        assert.equal(mk(`Hello {{#foo "bar"}}{{/foo}}`, {}), "Hello bar");
    });

    it("should allow registering new functions", () => {
        const mk = m.create();
        mk.use({
            functions: {
                foo: () => "bar",
            },
        });
        assert.equal(mk("Hello {{=foo}}", {}), "Hello bar");
    });

    it("should allow registering new partials", () => {
        const mk = m.create();
        mk.use({
            partials: {
                foo: "bar",
            },
        });
        assert.equal(mk("Hello {{>foo}}", {}), "Hello bar");
    });
});

describe("mikel.tokenize", () => {
    it("should tokenize a simple template", () => {
        const template = "Hello {{ name }}!";
        const tokens = m.tokenize(template);
        assert.deepEqual(tokens, ["Hello ", " name ", "!"]);
    });

    it("should tokenize a template with sections", () => {
        const template = "{{#if condition}}Yes{{/if}} {{name}}!";
        const tokens = m.tokenize(template);
        assert.deepEqual(tokens, ["", "#if condition", "Yes", "/if", " ", "name", "!"]);
    });

    it("should tokenize a template with partials", () => {
        const template = "Hello {{>partial}}!";
        const tokens = m.tokenize(template);
        assert.deepEqual(tokens, ["Hello ", ">partial", "!"]);
    });

    it("should tokenize a template with functions", () => {
        const template = "Result: {{=function arg1 arg2}}";
        const tokens = m.tokenize(template);
        assert.deepEqual(tokens, ["Result: ", "=function arg1 arg2", ""]);
    });

    it("should tokenize a template with nested sections", () => {
        const template = "{{#if condition}}{{#each items}}{{.}}{{/each}}{{/if}}";
        const tokens = m.tokenize(template);
        assert.deepEqual(tokens, ["", "#if condition", "", "#each items", "", ".", "", "/each", "", "/if", ""]);
    });

    it("should tokenize a template with raw sections", () => {
        const template = "{{#raw}}Hello {{name}}!{{/raw}}";
        const tokens = m.tokenize(template);
        assert.deepEqual(tokens, ["", "#raw", "Hello ", "name", "!", "/raw", ""]);
    });

    it("should tokenize a template with escape sections", () => {
        const template = "{{#escape}}<b>Hello</b>{{/escape}}";
        const tokens = m.tokenize(template);
        assert.deepEqual(tokens, ["", "#escape", "<b>Hello</b>", "/escape", ""]);
    });

    it("should tokenize a template with custom helpers", () => {
        const template = "{{#customHelper arg1 arg2}}Content{{/customHelper}}";
        const tokens = m.tokenize(template);
        assert.deepEqual(tokens, ["", "#customHelper arg1 arg2", "Content", "/customHelper", ""]);
    });
});

describe("mikel.untokenize", () => {
    it("should untokenize a simple array of tokens", () => {
        const tokens = ["Hello ", " name ", "!"];
        const template = m.untokenize(tokens);
        assert.equal(template, "Hello {{ name }}!");
    });

    it("should untokenize a complex array of tokens", () => {
        const tokens = ["", "#if condition", "Yes", "/if", " ", "name", "!"];
        const template = m.untokenize(tokens);
        assert.equal(template, "{{#if condition}}Yes{{/if}} {{name}}!");
    });

    it("should handle empty tokens array", () => {
        const tokens = [];
        const template = m.untokenize(tokens);
        assert.equal(template, "");
    });
});

describe("mikel.escape", () => {
    it("should escape HTML special characters", () => {
        const str = "<div>Hello & welcome!</div>";
        const escaped = m.escape(str);
        assert.equal(escaped, "&lt;div&gt;Hello &amp; welcome!&lt;/div&gt;");
    });
});

describe("mikel.parse", () => {
    it("should parse a string to a native type", () => {
        assert.equal(m.parse("true"), true);
        assert.equal(m.parse("false"), false);
        assert.equal(m.parse("null"), null);
        assert.equal(m.parse('"Hello"'), "Hello");
        assert.equal(m.parse("42"), 42);
        assert.equal(m.parse("3.14"), 3.14);
        assert.equal(m.parse("@name", {}, {name: "Alice"}), "Alice");
        assert.equal(m.parse("name", {name: "Bob"}), "Bob");
    });
});

describe("mikel.get", () => {
    it("should get a value from an object using a path", () => {
        const obj = {a: {b: {c: "Hello"}}};
        assert.equal(m.get(obj, "a.b.c"), "Hello");
        assert.equal(m.get(obj, "a.b.d"), "");
        assert.equal(m.get(obj, "."), obj);
        assert.equal(m.get(obj, "a.b"), obj.a.b);
    });

    it("should return empty string for undefined paths", () => {
        const obj = {a: {b: "Hello"}};
        assert.equal(m.get(obj, "a.c"), "");
        assert.equal(m.get(obj, "x.y.z"), "");
    });
});
