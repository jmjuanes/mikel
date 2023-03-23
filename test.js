import m from "./index.js";

describe("{{ xyz }}", () => {
    it("should replace variables", () => {
        const data = {name: "Bob"};
        expect(m("Hello {{ name }}!", data)).toEqual("Hello Bob!");
    });

    it("should escape variables", () => {
        const data = {tag: "<div>"};
        expect(m("Tag is {{ tag }}", data)).toEqual("Tag is &lt;div&gt;");
    });
});

describe("{{! xyz }}", () => {
    it("should not escape variables", () => {
        const data = {tag: "<div>"};
        expect(m("Tag is {{! tag }}", data)).toEqual("Tag is <div>");
    });
});

describe("{{# xyz }}", () => {
    it("should be displayed when truthy", () => {
        const data = {visible: true};
        expect(m("{{# visible}}Yes!{{/ visible}}", data)).toEqual("Yes!");
    });

    it("should not be visible when falsy", () => {
        const data = {visible: false};
        expect(m("{{# visible}}Yes!{{/ visible}}", data)).toEqual("");
    });

    it("should not be visible when null", () => {
        const data = {name: null};
        expect(m("{{#name}}Hello {{name}}{{/name}}", data)).toEqual("");
    });

    it("should not be visible when undefined", () => {
        const data = {};
        expect(m("{{#name}}Hello {{name}}{{/name}}", data)).toEqual("");
    });

    it("should parse variables inside", () => {
        const data = {visible: true, name: "Bob"};
        expect(m("{{#visible}}Hello {{name}}!{{/visible}}", data)).toEqual("Hello Bob!");
    });

    it("should support nested conditionals", () => {
        const data = {visible1: true, visible2: true, name: "Bob"};
        expect(m("{{#visible1}}{{#visible2}}{{name}}{{/visible2}}{{/visible1}}", data)).toEqual("Bob");
    });

    it("should iterate simple arrays", () => {
        const data = {
            items: ["1", "2", "3"],
        };
        expect(m("{{#items}}{{.}}{{/items}}", data)).toEqual("123");
    });

    it("should iterate arrays of objects", () => {
        const data = {
            items: [{name: "Susan"},{name: "Bob"}],
            name: "Phil",
        };
        expect(m("{{#items}}{{name}}-{{/items}}", data)).toEqual("Susan-Bob-");
    });

    it("should throw an error for unmatched end of section", () => {
        const data = {name: "Bob"};
        try {
            m("{{#name}}Hello {{name}}!{{/foo}}", data);
        }
        catch (error) {
            expect(error.message).toEqual("Unmatched section end: {{/foo}}");
        }
    });
});

describe("{{^ xyz }}", () => {
    it("should be rendered if variable is falsy", () => {
        const data = {visible: false};
        expect(m("{{^visible}}Yeah!{{/visible}}", data)).toEqual("Yeah!");
    });

    it("should not be rendered if variable is truthy", () => {
        const data = {visible: true};
        expect(m("{{^visible}}Yeah!{{/visible}}", data)).toEqual("");
    });
});

