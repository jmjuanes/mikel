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
        const data = {name: "Bob"};
        const partials = {
            foo: "Hello {{name}}!",
        };
        assert.equal(m("Message: '{{> foo}}'", data, {partials}), "Message: 'Hello Bob!'");
    });
});
