import * as fs from "node:fs";
import * as path from "node:path";
import mikel from "mikel";

// @description general utilities
const utils = {
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
    readdir: (folder, ext = "*") => {
        if (!fs.existsSync(folder) || !fs.statSync(folder).isDirectory()) {
            return [];
        }
        return fs.readdirSync(folder, "utf8").filter(file => {
            return (ext === "*" || ext.includes(path.extname(file))) && fs.statSync(path.join(folder, file)).isFile();
        });
    },
    // @description frontmatter parser
    // @params {String} content content to parse
    // @params {Function} parser parser function to use
    frontmatter: (content = "", parser = JSON.parse) => {
        const matches = Array.from(content.matchAll(/^(--- *)/gm))
        if (matches?.length === 2 && matches[0].index === 0) {
            return [
                content.substring(matches[1].index + matches[1][1].length).trim(),
                parser(content.substring(matches[0].index + matches[0][1].length, matches[1].index).trim()),
            ];
        }
        return [content, {}];
    },
};

// @description get nodes with the specified label
const getNodesByLabel = (nodes, label) => {
    return Array.from(nodes).filter(node => node.label === label);
};

// @description get plugins with the specified function
const getPlugins = (plugins, functionName) => {
    return plugins.filter(plugin => typeof plugin[functionName] === "function");
};

// @description press main function
// @param {Object} config - configuration object
// @param {String} config.source - source folder
// @param {String} config.destination - destination folder to save the files
const press = config => {
    const {source, destination, plugins, ...otherConfiguration} = config;
    const context = Object.freeze({
        config: otherConfiguration,
        source: path.resolve(source || "."),
        destination: path.resolve(destination || "./www"),
        template: mikel.create("{{>content}}", {}),
        plugins: plugins || [],
        nodes: [],
    });
    // 1. load nodes into context
    const nodesPaths = new Set(); // prevent adding duplicated nodes
    getPlugins(context.plugins, "load").forEach(plugin => {
        const nodes = plugin.load(context) || [];
        [nodes].flat().forEach(node => {
            if (nodesPaths.has(node.source)) {
                throw new Error(`File ${node.source} has been already processed by another plugin`);
            }
            context.nodes.push(node);
            nodesPaths.add(node.source);
        });
    });
    // 2. transform nodes
    const transformPlugins = getPlugins(context.plugins, "transform");
    context.nodes.forEach((node, _, allNodes) => {
        transformPlugins.forEach(plugin => {
            return plugin.transform(context, node, allNodes);
        });
    });
    // 3. filter nodes and get only the ones that are going to be emitted
    const shouldEmitPlugins = getPlugins(context.plugins, "shouldEmit");
    const filteredNodes = context.nodes.filter((node, _, allNodes) => {
        for (let i = 0; i < shouldEmitPlugins.length; i++) {
            const plugin = shouldEmitPlugins[i];
            if (!plugin.shouldEmit(context, node, allNodes)) {
                return false;
            }
        }
        return true;
    });
    // 4. before emit
    getPlugins(context.plugins, "beforeEmit").forEach(plugin => {
        return plugin.beforeEmit(context);
    });
    // 5. emit each node
    const emitPlugins = getPlugins(context.plugins, "emit");
    filteredNodes.forEach((node, _, allNodes) => {
        emitPlugins.forEach(plugin => {
            return plugin.emit(context, node, allNodes);
        });
    });
};

// @description source plugin
press.SourcePlugin = (options = {}, ids = new Set()) => {
    return {
        name: "SourcePlugin",
        load: context => {
            const folder = path.join(context.source, options?.folder || ".");
            return utils.readdir(folder, options?.extensions || "*").map(file => {
                ids.add(path.join(folder, file)); // save the full path as id
                return {
                    source: path.join(folder, file),
                    path: file,
                    label: options?.label,
                };
            });
        },
        transform: (_, node) => {
            if (ids.has(node.source)) {
                node.content = utils.read(node.source);
                node.url = path.normalize("/" + node.path);
            }
        },
    };
};

// @description aliases for loading pages, partials, and data
press.PagesPlugin = (folder = ".") => SourcePlugin({folder, extensions: [".html"], label: "page"});
press.PartialsPlugin = (folder = "./partials") => SourcePlugin({folder, extensions: [".html"], label: "partial"});
press.DataPlugin = (folder = "./data") => SourcePlugin({folder, extensions: [".json"], label: "data"});

// @description frontmatter plugin
// @params {Object} options options for this plugin
// @params {Array} options.extensions extensions to process. Default: [".md", ".markdown", ".html"]
// @params {Function} options.parser frontmatter parser (JSON.parse, YAML.load)
press.FrontmatterPlugin = (options = {}) => {
    return {
        name: "FrontmatterPlugin",
        transform: (_, node) => {
            if (typeof node.content === "string") {
                const [content, attributes] = utils.frontmatter(node.content, options.parser || JSON.parse);
                node.content = content;
                node.attributes = attributes;
                // check for permalink in node.attributes
                node.path = node.attributes?.permalink || node.path;
                node.url = path.normalize("/" + node.path);
            }
        },
    };
};

// @description content plugin
press.ContentPlugin = (siteData = {}) => {
    return {
        name: "ContentPlugin",
        shouldEmit: (context, node) => {
            return node.label !== "asset/data" && node.label !== "asset/partial";
        },
        beforeEmit: context => {
            // 1. prepare site data
            Object.assign(siteData, context.config, {
                data: Object.fromEntries(getNodesByLabel(context.nodes, LABELS.DATA).map(node => {
                    return [path.basename(node.path, ".json"), JSON.parse(node.content)];
                })),
                pages: getNodesByLabel(context.nodes, LABELS.PAGE),
                partials: getNodesByLabel(context.nodes, LABELS.PARTIAL),
            });
            // 2. register partials into template
            siteData.partials.forEach(partial => {
                const partialName = path.basename(partial.path, path.extname(partial.path));
                context.template.addPartial(partialName, {
                    body: partial.content,
                    attributes: partial.attributes || {},
                });
            });
        },
        emit: (context, node) => {
            if (node.label === "page" && typeof node.content === "string") {
                context.template.use(ctx => {
                    ctx.tokens = mikel.tokenize(node.content || "");
                });
                // compile and write the template
                const result = context.template({site: siteData, page: node});
                utils.write(path.join(context.destination, node.path), result);
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
                .forEach(item => utils.copy(item.from, path.join(context.destination, item.to)));
        },
    };
};

// assign other utils
press.utils = utils;

// export press generator
export default press;
