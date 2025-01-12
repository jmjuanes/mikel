# mikel-press

**mikel-press** is a tiny static site generator inspired by Jekyll that uses **mikel** as its templating engine. It provides a simple and efficient way to build static websites with customizable layouts and content.

## Installation

To install **mikel-press**, ensure you have [Node.js](https://nodejs.org) installed on your system. Then, add this package as a dependency to your project using **yarn**:

```bash
$ yarn add --dev mikel-press
```

Or **npm**:

```bash
$ npm install --dev mikel-press
```

## Usage

### Building the Site

Run the `build` command to generate your static website:

```bash
$ mikel-press build
```

The generated files will be available in the `www` directory by default.

### (WIP) Starting a Development Server

To preview your site locally, use the `serve` command:

```bash
mikel-press serve
```

This will start a local server at `http://localhost:4000`.

## (WIP) Configuration

Create a file called `press.config.js` with the configuration.


## Contributing

Contributions are welcome! If you have ideas or find a bug, feel free to open an issue or submit a pull request.

## License

This project is licensed under the MIT License.
