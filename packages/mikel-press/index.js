import * as fs from "node:fs";
import * as path from "node:path";
import mikel from "mikel";

// global utils
const utils = {
    // @description save file
    saveFile: (filePath, fileContent) => {
        const folder = path.dirname(filePath);
        if (!fs.existsSync(folder)) {
            fs.mkdirSync(folder, {recursive: true});
        }
        fs.writeFileSync(filePath, fileContent, "utf8");
    },
    // @description tiny front-matter parser
    frontmatter: (str = "", parser = null) => {
        let body = (str || "").trim(), attributes = {};
        if (!!parser) {
            const matches = Array.from(body.matchAll(/^(--- *)/gm))
            if (matches?.length === 2 && matches[0].index === 0) {
                const front = body.substring(0 + matches[0][1].length, matches[1].index).trim();
                body = body.substring(matches[1].index + matches[1][1].length).trim();
                attributes = typeof parser === "function" ? parser(front) : front;
            }
        }
        return {body, attributes};
    },
    // @description read a data folder
    readData: folder => {
        const files = fs.readdirSync(folder, "utf8")
            .filter(file => path.extname(file) === ".json")
            .map(file => path.join(folder, file))
            .map(file => {
                return [path.basename(file, ".json"), JSON.parse(fs.readFileSync(file, "utf8"))];
            });
        return Object.fromEntries(files);
    },
    // @description get pages from input folder
    readPages: (folder, type = ".html", fm = null, parse = null) => {
        return fs.readdirSync(folder, "utf8")
            .filter(file => path.extname(file) === type)
            .map(file => {
                const content = fs.readFileSync(path.join(folder, file), "utf8");
                const {body, attributes} = utils.frontmatter(content, fm);
                return {
                    name: file,
                    basename: path.basename(file, type),
                    extname: path.extname(file),
                    url: attributes?.permalink || path.join("/", path.basename(file, type) + ".html"),
                    data: attributes || {},
                    content: typeof parse === "function" ? parse(body) : body,
                };
            });
    },
    // @description get assets
    readAssets: (folder, fm = null) => {
        const assetPaths = fs.readdirSync(folder, "utf8");
        return Object.fromEntries(assetPaths.map(file => {
            const content = fs.readFileSync(path.join(folder, file), "utf8");
            const {body, attributes} = utils.frontmatter(content, fm);
            const asset = {
                name: file, 
                basename: path.basename(file, path.extname(file)),
                extname: path.extname(file),
                url: attributes?.permalink || path.join("/", file),
                data: attributes || {},
                content: body,
            };
            const assetName = asset.basename.replaceAll(".", "_").replaceAll("-", "_");
            return [assetName, asset];
        }));
    },
};

// @description returns the layout content from the given options
const getLayoutContent = config => {
    let content = "";
    // using options.template to specify the the absolute path to the template file
    if (typeof config?.layout === "string" || typeof config?.template === "string") {
        content = fs.readFileSync(config.layout || config.template, "utf8");
    }
    // using templateContent to specify the string content of the template
    if (typeof config?.layoutContent === "string" || typeof config?.templateContent === "string") {
        content = config.layoutContent || config.templateContent;
    }
    // parse with frontmatter
    const {body, attributes} = utils.frontmatter(content, config.frontmatter);
    return {
        content: body,
        data: attributes || {},
    };
};

// @description plugins
const plugins = {
    // plugin to read and include posts in markdown
    posts: (folder = "posts", extension = ".md", parser = null) => {
        return context => {
            const posts = utils.readPages(path.join(context.source, folder), extension, context.site.frontmatter, parser);
            context.site.posts = posts; // posts will be accesible in site.posts
            context.site.pages = [...context.site.pages, ...posts]; // posts will be included as pages also
        };
    },
};

// @description run mikel press with the provided configuration
const run = (config = {}) => {
    // 0. initialize context object
    const context = {
        site: config || {},
        source: path.resolve(process.cwd(), config?.source || "."),
        destination: path.resolve(process.cwd(), config?.destination || "./www"),
        layout: getLayoutContent(config),
    };
    // 1. initialize mikel instance
    context.compiler = mikel.create(context.layout.content, config?.mikel || {});
    // 2. read stuff
    context.site.data = utils.readData(path.join(context.source, config?.dataDir || "data"));
    context.site.pages = utils.readPages(path.join(context.source, config?.pagesDir || "pages"), ".html", config?.frontmatter ?? true, c => c);
    context.site.assets = utils.readAssets(path.join(context.source, config?.assetsDir || "assets"), config?.frontmatter ?? true);
    // 3. execute plugins
    if (config?.plugins && Array.isArray(config?.plugins)) {
        config.plugins.forEach(plugin => plugin(context));
    }
    // 4. save pages
    context.site.pages.forEach(page => {
        context.compiler.addPartial("content", page.content); // register page content as partial
        const content = context.compiler({
            site: context.site,
            layout: context.layout,
            page: page,
        });
        utils.saveFile(path.join(context.destination, page.url), content);
    });
    // 5. save assets
    Object.values(context.site.assets).forEach(asset => {
        utils.saveFile(path.join(context.destination, asset.url), asset.content);
    });
};

export default {
    utils,
    plugins,
    run,
};
