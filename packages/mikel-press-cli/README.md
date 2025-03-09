# mikel-press-cli

![npm version](https://badgen.net/npm/v/mikel-press-cli?labelColor=1d2734&color=21bf81)
![license](https://badgen.net/github/license/jmjuanes/mikel?labelColor=1d2734&color=21bf81)

The **mikel-press CLI** is a command-line tool for generating and serving static sites using [mikel-press](https://github.com/jmjuanes/mikel). It reads configuration settings from a `press.config.js` file and provides an easy way to build and preview your static website.

## Installation

To install the CLI into your project, run:

```bash
$ yarn add mikel-press
```

## Usage

Once installed, you can use the `mikel-press` command from your terminal. The CLI provides two main commands:

### `mikel-press build`

Generates the static site based on the configuration file. This command reads the `press.config.js` file (or another specified configuration file) and generates the static site.

### `mikel-press serve`

Builds the static site and starts a local web server to preview the generated content. By default, the server runs on port `3000`, but you can customize it using the `--port` option.

## Options

- `--config <path>`: Specifies the path to the configuration file. Default: `press.config.js`.
- `--port <number>` *(only for `serve`)*: Sets the port for the local server. Default: `3000`.
- `--watch` *(only for `serve`)*: Watches for changes in the source files and automatically rebuilds the site when modifications occur.

## Example Configuration File (`press.config.js`)

Below is an example configuration file for **mikel-press**:

```js
import press from "mikel-press";

export default {
    source: "./content",
    destination: "./public",
    layout: "./layouts/main.html",
    title: "My Static Site",
    plugins: [
        press.SourcePlugin(),
        press.ContentPlugin(),
    ],
};
```

## License

This project is licensed under the [MIT License](../../LICENSE).
