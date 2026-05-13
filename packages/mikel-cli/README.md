# mikel-cli

![npm version](https://badgen.net/npm/v/mikel-cli?labelColor=1d2734&color=21bf81)
![license](https://badgen.net/github/license/jmjuanes/mikel?labelColor=1d2734&color=21bf81)

A command-line interface for the [Mikel](https://github.com/jmjuanes/mikel) templating engine. This CLI tool allows you to render Mikel templates from the command line with support for data files, partials, helpers, functions, and plugins.

## Installation

Install the tool using **npm** or **yarn**:

```bash
# Using npm
$ npm install mikel-cli mikel

# Using yarn
$ yarn add mikel-cli mikel
```

**Note:** You need to install both `mikel-cli` and `mikel` packages. The `mikel` package is a peer dependency that provides the core templating functionality.

## Usage

### Basic Usage

```bash
$ mikel <template> [options]
```

### Options

| Option | Short | Description |
|--------|-------|-------------|
| `--help` | `-h` | Display help information |
| `--config <file>` | `-c` | Path to configuration file |
| `--output <file>` | `-o` | Output file path |
| `--data <file>` | `-D` | Path to JSON data file |
| `--plugin <module>` | `-L` | Load a Mikel plugin from a JavaScript module (can be used multiple times) |
| `--partial <file>` | `-P` | Register a partial template (supports glob patterns, can be used multiple times) |
| `--helper <file>` | `-H` | Register helper functions from a JavaScript module (supports glob patterns, can be used multiple times) |
| `--function <file>` | `-F` | Register functions from a JavaScript module (supports glob patterns, can be used multiple times) |

### Examples

#### Simple Template Rendering

Render a template and output to console:

```bash
mikel template.html
```

#### Using Data File

Render a template with data from a JSON file:

```bash
mikel template.html --data data.json
```

#### Output to File

Render template and save to an output file:

```bash
mikel template.html --data data.json --output dist/index.html
```

#### Using Partials

Register partial templates for reusable components:

```bash
mikel template.html --data data.json --partial header.html --partial footer.html --output dist/index.html
```

#### Using Helpers and Functions

Register custom helpers and functions from JavaScript modules:

```bash
mikel template.html --data data.json --helper helpers.js --function utils.js --output dist/index.html
```

#### Using Glob Patterns

Load multiple files using glob patterns:

```bash
# Load all HTML partials from a directory
mikel template.html --partial 'partials/*.html' --output dist/index.html

# Load all JavaScript helpers from a directory
mikel template.html --helper 'helpers/*.js' --output dist/index.html

# Load partials from subdirectories (recursive)
mikel template.html --partial 'components/**/*.html' --output dist/index.html

# Mix exact files and glob patterns
mikel template.html --partial header.html --partial 'components/*.html' --output dist/index.html
```

### Glob Pattern Support

The `--partial`, `--helper`, and `--function` options support glob patterns for loading multiple files at once:

| Pattern | Description | Example |
|---------|-------------|---------|
| `*.ext` | All files with extension in current directory | `*.html` |
| `dir/*.ext` | All files with extension in specific directory | `partials/*.html` |
| `dir/**/*.ext` | All files with extension in directory and subdirectories | `components/**/*.html` |
| `?` | Single character wildcard | `file?.html` |

**Note:** Glob patterns should be quoted to prevent shell expansion.

## Configuration File

For more complex use cases — multiple input files, output renaming, or plugins — you can use a configuration file instead of CLI arguments. Create a `mikel.config.js` file in your project root:

```js
export default {
    input: "src/**/*.mustache",
    output: {
        dir: "dist/",
        rename: {
            "^src/(.+)\\.mustache$": "$1.html",
        },
    },
    data: "./data/site.json",
    plugins: [],
};
```

Then run mikel pointing to the config file:

```bash
mikel --config mikel.config.js
```

CLI arguments take precedence over the configuration file when both are provided. However, when using a configuration file, `input` can be a glob or an array of globs — something not possible via CLI arguments alone.

### Configuration Fields

#### `input`

The template file(s) to process. Accepts a string (file path or glob) or an array of strings:

```js
// single file
input: "src/index.mustache"

// array of files and globs
input: ["src/index.mustache", "src/pages/**/*.mustache"]
```

#### `output`

Where to write the rendered files. Accepts a string (directory path) or an object:

```js
// simple directory
output: "dist/"

// with rename rules
output: {
    dir: "dist/",
    rename: {
        "^src/(.+)\\.mustache$": "$1.html",
    },
}
```

The `rename` field works like Jest's `moduleNameMapper` — keys are regular expressions and values are replacement strings. The first matching pattern wins. If no pattern matches, the basename of the input file is used as the output filename.

```js
// src/docs/guide/index.mustache → dist/docs/guide/index.html
rename: {
    "^src/(.+)\\.mustache$": "$1.html",
}
```

#### `data`

Data to pass to the templates. Accepts a path to a JSON file or a plain object:

```js
// path to JSON file
data: "./data/site.json"

// inline object
data: {
    site: {
        title: "My Site",
    },
}
```

#### `helpers`

An object containing helpers that will be registered in the mikel engine:

```js
export default {
    helpers: {
        uppercase: ({ fn, data }) => {
            return fn(data).toUpperCase();
        },
    },
};
```

#### `functions`

An object containing functions that will be registered in the mikel engine:

```js
export default {
    functions: {
        sayHello: () => "Hello!",
    },
};
```

#### `partials`

An object containing partials that will be registered in the mikel engine:

```js
export default {
    partials: {
        "foo": "Hello {{this.bar}}",
    },
};
```

#### `plugins`

An array of Mikel plugins to load. See the [Plugins](#plugins) section for details.

## Plugins

Plugins extend Mikel's functionality by registering additional helpers, functions, or partials. They can be loaded both via the `--plugin` CLI flag and the `plugins` configuration field.

### Loading Plugins via CLI

Use the `--plugin` flag to load a plugin from a JavaScript module:

```bash
mikel template.html --plugin mikel-markdown --output dist/index.html
```

### Loading Plugins via Configuration

Use the `plugins` field in your configuration file. Each entry can be a module name (string) or a tuple of `[moduleName, options]` when the plugin requires configuration:

```js
export default {
    plugins: [
        // plugin without options
        "mikel-frontmatter",
        // plugin with options
        ["mikel-markdown", {
            classNames: { ... },
        }],
    ],
};
```

## License

Licensed under the [MIT License](../../LICENSE).
