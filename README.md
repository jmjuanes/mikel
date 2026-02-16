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

### Comments

> This feature was added in `v0.27.0`.

Any content between `{{!--` and `--}}` will be completely ignored during template rendering. Comments can span multiple lines and are not included in the output or parsed AST.

```
{{!-- This is a comment --}}
```

> **Note**: Nested comments are not supported. The first closing `--}}` encountered will terminate the comment block.

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

You can also use sections for looping over arrays. When looping over array of strings, you can use a dot `.` or the `this` word to reference the current item in the loop.

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

#### Expand partial arguments using the spread operator

> This feature was added in `v0.20.0`.

You can use the spread operator `...` to expand the keyword arguments of a partial. This allows you to pass an object as individual keyword arguments to the partial.

Example:

```javascript
const data = {
    user: {
        name: "John Doe",
        email: "john@example.com",
    },
};
const partials = {
    user: "{{userName}} <{{userEmail}}>",
};

const result = m("User: {{>user ...user}}", data, {partials});
console.log(result); // --> 'User: John Doe <john@example.com>'
```

#### Partial blocks

> This feature was added in `v0.16.0`.

You can pass a block to a partial using a double greather than symbol `>>` followed by the partial name to start the partial block, and a slash followed by the partial name to end the partial block. The provided block content will be available in the `@content` variable.

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

const result = m("{{>foo}}", {}, options);
// Output: 'Hello Bob!'
```

#### Accessing to partial metadata using the `@partial` variable

> Added in `v0.28.0`.

Partial metadata can be accessed using the `@partial` variable inside the partial. It contains the following fields:

- `@partial.name`: the name of the partial being rendered.
- `@partial.args`: an array containing the positional arguments provided to the partial (if any).
- `@partial.options`: an object containing the keyword arguments provided to the partial (if any).
- `@partial.attributes`: the custom data provided to the partial (if any).
- `@partial.context`: the current rendering context.

### Helpers

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

console.log(m("{{#each users}}{{this}}, {{/each}}", data)); // --> 'John, Alice, Bob, '
```

When looping throug arrays, you can use the variable `@index` to access to the current index of the item in the array:

```javascript
const data = {
    users: ["John", "Alice", "Bob"],
};

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
console.log(m("{{each values limit=2}}{{this}}{{/each}}", {values: [0, 1, 2, 3]})); // --> '01'
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

#### raw

> Added in `v0.23.0`.

The `raw` helper allows to render the content of the block without evaluating it. All the stuff inside the block will be rendered as is, without processing any variables or helpers.

```javascript
console.log(m("{{#raw}}Hello {{name}}!{{/raw}}", {name: "Bob"})); // --> 'Hello {{name}}!'
```

#### slot

> Added in `v0.33.0`.

The `slot` helper allows you to capture a block of template content and store it under a named key. Captured slots become available through the special `@slot` state variable.
    
```javascript
const template = `
{{#slot "name"}}Bob{{/slot}}

Hello {{@slot.name}}!
`;

console.log(m(template, {})); // --> 'Hello Bob!'
```

Slots are evaluated at render time, so they can contain variables, helpers, or any other template expressions. If the same slot name is defined more than once, **the last definition wins**.

#### macro

> Added in `v0.33.0`.

The `macro` allows you to define partials directly in your template. Use `#macro` followed by the name to assign to the new partial to start the partial definition.

Example:

```javascript
const template = `
{{#macro "foo"}}
Hello {{name}}!
{{/macro}}

{{>foo name="Bob"}}
`;

console.log(m(template, {})); // --> 'Hello Bob!'
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

Custom helper functions receive a single `params` object as argument, containing the following fields:

- `args`: an array containing the variables with the helper is called in the template.
- `options`: an object containing the keyword arguments provided to the helper.
- `data`: the current data where the helper has been executed.
- `state`: an object containing the state variables available in the current context (e.g., `@root`, `@index`, etc.).
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

#### Expand helper arguments using the spread operator

> This feature was added in `v0.20.0`.

You can use the spread operator `...` to expand the arguments of a helper. This allows you to pass an array of values as individual arguments to the helper, or to pass an object as keyword arguments.

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
            return params.args.join(params.opt.separator);
        }
    },
};

const result = m("{{#join ...items ...options}}{{/join}}", data, options);
console.log(result); // --> "John, Alice, Bob"
```

#### Accessing to helper metadata using the `@helper` variable

> Introduced in `v0.28.0`.

Inside any helper block, you can access metadata about the current invocation through the `@helper` variable. It exposes the following fields:

- `@helper.name`: the name of the helper being invoked.
- `@helper.args`: an array of positional arguments passed to the helper.
- `@helper.options`: an object containing named (key-value) arguments.
- `@helper.context`: the current rendering context.

### State Variables

> Added in `v0.4.0`.

State Variables in Mikel provide convenient access to special values within your templates. These variables, denoted by the `@` symbol, allow users to interact with specific data contexts or values at runtime. State variables are usually generated by helpers like `#each`.

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

Functions will receive a single `params` object as argument, containing the following keys:

- `args`: an array containing the variables with the function is called in the template.
- `options`: an object containing the keyword arguments provided to the function.
- `data`: the current data object where the function has been executed.
- `state`: an object containing the state variables available in the current context (e.g., `@root`, `@index`, etc.).

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

#### Expand function arguments using the spread operator

> This feature was added in `v0.20.0`.

You can use the spread operator `...` to expand the arguments of a function. This allows you to pass an array of values as individual arguments to the function, or to pass an object as keyword arguments.


Example with an **array**:

```javascript
const data = {
    items: ["John", "Alice", "Bob"],
};

const options = {
    functions: {
        join: params => {
            return params.args.join(", ");
        }
    },
};

const result = m("{{=join ...items}}", data, options);
console.log(result); // --> "John, Alice, Bob"
```

Example with an **object**:

```javascript
const data = {
    user1: {
        firstName: "John",
        lastName: "Doe",
    },
    user2: {
        firstName: "Alice",
        lastName: "Smith",
    },
};
const options = {
    functions: {
        fullName: params => {
            return `${params.options.firstName} ${params.options.lastName}`;
        }
    },
};

const result = m("Users: {{=fullName ...user1}} and {{=fullName ...user2}}", data, options);
console.log(result); // --> "Users: John Doe and Alice Smith"
```

Of course, Jose — here’s a version of the **Subexpressions** documentation written to perfectly match the tone, structure, and formatting conventions of the current README.  
It follows the same patterns: short intro, version note, examples, concise explanations, no extra fluff.

### Subexpressions  

> Added in `v0.30.0`.

Subexpressions allow you to evaluate a function call inside another function call. They are written using parentheses, and can be used anywhere a normal function argument is allowed. Example:

```hbs
{{=sum (sum 3 4) 3}}
```

In this example, the inner expression is evaluated first:

- `(sum 3 4)` → `7`  
- `sum 7 3` → `10`

Result:

```
10
```

#### Nested subexpressions

Subexpressions can be nested to any depth:

```hbs
{{=sum (sum 1 (sum 2 3)) 4}}
```

#### Using strings inside subexpressions

Strings behave the same way inside subexpressions, including quoted strings with spaces:

```hbs
{{=concat "Hello " (upper name)}}
```

If `name = "world"`:

```
Hello WORLD
```

#### Variables inside subexpresspressions

You can reference variables or paths normally:

```hbs
{{=sum (sum price tax) shipping}}
```

#### Limitations

- Subexpressions are currently supported **only for functions** (`{{=...}}`).
- Subexpressions inside helper arguments are not yet supported.
- Parentheses must be balanced; malformed expressions will throw an error.


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

### `mikel.create(options)`

> Removed `template` argument in `v0.24.0`.

Allows to create an isolated instance of mikel, useful when you want to use the same options for multiple templates without passing them every time. You can pass an `options` object with the same structure as the one used in the `mikel` function, which will be used for all templates compiled with this instance.

It returns a function that you can call with the template and data to compile the template.

```javascript
import mikel from "mikel";

const mk = mikel.create({
    partials: {
        hello: "Hello, {{name}}!",
    },
});

console.log(mk("{{>hello}}", {name: "Bob"})); // --> "Hello, Bob!"
console.log(mk("{{>hello}}", {name: "Susan"})); // --> "Hello, Susan!"
```

It also exposes the following additional methods:

#### `mk.use(options)`

> Added in `v0.19.0`.

Allows to extend the templating with custom **helpers**, **functions**, and **partials**.

```javascript
mk.use({
    partials: {
        foo: "bar",
    },
});
```

#### `mk.addHelper(helperName, helperFn)`

Allows to register a new helper instead of using the `options` object.

```javascript
mk.addHelper("foo", () => { ... });
```

#### `mk.removeHelper(helperName)`

Removes a previously added helper.

```javascript
mk.removeHelper("foo");
```

#### `mk.addPartial(partialName, partialCode)`

Registers a new partial instead of using the `options` object.

```javascript
mk.addPartial("bar", " ... ");
```

#### `mk.removePartial(partialName)`

Removes a previously added partial.

```javascript
mk.removePartial("bar");
```

#### `mk.addFunction(fnName, fn)`

Registers a new function instead of using the `options` object.

```javascript
mk.addFunction("foo", () => "...");
```

#### `mk.removeFunction(fnName)`

Removes a previously added function.

```javascript
mk.removeFunction("foo");
```

### `mikel.escape(str)`

This function converts special HTML characters `&`, `<`, `>`, `"`, and `'` to their corresponding HTML entities.

### `mikel.get(object, path)`

This function returns the value in `object` following the provided `path` string.

## License

This project is licensed under the [MIT License](LICENSE).
