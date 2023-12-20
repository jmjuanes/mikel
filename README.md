# Mikel

![npm version](https://badgen.net/npm/v/mikel?labelColor=1d2734&color=21bf81)
![license](https://badgen.net/github/license/jmjuanes/mikel?labelColor=1d2734&color=21bf81)

> **Mikel** is an experimental package. Its API is not stable and may change without notice. **Use it at your own risk.**

Mikel is a lightweight library designed to simplify HTML template literals, offering a effortlessly way to create dynamic HTML content using familiar JavaScript template tags.

## Features

- **Lightweight:** Mikel prioritizes simplicity and efficiency, offering a lightweight solution for handling HTML template literals.
  
- **Dynamic Rendering:** Utilize the `render` function to effortlessly transform template objects into HTML elements, simplifying the process of dynamic content creation.

- **Flexibility:** Mikel seamlessly integrates into your JavaScript projects, providing flexibility and ease of use.

## Installation

Install this library using NPM or YARN:

```bash
## Install using npm
$ npm install --save mikel

## Install using yarn
$ yarn add mikel
```

## API

### Core

#### `html`

The `html` method is a JavaScript template tag that generates a template object. This object encapsulates both the template string and the values that will populate the template, providing a clean and organized way to manage dynamic content.

```javascript
import {html} from "mikel";

const name = "Mikel";
const myTemplate = html`<p>Hello, ${name}!</p>`;
```

#### `render(DOMElement, template)`

The `render` function takes a DOM element and a template and render it inside the DOM element.

```javascript
import {html, render} from "mikel";

render(document.body, html`<div>Hello world!</div>`);
```

### Helpers

#### `classMap(classObj)`

The `classMap` helper is a function that takes an object as input, where keys represent class names, and values indicate whether the class should be included (`true` values) or excluded (`false` values). It returns a string containing the concatenated class names for the truthy values in the input object.

```javascript
import {html, classMap} from "mikel";

const className = classMap({
    "is-active": true,
    "is-disabled": false,
    "custom-class": true,
});

html`<div class="${className}"></div>`;
// class="is-active custom-class"
```

#### `styleMap(styleObj)`

The `styleMap` helper is a function that takes an object as input, where keys represent CSS attribute names, and values represent corresponding attribute values. It returns a valid CSS style string based on the input object.

```javascript
import {styleMap} from "mikel";

const styles = styleMap({
    "font-size": "16px",
    "color": "blue",
    "background-color": "lightgray",
});

console.log(styles);
// Output: 'font-size: 16px; color: blue; background-color: lightgray;'
```

## License

Under the [MIT License](./LICENSE).
