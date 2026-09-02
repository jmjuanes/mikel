# mikel-jsx

> **⚠️ Experimental.** This package is a work in progress — the tag syntax, attribute rules, and public API can change at any time without notice. Not recommended for production use yet.

A plugin for [mikel](https://github.com/jmjuanes/mikel) that adds a JSX-style `<m-name>` tag for calling mikel directives (helpers and partials) from HTML-ish templates, as an alternative to the usual mustache syntax (`{{# }}`).

```html
<!-- before -->
{{#header title="Hello" /}}
{{#if isAdmin}}Admin!{{/if}}

<!-- now, also available -->
<m-header title="Hello" />
<m-if isAdmin>Admin!</m-if>
```

## Installation

```bash
# install using NPM
$ npm install mikel-jsx

# install using YARN
$ yarn add mikel-jsx
```

```js
import mikel from "mikel";
import mikelJsx from "mikel-jsx";

const mk = mikel.create({ ... });

mk.use(mikelJsx());
```

## Tag syntax

Only tags whose name starts exactly with `m-` are recognized; any other tag (`<div>`, `<span>`, your own custom elements) is left completely untouched.

```html
<m-header title="Hello" />
<!-- {{#header title="Hello" /}} -->

<m-card title="Hello">
    This content is available inside the partial as {{@content}}
</m-card>
<!-- {{#card title="Hello"}}...{{/card}} -->

<m-if isAdmin>You're an admin</m-if>
<!-- {{#if isAdmin}}...{{/if}} -->

<m-each users limit="3">{{this.name}}</m-each>
<!-- {{#each users limit="3"}}...{{/each}} -->
```

A tag with no attributes and a self-closing slash, `<m-slot />`, becomes `{{#slot /}}` — same rule, nothing special about it.

## Attributes

Each attribute is translated into a mikel argument (positional or keyword). There are just two things a value can be, and they mean the same thing whether the attribute is positional or keyword:

- **quoted (`"..."`)**: always a plain string literal. `"5"` and `"true"` stay strings.
- **braced (`{...}`)**: a raw mikel value: a variable path, a number, a boolean, a subexpression, or a spread. Whatever you put inside the braces is handed straight to mikel's own parser.

| Written as   | Translates to... | Resulting type                                          |
|--------------|-------------------|----------------------------------------------------------|
| `name`       | `name`            | positional, variable/path (dots allowed: `user.name`)     |
| `key="text"` | `key="text"`      | keyword, string literal, always                            |
| `key={expr}` | `key=expr`        | keyword, raw value (variable, string, number, boolean, subexpression...) |
| `{expr}`     | `expr`            | positional, raw value (for anything that isn't a plain identifier, e.g. `{(eq a b)}`) |
| `{...expr}`  | `...expr`         | spread                                                     |

Examples:

```html
<m-each users limit="3">...</m-each>
<!-- {{#each users limit="3"}}...{{/each}} -->
<!-- careful: this passes the STRING "3", not the number 3 -->

<m-each users limit={3} skip={pageOffset}>...</m-each>
<!-- {{#each users limit=3 skip=pageOffset}}...{{/each}} -->

<m-user {...person} />
<!-- {{#user ...person /}} -->
```

## Nesting

Tags can be nested arbitrarily deep — the transform always resolves the innermost pair first:

```html
<m-card title="Outer">
    <m-if isAdmin>
        <m-each users>{{this.name}} </m-each>
    </m-if>
</m-card>
```

## Known limitations

- An unescaped `>` inside a literal attribute breaks tag recognition (no HTML-specific escaping is performed).
- Quotes must be straight (`"`), not curly/typographic (`“` `”`) — check that your editor isn't auto-correcting them.
- Only double quotes (`"`) are recognized for attribute values, by design — single quotes (`'...'`) are intentionally not supported.
- Literal content inside an example `<pre>`/`<code>` block would be transformed just like any other content — there's no escape hatch.
- The `m-` prefix is effectively reserved: if you already use real custom elements with that prefix, they will collide.

## License

Licensed under the [MIT License](../../LICENSE).
