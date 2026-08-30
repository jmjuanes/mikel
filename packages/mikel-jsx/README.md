# mikel-jsx

> **⚠️ Experimental.** This package is a work in progress — the tag syntax, attribute rules, and public API can change at any time without notice. Not recommended for production use yet.

A plugin for [mikel](https://github.com/jmjuanes/mikel) that adds a JSX-style tag syntax for calling **partials**, **helpers** and **functions** from HTML-ish templates, as an alternative to the usual mustache syntax (`{{> }}`, `{{# }}`, `{{= }}`).

```html
<!-- before -->
{{>header title="Hello"}}
{{#if isAdmin}}Admin!{{/if}}
{{=fullName user.first user.last}}

<!-- now, also available -->
<m-header title="Hello" />
<x-if isAdmin>Admin!</x-if>
<f-fullName user.first user.last />
```

## Installation

```bash
## install using NPM
$ npm install mikel-jsx mikel

## install using YARN
$ yarn add mikel-jsx mikel
```

```js
import mikel from "mikel";
import jsxPlugin from "mikel-jsx";

const mk = mikel.create({
    partials: { /* ... */ },
    helpers: { /* ... */ },
    functions: { /* ... */ },
});

mk.use(jsxPlugin);
```

## Tag syntax

The tag's prefix determines what it calls. Only tags whose name starts exactly with `m-`, `x-` or `f-` are recognized; any other tag (`<div>`, `<span>`, your own custom elements) is left completely untouched.

| Prefix | Calls...  | Supported forms          | Mustache equivalent                     |
|--------|-----------|----------------------------|-------------------------------------------|
| `m-`   | partial   | self-closing and block     | `{{>name}}` / `{{>>name}}...{{/name}}`     |
| `x-`   | helper    | self-closing and block     | `{{#name /}}` / `{{#name}}...{{/name}}`    |
| `f-`   | function  | self-closing only          | `{{=name}}`                                |

Functions only exist in self-closing form because they don't receive a block (`fn`) to render.

### Partials

```html
<m-header title="Hello" />

<m-card title="Hello">
    This content is available inside the partial as {{@content}}
</m-card>
```

### Helpers

```html
<x-if isAdmin>You're an admin</x-if>

<x-each users limit="3">
    {{this.name}}
</x-each>

<x-each users />  <!-- self-closing: useful for helpers that don't need a block -->
```

### Functions

```html
<f-fullName user.first user.last />
```

## Attributes

Each attribute is translated into a mikel argument (positional or keyword). There are just two things a value can be, and they mean the same thing whether the attribute is positional or keyword:

- **quoted (`"..."`)** → always a plain string literal.
- **braced (`{...}`)** → a raw mikel value: a variable path, a number, a boolean, a subexpression, or a spread. Whatever you put inside the braces is handed straight to mikel's own parser.

| Written as   | Translates to... | Resulting type                                          |
|--------------|-------------------|----------------------------------------------------------|
| `name`       | `name`            | positional, variable/path (dots allowed: `user.name`)     |
| `key="text"` | `key="text"`      | keyword, string literal, always                            |
| `key={expr}` | `key=expr`        | keyword, raw value (variable, string, number, boolean, subexpression...) |
| `{expr}`     | `expr`            | positional, raw value (for anything that isn't a plain identifier, e.g. `{(eq a b)}`) |
| `{...expr}`  | `...expr`         | spread                                                     |

Examples:

```html
<x-each users limit="3">...</x-each>
<!-- {{#each users limit="3"}}...{{/each}} -->
<!-- careful: this passes the STRING "3", not the number 3 -->

<x-each users limit={3} skip={pageOffset}>...</x-each>
<!-- {{#each users limit=3 skip=pageOffset}}...{{/each}} -->

<m-user {...person} />
<!-- {{>user ...person}} -->
```

## Nesting

Tags can be nested arbitrarily deep — the transform always resolves the innermost pair first:

```html
<m-card title="Outer">
    <x-if isAdmin>
        <x-each users>{{this.name}} </x-each>
    </x-if>
</m-card>
```

## Known limitations

- An unescaped `>` inside a literal attribute breaks tag recognition (no HTML-specific escaping is performed).
- Quotes must be straight (`"`), not curly/typographic (`“` `”`) — check that your editor isn't auto-correcting them.
- Only double quotes (`"`) are recognized for attribute values, by design — single quotes (`'...'`) are intentionally not supported.
- Literal content inside an example `<pre>`/`<code>` block would be transformed just like any other content — there's no escape hatch.
- The `m-`, `x-`, `f-` prefixes are effectively reserved: if you already use real custom elements with those same prefixes, they will collide.

## License

Licensed under the [MIT License](../../LICENSE).
