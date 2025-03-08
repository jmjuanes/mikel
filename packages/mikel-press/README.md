# mikel-press

> A tiny and fast static site generator based on mikel templating.

**mikel-press** is a static site generator built on top of **mikel**, a Mustache-based templating engine. It allows you to generate static websites from HTML and Markdown files using a flexible plugin system.

## Installation

Install this package using **yarn** or **npm**:

```bash
$ yarn add mikel mikel-press
```

## Configuration

**mikel-press** can be configured using a `config` object that accepts the following options:

| Field | Description | Default |
|-------|-------------|---------|
| `source` | The path to the directory containing the site's HTML or Markdown files. | `"content"` |
| `destination` |  The output directory where the generated static site will be saved. | `"www"` |
| `layout` | The path to the layout file that will be used as the base template for all pages. | - |
| `plugins` | A list of plugins used to extend the functionality of mikel-press. | `[]` |
| `*` |  Any other properties passed in config will be available as `site.*` inside each page template. | - |

## Plugins

**mikel-press** relies on plugins to handle file reading, transformation, and rendering. The following plugins are built-in:

### `press.SourcePlugin(options)`

This plugin reads content from the specified `config.source` directory and loads it into the system for processing.

Options:
- `options.source` (string): Specifies a custom source directory. If not provided, `config.source` is used.
- `options.extensions` (array): Defines the file extensions that should be processed. The default value is `[".html", ".md", ".markdown"]`.

## `press.ContentPlugin(options)`

This plugin processes each page and saves it into `config.destination`. It accepts an `options` object, which is passed to mikel for template processing.

## Node API

**mikel-press** provides an API with two main methods:

### `press.build(config)`

Triggers the build of **mikel-press** with the given configuration object provided as argument.

```javascript
import press from "mikel-press";

press.build({
    // ...
});
```

### `press.watch(config)`

Calling the `watch` method triggers the build, but when watches for changes and as soon as it detectes a change in some of the source files, builds it again.

```javascript
import press from "mikel-press";

press.watch({
    // ...
});
```

## License

This project is licensed under the [MIT License](../../LICENSE).
