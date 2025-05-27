# mikel-press

![npm version](https://badgen.net/npm/v/mikel-press?labelColor=1d2734&color=21bf81)
![license](https://badgen.net/github/license/jmjuanes/mikel?labelColor=1d2734&color=21bf81)

**mikel-press** is a static site generator inspired by [Jekyll](https://jekyllrb.com/) and built on top of **mikel**, a Mustache-based templating engine. It allows you to generate static websites from HTML and Markdown files using a flexible plugin system.

## Installation

To install **mikel-press**, ensure you have [Node.js](https://nodejs.org) installed on your system. Then, add this package as a dependency to your project using **yarn**:

```bash
$ yarn add --dev mikel-press
```

Or **npm**:

```bash
$ npm install --dev mikel-press
```

## Directory structure

A basic **mikel-press** directory structure looks like this:

```
.
├── data
│   └── projects.json
├── partials
│   ├── footer.html
│   └── header.html
├── posts
│   ├── 2025-04-03-introducing-our-new-project.html
│   ├── 2025-04-05-how-to-stay-productive.html
│   └── 2025-04-07-understanding-javascript-closures.html
├── www
├── press.js
├── package.json
├── projects.html
├── blog.html
├── about.html
└── index.html
```

## Configuration

**mikel-press** can be configured using a `config` object that accepts the following options:

| Field | Description | Default |
|-------|-------------|---------|
| `source` | The path to the directory containing the site folders. | `"."` |
| `destination` | The output directory where the generated static site will be saved. | `"www"` |
| `extensions` | List of file extensions to process. | `[".html"]` |
| `mikelOptions` | An object containing custom configuration for the **mikel** templating engine. | `{}` |
| `plugins` | A list of plugins used to extend the functionality of **mikel-press**. | `[]` |
| `*` | Any other properties passed in config will be available as `site.*` inside each page template. | - |

Here is an example configuration object:

```javascript
import press from "mikel-press";

press({
    source: ".",
    destination: "./www",
    title: "Hello world",
    description: "My awesome site",
    plugins: [
        press.SourcePlugin({folder: "posts", basePath: "blog"}),
        press.PartialsLoaderPlugin(),
        press.DataLoaderPlugin(),
        press.FrontmatterPlugin(),
        press.ContentPagePlugin(),
    ],
});
```

## Content

### Variables

Each HTML file processed by **mikel-press** will be handled by the mikel templating engine, that will provide the following data variables to each page:

#### Global variables

| Variable | Description |
|----------|-------------|
| `site` | Contains the site information and all the additional keys provided in the configuration object. |
| `page` | Specific information about the page that is rendered. |

#### Site variables

| Variable | Description |
|----------|-------------|
| `site.pages` | A list containing all pages processed by **mikel-press**. |
| `site.data` | An object containing all data items loaded by `DataLoaderPlugin`. |
| `site.partials` | A list containing all partials files loaded by the `PartialsLoaderPlugin`. |
| `site.*` | All the additional configuration fields provided in the configuration. |

#### Page variables

| Variable | Description |
|----------|-------------|
| `page.content` | The raw content of the page before begin processed by **mikel**. |
| `page.title` | The title of the page. |
| `page.path` | The path to the page. Example: `about/index.html`. |
| `page.url` | The path to the page including the leading `/`. Example: `/about/index.html`. |
| `page.attributes` | An object containing all the frontmatter variables in the page processed by `FrontmatterPlugin`. |

## Plugins

**mikel-press** relies on plugins to handle file reading, transformation, and rendering. The following plugins are built-in:

### `press.SourcePlugin(options)`

This plugin reads content from the specified directory and loads it into the system for processing.

Options:
- `options.folder` (string): Specifies a custom source directory. If not provided, `config.source` is used.
- `options.extensions` (array): Defines the file extensions that should be processed. If not provided, it will use `config.extensions`.
- `options.basePath` (string): Specifies the base path for the output files.

### `press.PartialsPlugin(options)`

An alias of `press.SourcePlugin` that will read all files in the `partials` folder and process them as a partials. The **mikel** tag `{{>file}}` can be used to include the partial in `partials/file.html`.

This plugin accepts the following options:
- `options.folder` (string): To change the directory to load the partials files. Default is `./partials`.
- `options.extensions` (array): Defines the file extensions that should be processed. If not provided, it will use `config.extensions`.

### `press.DataPlugin(options)`

This plugin loads JSON files from the specified directory and makes them available in the site context. This plugin accepts the following options:

- `options.folder` (string): Specifies a custom source directory for data files. If not provided, `./data` is used.

### `press.AssetsPlugin(options)`

This plugin loads additional files (aka assets) and includes them in the build folder. This plugin accepts the following options:

- `options.folder` (string): Specifies a custom source directory for assets files. If not provided, `./assets` is used.
- `options.extensions` (array): Defines the file extensions that should be processed. If not provided, it will use `"*"`.
- `options.exclude` (array): Defines the list of file names to exclude.
- `options.basePath` (string): Allows to specify a base path for the output files.

### `press.FrontmatterPlugin()`

This plugin processes and parses the frontmatter in each file. The parsed frontmatter content will be available in `page.attributes` field.

### `press.ContentPagePlugin()`

This plugin processes each page and saves it into `config.destination`.

### `press.CopyAssetsPlugin(options)`

This plugin copies static files from the source to the destination.

Options:
- `options.patterns` (array): List of file patterns to copy. Each pattern should have `from` and `to`.

## API

**mikel-press** exposes a single function that triggers the build with the given configuration object provided as an argument.

```javascript
import press from "mikel-press";

press({...});
```

## License

This project is licensed under the [MIT License](../../LICENSE).
