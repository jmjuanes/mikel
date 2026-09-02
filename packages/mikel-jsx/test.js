import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { transform, parseAttributes } from "./index.js";

describe("tag transform", () => {
    test("self-closing tag", () => {
        assert.equal(transform(`<m-header title="Hello" />`), `{{#header title="Hello" /}}`);
    });

    test("block tag", () => {
        assert.equal(transform(`<m-card title="Hi">content</m-card>`), `{{#card title="Hi"}}content{{/card}}`);
    });

    test("bare positional attribute (e.g. a condition)", () => {
        assert.equal(transform(`<m-if isAdmin>Admin!</m-if>`), `{{#if isAdmin}}Admin!{{/if}}`);
    });

    test("self-closing with a key={expr} keyword arg", () => {
        assert.equal(transform(`<m-each users skip={1} />`), `{{#each users skip=1 /}}`);
    });

    test("no attributes at all", () => {
        assert.equal(transform(`<m-slot />`), `{{#slot /}}`);
    });

    test("nesting resolves innermost-first, regardless of what each tag maps to", () => {
        assert.equal(
            transform(`<m-card title="Outer"><m-if show><m-each users>{{this}} </m-each></m-if></m-card>`),
            `{{#card title="Outer"}}{{#if show}}{{#each users}}{{this}} {{/each}}{{/if}}{{/card}}`,
        );
    });

    test("spread attribute", () => {
        assert.equal(transform(`<m-user {...person} />`), `{{#user ...person /}}`);
    });
});

describe("regular HTML is left untouched", () => {
    test("tags not prefixed with m- are not transformed", () => {
        assert.equal(
            transform(`<div class="wrapper"><span>{{title}}</span></div>`),
            `<div class="wrapper"><span>{{title}}</span></div>`,
        );
    });

    test("tags with a prefix but no following hyphen are not matched (e.g. <main>, <mark>)", () => {
        assert.equal(transform(`<main><mark>hi</mark></main>`), `<main><mark>hi</mark></main>`);
    });
});

describe("attributes", () => {
    test("quoted values are always plain strings — never auto-typed", () => {
        assert.equal(parseAttributes(`n="5" flag="true" zip="007"`), `n="5" flag="true" zip="007"`);
    });

    test("key={expr} passes a variable, string, number or boolean through as-is", () => {
        assert.equal(parseAttributes(`n={pageSize}`), `n=pageSize`);
        assert.equal(parseAttributes(`s={"hello"}`), `s="hello"`);
        assert.equal(parseAttributes(`num={5}`), `num=5`);
        assert.equal(parseAttributes(`flag={true}`), `flag=true`);
    });

    test('quoted key="{expr}" escape hatch behaves like key={expr}', () => {
        assert.equal(parseAttributes(`n="{pageSize}"`), `n=pageSize`);
        assert.equal(parseAttributes(`flag="{true}"`), `flag=true`);
    });

    test("bare positional attribute, dotted paths allowed", () => {
        assert.equal(parseAttributes(`isAdmin user.name`), `isAdmin user.name`);
    });

    test("spread attribute (via parseAttributes directly)", () => {
        assert.equal(parseAttributes(`{...person}`), `...person`);
    });
});
