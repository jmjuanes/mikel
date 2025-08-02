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
| `--partial <file>` | `-P` | Register a partial template (can be used multiple times) |
| `--helper <file>` | `-H` | Register helper functions from a JavaScript module (can be used multiple times) |
| `--function <file>` | `-F` | Register functions from a JavaScript module (can be used multiple times) |

### Examples

Render a template and output to console:

```bash
mikel template.html
```

Render a template with data from a JSON file:

```bash
mikel template.html --data data.json
```

Render template and save to an output file:

```bash
mikel template.html --data data.json --output dist/index.html
```

Register partial templates for reusable components:

```bash
mikel template.html --data data.json --partial header.html --partial footer.html --output dist/index.html
```

Register custom helpers and functions from JavaScript modules:

```bash
mikel template.html --data data.json --helper helpers.js --function utils.js --output dist/index.html
```

## License

Licensed under the [MIT License](../../LICENSE).
