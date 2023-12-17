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

### `html`

The `html` method is a JavaScript template tag that generates a template object. This object encapsulates both the template string and the values that will populate the template, providing a clean and organized way to manage dynamic content.

```javascript
import {html} from "mikel";

const name = "Mikel";
const myTemplate = html`<p>Hello, ${name}!</p>`;
```

### `render(template)`

The `render` function takes a template object as its input and efficiently transforms it into an HTML element.

```javascript
import {render} from "mikel";

const renderedElement = render(myTemplate);
document.body.appendChild(renderedElement);
```

## License

Under the [MIT License](./LICENSE).
