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

Each attribute is translated into a mikel argument (positional or keyword). You can freely mix forms, even within the same tag:

| Written as                  | Translates to...           | Resulting type                             |
|-------------------------------|-------------------------------|-----------------------------------------------|
| `name`                         | `name`                         | positional, variable/path (dots allowed: `user.name`) |
| `key="text"`                   | `key="text"`                   | keyword, string literal                        |
| `key="1"` / `key="true"`       | `key=1` / `key=true`           | keyword, number/boolean (see note below)       |
| `key="{{expr}}"`               | `key=expr`                     | keyword, raw value (variable, number, subexpression...) |
| `key=expr`                     | `key=expr`                     | keyword, raw value, unquoted (mikel's native syntax) |
| `{expr}`                       | `expr`                         | positional, raw value (for anything that isn't an identifier, e.g. `{(eq a b)}`) |
| `{...expr}`                    | `...expr`                      | spread                                         |

Examples:

```html
<x-each users limit="3" skip="1">...</x-each>
<!-- {{#each users limit=3 skip=1}}...{{/each}} -->

<x-each users limit=pageSize>...</x-each>
<!-- {{#each users limit=pageSize}}...{{/each}} -->

<m-user {...person} />
<!-- {{>user ...person}} -->
```

### Number and boolean detection in quoted attributes

To keep the syntax fully XML-compliant (attributes always quoted) without losing typing, a quoted value is automatically converted to a number or boolean when:

- it's exactly `"true"` or `"false"`, or
- it's a "canonical" number: `String(Number(value)) === value`.

That round-trip check avoids the trap of numeric-looking identifiers where the textual form carries meaning — leading zeros, formatted codes, etc. (`"007"`, `"08001"`, phone numbers...) — which are correctly kept as strings, since they don't survive the round trip:

```html
<m-header limit="3" />      <!-- limit=3 (number) -->
<m-header ratio="2.5" />    <!-- ratio=2.5 (number) -->
<x-if isAdmin="true">       <!-- isAdmin=true (boolean) -->
<m-user code="007" />       <!-- code="007" (stays a string) -->
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
- Literal content inside an example `<pre>`/`<code>` block would be transformed just like any other content — there's no escape hatch.
- The `m-`, `x-`, `f-` prefixes are effectively reserved: if you already use real custom elements with those same prefixes, they will collide.

## License

Licensed under the [MIT License](../../LICENSE).
