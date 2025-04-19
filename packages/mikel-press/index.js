import * as fs from "node:fs";
import * as path from "node:path";
import mikel from "mikel";

// @description press main function
// @param {Object} config - configuration object
// @param {String} config.source - source folder
// @param {String} config.destination - destination folder to save the files
// @param {Array} config.plugins - list of plugins to apply
const press = (config = {}) => {
    const {source, destination, plugins, extensions, mikelOptions, ...otherConfig} = config;
    const context = Object.freeze({
        config: otherConfig,
        source: path.resolve(source || "."),
        destination: path.resolve(destination || "./www"),
        extensions: extensions || [".html"],
        template: mikel.create("{{>content}}", mikelOptions || {}),
        plugins: [
            press.SourcePlugin({folder: ".", label: press.LABEL_PAGE}),
            ...plugins,
        ],
        nodes: [],
    });
    const getPlugins = name => context.plugins.filter(plugin => typeof plugin[name] === "function");
    // 1. load nodes into context
    const nodesPaths = new Set(); // prevent adding duplicated nodes
    getPlugins("load").forEach(plugin => {
        [plugin.load(context) || []].flat().forEach(node => {
            if (nodesPaths.has(node.source)) {
                throw new Error(`File ${node.source} has been already processed by another plugin`);
            }
            context.nodes.push(node);
            nodesPaths.add(node.source);
        });
    });
    // 2. transform nodes
    const transformPlugins = getPlugins("transform");
    context.nodes.forEach((node, _, allNodes) => {
        transformPlugins.forEach(plugin => {
            return plugin.transform(context, node, allNodes);
        });
    });
    // 3. filter nodes and get only the ones that are going to be emitted
    const shouldEmitPlugins = getPlugins("shouldEmit");
    const filteredNodes = context.nodes.filter((node, _, allNodes) => {
        return shouldEmitPlugins.every(plugin => {
            return !!plugin.shouldEmit(context, node, allNodes);
        });
    });
    // 4. before emit
    getPlugins("beforeEmit").forEach(plugin => {
        return plugin.beforeEmit(context);
    });
    // 5. emit each node
    const emitPlugins = getPlugins("emit");
    filteredNodes.forEach((node, _, allNodes) => {
        emitPlugins.forEach(plugin => {
            return plugin.emit(context, node, allNodes);
        });
    });
};

// @description general utilities
press.utils = {
    // @description read a file from disk
    // @param {String} file path to the file to read
    read: (file, encoding = "utf8") => {
        return fs.readFileSync(file, encoding);
    },
    // @description write a file to disk
    // @param {String} file path to the file to save
    // @param {String} content content to save
    write: (file, content = "") => {
        const folder = path.dirname(file);
        if (!fs.existsSync(folder)) {
            fs.mkdirSync(folder, {recursive: true});
        }
        fs.writeFileSync(file, content, "utf8");
    },
    // @description copy a file
    copy: (source, target) => {
        const folder = path.dirname(target);
        if (!fs.existsSync(folder)) {
            fs.mkdirSync(folder, {recursive: true});
        }
        fs.copyFileSync(source, target);
    },
    // @description get all files from the given folder and the given extensions
    readdir: (folder, extensions = "*") => {
        if (!fs.existsSync(folder) || !fs.statSync(folder).isDirectory()) {
            return [];
        }
        return fs.readdirSync(folder, "utf8")
            .filter(file => extensions === "*" || extensions.includes(path.extname(file)))
            .filter(file => fs.statSync(path.join(folder, file)).isFile());
    },
    // @description frontmatter parser
    // @params {String} content content to parse
    // @params {Function} parser parser function to use
    frontmatter: (content = "", parser = JSON.parse) => {
        const matches = Array.from(content.matchAll(/^(--- *)/gm))
        if (matches?.length === 2 && matches[0].index === 0) {
            return {
                body: content.substring(matches[1].index + matches[1][1].length).trim(),
                attributes: parser(content.substring(matches[0].index + matches[0][1].length, matches[1].index).trim()),
            };
        }
        return {body: content, attributes: {}};
    },
};

// assign constants
press.LABEL_PAGE = "page";
press.LABEL_ASSET = "asset";
press.LABEL_DATA = "asset/data";
press.LABEL_PARTIAL = "asset/partial";

// @description source plugin
press.SourcePlugin = (options = {}) => {
    return {
        name: "SourcePlugin",
        load: context => {
            const folder = path.join(context.source, options?.folder || ".");
            return press.utils.readdir(folder, options?.extensions || context.extensions).map(file => ({
                source: path.join(folder, file),
                label: options.label || press.LABEL_PAGE,
                path: path.join(options?.basePath || ".", file),
                url: path.normalize("/" + path.join(options?.basePath || ".", file)),
                content: press.utils.read(path.join(folder, file)),
            }));
        },
    };
};

// @description loader plugins
press.DataPlugin = (options = {}) => {
    return press.SourcePlugin({folder: "./data", extensions: [".json"], label: press.LABEL_DATA, ...options});
};
press.PartialsPlugin = (options = {}) => {
    return press.SourcePlugin({folder: "./partials", extensions: [".html"], label: press.LABEL_PARTIAL, ...options});
};

// @description frontmatter plugin
press.FrontmatterPlugin = () => {
    return {
        name: "FrontmatterPlugin",
        transform: (_, node) => {
            if (typeof node.content === "string") {
                const result = press.utils.frontmatter(node.content, JSON.parse);
                node.content = result.content;
                node.attributes = result.attributes || {};
                node.title = node.attributes?.title || node.path;
                if (node.attributes.permalink) {
                    node.path = node.attributes.permalink;
                    node.url = path.normalize("/" + node.path);
                }
            }
        },
    };
};

// @description plugin to generate pages content
press.ContentPagePlugin = (siteData = {}) => {
    return {
        name: "ContentPagePlugin",
        shouldEmit: (context, node) => {
            return ![press.LABEL_ASSET, press.LABEL_DATA, press.LABEL_PARTIAL].includes(node.label);
        },
        beforeEmit: context => {
            const getNodes = label => context.nodes.filter(n => n.label === label);
            // 1. prepare site data
            Object.assign(siteData, context.config, {
                pages: getNodes(press.LABEL_PAGE),
                data: Object.fromEntries(getNodes(press.LABEL_DATA).map(node => {
                    return [path.basename(node.path, ".json"), JSON.parse(node.content)];
                })),
                partials: getNodes(press.LABEL_PARTIAL),
                assets: getNodes(press.LABEL_ASSET),
            });
            // 2. register partials into template
            siteData.partials.forEach(partial => {
                context.template.addPartial(path.basename(partial.path), {
                    body: partial.content,
                    attributes: partial.attributes || {},
                });
            });
        },
        emit: (context, node) => {
            if (node.label === press.LABEL_PAGE && typeof node.content === "string") {
                context.template.use(ctx => {
                    ctx.tokens = mikel.tokenize(node.content || "");
                });
                // compile and write the template
                const result = context.template({site: siteData, page: node});
                press.utils.write(path.join(context.destination, node.path), result);
            }
        },
    };
};

// @description copy plugin
press.CopyAssetsPlugin = (options = {}) => {
    return {
        name: "CopyAssetsPlugin",
        beforeEmit: context => {
            (options.patterns || [])
                .filter(item => !!item.from && !!item.to && fs.existsSync(item.from))
                .forEach(item => press.utils.copy(item.from, path.join(context.destination, item.to)));
        },
    };
};

// export press generator
export default press;
