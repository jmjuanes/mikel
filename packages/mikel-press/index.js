import * as fs from "node:fs";
import * as path from "node:path";
import * as http from "node:http";
import mikel from "mikel";

// @description default mime types
const DEFAULT_MIME_TYPES = {
    ".css": "text/css",
    ".gif": "image/gif",
    ".html": "text/html",
    ".ico": "image/vnd.microsoft.icon",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".js": "text/javascript",
    ".json": "application/json",
    ".mjs": "text/javascript",
    ".png": "image/png",
    ".svg": "image/svg+xml",
    ".txt": "text/plain", 
};

// @description default labels
const LABELS = {
    PAGE: "page",
    ASSET: "asset",
    DATA: "asset/data",
    PARTIAL: "asset/partial",
    LAYOUT: "asset/layout",
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
    // @description walk through the given folder and get all files
    // @params {String} folder folder to walk through
    // @params {Array|String} extensions extensions to include. Default: "*"
    walkdir: (folder, extensions = "*") => {
        const files = [];
        const walkSync = currentFolder => {
            const fullFolderPath = path.join(folder, currentFolder);
            fs.readdirSync(fullFolderPath).forEach(file => {
                const filePath = path.join(currentFolder, file);
                const fullFilePath = path.join(fullFolderPath, file);
                if (fs.statSync(fullFilePath).isDirectory()) {
                    return walkSync(filePath);
                }
                if (extensions === "*" || extensions.includes(path.extname(file))) {
                    files.push(filePath);
                }
            });
        };
        walkSync("./");
        return files;
    },
    // @description watch for file changes
    // @param {String} filePath path to the file to watch
    // @param {Function} listener method to listen for file changes
    watch: (filePath, listener) => {
        let lastModifiedTime = null;
        fs.watch(filePath, "utf8", () => {
            const modifiedTime = fs.statSync(filePath).mtimeMs;
            if (lastModifiedTime !== modifiedTime) {
                lastModifiedTime = modifiedTime;
                return listener(filePath);
            }
        });
    },
    // @description change the properties of the given path (dirname, basename, extname)
    format: (filePath, options = {}) => {
        const dirname = options.dirname || path.dirname(filePath);
        const extname = options.extname || path.extname(filePath);
        const basename = options.basename || path.basename(filePath, path.extname(filePath));
        return path.join(dirname, `${basename}${extname}`);
    },
    // @description get the mime type from the given extension
    getMimeType: (extname = ".txt") => {
        return DEFAULT_MIME_TYPES[extname] || "text/plain";
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

// @description get all nodes to update
const getNodesToUpdate = (graph, affectedNode) => {
    const listOfAffectedNodes = new Set();
    const walkNodes = currentNode => {
        listOfAffectedNodes.add(currentNode);
        return graph.forEach(edge => {
            if (edge[0] === currentNode && !listOfAffectedNodes.has(edge[1])) {
                walkNodes(edge[1]);
            }
        });
    };
    walkNodes(affectedNode);
    return listOfAffectedNodes;
};

// @description get plugins with the specified function
const getPlugins = (plugins, functionName) => {
    return plugins.filter(plugin => typeof plugin[functionName] === "function");
};

// create a new context from the provided configuration
const createContext = config => {
    const {source, destination, plugins, ...otherConfiguration} = config;
    const context = Object.freeze({
        config: otherConfiguration,
        source: path.resolve(source || "."),
        destination: path.resolve(destination || "./www"),
        plugins: plugins || [],
        template: mikel.create("{{>content}}", {}),
        nodes: [],
        edges: [],
    });
    // load nodes into context
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
    // generate dependency graph
    const edgesPaths = new Set(); // prevent adding duplicated edges
    getPlugins(context.plugins, "getDependencyGraph").forEach(plugin => {
        (plugin.getDependencyGraph(context) || []).forEach(edge => {
            if (!edge.every(node => nodesPaths.has(node))) {
                throw new Error(`Dependency graph contains nodes that have not been loaded`);
            }
            const edgePath = edge.join(" -> ");
            if (!edgesPaths.has(edgePath)) {
                context.edges.push(edge);
                edgesPaths.add(edgePath);
            }
        });
    });
    // return context
    return context;
};

// @description build context
const buildContext = (context, nodes = null) => {
    const nodesToBuild = (nodes && Array.isArray(nodes)) ? nodes : context.nodes;
    // reset nodes path
    nodesToBuild.forEach(node => {
        node.data.path = node.path;
    });
    // transform nodes
    const transformPlugins = getPlugins(context.plugins, "transform");
    nodesToBuild.forEach((node, _, allNodes) => {
        transformPlugins.forEach(plugin => {
            return plugin.transform(context, node, allNodes);
        });
    });
    // filter nodes and get only the ones that are going to be emitted
    const shouldEmitPlugins = getPlugins(context.plugins, "shouldEmit");
    const filteredNodes = nodesToBuild.filter((node, _, allNodes) => {
        for (let i = 0; i < shouldEmitPlugins.length; i++) {
            const plugin = shouldEmitPlugins[i];
            if (!plugin.shouldEmit(context, node, allNodes)) {
                return false;
            }
        }
        return true;
    });
    // before emit
    getPlugins(context.plugins, "beforeEmit").forEach(plugin => {
        return plugin.beforeEmit(context);
    });
    // emit each node
    const emitPlugins = getPlugins(context.plugins, "emit");
    filteredNodes.forEach((node, _, allNodes) => {
        emitPlugins.forEach(plugin => {
            return plugin.emit(context, node, allNodes);
        });
    });
};

// @description start a watch on the current context
const watchContext = context => {
    // force to rebuild
    const rebuild = changedNodePath => {
        const nodesPathsToBuild = getNodesToUpdate(context.edges, changedNodePath);
        const nodesToRebuild = context.nodes.filter(node => {
            return nodesPathsToBuild.has(path.join(node.source, node.path));
        });
        // perform the rebuild of the context
        buildContext(context, nodesToRebuild);
    };
    // create a watch for each registered node in the context
    context.nodes.forEach(node => {
        return utils.watch(path.join(node.source, node.path), rebuild);
    });
};

// @description start a server on the current context
// @param {Object} context current site context
// @param {Object} options server options
// @param {String} options.port port that the server will listen. Default: "3000"
// @param {Function} options.getMimeType function to obtain the associated mime type from the given extension
const serveContext = (context, options = {}) => {
    const port = parseInt(options?.port || "3000");
    const getMimeType = options?.getMimeType || utils.getMimeType;
    const server = http.createServer((request, response) => {
        let responseCode = 200;
        let url = path.join(context.destination, path.normalize(request.url));
        // check for directory
        if (url.endsWith("/") || (fs.existsSync(url) && fs.statSync(url).isDirectory())) {
            url = path.join(url, "index.html");
        }
        // check if we have to append the '.html' extension
        if (!fs.existsSync(url) && fs.existsSync(url + ".html")) {
            url = url + ".html";
        }
        // check if the file does not exist
        if (!fs.existsSync(url)) {
            url = path.join(context.destination, "404.html");
            responseCode = 404;
        }
        // send the file
        response.writeHead(responseCode, {
            "Content-Type": getMimeType?.(path.extname(url)) || "text/plain",
        });
        fs.createReadStream(url).pipe(response);
        console.log(`[${responseCode}] ${request.method} ${request.url}`);
    });
    // launch server
    server.listen(port);
    console.log(`Server running at http://127.0.0.1:${port}/`);
};

// @description source plugin
const SourcePlugin = (options = {}) => {
    return {
        name: "SourcePlugin",
        load: context => {
            const folder = path.resolve(context.source, options?.source || "");
            const nodes = utils.walkdir(folder, options?.extensions || "*").map(file => {
                return createNode(folder, file, options?.label || LABELS.PAGE);
            });
            return nodes;
        },
        transform: (_, node) => {
            if (node.label === options.label) {
                if (!(options?.binaryExtensions || []).includes(path.extname(node.path))) {
                    node.data.content = utils.read(path.join(node.source, node.path));
                }
                node.data.path = path.join(options?.base || "", node.path);
                node.data.url = path.normalize("/" + node.data.path);
            }
        },
    };
};

// @description alias to Source plugin
const PagesPlugin = (options = {}) => {
    return SourcePlugin({
        extensions: options?.extensions || [".html", ".htm"],
        label: options?.label || LABELS.PAGE,
        source: options?.source || "./pages",
    });
};

// @description assets plugin
const AssetsPlugin = (options = {}) => {
    return SourcePlugin({
        extensions: options?.extensions || "*",
        label: options?.label || LABELS.ASSET,
        source: options?.source || "./assets",
        base: options?.base ?? "assets",
        binaryExtensions: options?.binaryExtensions || [".png", ".jpg", ".jpeg", ".gif", ".ico"],
    });
};

// @description partials plugin
const PartialsPlugin = (options = {}) => {
    return {
        ...SourcePlugin({
            extensions: options?.extensions || [".html", ".htm"],
            source: options?.source || "./partials",
            label: options?.label || LABELS.PARTIAL,
        }),
        name: "PartialsPlugin",
        shouldEmit: (_, node) => {
            return node.label !== (options?.label || LABELS.PARTIAL);
        },
    };
};

// @description data plugin
const DataPlugin = (options = {}) => {
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
                node.data.name = path.basename(node.path, ".json");
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
const FrontmatterPlugin = (options = {}) => {
    const extensions = options.extensions || [".md", ".markdown", ".html"];
    return {
        name: "FrontmatterPlugin",
        transform: (_, node) => {
            if ((extensions === "*" || extensions.includes(path.extname(node.path))) && typeof node.data.content === "string") {
                node.data.attributes = {};
                const matches = Array.from(node.data.content.matchAll(/^(--- *)/gm))
                if (matches?.length === 2 && matches[0].index === 0) {
                    const front = node.data.content.substring(0 + matches[0][1].length, matches[1].index).trim();
                    node.data.content = node.data.content.substring(matches[1].index + matches[1][1].length).trim();
                    if (typeof options.parser === "function") {
                        node.data.attributes = options.parser(front);
                    }
                }
            }
        },
    };
};

// @description permalink plugin
const PermalinkPlugin = () => {
    return {
        name: "PermalinkPlugin",
        transform: (_, node) => {
            node.data.path = node.data?.attributes?.permalink || node.data.path;
            node.data.url = path.normalize("/" + node.data.path);
        },
    };
};

// @description markdown plugin
// @params {Object} options options for this plugin
// @params {Object} options.parser markdown parser (for example marked.parse)
const MarkdownPlugin = (options = {}) => {
    return {
        name: "MarkdownPlugin",
        transform: (_, node) => {
            if (path.extname(node.path) === ".md" || path.extname(node.path) === ".markdown") {
                node.data.content = options.parser(node.data.content);
                node.data.path = utils.format(node.data.path, {extname: ".html"});
            }
        },
    };
};

// @description content plugin
const ContentPlugin = (options = {}, pluginContext = {}) => {
    return {
        name: "ContentPlugin",
        load: context => {
            const layout = path.resolve(context.source, context.config.layout || options.layout || "./layout.html");
            if (fs.existsSync(layoutPath)) {
                pluginContext.layout = createNode(path.dirname(layout), path.basename(layout), LABELS.LAYOUT);
            }
            return pluginContext.layout;
        },
        transform: (_, node) => {
            if (node.label === LABELS.LAYOUT) {
                node.data.content = utils.read(path.join(node.source, node.path));
            }
        },
        getDependencyGraph: context => {
            const graph = [];
            const extensions = context.config?.extensions || [".html", ".htm"];
            context.nodes.forEach(node => {
                if (pluginContext.layout && node.label !== LABELS.LAYOUT && extensions.includes(path.extname(node.path))) {
                    graph.push([
                        path.join(pluginContext.layout.source, pluginContext.layout.path),
                        path.join(node.source, node.path),
                    ]);
                }
            });
            return graph;
        },
        shouldEmit: (_, node) => {
            return node.label !== LABELS.LAYOUT;
        },
        beforeEmit: context => {
            // prepare site data
            pluginContext.siteData = Object.assign({}, context.config, {
                data: Object.fromEntries(getNodesByLabel(context.nodes, LABELS.DATA).map(node => {
                    return [node.data.name, node.data.content];
                })),
                pages: getNodesByLabel(context.nodes, LABELS.PAGE).map(n => n.data),
                assets: getNodesByLabel(context.nodes, LABELS.ASSET).map(n => n.data),
                partials: getNodesByLabel(context.nodes, LABELS.PARTIAL).map(n => n.data),
            });
            // use layout in template
            if (pluginContext?.layout?.data?.content) {
                context.template.use(ctx => {
                    ctx.tokens = mikel.tokenize(pluginContext.layout.data.content || "{{>content}}");
                });
            }
            // register partials
            pluginContext.siteData.partials.forEach(partial => {
                const name = path.basename(partial.path, path.extname(partial.path));
                context.template.addPartial(name, {
                    body: partial.content,
                    attributes: partial.attributes || {},
                });
            });
        },
        emit: (context, node) => {
            const destination = path.join(context.destination, node.data?.path || node.path);
            // 1. check for page node
            if (node.label === LABELS.PAGE) {
                context.template.addPartial("content", node.data.content);
                utils.write(destination, context.template({
                    site: pluginContext.siteData,
                    page: node.data,
                    layout: pluginContext.layout?.data || {},
                }));
            }
            // 2. check for asset node with content in the node
            else if (node.label === LABELS.ASSET && node.data?.content) {
                utils.write(destination, node.data.content);
            }
            // 3. check for asset node without content in the node
            else if (node.label === LABELS.ASSET) {
                utils.copy(path.join(node.source, node.path), destination);
            }
        },
    };
};

// @description copy plugin
const CopyAssetsPlugin = (options = {}) => {
    return {
        name: "CopyAssetsPlugin",
        emit: context => {
            (options.patterns || []).forEach(item => {
                if (item.from && item.to && fs.existsSync(item.from)) {
                    utils.copy(item.from, path.join(context.destination, item.to));
                }
            });
        },
    };
};

// @description default export of mikel-press
export default {
    // @description run mikel-press and generate the static site
    // @param {Object} config configuration object
    build: config => {
        buildContext(createContext(config));
    },
    // @description watch for changes in the source folder and rebuild the site
    // @param {Object} config configuration object
    watch: config => {
        const context = createContext(config);
        buildContext(context, context.nodes);
        watchContext(context);
    },
    // utilities for working with files
    utils: utils,
    // helpers for working with the context
    createNode: createNode,
    createContext: createContext,
    buildContext: buildContext,
    watchContext: watchContext,
    serveContext: serveContext,
    // plugins 
    SourcePlugin: SourcePlugin,
    PagesPlugin: PagesPlugin,
    AssetsPlugin: AssetsPlugin,
    PartialsPlugin: PartialsPlugin,
    DataPlugin: DataPlugin,
    MarkdownPlugin: MarkdownPlugin,
    FrontmatterPlugin: FrontmatterPlugin,
    PermalinkPlugin: PermalinkPlugin,
    ContentPlugin: ContentPlugin,
    CopyAssetsPlugin: CopyAssetsPlugin,
    // constants
    LABELS: LABELS,
};
