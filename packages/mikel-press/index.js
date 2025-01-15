import * as fs from "node:fs";
import * as path from "node:path";
import mikel from "mikel";

// @description tiny yaml parser
const parseYaml = (str = "") => {
    const lines = str.split("\n").filter(line => line.trim() !== "" && !line.trim().startsWith("#"));
    return Object.fromEntries(lines.map(line => {
        const [key, value] = line.split(":").map(part => part.trim());
        if (!isNaN(value)) {
            return [key, Number(value)];
        }
        if (value === "true" || value === "false" || value === "null") {
            return [key, JSON.parse(value)];
        }
        return [key, value.replaceAll(/^["']|["']$/g, "")];
    }));
};

// @description tiny front-matter parser
const frontmatter = (str = "") => {
    let body = (str || "").trim(), attributes = {};
    const matches = Array.from(body.matchAll(/^(--- *)/gm));
    if (matches?.length === 2 && matches[0].index === 0) {
        attributes = parseYaml(body.substring(0 + matches[0][1].length, matches[1].index).trim());
        body = body.substring(matches[1].index + matches[1][1].length).trim();
    }
    return {body, attributes};
};

// @description utility to save a file to disk
const saveFile = (filePath, fileContent) => {
    const folder = path.dirname(filePath);
    if (!fs.existsSync(folder)) {
        fs.mkdirSync(folder, {recursive: true});
    }
    fs.writeFileSync(filePath, fileContent, "utf8");
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
    const {body, attributes} = typeof config.frontmatter == "function" ? config.frontmatter(content) : {body: content, attributes: {}};
    return {
        content: body,
        data: attributes || {},
        attributes: attributes || {},
    };
};

// @description create a virtual page object from the given options
const createVirtualPage = (options = {}) => {
    const content = options.content || fs.readFileSync(options.file, "utf8");
    const extname = options.extname || path.extname(options.file || "") || ".html";
    const basename = options.basename || path.basename(options.file || "", extname) || "virtual";
    const {body, attributes} = typeof options?.frontmatter == "function" ? options.frontmatter(content) : {body: content, attributes: {}};
    return {
        name: basename + extname,
        basename: basename,
        extname: extname,
        url: options.url || attributes?.permalink || path.join("/", basename + extname),
        data: attributes || {}, // DEPRECATED
        attributes: attributes || {},
        content: typeof options.transform === "function" ? options.transform(body) : body,
    };
};

// @description get pages from input folder
const readPages = (folder, extensions = ".html", fm = null, transform = null) => {
    const extensionsList = new Set([extensions].flat());
    if (fs.existsSync(folder) && fs.lstatSync(folder).isDirectory()) {
        return fs.readdirSync(folder, "utf8")
            .filter(file => extensionsList.has(path.extname(file)))
            .map(file => {
                return createVirtualPage({
                    file: path.join(folder, file),
                    frontmatter: fm,
                    transform: transform,
                    extname: ".html",
                });
            });
    }
    return [];
};

// @description get assets
const readAssets = (folder, fm = null) => {
    if (fs.existsSync(folder) && fs.lstatSync(folder).isDirectory()) {
        const assetPaths = fs.readdirSync(folder, "utf8");
        return Object.fromEntries(assetPaths.map(file => {
            const asset = createVirtualPage({
                file: path.join(folder, file),
                frontmatter: fm,
            });
            const assetName = asset.basename.replaceAll(".", "_").replaceAll("-", "_");
            return [assetName, asset];
        }));
    }
    return {};
};

// @description read a data folder
const readData = folder => {
    if (fs.existsSync(folder) && fs.lstatSync(folder).isDirectory()) {
        const files = fs.readdirSync(folder, "utf8")
            .filter(file => path.extname(file) === ".json")
            .map(file => path.join(folder, file))
            .map(file => {
                return [path.basename(file, ".json"), JSON.parse(fs.readFileSync(file, "utf8"))];
            });
        return Object.fromEntries(files);
    }
    return {};
};

// @description run mikel press with the provided configuration
const run = (config = {}) => {
    // 0. initialize context object
    const hooks = ["initialize", "compiler", "beforeEmit", "emitPage", "emitAsset", "done"];
    const context = {
        site: config || {},
        source: path.resolve(process.cwd(), config?.source || "."),
        destination: path.resolve(process.cwd(), config?.destination || "./www"),
        layout: getLayoutContent(config),
        hooks: Object.freeze(Object.fromEntries(hooks.map(name => {
            return [name, new Set()];
        }))),
    };
    const dispatch = (name, args) => Array.from(context.hooks[name]).forEach(fn => fn.apply(null, args));
    // 1. execute plugins
    if (config?.plugins && Array.isArray(config?.plugins)) {
        config.plugins.forEach(plugin => plugin(context));
    }
    dispatch("initialize", []);
    // 2. initialize mikel instance
    const compiler = mikel.create(context.layout.content, config?.mikel || {});
    dispatch("compiler", [context.compiler]);
    // 3. read stuff
    context.site.data = readData(path.join(context.source, config?.dataDir || "data"));
    context.site.pages = readPages(path.join(context.source, config?.pagesDir || "pages"), ".html", config?.frontmatter, c => c);
    context.site.assets = readAssets(path.join(context.source, config?.assetsDir || "assets"), config?.frontmatter);
    dispatch("beforeEmit", []);
    // 4. save pages
    context.site.pages.forEach(page => {
        compiler.addPartial("content", page.content); // register page content as partial
        const content = compiler({
            site: context.site,
            layout: context.layout,
            page: page,
        });
        dispatch("emitPage", [page, content]);
        saveFile(path.join(context.destination, page.url), content);
    });
    // 5. save assets
    Object.values(context.site.assets).forEach(asset => {
        dispatch("emitAsset", [asset]);
        saveFile(path.join(context.destination, asset.url), asset.content);
    });
    dispatch("done", []);
};

// plugin to read and include posts in markdown
const postsPlugin = (options = {}) => {
    return context => {
        context.hooks.beforeEmit.add(() => {
            const posts = readPages(path.join(context.source, options?.dir || "posts"), [".md"], context.site.frontmatter, options?.parser);
            context.site.posts = posts; // posts will be accesible in site.posts
            context.site.pages = [...context.site.pages, ...posts]; // posts will be included as pages also
        });
    };
};

// export
export default {run, createVirtualPage, frontmatter, postsPlugin};
