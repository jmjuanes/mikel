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

#### Fallback values

> Added in `v0.14.0`.

You can specify a value as a fallback, using the double OR `||` operator and followed by the fallback value.

```javascript
const result = m(`Hello {{name || "World"}}!`, {});
// Output: 'Hello World!'
```

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

#### Keyword arguments in partials

> This feature was added in `v0.13.0`.

You can provide keyword arguments in partials to generate a new context object using the provided keywords.

```javascript
const data = {
    name: "John Doe",
    email: "john@example.com",
};
const partials = {
    user: "{{userName}} <{{userEmail}}>",
};

const result = m("User: {{>user userName=name userEmail=email }}", data, {partials});
// Output: 'User: John Doe <john@example.com>'
```

Please note that providing keyword arguments and a custom context to a partial is not supported. On this situation, the partial will be evaluated only with the custom context.

#### Partial blocks

> This feature was added in `v0.16.0`.

You can pass a block to a partial using a greather than symbol `>>` followed by the partial name to start the partial block, and a slash followed by the partial name to end the partial block. The provided block content will be available in the `@content` variable.

Example:

```javascript
const options = {
    partials: {
        foo: "Hello {{@content}}!",
    },
};

const result = m("{{>>foo}}Bob{{/foo}}", {}, options);
// Output: 'Hello Bob!'
```

#### Partials data

> This feature was added in `v0.18.0`.

Partials allows you to define custom data. Instead of providing a string with the partial content, you can provide an object with the following keys:

- `body`: a string with the partial content.
- `data`: an object with your custom data for the partial. You can also use `attributes` as an alias.

Custom data will be available in the partial content as a variable `@partial`.

Example:

```javascript
const options = {
    partials: {
        foo: {
            body: "Hello {{@partial.name}}!",
            data: {
                name: "Bob",
            },
        },
    },
};

const result = m("{{> foo}}", {}, options);
// Output: 'Hello Bob!'
```

### Inline partials

> This feature was added in `v0.16.0`.

Inline partials allows you to define partials directly in your template. Use the plus symbol `+` followed by the partial name to start the partial definition, and end the partial definition with a slash `/` followed by the partial name. For example, `{{<foo}}` begins a partial definition called `foo`, and `{{/foo}}` ends it.

Example:

```javascript
const result = m(`{{<foo}}Hello {{name}}!{{/foo}}{{>foo name="Bob"}}`, {});
// Output: 'Hello Bob!'
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

The `each` helper also supports the following options, provided as keyword arguments:
- `skip`: number of first items to skip (default is `0`).
- `limit`: allows to limit the number of items to display (default equals to the length of the items list).

Example:

```javascript
console.log(m("{{each values limit=2}}{{.}}{{/each}}", {values: [0, 1, 2, 3]})); // --> '01'
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

#### eq

> Added in `v0.9.0`.

The `eq` helper renders the blocks only if the two values provided as argument are equal. Example:

```javascript
console.log(m(`{{#eq name "bob"}}Hello bob{{/eq}}`, {name: "bob"})); // --> 'Hello bob'
```

#### ne

> Added in `v0.9.0`.

The `ne` helper renders the block only if the two values provided as argument are not equal. Example:

```javascript
console.log(m(`{{#ne name "bob"}}Not bob{{/ne}}`, {name: "John"})); // --> 'Not bob'
```

#### with

> Added in `v0.10.0`.

The `with` helper allows to change the data context of the block.

```javascript
const data = {
    autor: {
        name: "Bob",
        email: "bob@email.com",
    },
};

console.log(m("{{#with autor}}{{name}} <{{email}}>{{/with}}", data)); // --> 'Bob <bob@email.com>'
```

#### escape

> Added in `v0.17.0`.

The `escape` helper allows to escape the provided block content.

```javascript
console.log(m("{{#escape}}<b>Hello World!</b>{{/escape}}")); // --> '&lt;b&gt;Hello World!&lt;/b&gt;
```

### Custom Helpers

> Added in `v0.5.0`.
> Breaking change introduced in `v0.12.0`.

Custom helpers should be provided as an object in the `options.helpers` field, where each key represents the name of the helper and the corresponding value is a function defining the helper's behavior.

Example:

```javascript
const template = "{{#greeting name}}{{/greeting}}";
const data = {
    name: "World!",
};
const options = {
    helpers: {
        customHelper: params => {
            return `Hello, ${params.args[0]}!`;
        },
    },
};

const result = m(template, data, options);
console.log(result); // Output: "Hello, World!"
```

Custom helper functions receive a single object as argument, containing the following keys:

- `args`: an array containing the variables with the helper is called in the template.
- `opt`: an object containing the keyword arguments provided to the helper.
- `data`: the current data where the helper has been executed.
- `context` (**DEPRECATED**): the current context (data) where the helper has been executed.
- `fn`: a function that executes the template provided in the helper block and returns a string with the evaluated template in the provided context.

The helper function must return a string, which will be injected into the result string. Example:

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

### Runtime Variables

> Added in `v0.4.0`.

Runtime Variables in Mikel provide convenient access to special values within your templates. These variables, denoted by the `@` symbol, allow users to interact with specific data contexts or values at runtime. Runtime variables are usually generated by helpers like `#each`.

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

#### @first

> Added in `v0.7.0`.

The `@first` variable allows to check if the current iteration using the `#each` helper is the first item in the array or object.

```
{{#each items}} {{.}}: {{#if @first}}first item!{{/if}}{{#unless @first}}not first{{/if}} {{/each}}
```

#### @last

> Added in `v0.7.0`.

The `@last` variable allows to check if the current iteration using the `#each` helper is the last item in the array or object.

```
{{#each items}}{{@index}}:{{.}} {{#unless @last}},{{/unless}}{{/each}}
```

### Functions

> Added in `v0.8.0`.
> Breaking change introduced in `v0.12.0`.

Mikel allows users to define custom functions that can be used within templates to perform dynamic operations. Functions can be invoked in the template using the `=` character, followed by the function name and the variables to be provided to the function. Variables should be separated by spaces.

Functions should be provided in the `options.functions` field of the options object when rendering a template. Each function is defined by a name and a corresponding function that performs the desired operation.

Functions will receive a single object as argument, containing the following keys:

- `args`: an array containing the variables with the function is called in the template.
- `opt`: an object containing the keyword arguments provided to the function.
- `context`: the current context (data) where the function has been executed.

Example:

```javascript
const data = {
    user: {
        firstName: "John",
        lastName: "Doe",
    },
};
const options = {
    functions: {
        fullName: ({args}) => {
            return `${args[0]} ${args[1]}`;
        }
    },
};

const result = m("My name is: {{=fullName user.firstName user.lastName}}", data, options);
console.log(result); // --> "My name is: John Doe"
```


## API

### `mikel(template, data[, options])`

Render the given template string with the provided data object and options.

- `template` (string): the template string.
- `data` (object): the data object containing the values to render.
- `options` (object): an object containing the following optional values:
    - `partials` (object): an object containing the available partials.
    - `helpers` (object): an object containing custom helpers.
    - `functions` (object): and object containing custom functions.

Returns: A string with the rendered output.

```javascript
import mikel from "mikel";

const data = {
    name: "World",
};

const result = mikel("Hello, {{name}}!", data);
console.log(result); // Output: "Hello, World!"
```

### `mikel.create(template [, options])`

Allows to create an isolated instance of mikel, useful when you want to compile the same template using different data. The `template` argument is the template string, and the optional `options` argument is the same options object that you can pass to `mikel` method.

It returns a function that you can call with the data to compile the template.

```javascript
import mikel from "mikel";

const template = mikel.create("Hello, {{name}}!");

console.log(template({name: "Bob"})); // --> "Hello, Bob!"
console.log(template({name: "Susan"})); // --> "Hello, Susan!"
```

It also exposes the following additional methods:

#### `template.use(options)`

> Added in `v0.19.0`.

Allows to extend the templating with custom **helpers**, **functions**, and **partials**.

```javascript
template.use({
    partials: {
        foo: "bar",
    },
});
```

#### `template.addHelper(helperName, helperFn)`

Allows to register a new helper instead of using the `options` object.

```javascript
template.addHelper("foo", () => { ... });
```

#### `template.removeHelper(helperName)`

Removes a previously added helper.

```javascript
template.removeHelper("foo");
```

#### `template.addPartial(partialName, partialCode)`

Registers a new partial instead of using the `options` object.

```javascript
template.addPartial("bar", " ... ");
```

#### `template.removePartial(partialName)`

Removes a previously added partial.

```javascript
template.removePartial("bar");
```

#### `template.addFunction(fnName, fn)`

Registers a new function instead of using the `options` object.

```javascript
template.addFunction("foo", () => "...");
```

#### `template.removeFunction(fnName)`

Removes a previously added function.

```javascript
template.removeFunction("foo");
```

### `mikel.escape(str)`

This function converts special HTML characters `&`, `<`, `>`, `"`, and `'` to their corresponding HTML entities.

### `mikel.get(object, path)`

This function returns the value in `object` following the provided `path` string.

## License

This project is licensed under the [MIT License](LICENSE).
