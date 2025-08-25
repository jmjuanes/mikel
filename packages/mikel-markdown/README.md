# mikel-markdown

![npm version](https://badgen.net/npm/v/mikel-markdown?labelColor=1d2734&color=21bf81)
![license](https://badgen.net/github/license/jmjuanes/mikel?labelColor=1d2734&color=21bf81)

A plugin for **mikel** that registers a helper for parsing markdown content.

## Limitations

**Important**: **This plugin DOES NOT sanitize the output HTML**. The package focuses solely on converting Markdown content to HTML markup. It is crucial to note that the converted HTML may contain potentially unsafe content, such as scripts or malicious code, if the input Markdown includes such elements.

If you plan to render user-generated Markdown content as HTML in a web application, it is strongly recommended to use a separate HTML sanitization library, such as [DOMPurify](https://github.com/cure53/DOMPurify), to ensure that the resulting HTML is safe for rendering and doesn't pose a security risk.

Always exercise caution when incorporating user-generated content into your web application and take appropriate measures to prevent cross-site scripting (XSS) attacks and other security vulnerabilities.

Please be mindful of this limitation and take the necessary precautions to protect your application's security when using this package.

## Installation

You can install this plugin using npm or yarn:

```bash
## install using YARN
$ yarn add mikel-markdown

## install using NPM
$ npm install --save mikel-markdown
```

## Usage

Import the `mikel-markdown` package:

```javascript
import mikel from "mikel";
import mikelMarkdown from "mikel-markdown";
```

In your template, use the `{{#markdown}}` helper in the markdown code you want to convert:

```javascript
const template = `{{#markdown}}Hello **world**{{/markdown}}`;
```

Include the plugin using the `use` method of mikel:

```javascript
const m = mikel.create(template);

m.use(mikelMarkdown());
```

And finally, compile your template:
```javascript
const result = m({}); // --> '<p>Hello <strong>world</strong></p>'
```

### Embedded HTML Blocks

By default, `mikel-markdown` transforms most content to ensure consistent Markdown rendering, including HTML blocks. However, if you need to include raw HTML blocks, such as `<div>`, `<section>`, or custom components, you can wrap your HTML block between `<!--html-->` and `<!--/html-->` like so:

```html
<!--html-->
<div class="center">
  <p>This content will be preserved as raw HTML.</p>
</div>
<!--/html-->
```

## Helpers

### `#markdown`

The `#markdown` helper is used to convert Markdown content into HTML markup. It takes the content inside the helper and processes it using a Markdown parser, returning the resulting HTML.

```javascript
m(`{{#markdown}}Hello **world**{{/markdown}}`); // --> '<p>Hello <strong>world</strong></p>'
```

### `#inlineMarkdown`

The `#inlineMarkdown` helper is used to convert inline Markdown content into HTML markup. This helper is useful for rendering Markdown content that is not block-level, such as inline code, emphasis, or links.

```javascript
m(`{{#inlineMarkdown}}Hello **world**{{/inlineMarkdown}}`); // --> 'Hello <strong>world</strong>'
```

## License

Licensed under the [MIT License](../../LICENSE).
