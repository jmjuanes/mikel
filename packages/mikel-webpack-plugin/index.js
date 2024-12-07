import path from "node:path";
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

const getEntryNames = (compilation, includeChunks = []) => {
    const entryNames = Array.from(compilation.entrypoints.keys());
    if (!includeChunks || includeChunks.length === 0) {
        return entryNames;
    }
    return entryNames.filter(entryName => !entryName.includes("chunk"));
};

const getAssets = (compilation, entryNames) => {
    const publicPath = "./"; 
    const entryPointPublicPathMap = new Set();
    const assets = {
        js: [],
        css: [],
    };
    entryNames.forEach(entryName => {
        compilation.entrypoints.get(entryName)
            .getFiles()
            .filter(file => !!compilation.getAsset(file))
            .filter(file => [".js", ".css"].includes(path.extname(file)))
            .map(file => publicPath + file)
            .forEach(file => {
                if (!entryPointPublicPathMap.has(file)) {
                    const ext = path.extname(file).slice(1); // get extension without leading dot
                    assets[ext].push(file);
                    entryPointPublicPathMap.add(file);
                }
            });
    });
    return assets;
};

// @description MikelWebpackPlugin class
export default class MikelWebpackPlugin {
    constructor(options = {}) {
        this.options = options;
    }

    apply(compiler) {
        const includeChunks = this.options.chunks || ["main"];
        const filename = this.options.filename || "index.html";
        compiler.hooks.compilation.tap(PLUGIN_NAME, compilation => {
            const processAssetsOptions = {
                name: PLUGIN_NAME,
                stage: compiler.webpack.Compilation.PROCESS_ASSETS_STAGE_OPTIMIZE_INLINE,
            };
            compilation.hooks.processAssets.tap(processAssetsOptions, () => {
                    // const jsFiles = Object.keys(assets).filter(file => file.endsWith('.js'));
                    // const cssFiles = Object.keys(assets).filter(file => file.endsWith('.css'));
                    // console.log(assets);
                    // const assetInfo = compilation.assetsInfo.get(jsFiles[0]);
                    // console.log(assetInfo);
                    // const entryNames = Array.from(compilation.entrypoints.keys());
                    const entryNames = getEntryNames(compilation, includeChunks);
                    console.log(entryNames);
                    const assets = getAssets(compilation, entryNames);
                    console.log(assets);

                    const htmlContent = generateHtml(assets.js, assets.css);

                    compilation.emitAsset(filename, new compiler.webpack.sources.RawSource(htmlContent));
                }
            );
        });
    }
}
