# Mikel

![npm version](https://badgen.net/npm/v/mikel?labelColor=1d2734&color=21bf81)
![license](https://badgen.net/github/license/jmjuanes/mikel?labelColor=1d2734&color=21bf81)

Mikel is a lightweight templating library based on the [Mustache](https://mustache.github.io) syntax, designed to be concise and easy to use. It provides a simple way to render templates using data objects, supporting features such as variables, partials, conditional sections, and looping. With a focus on simplicity and minimalism, Mikel offers a tiny yet powerful solution for generating dynamic content in JavaScript applications.

## Installation

You can install Mikel via npm or yarn:

```bash
## Install using npm
$ npm install mikel

## Install using yarn
$ yarn add mikel
```

## Syntax

Mikel supports the following syntax for rendering templates:

### Variables

Use double curly braces `{{ }}` to insert variables into your template. Variables will be replaced with the corresponding values from the data object.

### Sections

Sections allow for conditional rendering of blocks of content based on the presence or absence of a value in the data object. Use the pound symbol `#` to start a section and the caret `^` to denote an inverted section. End the section with a forward slash `/`.

Example:

```javascript
const data = {
    isAdmin: true,
};
const result = m("{{#isAdmin}}You are Admin{{/isAdmin}}", data);
// Output: 'You are Admin'
```

You can also use sections for looping over arrays. When looping over array of strings, you can use a dot `.` to reference the current item in the loop.

Example:

```javascript
const data = {
    users: [
        { name: "John" },
        { name: "Alice" },
        { name: "Bob" }
    ],
};

const result = m("Users:{{# users }} {{ name }},{{/ users }}", data);
// Output: 'Users: John, Alice, Bob,'
```

Inverted sections render their block of content if the value is falsy or the key does not exist in the data object.

Example:

```javascript
const data = {
    isAdmin: false,
};
const result = m("{{^isAdmin}}You are not Admin{{/isAdmin}}", data);
// Output: 'You are not Admin'
```

### Partials 

> This feature was added in `v0.3.0`

Partials allow you to include separate templates within your main template. Use the greater than symbol `>` followed by the partial name inside double curly braces `{{> partialName }}`.

Example:

```javascript
const data = {
    name: "Bob",
};

const partials = {
    hello: "Hello {{name}}!",
};

const result = m("{{> hello}}", data, {partials});
// Output: 'Hello Bob!'
```

#### Custom context in partials

> This feature was added in `v0.3.1`.

You can provide a custom context for the partial by specifying a field of the data: `{{> partialName dataField}}`.

```javascript
const data = {
    currentUser: {
        name: "John Doe",
        email: "john@example.com",
    },
};
const partials = {
    user: "{{name}} <{{email}}>",
};

const result = m("User: {{> user currentUser}}", data, {partials});
// Output: 'User: John Doe <john@example.com>'
```

### Built-in helpers

> Added in `v0.4.0`.

Helpers allows you to execute special functions within blocks or sections of your template. Mikel currently supports the following built-in helpers:

#### each

The `each` helper iterates over an array and renders the block for each item in the array.

Syntax: `{{#each arrayName}} ... {{/each}}`.

Example:

```javascript
const data = {
    users: ["John", "Alice", "Bob"],
};

console.log(m("{{#each users}}{{.}}, {{/each}}", data)); // --> 'John, Alice, Bob, '
```

When looping throug arrays, you can use the variable `@index` to access to the current index of the item in the array:

```javascript
const data = {
    users: ["John", "Alice", "Bob"],
};

console.log(m("{{#each users}}{{@index}}: {{.}}, {{/each}}", data)); // --> '0: John, 1: Alice, 2: Bob, '
```

The `each` helper can also iterate over objects:

```javascript
const data = {
    values: {
        foo: "bar",
    },
};

console.log(m("{{#each values}}{{.}}{{/each}}", data)); // --> 'bar'
```

When looping throug objects, you can use the variable `@key` to access to the current key in the object, and the variable `@value` to access to the corresponding value:

```javascript
const data = {
    values: {
        foo: "0",
        bar: "1",
    },
};

console.log(m("{{#each values}}{{@key}}: {{@value}}, {{/each}}", data)); // --> 'foo: 0, bar: 1, '
```

#### if

The `if` helper renders the block only if the condition is truthy.

Syntax: `{{#if condition}} ... {{/if}}`

Example:

```javascript
const data = {
    isAdmin: true,
};

console.log(m("{{#if isAdmin}}Hello admin{{/if}}", data)); // --> 'Hello admin'
```

#### unless

The `unless` helper renders the block only if the condition is falsy.

Syntax: `{{#unless condition}} ... {{/unless}}`

Example:

```javascript
const data = {
    isAdmin: false,
};

console.log(m("{{#unless isAdmin}}Hello guest{{/unless}}", data)); // --> 'Hello guest'
```

### Data variables

> Added in `v0.4.0`.

Data Variables in Mikel provide convenient access to special values within your templates. These variables, denoted by the `@` symbol, allow users to interact with specific data contexts or values.

#### @root

The `@root` variable grants access to the root data context provided to the template. It is always defined and enables users to retrieve values from the top-level data object.

Example:

```javascript
const data = {
    name: "World",
};

console.log(m("Hello, {{@root.name}}!", data)); // -> 'Hello, World!'
```

#### @index

The `@index` variable facilitates access to the current index of the item when iterating over an array using the `#each` helper. It aids in dynamic rendering and indexing within loops.

#### @key

The `@key` variable allows users to retrieve the current key of the object entry when looping through an object using the `#each` helper. It provides access to object keys for dynamic rendering and customization.

#### @value

The `@value` variable allows users to retrieve the current value of the object entry when iterating over an object using the `#each` helper. It simplifies access to object values for dynamic rendering and data manipulation.

### Custom data variables

> Added in `v0.5.0`

Mikel allows users to define custom data variables, providing enhanced flexibility and customization options for templates. These custom data variables can be accessed within the template using the `@` character.

Custom data variables should be provided in the `options.variables` field of the options object when rendering a template. Each custom data variable should be defined as a key-value pair, where the key represents the variable name and the value represents the data associated with that variable.

Example:

```javascript
const result = m("Hello, {{@customVariable}}!", {}, {
    variables: {
        customVariable: "World",
    },
});
console.log(result); // --> 'Hello, World!'
```

In this example, the custom data variable `customVariable` is defined with the value `"World"`, and it can be accessed in the template using `@customVariable`.

## API

### `m(template, data[, options])`

Render the given template string with the provided data object.

- `template` (string): The Mustache template string.
- `data` (object): The data object containing the values to render.
- `options` (object): An object containing the following optional values:
    - `partials` (object): An object containing the available partials.
    - `variables` (object): An object containing custom data variables.

Returns: A string with the rendered output.

```javascript
import m from "mikel";

const data = {
    name: "World",
};

const result = m("Hello, {{name}}!", data);
console.log(result); // Output: "Hello, World!"
```

## License

This project is licensed under the [MIT License](LICENSE).
