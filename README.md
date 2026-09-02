# Mikel

![npm version](https://badgen.net/npm/v/mikel?labelColor=1d2734&color=21bf81)
![license](https://badgen.net/github/license/jmjuanes/mikel?labelColor=1d2734&color=21bf81)

Mikel is a lightweight templating library based on the [Mustache](https://mustache.github.io) syntax and designed to be concise and easy to use. It provides a simple way to render templates using data objects, supporting variables, helpers, and partials — all unified under a single `#` syntax. With a focus on simplicity and minimalism, Mikel offers a tiny yet powerful solution for generating dynamic content in JavaScript applications.

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

```javascript
const result = m(`Hello {{name}}!`, { name: "World" });
// Output: 'Hello World!'
```

#### Nested values

You can access nested properties of an object using dot notation.

```javascript
const result = m(`Hello {{user.name}}!`, {
    user: { name: "John" },
});
// Output: 'Hello John!'
```

#### Array values

You can access a specific element of an array using its index in dot notation.

```javascript
const result = m(`Hello {{users.0.name}}!`, {
    users: [
        { name: "John" },
        { name: "Alice" },
    ],
});
// Output: 'Hello John!'
```

#### Fallback values

> Added in `v0.14.0`.

You can specify a fallback value using the `||` operator. This value will be used when the variable is not defined or is empty.

```javascript
const result = m(`Hello {{name || "World"}}!`, {});
// Output: 'Hello World!'
```

### Comments

> This feature was added in `v0.27.0`.

Any content between `{{!--` and `--}}` will be completely ignored during template rendering. Comments can span multiple lines and are not included in the output or parsed AST.

```
{{!-- This is a comment --}}
```

> **Note**: Nested comments are not supported. The first closing `--}}` encountered will terminate the comment block.

### Helpers

> Added in `v0.4.0`.

Helpers are blocks that execute special functions within your template. They use the `#` prefix to open a block and `/` prefix to close it:

```
{{#helperName args}}...block content...{{/helperName}}
```

Mikel currently supports the following built-in helpers:

#### each

The `each` helper iterates over an array or object and renders the block for each item.

Syntax: `{{#each arrayName}} ... {{/each}}`.

Example:

```javascript
const data = {
    users: ["John", "Alice", "Bob"],
};

console.log(m("{{#each users}}{{this}}, {{/each}}", data)); // --> 'John, Alice, Bob, '
```

When looping through arrays, you can use the variable `@index` to access the current index:

```javascript
console.log(m("{{#each users}}{{@index}}: {{this}}, {{/each}}", data)); // --> '0: John, 1: Alice, 2: Bob, '
```

The `each` helper can also iterate over objects:

```javascript
const data = {
    values: {
        foo: "bar",
    },
};

console.log(m("{{#each values}}{{this}}{{/each}}", data)); // --> 'bar'
```

When looping through objects, you can use `@key` to access the current key and `@value` to access the corresponding value:

```javascript
const data = {
    values: {
        foo: "0",
        bar: "1",
    },
};

console.log(m("{{#each values}}{{@key}}: {{@value}}, {{/each}}", data)); // --> 'foo: 0, bar: 1, '
```

The `each` helper also supports the following keyword arguments:
- `skip`: number of first items to skip (default is `0`).
- `limit`: limits the number of items to display (default is the length of the items list).
- `items`: the array or object to iterate (alternative to positional argument).

Example:

```javascript
console.log(m("{{#each items=users limit=2}}{{this}}, {{/each}}", { users: ["John", "Alice", "Bob"] })); // --> 'John, Alice, '
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

The condition can also be provided as a keyword argument:

```javascript
console.log(m("{{#if condition=isAdmin}}Hello admin{{/if}}", { isAdmin: true })); // --> 'Hello admin'
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

The condition can also be provided as a keyword argument:

```javascript
console.log(m("{{#unless condition=isAdmin}}Hello guest{{/unless}}", { isAdmin: false })); // --> 'Hello guest'
```

#### eq

> Added in `v0.9.0`.

The `eq` helper renders the blocks only if the two values provided as argument are equal. Example:

```javascript
console.log(m(`{{#eq name "bob"}}Hello bob{{/eq}}`, {name: "bob"})); // --> 'Hello bob'
```

Both values can also be provided as keyword arguments `left` and `right`:

```javascript
console.log(m(`{{#eq left=name right="bob"}}Hello bob{{/eq}}`, {name: "bob"})); // --> 'Hello bob'
```

#### ne

> Added in `v0.9.0`.

The `ne` helper renders the block only if the two values provided as argument are not equal. Example:

```javascript
console.log(m(`{{#ne name "bob"}}Not bob{{/ne}}`, {name: "John"})); // --> 'Not bob'
```

Both values can also be provided as keyword arguments `left` and `right`:

```javascript
console.log(m(`{{#ne left=name right="bob"}}Not bob{{/ne}}`, {name: "John"})); // --> 'Not bob'
```

#### with

> Added in `v0.10.0`.

The `with` helper allows to change the data context of the block.

```javascript
const data = {
    author: {
        name: "Bob",
        email: "bob@email.com",
    },
};

console.log(m("{{#with author}}{{name}} <{{email}}>{{/with}}", data)); // --> 'Bob <bob@email.com>'
```

The value can also be provided as a keyword argument `context`:

```javascript
console.log(m("{{#with context=author}}{{name}} <{{email}}>{{/with}}", {
    author: { name: "Bob", email: "bob@email.com" },
})); // --> 'Bob <bob@email.com>'
```

#### escape

> Added in `v0.17.0`

The `escape` helper escapes the block content as HTML entities.

```javascript
console.log(m("{{#escape}}<b>Hello World!</b>{{/escape}}")); // --> '&lt;b&gt;Hello World!&lt;/b&gt;'
```

#### raw

> Added in `v0.23.0`

The `raw` helper renders the block content without evaluating any variables or helpers inside it.

```javascript
console.log(m("{{#raw}}Hello {{name}}!{{/raw}}", {name: "Bob"})); // --> 'Hello {{name}}!'
```

#### slot

> Added in `v0.33.0`

The `slot` helper captures a block of template content and stores it under a named key, accessible via the `@slot` state variable.

```javascript
const template = `
{{#slot "name"}}Bob{{/slot}}

Hello {{@slot.name}}!
`;

console.log(m(template, {})); // --> 'Hello Bob!'
```

Slots are evaluated at render time, so they can contain variables, helpers, or any other template expressions. If the same slot name is defined more than once, **the last definition wins**.

### Custom Helpers

> Added in `v0.5.0`.
> Breaking change introduced in `v0.12.0`.

Custom helpers should be provided as an object in the `options.helpers` field, where each key represents the name of the helper and the value is a function defining the helper's behavior.

Example:

```javascript
const template = "{{#greeting name}}{{/greeting}}";
const data = {
    name: "World!",
};
const options = {
    helpers: {
        greeting: params => {
            return `Hello, ${params.args[0]}!`;
        },
    },
};

const result = m(template, data, options);
console.log(result); // Output: "Hello, World!"
```

Custom helper functions receive a single `params` object as argument, containing the following fields:

- `args`: an array containing the positional arguments the helper is called with.
- `options`: an object containing the keyword arguments provided to the helper.
- `context`: an object with the following fields:
    - `context.data`: the current data where the helper has been executed.
    - `context.state`: an object containing the state variables available in the current context (e.g., `@root`, `@index`, etc.).
    - `context.directives`: all registered helpers and partials.
    - `context.tokens`: the raw tokens of the helper block content.
- `fn`: a function that executes the template block and returns a string with the evaluated content in the provided context.

The helper function must return a string. Example:

```javascript
const data = {
    items: [
        { name: "John" },
        { name: "Alice" },
        { name: "Bob" },
    ],
};
const options = {
    helpers: {
        customEach: ({args, fn}) => {
            return args[0].map((item, index) => fn({ ...item, index: index})).join("");
        },
    },
};

const result = m("{{#customEach items}}{{index}}: {{name}}, {{/customEach}}", data, options);
console.log(result); // --> "0: John, 1: Alice, 2: Bob,"
```

#### Self-closing helpers

> Added in `v0.39.0`.

Helpers that don't need to render a block of content can be self-closed by adding a forward slash `/` right before the closing `}}`. This removes the need to write a matching closing tag.

```javascript
const options = {
    helpers: {
        toUpperCase: params => params.args[0].toUpperCase(),
    },
};

console.log(m("Hello {{#toUpperCase 'Bob' /}}", {}, options)); // --> 'Hello BOB'
```

A self-closing helper is equivalent to an empty block, so `{{#name args /}}` behaves the same as `{{#name args}}{{/name}}`.

#### Expand helper arguments using the spread operator

> Added in `v0.20.0`

You can use the spread operator `...` to expand the arguments of a helper. This allows you to pass an array of values as individual positional arguments, or an object as keyword arguments.

Example:

```javascript
const data = {
    items: ["John", "Alice", "Bob"],
    options: {
        separator: ", ",
    },
};
const options = {
    helpers: {
        join: params => {
            return params.args.join(params.options.separator);
        }
    },
};

const result = m("{{#join ...items ...options}}{{/join}}", data, options);
console.log(result); // --> "John, Alice, Bob"
```

#### Accessing to helper metadata using the `@helper` variable

> Introduced in `v0.28.0`.
> Breaking change introduced in `v0.40.0`.

Inside any helper block, you can access metadata about the current invocation through the `@helper` variable. It exposes the following fields:

- `@helper.name`: the name of the helper being invoked.
- `@helper.args`: an array of positional arguments passed to the helper.
- `@helper.options`: an object containing named (key-value) arguments.

### Partials

> Added in `v0.3.0`

Partials allow you to include and reuse separate template fragments within your main template. They use the same `#` syntax as helpers and are registered by name.

A partial without a block is typically invoked as self-closing:

```javascript
const options = {
    partials: {
        hello: "Hello {{name}}!",
    },
};

const result = m("{{#hello /}}", { name: "Bob" }, options);
// Output: 'Hello Bob!'
```

#### Custom context in partials

> Added in `v0.3.1`

You can provide a different data context for the partial using a positional argument:

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

const result = m("User: {{#user currentUser /}}", data, {partials});
// Output: 'User: John Doe <john@example.com>'
```

#### Keyword arguments in partials

> Added in `v0.13.0`

You can provide keyword arguments to generate a new context object for the partial:

```javascript
const data = {
    name: "John Doe",
    email: "john@example.com",
};
const partials = {
    user: "{{userName}} <{{userEmail}}>",
};

const result = m("User: {{#user userName=name userEmail=email /}}", data, {partials});
// Output: 'User: John Doe <john@example.com>'
```

#### Expand partial arguments using the spread operator

> Added in `v0.20.0`

You can use the spread operator `...` to expand an object as keyword arguments to a partial:

```javascript
const data = {
    user: {
        name: "John Doe",
        email: "john@example.com",
    },
};
const partials = {
    user: "{{name}} <{{email}}>",
};

const result = m("User: {{#user ...user /}}", data, {partials});
console.log(result); // --> 'User: John Doe <john@example.com>'
```

#### Partial blocks

> Added in `v0.16.0`

You can pass a block to a partial. The block content will be available via the `@content` state variable inside the partial:

```javascript
const options = {
    partials: {
        foo: "Hello {{@content}}!",
    },
};

const result = m("{{#foo}}Bob{{/foo}}", {}, options);
// Output: 'Hello Bob!'
```

#### Partials data

> Added in `v0.18.0`.

Partials allows you to define custom data. Instead of providing a string with the partial content, you can provide an object with the following keys:

- `body`: a string with the partial content.
- `data`: an object with your custom data for the partial. You can also use `attributes` as an alias.

Custom data will be available in the partial content in the `@partial.attributes` variable.

Example:

```javascript
const options = {
    partials: {
        foo: {
            body: "Hello {{@partial.attributes.name}}!",
            data: {
                name: "Bob",
            },
        },
    },
};

const result = m("{{#foo /}}", {}, options);
// Output: 'Hello Bob!'
```

#### Accessing to partial metadata using the `@partial` variable

> Added in `v0.28.0`.
> Breaking change introduced in `v0.40.0`.

Partial metadata can be accessed using the `@partial` variable inside the partial. It contains the following fields:

- `@partial.args`: an array containing the positional arguments provided to the partial (if any).
- `@partial.options`: an object containing the keyword arguments provided to the partial (if any).
- `@partial.attributes`: the custom data provided to the partial (if any).

### State Variables

> Added in `v0.4.0`.

State Variables in Mikel provide convenient access to special values within your templates. These variables, denoted by the `@` symbol, are usually generated by helpers like `#each`.

#### @root

The `@root` variable grants access to the root data context provided to the template.

```javascript
const data = {
    name: "World",
};

console.log(m("Hello, {{@root.name}}!", data)); // -> 'Hello, World!'
```

#### @index

The `@index` variable provides the current index of the item when iterating over an array using the `#each` helper.

#### @key

The `@key` variable provides the current key of the object entry when looping through an object using the `#each` helper.

#### @value

The `@value` variable provides the current value of the object entry when iterating over an object using the `#each` helper.

#### @first

> Added in `v0.7.0`.

The `@first` variable is `true` when the current iteration using the `#each` helper is the first item.

```
{{#each items}}{{.}}: {{#if @first}}first item!{{/if}}{{#unless @first}}not first{{/unless}} {{/each}}
```

#### @last

> Added in `v0.7.0`.

The `@last` variable is `true` when the current iteration using the `#each` helper is the last item.

```
{{#each items}}{{@index}}:{{.}} {{#unless @last}},{{/unless}}{{/each}}
```

## API

### `mikel(template, data[, options])`

Render the given template string with the provided data object and options.

- `template` (string): the template string.
- `data` (object): the data object containing the values to render.
- `options` (object): an object containing the following optional values:
    - `partials` (object): an object containing the available partials.
    - `helpers` (object): an object containing custom helpers.

Returns: A string with the rendered output.

```javascript
import mikel from "mikel";

const data = {
    name: "World",
};

const result = mikel("Hello, {{name}}!", data);
console.log(result); // Output: "Hello, World!"
```

### `mikel.create(options)`

Allows to create an isolated instance of mikel, useful when you want to use the same options for multiple templates. You can pass an `options` object with the same structure as the one used in the `mikel` function, which will be used for all templates compiled with this instance.

It returns a function that you can call with the template and data to compile the template.

```javascript
import mikel from "mikel";

const mk = mikel.create({
    partials: {
        hello: "Hello, {{name}}!",
    },
});

console.log(mk("{{#hello /}}", { name: "Bob" })); // --> "Hello, Bob!"
console.log(mk("{{#hello /}}", { name: "Susan" })); // --> "Hello, Susan!"
```

It also exposes the following additional methods:

#### `mk.use(options)`

> Added in `v0.19.0`.
> Breaking change introduced in `v0.40.0`.

Extends the instance with additional helpers, partials, or initial state.

```javascript
mk.use({
    helpers: {
        uppercase: ({ fn, context }) => fn(context.data).toUpperCase(),
    },
    partials: {
        foo: "Hello {{name}}!",
    },
});
```

### `mikel.escape(str)`

This function converts special HTML characters `&`, `<`, `>`, `"`, and `'` to their corresponding HTML entities.

### `mikel.get(object, path)`

This function returns the value in `object` following the provided `path` string.

## Advanced

### Built‑in Plugins

> Added in `v0.35.0`.

Mikel includes a small set of built‑in plugins that provide common functionality without requiring additional packages.

#### `mikel.SetStatePlugin(name, value)`

Registers a static state variable that becomes available inside templates through the `@variable` syntax.

```javascript
mk.use(mikel.SetStatePlugin("version", "1.0.0"));
```

## License

This project is licensed under the [MIT License](LICENSE).
