import * as fs from "node:fs";
import * as path from "node:path";
import mikel from "mikel";

// @description read a file from disk
export const read = (file, encoding = "utf8") => {
    return fs.readFileSync(file, encoding);
};

// @description write a file to disk
export const write = (file, content) => {
    const folder = path.dirname(file);
    if (!fs.existsSync(folder)) {
        fs.mkdirSync(folder, {recursive: true});
    }
    fs.writeFileSync(file, content, "utf8");
};

// @description copy a file
export const copy = (source, target) => {
    const folder = path.dirname(target);
    if (!fs.existsSync(folder)) {
        fs.mkdirSync(folder, {recursive: true});
    }
    fs.copyFileSync(source, target);
};

// @description get all files from the given folder and the given extensions
export const readdir = (folder, extensions = "*") => {
    if (!fs.existsSync(folder) || !fs.statSync(folder).isDirectory()) {
        return [];
    }
    return fs.readdirSync(folder, "utf8").filter(file => {
        return extensions === "*" || extensions.includes(path.extname(file));
    });
};

// @description walk through the given folder and get all files
// @params {String} folder folder to walk through
// @params {Array|String} extensions extensions to include. Default: "*"
export const walkdir = (folder, extensions = "*") => {
    const files = [];
    const walkSync = currentFolder => {
        fs.readdirSync(currentFolder).forEach(file => {
            const pathToFile = path.join(currentFolder, file);
            if (fs.statSync(pathToFile).isDirectory()) {
                return walkSync(pathToFile);
            }
            if (extensions === "*" || extensions.includes(path.extname(file))) {
                files.push(pathToFile);
            }
        });
    };
    walkSync(folder);
    return files;
};

// @description change the properties of the given path (dirname, basename, extname)
export const formatPath = (filePath, options = {}) => {
    const dirname = options.dirname || path.dirname(filePath);
    const extname = options.extname || path.extname(filePath);
    const basename = options.basename || path.basename(filePath, path.extname(filePath));
    return path.join(dirname, `${basename}${extname}`);
};

// @description watch for file changes
export const watch = (filePath, listener) => {
    let lastModifiedTime = null;
    fs.watch(filePath, "utf8", () => {
        const modifiedTime = fs.statSync(filePath).mtimeMs;
        if (lastModifiedTime !== modifiedTime) {
            lastModifiedTime = modifiedTime;
            return listener(filePath);
        }
    });
};

// @description add a new node item
export const createNode = (source, path, label = "", data = {}) => {
    return {source, path, label, data};
};

// @description get nodes with the specified label
export const getNodesByLabel = (nodes, label) => {
    return Array.from(nodes).filter(node => node.label === label);
};

// @description get all nodes to update
const getNodesToUpdate = (graph, affectedNode, listOfAffectedNodes) => {
    listOfAffectedNodes.add(affectedNode);
    return graph.forEach(edge => {
        if (edge[0] === affectedNode && !listOfAffectedNodes.has(edge[1])) {
            getNodesToUpdate(graph, edge[1], listOfAffectedNodes);
        }
    });
};

// @description get plugins with the specified function
export const getPlugins = (plugins, functionName) => {
    return plugins.filter(plugin => typeof plugin[functionName] === "function");
};

// create a new context from the provided configuration
export const createContextFromConfig = config => {
    const {source, destination, plugins, ...otherConfiguration} = config;
    const context = Object.freeze({
        config: otherConfiguration,
        source: path.resolve(source || "."),
        destination: path.resolve(destination || "./www"),
        plugins: plugins || [],
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

// partial build context
export const partialBuildContext = (context, nodesToBuild = []) => {
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
    // emit each node
    getPlugins(context.plugins, "emit").forEach(plugin => {
        return plugin.emit(context, filteredNodes);
    });
};

// @description start context watch
export const startContextWatch = context => {
    // const nodesMap = new Map(context.nodes.map(node => {
    //     return [path.join(node.source, node.path), node];
    // }));
    // force to rebuild
    const rebuild = changedNodePath => {
        const nodesPathsToBuild = new Set();
        getNodesToUpdate(context.edges, changedNodePath, nodesPathsToBuild);
        const nodesToRebuild = context.nodes.filter(node => {
            return nodesPathsToBuild.has(path.join(node.source, node.path));
        });
        // perform the rebuild of the context
        partialBuildContext(context, nodesToRebuild);
    };
    // create a watch for each registered node in the context
    context.nodes.forEach(node => {
        return watch(path.join(node.source, node.path), rebuild);
    });
};

// @description source plugin
export const SourcePlugin = (options = {}) => {
    const label = options.label || "pages";
    return {
        name: "SourcePlugin",
        load: context => {
            const folder = path.resolve(context.source, options.source || "./content");
            const nodes = walkdir(folder, options?.extensions || "*").map(file => {
                return createNode(folder, file, label);
            });
            return nodes;
        },
        transform: (_, node) => {
            if (node.label === label) {
                node.data.content = read(path.join(node.source, node.path));
            }
        },
    };
};

// @description data plugin
export const DataPlugin = (options = {}) => {
    const label = options?.label || "asset/data";
    return {
        name: "DataPlugin",
        load: context => {
            const folder = path.resolve(context.source, options.source || "./data");
            return readdir(folder, [".json"]).map(file => {
                return createNode(folder, file, label);
            });
        },
        transform: (_, node) => {
            if (node.label === label && path.extname(node.path) === ".json") {
                node.data.name = path.basename(node.path, ".json");
                node.data.content = JSON.parse(read(path.join(node.source, node.path)));
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
// @params {Function} options.parser frontmatter parser
export const FrontmatterPlugin = (options = {}) => {
    const extensions = options.extensions || [".md", ".markdown", ".html"];
    return {
        name: "FrontmatterPlugin",
        transform: (_, node) => {
            if ((extensions === "*" || extensions.includes(path.extname(node.path))) && typeof node.data.content === "string") {
                const {body, attributes} = options.parser(node.data.content);
                node.data.attributes = attributes;
                node.data.content = body;
            }
        },
    };
};

// @description permalink plugin
export const PermalinkPlugin = () => {
    return {
        name: "PermalinkPlugin",
        transform: (_, node) => {
            node.data.path = node.data?.attributes?.permalink || node.data.path;
            // node.data.url = path.normalize("/" + node.data.path);
        },
    };
};

// @description markdown plugin
// @params {Object} options options for this plugin
// @params {Object} options.parser markdown parser (for example marked.parse)
export const MarkdownPlugin = (options = {}) => {
    return {
        name: "MarkdownPlugin",
        transform: (_, node) => {
            if (path.extname(node.path) === ".md" || path.extname(node.path) === ".markdown") {
                // const marked = new Marked(options);
                // getPlugins(context.plugins, "markdownPlugins").forEach(plugin => {
                //     (plugin.markdownPlugins(context, node) || []).forEach(markedPlugin => {
                //         marked.use(markedPlugin);
                //     });
                // });
                node.data.content = options.parser(node.data.content);
                node.data.path = formatPath(node.data.path, {extname: ".html"});
            }
        },
    };
};

// @description content plugin
export const ContentPlugin = (options = {}) => {
    const label = options.label || "asset/template";
    const extensions = options.extensions || [".html", ".md", ".markdown"];
    return {
        name: "ContentPlugin",
        load: context => {
            return createNode(context.source, options.template, label);
        },
        transform: (context, node) => {
            if (node.label === label) {
                node.data.content = read(path.join(node.source, node.path));
            }
        },
        getDependencyGraph: context => {
            const graph = [];
            const template = getNodesByLabel(context.nodes, label)[0];
            context.nodes.forEach(node => {
                if (node.label !== label && extensions.includes(path.extname(node.path))) {
                    graph.push([
                        path.join(template.source, template.path),
                        path.join(node.source, node.path),
                    ]);
                }
            });
            return graph;
        },
        shouldEmit: (_, node) => {
            return node.label !== label;
        },
        emit: (context, nodesToEmit) => {
            // prepare site data
            const siteData = Object.assign({}, context.config, {
                data: Object.fromEntries(getNodesByLabel(context.nodes, "asset/data").map(node => {
                    return [node.data.name, node.data.content];
                })),
                pages: getNodesByLabel(context.nodes, "pages").map(n => n.data),
                posts: getNodesByLabel(context.nodes, "posts").map(n => n.data),
            });
            // get data files
            const template = getNodesByLabel(context.nodes, label)[0];
            const compiler = mikel.create(template.data.content, options);
            nodesToEmit.forEach(node => {
                if (extensions.includes(path.extname(node.path))) {
                    compiler.addPartial("content", node.data.content);
                    const content = compiler({
                        site: siteData,
                        page: node.data,
                        template: template.data,
                    });
                    const filePath = formatPath(node.data.path || node.path, {extname: ".html"});
                    write(path.join(context.destination, filePath), content);
                }
            });
        },
    };
};

// @description copy plugin
export const CopyAssetsPlugin = (options = {}) => {
    return {
        name: "CopyAssetsPlugin",
        emit: context => {
            (options.patterns || []).forEach(item => {
                if (item.from && item.to && fs.existsSync(item.from)) {
                    copy(item.from, path.join(context.destination, item.to));
                }
            });
        },
    };
};
