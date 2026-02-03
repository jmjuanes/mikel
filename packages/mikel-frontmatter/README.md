# mikel-frontmatter

![npm version](https://badgen.net/npm/v/mikel-frontmatter?labelColor=1d2734&color=21bf81)
![license](https://badgen.net/github/license/jmjuanes/mikel?labelColor=1d2734&color=21bf81)

A [mikel](https://github.com/jmjuanes/mikel) plugin to define new data inside templates using a frontmatter-like syntax. Supports both **YAML** and **JSON** formats.

## Installation

You can install Mikel via npm or yarn:

```bash
## Install using npm
$ npm install mikel mikel-frontmatter

## Install using yarn
$ yarn add mikel mikel-frontmatter
```

## Usage

This plugin provides a `{{#frontmatter}}` helper that allows you to define metadata at the beginning of your templates, similar to frontmatter in Markdown files. The parsed data is stored as a variable accessible via `@frontmatter` (or a custom variable name).

The plugin automatically detects the format:
- **YAML format**: When the content doesn't start with `{`
- **JSON format**: When the content starts with `{` and ends with `}`

### YAML Example

```javascript
import mikel from "mikel";
import mikelFrontmatter from "mikel-frontmatter";

const template = `
{{#frontmatter}}
title: My Page Title
author: John Doe
date: 2026-02-03
tags:
  - javascript
  - templating
settings:
  published: true
  featured: false
{{/frontmatter}}

<h1>{{@frontmatter.title}}</h1>
<p>By {{@frontmatter.author}} on {{@frontmatter.date}}</p>

{{#if @frontmatter.settings.published}}
  <span class="badge">Published</span>
{{/if}}

<ul>
{{#each @frontmatter.tags}}
  <li>{{this}}</li>
{{/each}}
</ul>
`;

const render = mikel.create();
render.use(mikelFrontmatter());

const result = render(template, {});
console.log(result);
```

### JSON Example

```javascript
import mikel from "mikel";
import mikelFrontmatter from "mikel-frontmatter";

const template = `
{{#frontmatter}}
{
  "title": "My Page Title",
  "author": "John Doe",
  "date": "2026-02-03",
  "tags": ["javascript", "templating"],
  "settings": {
    "published": true,
    "featured": false
  }
}
{{/frontmatter}}

<h1>{{@frontmatter.title}}</h1>
<p>By {{@frontmatter.author}} on {{@frontmatter.date}}</p>

{{#if @frontmatter.settings.published}}
  <span class="badge">Published</span>
{{/if}}

<ul>
{{#each @frontmatter.tags}}
  <li>{{this}}</li>
{{/each}}
</ul>
`;

const render = mikel.create();
render.use(mikelFrontmatter());

const result = render(template, {});
console.log(result);
```

## Features

### Format Auto-Detection

The plugin automatically detects whether your frontmatter is in YAML or JSON format:

```javascript
// YAML format (default)
{{#frontmatter}}
title: My Title
author: John Doe
{{/frontmatter}}

// JSON format (automatically detected)
{{#frontmatter}}
{
  "title": "My Title",
  "author": "John Doe"
}
{{/frontmatter}}
```

### Basic Key-Value Pairs

```javascript
const template = `
{{#frontmatter}}
title: Hello World
author: Jane Smith
version: 1.0.0
{{/frontmatter}}

Title: {{@frontmatter.title}}
`;
```

### Data Types

The plugin supports common data types in both YAML and JSON:

**YAML:**
- **Strings**: `name: John Doe` or `name: "John Doe"` or `name: 'John Doe'`
- **Numbers**: `age: 25` or `price: 19.99`
- **Booleans**: `published: true` or `active: false` (also `yes/no`, `on/off`)
- **Null**: `value: null` or `value: ~` or `value:`

**JSON:**
- **Strings**: `"name": "John Doe"`
- **Numbers**: `"age": 25` or `"price": 19.99`
- **Booleans**: `"published": true` or `"active": false`
- **Null**: `"value": null`

### Nested Objects

Both YAML and JSON support nested objects:

**YAML:**
```javascript
const template = `
{{#frontmatter}}
author:
  name: John Doe
  email: john@example.com
  social:
    twitter: @johndoe
    github: johndoe
{{/frontmatter}}

Author: {{@frontmatter.author.name}} ({{@frontmatter.author.email}})
Twitter: {{@frontmatter.author.social.twitter}}
`;
```

**JSON:**
```javascript
const template = `
{{#frontmatter}}
{
  "author": {
    "name": "John Doe",
    "email": "john@example.com",
    "social": {
      "twitter": "@johndoe",
      "github": "johndoe"
    }
  }
}
{{/frontmatter}}

Author: {{@frontmatter.author.name}} ({{@frontmatter.author.email}})
Twitter: {{@frontmatter.author.social.twitter}}
`;
```

### Arrays

Both formats support arrays:

**YAML:**
```javascript
const template = `
{{#frontmatter}}
tags:
  - javascript
  - nodejs
  - template
colors:
  - red
  - green
  - blue
{{/frontmatter}}

Tags: {{#each @frontmatter.tags}}{{this}}{{#unless @last}}, {{/unless}}{{/each}}
`;
```

**JSON:**
```javascript
const template = `
{{#frontmatter}}
{
  "tags": ["javascript", "nodejs", "template"],
  "colors": ["red", "green", "blue"]
}
{{/frontmatter}}

Tags: {{#each @frontmatter.tags}}{{this}}{{#unless @last}}, {{/unless}}{{/each}}
`;
```

### Arrays of Objects

**YAML:**
```javascript
const template = `
{{#frontmatter}}
contributors:
  - name: Alice
    role: Developer
  - name: Bob
    role: Designer
  - name: Carol
    role: Manager
{{/frontmatter}}

{{#each @frontmatter.contributors}}
  <div>{{name}} - {{role}}</div>
{{/each}}
`;
```

**JSON:**
```javascript
const template = `
{{#frontmatter}}
{
  "contributors": [
    { "name": "Alice", "role": "Developer" },
    { "name": "Bob", "role": "Designer" },
    { "name": "Carol", "role": "Manager" }
  ]
}
{{/frontmatter}}

{{#each @frontmatter.contributors}}
  <div>{{name}} - {{role}}</div>
{{/each}}
`;
```

### Custom Variable Name

Use the `as` option to store the frontmatter data in a custom variable:

```javascript
const template = `
{{#frontmatter as="meta"}}
title: My Page
description: A great page
{{/frontmatter}}

<title>{{@meta.title}}</title>
<meta name="description" content="{{@meta.description}}">
`;
```

### Multiple Frontmatter Blocks

You can have multiple `{{#frontmatter}}` blocks in a template. Later blocks will overwrite earlier ones:

```javascript
const template = `
{{#frontmatter}}
title: Original Title
author: John
{{/frontmatter}}

{{#frontmatter}}
title: Updated Title
status: draft
{{/frontmatter}}

Title: {{@frontmatter.title}}
Author: {{@frontmatter.author}}
Status: {{@frontmatter.status}}
`;

// Output:
// Title: Updated Title
// Author: (empty, overwritten)
// Status: draft
```

## API

### mikelFrontmatter(options?)

Creates a new instance of the frontmatter plugin.

**Parameters:**
- `options` (optional): Configuration options for the plugin.
  - `parser` (Function): Custom parser function to override the default YAML/JSON parser.

**Returns:** A plugin object with a `frontmatter` helper.

### Helper: `{{#frontmatter}}...{{/frontmatter}}`

Parses the content inside the block as YAML or JSON (auto-detected) and stores it as a variable.

**Options:**
- `as`: Custom variable name (default: `"frontmatter"`). Example: `{{#frontmatter as="meta"}}`

**Output:** This helper doesn't produce any output in the rendered template.

### Custom Parser

You can provide a custom parser function if you need special parsing logic:

```javascript
const customParser = (content) => {
    // Your custom parsing logic
    return parsedData;
};

const render = mikel.create();
render.use(mikelFrontmatter({ parser: customParser }));
```

## YAML Syntax Support

This plugin includes a basic YAML parser that supports:

- ✅ Key-value pairs
- ✅ Nested objects (with indentation)
- ✅ Arrays (using `- item` syntax)
- ✅ Arrays of objects
- ✅ Strings, numbers, booleans, null
- ✅ Quoted strings (`"..."` or `'...'`)
- ✅ Comments (lines starting with `#`)
- ✅ Boolean variants (`yes/no`, `on/off`, `true/false`)
- ❌ Multi-line strings (with `|` or `>`)
- ❌ Anchors and aliases (`&anchor`, `*alias`)
- ❌ Complex YAML features

For most common use cases, this subset is sufficient.

## JSON Support

The plugin fully supports standard JSON syntax through the native `JSON.parse()` method. If the frontmatter content starts with `{` and ends with `}`, it will be automatically parsed as JSON.

## License

Licensed under the [MIT License](../../LICENSE).
