import {describe, it} from "node:test";
import assert from "node:assert";
import m from "./index.js";

describe("{{ xyz }}", () => {
    it("should replace variables", () => {
        const data = {name: "Bob"};
        assert.equal(m("Hello {{ name }}!", data), "Hello Bob!");
    });

    it("should escape variables", () => {
        const data = {tag: "<div>"};
        assert.equal(m("Tag is {{ tag }}", data), "Tag is &lt;div&gt;");
    });
});

describe("{{! xyz }}", () => {
    it("should not escape variables", () => {
        const data = {tag: "<div>"};
        assert.equal(m("Tag is {{! tag }}", data), "Tag is <div>");
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

describe("{{#customHelper }}", () => {
    it("should allow to execute a simple custom helper", () => {
        const options = {
            helpers: {
                hello: ({value}) => `Hello ${value}!!`,
            },
        };
        assert.equal(m("{{#hello name}}{{/hello}}", {name: "Bob"}, options), "Hello Bob!!");
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

describe("{{@customVariable}}", () => {
    const options = {
        variables: {
            foo: "bar",
        },
    };
    it("should allow providing custom at-variables", () => {
        assert.equal(m("Hello, {{@foo}}", {}, options), "Hello, bar");
    });

    it("should be available in helpers", () => {
        assert.equal(m("{{#each values}}{{@foo}}:{{.}},{{/each}}", {values: [1, 2]}, options), "bar:1,bar:2,");
    });
});
