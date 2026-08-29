import { test, describe } from "node:test";
import assert from "node:assert";
import mikel from "../../index.js";
import xmlPlugin from "./index.js";

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
    mk.use(xmlTagsPlugin);
    return mk;
};

describe("partials (m-)", () => {
    test("self-closing partial with a literal attribute", () => {
        const mk = createInstance();
        assert.equal(mk(`<m-header title="Hello" />`, {}), `<h1>Hello</h1>`);
    });

    test("self-closing partial with a variable attribute", () => {
        const mk = createInstance();
        assert.equal(mk(`<m-header title="{{title}}" />`, { title: "World" }), `<h1>World</h1>`);
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

    test("block helper: each, mixing positional and keyword args", () => {
        const mk = createInstance();
        assert.equal(
            mk(`<x-each users skip="{{1}}" limit="{{2}}">{{this}}, </x-each>`, {
                users: ["John", "Alice", "Bob", "Carl"],
            }),
            `Alice, Bob, `,
        );
    });

    test("unquoted key=value keyword argument", () => {
        const mk = createInstance();
        assert.equal(
            mk(`<x-each users limit=limit>{{this}} </x-each>`, { users: ["a", "b", "c", "d"], limit: 2 }),
            `a b `,
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
            mk(`<x-if show><m-header title="{{title}}" /></x-if>`, { show: true, title: "Nested!" }),
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

describe("attribute type detection", () => {
    test("quoted canonical numbers are unwrapped as numbers", () => {
        const mk = createInstance();
        assert.equal(
            mk(`<x-each users limit="2">{{this}} </x-each>`, { users: ["a", "b", "c"] }),
            `a b `,
        );
    });

    test("quoted true/false are unwrapped as booleans (as a keyword arg, checked via a custom helper)", () => {
        const mk = mikel.create({ helpers: { isTrue: ({ options }) => options.flag === true ? "yes" : "no" } });
        mk.use(xmlTagsPlugin);
        assert.equal(mk(`<x-isTrue flag="true" />`, {}), `yes`);
        assert.equal(mk(`<x-isTrue flag="false" />`, {}), `no`);
    });

    test("non-canonical numeric strings (leading zeros) are kept as strings", () => {
        const mk = createInstance();
        // "007" as a number would be 7 and lose the leading zeros: it must stay a string
        assert.equal(mk(`<m-user name="007" email="e" />`, {}), `007 <e>`);
    });

    test("plain string literals are unaffected", () => {
        const mk = createInstance();
        assert.equal(mk(`<m-header title="Hello" />`, {}), `<h1>Hello</h1>`);
    });
});
