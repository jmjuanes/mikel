// import mikel from "mikel";

// @description global variables
const PLUGIN_NAME = "MikelWebpackPlugin";

// utility method to generate the HTML content for the given JS and CSS files
const generateHtml = (jsFiles, cssFiles) => {
    const cssLinks = cssFiles.map(file => `<link rel="stylesheet" href="${file}">`).join('\n');
    const jsScripts = jsFiles.map(file => `<script src="${file}"></script>`).join('\n');

    return `
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Document</title>
            ${cssLinks}
        </head>
        <body>
            ${jsScripts}
        </body>
        </html>
    `;
};

// @description MikelWebpackPlugin class
export default class MikelWebpackPlugin {
    constructor(options = {}) {
        this.options = options;
    }

    apply(compiler) {
        compiler.hooks.compilation.tap(PLUGIN_NAME, compilation => {
            const processAssetsOptions = {
                name: PLUGIN_NAME,
                stage: compiler.webpack.Compilation.PROCESS_ASSETS_STAGE_OPTIMIZE_INLINE,
            };
            compilation.hooks.processAssets.tap(processAssetsOptions, assets => {
                    const jsFiles = Object.keys(assets).filter(file => file.endsWith('.js'));
                    const cssFiles = Object.keys(assets).filter(file => file.endsWith('.css'));

                    const htmlContent = generateHtml(jsFiles, cssFiles);

                    compilation.emitAsset('index.html', new compiler.webpack.sources.RawSource(htmlContent));
                }
            );
        });
    }
}
