import fs from "node:fs";
import path from "node:path";
import mikel from "mikel";

// @description global variables
const PLUGIN_NAME = "MikelWebpackPlugin";

// @description returns the template content from the given options
const getTemplateContent = options => {
    // using options.template to specify the the absolute path to the template file
    if (typeof options.template === "string") {
        return fs.readFileSync(options.template, "utf8");
    }
    // using templateContent to specify the string content of the template
    if (typeof options.templateContent === "string") {
        return options.templateContent;
    }
    // Other case: use the default template
    return fs.readFileSync("./template.html", "utf8");
};

// @description get the entry names to include in the output HTML
const getEntryNames = (compilation, includeChunks = []) => {
    const entryNames = Array.from(compilation.entrypoints.keys());
    // note: empty includeChunks means that no assets will be injected in the generated HTML
    // if (!includeChunks || includeChunks.length === 0) {
    if (!includeChunks) {
        return entryNames;
    }
    // get only entries that are included in the includeChunks array
    return entryNames.filter(entryName => includeChunks.includes(entryName));
};

// @description get assets related to the specified entries
const getAssets = (compilation, entryNames, publicPath = "./") => {
    const assets = new Set();
    entryNames.forEach(entryName => {
        compilation.entrypoints.get(entryName)
            .getFiles()
            .filter(file => !!compilation.getAsset(file))
            .filter(file => [".js", ".css"].includes(path.extname(file)))
            .map(file => publicPath + file)
            .forEach(file => assets.add(file));
    });
    // return Array.from(assets);
    return {
        publicPath: publicPath,
        js: Array.from(assets).filter(file => file.endsWith(".js")),
        css: Array.from(assets).filter(file => file.endsWith(".css")),
    };
};

// @description MikelWebpackPlugin class
export default class MikelWebpackPlugin {
    constructor(options = {}) {
        this.options = options;
    }

    apply(compiler) {
        const includeChunks = this.options.chunks || ["main"];
        const filename = this.options.filename || "index.html";
        const template = getTemplateContent(this.options);
        compiler.hooks.compilation.tap(PLUGIN_NAME, compilation => {
            const processAssetsOptions = {
                name: PLUGIN_NAME,
                stage: compiler.webpack.Compilation.PROCESS_ASSETS_STAGE_OPTIMIZE_INLINE,
            };
            compilation.hooks.processAssets.tap(processAssetsOptions, () => {
                    const publicPath = this.options.publicPath || "./";
                    const entryNames = getEntryNames(compilation, includeChunks);
                    const assets = getAssets(compilation, entryNames, publicPath);
                    // compile the provided template
                    const pluginData = {
                        ...(this.options.templateData || {}),
                        options: this.options,
                        assets: assets,
                    };
                    const content = mikel(template, pluginData, this.options.templateOptions || {});
                    // emit the HTML file as a new asset
                    compilation.emitAsset(filename, new compiler.webpack.sources.RawSource(content));
                }
            );
        });
    }
}
