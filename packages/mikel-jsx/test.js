import { test, describe } from "node:test";
import assert from "node:assert";
import mikel from "../../index.js";
import jsxPlugin from "./index.js";

// @description builds a fresh mikel instance with the plugin installed and
// a small set of partials/helpers/functions used across the tests below
const createInstance = () => {
    const mk = mikel.create({
        partials: {
            header: `<h1>{{title}}</h1>`,
            card: `<div class="card"><h2>{{title}}</h2>{{@content}}</div>`,
            user: `{{name}} <{{email}}>`,
        },
        functions: {
            fullName: ({ args }) => `${args[0]} ${args[1]}`,
        },
    });
    mk.use(jsxPlugin);
    return mk;
};

describe("partials (m-)", () => {
    test("self-closing partial with a literal attribute", () => {
        const mk = createInstance();
        assert.equal(mk(`<m-header title="Hello" />`, {}), `<h1>Hello</h1>`);
    });

    test("self-closing partial with a variable attribute", () => {
        const mk = createInstance();
        assert.equal(mk(`<m-header title={title} />`, { title: "World" }), `<h1>World</h1>`);
    });

    test("block partial exposes its children as @content", () => {
        const mk = createInstance();
        assert.equal(
            mk(`<m-card title="Hi">Some content</m-card>`, {}),
            `<div class="card"><h2>Hi</h2>Some content</div>`,
        );
    });

    test("spread attribute", () => {
        const mk = createInstance();
        assert.equal(
            mk(`<m-user {...person} />`, { person: { name: "Bob", email: "bob@test.com" } }),
            `Bob <bob@test.com>`,
        );
    });
});

describe("helpers (x-)", () => {
    test("self-closing helper with a bare (positional) attribute", () => {
        const mk = createInstance();
        assert.equal(
            mk(`<x-each users />{{#each users}}{{this}},{{/each}}`, { users: ["a", "b"] }),
            `a,b,`,
        );
    });

    test("block helper: if, truthy and falsy", () => {
        const mk = createInstance();
        assert.equal(mk(`<x-if isAdmin>Admin!</x-if>`, { isAdmin: true }), `Admin!`);
        assert.equal(mk(`<x-if isAdmin>Admin!</x-if>`, { isAdmin: false }), ``);
    });

    test("block helper: each, mixing positional and {expr} keyword args", () => {
        const mk = createInstance();
        assert.equal(
            mk(`<x-each users skip={1} limit={2}>{{this}}, </x-each>`, {
                users: ["John", "Alice", "Bob", "Carl"],
            }),
            `Alice, Bob, `,
        );
    });

    test("quoted {expr} escape hatch behaves exactly like the unquoted form", () => {
        const mk = createInstance();
        assert.equal(
            mk(`<x-each users skip="{1}" limit="{2}">{{this}}, </x-each>`, {
                users: ["John", "Alice", "Bob", "Carl"],
            }),
            `Alice, Bob, `,
        );
    });
});

describe("functions (f-)", () => {
    test("self-closing function with dotted positional paths", () => {
        const mk = createInstance();
        assert.equal(
            mk(`<f-fullName user.first user.last />`, { user: { first: "John", last: "Doe" } }),
            `John Doe`,
        );
    });
});

describe("nesting", () => {
    test("helper wrapping a partial", () => {
        const mk = createInstance();
        assert.equal(
            mk(`<x-if show><m-header title={title} /></x-if>`, { show: true, title: "Nested!" }),
            `<h1>Nested!</h1>`,
        );
    });

    test("partial block containing a helper containing a helper", () => {
        const mk = createInstance();
        assert.equal(
            mk(
                `<m-card title="Outer"><x-if show><x-each users>{{this}} </x-each></x-if></m-card>`,
                { show: true, users: ["x", "y", "z"] },
            ),
            `<div class="card"><h2>Outer</h2>x y z </div>`,
        );
    });
});

describe("regular HTML is left untouched", () => {
    test("tags not prefixed with m-/x-/f- are not transformed", () => {
        const mk = createInstance();
        assert.equal(
            mk(`<div class="wrapper"><span>{{title}}</span></div>`, { title: "Plain HTML" }),
            `<div class="wrapper"><span>Plain HTML</span></div>`,
        );
    });

    test("tags with a prefix but no following hyphen are not matched (e.g. <main>, <mark>)", () => {
        const mk = createInstance();
        assert.equal(mk(`<main><mark>hi</mark></main>`, {}), `<main><mark>hi</mark></main>`);
    });
});

describe("attribute values", () => {
    test("quoted values are always plain strings — never auto-typed", () => {
        const mk = mikel.create({ helpers: { echo: ({ options }) => JSON.stringify(options) } });
        mk.use(jsxPlugin);
        assert.equal(mk(`<x-echo n="5" flag="true" zip="007" />`, {}), `{"n":"5","flag":"true","zip":"007"}`);
    });

    test("key={expr} passes a variable, string, number or boolean through to mikel's own parser", () => {
        const mk = mikel.create({ helpers: { echo: ({ options }) => JSON.stringify(options) } });
        mk.use(jsxPlugin);
        assert.equal(mk(`<x-echo n={pageSize} />`, { pageSize: 3 }), `{"n":3}`);
        assert.equal(mk(`<x-echo s={"hello"} />`, {}), `{"s":"hello"}`);
        assert.equal(mk(`<x-echo num={5} />`, {}), `{"num":5}`);
        assert.equal(mk(`<x-echo flag={true} />`, {}), `{"flag":true}`);
    });

    test('quoted key="{expr}" escape hatch behaves like key={expr} (undocumented, for lint-sensitive HTML)', () => {
        const mk = mikel.create({ helpers: { echo: ({ options }) => JSON.stringify(options) } });
        mk.use(jsxPlugin);
        assert.equal(mk(`<x-echo n="{pageSize}" />`, { pageSize: 7 }), `{"n":7}`);
        assert.equal(mk(`<x-echo flag="{true}" />`, {}), `{"flag":true}`);
    });

    test("the old key=\"{{expr}}\" double-brace form is no longer special-cased: it becomes a literal string, which mikel's own tokenizer then rejects because of the embedded braces (pre-existing mikel limitation, not specific to this plugin)", () => {
        const mk = mikel.create({ helpers: { echo: ({ options }) => JSON.stringify(options) } });
        mk.use(jsxPlugin);
        assert.throws(() => mk(`<x-echo n="{{pageSize}}" />`, { pageSize: 9 }));
    });
});
