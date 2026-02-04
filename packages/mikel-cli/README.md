# mikel-cli

![npm version](https://badgen.net/npm/v/mikel-cli?labelColor=1d2734&color=21bf81)
![license](https://badgen.net/github/license/jmjuanes/mikel?labelColor=1d2734&color=21bf81)

A command-line interface for the [Mikel](https://github.com/jmjuanes/mikel) templating engine. This CLI tool allows you to render Mikel templates from the command line with support for data files, partials, helpers, and functions.

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
| `--data <file>` | `-D` | Path to JSON data file |
| `--output <file>` | `-o` | Output file path |
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

#### Complex Example

A complete example combining all features:

```bash
mikel src/template.html \
  --data src/data.json \
  --partial 'src/partials/*.html' \
  --partial 'src/components/**/*.html' \
  --helper 'src/helpers/*.js' \
  --function 'src/utils/*.js' \
  --output dist/index.html
```

### Glob Pattern Support

The `--partial`, `--helper`, and `--function` options support glob patterns for loading multiple files at once:

| Pattern | Description | Example |
|---------|-------------|---------|
| `*.ext` | All files with extension in current directory | `*.html`, `*.js` |
| `dir/*.ext` | All files with extension in specific directory | `partials/*.html` |
| `dir/**/*.ext` | All files with extension in directory and subdirectories | `components/**/*.html` |
| `?` | Single character wildcard | `file?.html` |

**Note:** Glob patterns should be quoted to prevent shell expansion.

## License

Licensed under the [MIT License](../../LICENSE).
