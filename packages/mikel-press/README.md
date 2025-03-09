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
| `destination` | The output directory where the generated static site will be saved. | `"www"` |
| `layout` | The path to the layout file that will be used as the base template for all pages. | - |
| `plugins` | A list of plugins used to extend the functionality of mikel-press. | `[]` |
| `*` | Any other properties passed in config will be available as `site.*` inside each page template. | - |

Here is an example configuration object:

```javascript
const config = {
    source: "./content",
    destination: "./www",
    layout: "./layout.html",
    title: "Hello world",
    description: "My awesome site",
    plugins: [
        press.SourcePlugin(),
        press.FrontmatterPlugin(),
        press.PermalinkPlugin(),
        press.ContentPlugin(),
        press.CopyAssetsPlugin({
            patterns: [
                { from: "./static/styles.css", to: "static/" },
            ],
        }),
    ],
};
```

## Content

### Variables

Each HTML file processed by **mikel-press** will be handled by the mikel templating engine, that will provide the following data variables to each page:

#### Global variables

| Variable | Description |
|----------|-------------|
| `site` | Contains the site information and all the additional keys provided in the configuration object. |
| `page` | Specific information about the page that is rendered. |
| `layout` | Specific information about the layout that is used for renderin the page. |

#### Site variables

| Variable | Description |
|----------|-------------|
| `site.data` | An object containing all data items loaded by `DataPlugin`. |
| `site.pages` | A list containing all pages processed by **mikel-pres**. |
| `site.*` | All the additional configuration fields provided in the configuration. |

#### Page variables

| Variable | Description |
|----------|-------------|
| `page.path` | The path to the page. Example: `about/index.html`. |
| `page.url` | The path to the page including the leading `/`. Example: `/about/index.html`. |
| `page.attributes` | An object containing all the frontmatter variables in the page processed by `FrontmatterPlugin`. |
| `page.content` | The raw content of the page before begin processed by **mikel**. |

#### Layout variables

| Variable | Description |
|----------|-------------|
| `layout.attributes` | An object containing all the frontmatter variables in the layout processed by `FrontmatterPlugin`. |
| `layout.content` | The raw content of the layout. |

## Plugins

**mikel-press** relies on plugins to handle file reading, transformation, and rendering. The following plugins are built-in:

### `press.SourcePlugin(options)`

This plugin reads content from the specified `config.source` directory and loads it into the system for processing.

Options:
- `options.source` (string): Specifies a custom source directory. If not provided, `config.source` is used.
- `options.extensions` (array): Defines the file extensions that should be processed. The default value is `[".html", ".md", ".markdown"]`.

### `press.DataPlugin(options)`

This plugin loads JSON files from the specified directory and makes them available in the site context.

Options:
- `options.source` (string): Specifies a custom source directory for data files. If not provided, `./data` is used.

### `press.FrontmatterPlugin(options)`

This plugin processes frontmatter in Markdown and HTML files.

Options:
- `options.extensions` (array): Defines the file extensions that should be processed. The default value is `[".md", ".markdown", ".html"]`.
- `options.parser` (function): Frontmatter parser function (e.g., `JSON.parse`, `YAML.load`).

### `press.PermalinkPlugin()`

This plugin allows defining custom permalinks for pages.

### `press.MarkdownPlugin(options)`

This plugin processes Markdown files and converts them to HTML.

Options:
- `options.parser` (function): Markdown parser function (e.g., `marked.parse`).

### `press.ContentPlugin(options)`

This plugin processes each page and saves it into `config.destination`. It accepts an `options` object, which is passed to mikel for template processing.

### `press.CopyAssetsPlugin(options)`

This plugin copies static files from the source to the destination.

Options:
- `options.patterns` (array): List of file patterns to copy. Each pattern should have `from` and `to`.

## Node API

**mikel-press** provides an API with two main methods:

### `press.build(config)`

Triggers the build of **mikel-press** with the given configuration object provided as an argument.

```javascript
import press from "mikel-press";

press.build(config);
```

### `press.watch(config)`

Calling the `watch` method triggers the build, but also watches for changes and rebuilds the site as soon as it detects a change in any of the source files.

```javascript
import press from "mikel-press";

press.watch(config);
```

## License

This project is licensed under the [MIT License](../../LICENSE).
