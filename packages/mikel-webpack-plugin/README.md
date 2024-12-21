# Mikel Webpack Plugin

> Generate HTML files using the Mikel templating.

## Description

A Webpack plugin inspired by [htmlWebpackPlugin](https://github.com/jantimon/html-webpack-plugin) that generates HTML files for your bundles using [Mikel](https://github.com/jmjuanes/mikel) as the templating engine.

## Installation

Install this project using **npm**:

```bash
$ npm install --save-dev mikel-webpack-plugin
```

Or using **yarn**:

```bash
$ yarn add --dev mikel-webpack-plugin
```

## Usage

```javascript
// webpack.config.js
import MikelWebpackPlugin from "mikel-webpack-plugin";

export default {
    entry: "index.js",
    output: {
        path: path.join(process.cwd(), "www"),
        filename: "bundle.js",
    },
    plugins: [
        new MikelWebpackPlugin({
            filename: "index.html",
        }),
    ],
};
```

## Configuration

This plugin accepts the following options:

| Name | Type | Description | Default Value |
|------|------|-------------|---------------|
| `filename` | `String` | Name of the generated HTML file. | `index.html` |
| `template` | `String` | Absolute path to the template file to use. | `null` |
| `templateContent` | `String` | Template content as a string. | `null` |
| `chunks` | `Array` | List of entry names to include in the HTML. | `["main"]` |
| `publicPath` | `String` | Public path for the assets. | `"./"` |
| `meta` | `Object` | Additional `<meta>` tags to include in the `<head>`. Example: `{author: "John Doe"}`. | `{}` |
| `link` | `Array` | List of `<link>` tags to include in the `<head>`. Example: `[{rel: "icon", href: "/favicon.ico"}] `. |
| `templateData` | `Object` | Additional data for the template that will be passes to Mikel. | `{}` |
| `templateOptions` | `Object` | Additional options for the Mikel templating (partials, helpers, and functions). | `{}` |


## License

This project is licensed under the **MIT License**.
