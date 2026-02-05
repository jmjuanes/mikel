# mikel-frontmatter

![npm version](https://badgen.net/npm/v/mikel-frontmatter?labelColor=1d2734&color=21bf81)
![license](https://badgen.net/github/license/jmjuanes/mikel?labelColor=1d2734&color=21bf81)

A [mikel](https://github.com/jmjuanes/mikel) plugin to define new data inside templates using a frontmatter-like syntax. Supports both **YAML** and **JSON** formats.

## Installation

You can install it via npm or yarn:

```bash
## Install using npm
$ npm install mikel mikel-frontmatter

## Install using yarn
$ yarn add mikel mikel-frontmatter
```

## Usage

Import the `mikel-frontmatter` package:

```javascript
import mikel from "mikel";
import mikelFrontmatter from "mikel-frontmatter";
```

Include the plugin using the `use` method of mikel:

```javascript
const m = mikel.create();

m.use(mikelFrontmatter({ ... }));
```

In your template, the `{{#frontmatter}}` helper allows you to define metadata at the beginning of your templates, similar to frontmatter in Markdown files. The parsed data is stored as a variable accessible via `@frontmatter` (or a custom variable name, see below).

Example:

```html
{{#frontmatter}}
title: My Page Title
author: John Doe
date: 2026-02-03
tags:
  - javascript
  - templating
{{/frontmatter}}
<h1>{{@frontmatter.title}}</h1>
<p>By {{@frontmatter.author}} on {{@frontmatter.date}}</p>
<ul>
    {{#each @frontmatter.tags}}
    <li>{{this}}</li>
    {{/each}}
</ul>
```

Note that this helper doesn't produce any output in the rendered template.

### Customization

The `{{#frontmatter}}` helper accepts the following arguments:

#### as

Custom variable name to save parsed metadata. If not provided, parsed metadata will be saved in `@frontmatter`. Example:

```html
{{#frontmatter as="meta"}}
name: Bob
{{/frontmatter}}
<div>Hello {{@meta.name}}</div>
```

## API

### mikelFrontmatter(options?)

Creates a new instance of the frontmatter plugin. It accepts an `options` parameters containing the following fields:
- `parser` (Function): Custom parser function to override the default YAML/JSON parser.


## Custom Parser

You can provide a custom parser function if you need special parsing logic:

```javascript
const customParser = (content) => {
    // Your custom parsing logic
    return parsedData;
};

const render = mikel.create();
render.use(mikelFrontmatter({
    parser: customParser,
}));
```

## YAML Syntax Support

This plugin includes a basic YAML parser that supports:

- ✅ Key-value pairs.
- ✅ Nested objects (with indentation).
- ✅ Arrays (using `- item` syntax).
- ✅ Arrays of objects.
- ✅ Strings, numbers, booleans, null.
- ✅ Quoted strings (`"..."` or `'...'`).
- ✅ Comments (lines starting with `#`).
- ✅ Boolean variants (`yes/no`, `on/off`, `true/false`).
- ❌ Multi-line strings (with `|` or `>`).
- ❌ Anchors and aliases (`&anchor`, `*alias`).
- ❌ Inline objects.
- ❌ Complex YAML features.

For most common use cases, this subset is sufficient.

## JSON Support

The plugin fully supports standard JSON syntax through the native `JSON.parse()` method.

## License

Licensed under the [MIT License](../../LICENSE).
