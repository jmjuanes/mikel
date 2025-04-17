import * as fs from "node:fs";
import * as path from "node:path";
import mikel from "mikel";

// @description default labels
const LABELS = {
    PAGE: "page",
    ASSET_DATA: "asset/data",
    ASSET_PARTIAL: "asset/partial",
};

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
    readdir: (folder, extensions = "*") => {
        if (!fs.existsSync(folder) || !fs.statSync(folder).isDirectory()) {
            return [];
        }
        return fs.readdirSync(folder, "utf8").filter(file => {
            return extensions === "*" || extensions.includes(path.extname(file));
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

// @description add a new node item
const createNode = (source, path, label = "", data = {}) => {
    return {source, path, label, data};
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
        plugins: plugins || [],
        nodes: [],
    });
    // 1. load nodes into context
    const nodesPaths = new Set(); // prevent adding duplicated nodes
    getPlugins(context.plugins, "load").forEach(plugin => {
        const nodes = plugin.load(context) || [];
        [nodes].flat().forEach(node => {
            const nodeFullPath = path.join(node.source, node.path);
            if (nodesPaths.has(nodeFullPath)) {
                throw new Error(`File ${nodeFullPath} has been already processed by another plugin`);
            }
            context.nodes.push(node);
            nodesPaths.add(nodeFullPath);
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
press.SourcePlugin = () => {
    return {
        name: "SourcePlugin",
        load: context => {
            // 1. prepare folders paths
            const extensions = context.config.extensions || [".html", ".htm"];
            const pagesFolder = path.resolve(context.source, context.config.pagesDirectory || "./pages");
            const partialsFolder = path.resolve(context.source, context.config.partialsDirectory || "./partials");
            // 2. read all files from the source folders
            return [
                ...utils.readdir(pagesFolder, extensions).map(file => {
                    return createNode(pagesFolder, file, LABELS.PAGE);
                }),
                ...utils.readdir(partialsFolder, extensions).map(file => {
                    return createNode(partialsFolder, file, LABELS.ASSET_PARTIAL);
                }),
            ];
        },
        transform: (_, node) => {
            if (node.label === LABELS.PAGE || node.label === LABELS.ASSET_PARTIAL) {
                node.data.content = utils.read(path.join(node.source, node.path));
                node.data.path = node.path;
                node.data.url = path.normalize("/" + node.data.path);
            }
        },
        shouldEmit: (_, node) => {
            return node.label !== LABELS.ASSET_PARTIAL;
        },
    };
};

// @description data plugin
press.DataPlugin = (options = {}) => {
    const label = options?.label || LABELS.DATA;
    return {
        name: "DataPlugin",
        load: context => {
            const folder = path.resolve(context.source, options.source || "./data");
            return utils.readdir(folder, [".json"]).map(file => {
                return createNode(folder, file, label);
            });
        },
        transform: (_, node) => {
            if (node.label === label && path.extname(node.path) === ".json") {
                node.data.content = JSON.parse(utils.read(path.join(node.source, node.path)));
            }
        },
        shouldEmit: (_, node) => {
            return node.label !== label;
        },
    };
};

// @description frontmatter plugin
// @params {Object} options options for this plugin
// @params {Array} options.extensions extensions to process. Default: [".md", ".markdown", ".html"]
// @params {Function} options.parser frontmatter parser (JSON.parse, YAML.load)
press.FrontmatterPlugin = (options = {}) => {
    return {
        name: "FrontmatterPlugin",
        transform: (_, node) => {
            if (typeof node.data.content === "string") {
                const [content, attributes] = utils.frontmatter(node.data.content, options.parser || JSON.parse);
                node.data.content = content;
                node.data.attributes = attributes;
            }
        },
    };
};

// @description permalink plugin
press.PermalinkPlugin = () => {
    return {
        name: "PermalinkPlugin",
        transform: (_, node) => {
            node.data.path = node.data?.attributes?.permalink || node.data.path;
            node.data.url = path.normalize("/" + node.data.path);
        },
    };
};

// @description content plugin
press.ContentPlugin = (options = {}, template = {}) => {
    return {
        name: "ContentPlugin",
        beforeEmit: context => {
            // 1. prepare site data
            template.siteData = Object.assign({}, context.config, {
                data: Object.fromEntries(getNodesByLabel(context.nodes, LABELS.ASSET_DATA).map(node => {
                    return [path.basename(node.path, ".json"), node.data.content];
                })),
                pages: getNodesByLabel(context.nodes, LABELS.PAGE).map(n => n.data),
                partials: getNodesByLabel(context.nodes, LABELS.ASSET_PARTIAL).map(n => n.data),
            });
            // 2. generate options
            template.options = Object.assign({}, options, {
                partials: {
                    ...Object.fromEntries(template.siteData.partials.map(partial => {
                        const partialName = path.basename(partial.path, path.extname(partial.path));
                        const partialContent = {
                            body: partial.content,
                            attributes: partial.attributes || {},
                        };
                        return [partialName, partialContent];
                    })),
                    ...options.partials,
                },
            });
        },
        emit: (context, node) => {
            if (node.label === LABELS.PAGE && typeof node.data.content === "string") {
                const data = {
                    site: template.siteData,
                    page: node.data,
                };
                const result = mikel(node.data.content, data, template.options);
                utils.write(path.join(context.destination, node.data?.path || node.path), result);
            }
        },
    };
};

// @description copy plugin
press.CopyAssetsPlugin = (options = {}) => {
    return {
        name: "CopyAssetsPlugin",
        emit: context => {
            (options.patterns || []).forEach(item => {
                if (item.from && item.to && fs.existsSync(item.from)) {
                    utils.copy(item.from, path.join(context.destination, options?.basePath || options?.base || "", item.to));
                }
            });
        },
    };
};

// assign other utils
press.utils = utils;
press.createNode = createNode;
press.getNodesByLabel = getNodesByLabel;

// export press generator
export default press;
