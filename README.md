# Mikel

![npm version](https://badgen.net/npm/v/mikel?labelColor=1d2734&color=21bf81)
![license](https://badgen.net/github/license/jmjuanes/mikel?labelColor=1d2734&color=21bf81)

Mikel is a lightweight implementation of the Mustache templating system in JavaScript, designed to be concise and simple. With less than 60 lines of code, it offers a convenient way to render templates using data.

## Installation

You can install Mikel via npm or yarn:

```bash
## Install using npm
$ npm install mikel

## Install using yarn
$ yarn add mikel
```

## Usage

### `m(template, data)`

Render the given template string with the provided data object.

- `template` (string): The Mustache template string.
- `data` (object): The data object containing the values to render.

Returns: A string with the rendered output.

```javascript
import m from "mikel";

const template = "Hello, {{ name }}!";
const data = {
    name: "World",
};

const result = m(template, data);
console.log(result); // Output: "Hello, World!"
```

## Limitations

Mikel aims to provide a minimalistic implementation of Mustache templating and currently has the following limitations:

- **No support for partials:** Mikel does not support partials, meaning you cannot include separate templates within your main template file.
- **Basic functionality:** While Mikel supports the core features of Mustache templating, it may lack some advanced features found in other implementations.

## License

This project is licensed under the [MIT License](LICENSE).
