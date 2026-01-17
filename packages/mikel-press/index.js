import * as fs from "node:fs";
import * as path from "node:path";

// @description internal method to get the first node that ends with the provided string
const getNodeFromSource = (nodes = [], endingStr = "") => {
    return (nodes || []).find(node => (node.source || "").endsWith(endingStr || ""));
};

// @description get all plugins of the given type
const getPlugins = (context, name) => {
    return context.plugins.filter(plugin => typeof plugin[name] === "function");
};

// @description apply the layout to the provided node
const applyLayout = page => {
    return `{{>>layout:${page.attributes.layout}}}\n\n${page.content}\n\n{{/layout:${page.attributes.layout}}}\n`;
};

// @description generate the content for the redirection page
const generateRedirectHTML = (to, status) => {
    const content = [
        `<!DOCTYPE html>`,
        `<html lang="en">`,
        `<head>`,
        `    <meta charset="utf-8" />`,
        `    <title>Redirecting...</title>`,
        `    <meta http-equiv="refresh" content="0; url=${to}" />`,
        `    <link rel="canonical" href="${to}" />`,
        `    <script>window.location.replace("${to}");</script>`,
        `</head>`,
        `<body>`,
        `    <p>Redirectig to <a href="${to}">${to}</a>...</p>`,
        `</body>`,
        `</html>`,
    ];
    return content.join("\n");
};

// @description press main function
// @param {Object} config - configuration object
// @param {String} config.source - source folder
// @param {String} config.destination - destination folder to save the files
// @param {Array} config.plugins - list of plugins to apply
const press = (config = {}) => {
    const context = press.createContext(config);
    press.buildContext(context, context.nodes);
    if (config.watch === true) {
        press.watchContext(context);
    }
};

// @description create a context object
press.createContext = (config = {}) => {
    const { source, destination, plugins, extensions, exclude, template, watch, ...otherConfig } = config;
    const context = Object.freeze({
        config: otherConfig,
        source: path.resolve(source || "."),
        destination: path.resolve(destination || "./www"),
        extensions: extensions || [ ".html", ".mustache" ],
        exclude: exclude || [ "node_modules", ".git", ".gitignore", ".github" ],
        template: template,
        plugins: [
            press.SourcePlugin({ folder: ".", label: press.LABEL_PAGE }),
            ...plugins,
        ],
        nodes: [],
        actions: {},
    });
    // register helpers and funcions
    context.template.addFunction("getPageUrl", params => {
        return getNodeFromSource(params?.variables?.root?.site?.pages || [], params.args[0])?.url || "";
    });
    context.template.addFunction("getAssetUrl", params => {
        return getNodeFromSource(params?.variables?.root?.site?.assets || [], params.args[0])?.url || "";
    });
    context.template.addHelper("pages", params => {
        const draft = params?.options?.draft ?? params?.opt?.draft;
        const collection = params?.opt?.collection || params?.options?.collection || null;
        const items = (params.data?.site?.pages || []).filter(page => {
            if (typeof draft === "boolean" && draft !== !!page?.attributes?.draft) {
                return false;
            }
            return !collection || page.attributes?.collection === collection;
        });
        const limit = Math.min(items.length, params.options?.limit || params.opt?.limit || items.length);
        return items.slice(0, limit).reverse().map((c, i) => params.fn(c, {index: i})).join("");
    });
    // initialize plugins
    getPlugins(context, "init").forEach(plugin => {
        return plugin.init(context);
    });
    // load nodes into context
    const nodesPaths = new Set(); // prevent adding duplicated nodes
    getPlugins(context, "load").forEach(plugin => {
        [plugin.load(context) || []].flat().forEach(node => {
            if (nodesPaths.has(node.source)) {
                throw new Error(`File ${node.source} has been already processed by another plugin`);
            }
            context.nodes.push(node);
            nodesPaths.add(node.source);
        });
    });
    return context;
};

// @description build the provided context
press.buildContext = (context, nodesToBuild = null) => {
    const nodes = (Array.isArray(nodesToBuild) ? nodesToBuild : context.nodes).slice();
    const createNode = (nodeLabel, nodeObject = {}) => {
        nodes.push({ label: nodeLabel, content: "", ...nodeObject });
    };
    // 0. assign actions to context
    Object.assign(context.actions, {
        createPage: pageObject => createNode(press.LABEL_PAGE, pageObject),
        createAsset: assetObject => createNode(press.LABEL_ASSET, assetObject),
    });
    // 1. transform nodes
    getPlugins(context, "transform").forEach(plugin => {
        // special hook to initialize the transform plugin
        if (typeof plugin.beforeTransform === "function") {
            plugin.beforeTransform(context);
        }
        // run the transform in all nodes
        nodes.forEach((node, _, allNodes) => {
            return plugin.transform(context, node, allNodes);
        });
    });
    // 2. filter nodes and get only the ones that are going to be emitted
    const shouldEmitPlugins = getPlugins(context, "shouldEmit");
    const filteredNodes = nodes.filter((node, _, allNodes) => {
        return shouldEmitPlugins.every(plugin => {
            return !!plugin.shouldEmit(context, node, allNodes);
        });
    });
    // 3. before emit
    getPlugins(context, "beforeEmit").forEach(plugin => {
        return plugin.beforeEmit(context);
    });
    // 4. emit each node
    filteredNodes.forEach(node => {
        // 1. if node has been processed (aka node.content is an string), write the file
        if (typeof node.content === "string") {
            press.utils.write(path.join(context.destination, node.path), node.content);
        }
        // 2. if node has not been processed, just copy the file
        else if (fs.existsSync(node.source)) {
            press.utils.copy(node.source, path.join(context.destination, node.path));
        }
    });
};

// @description start a watch on the current context
press.watchContext = (context, options = {}) => {
    const labelsToWatch = options.labels || [press.LABEL_PAGE, press.LABEL_PARTIAL, press.LABEL_DATA];
    const nodesToRebuild = context.nodes.filter(node => labelsToWatch.includes(node.label));
    const rebuild = () => press.buildContext(context, nodesToRebuild);
    // create a watch for each registered node in the context
    nodesToRebuild.forEach(node => {
        press.utils.watch(node.source, rebuild);
    });
};

// @description general utilities
press.utils = {
    // @description normalize a path
    normalizePath: (rawPath) => {
        return path.normalize("/" + rawPath);
    },
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
    readdir: (folder, extensions = "*", exclude = []) => {
        if (!fs.existsSync(folder) || !fs.statSync(folder).isDirectory()) {
            return [];
        }
        return fs.readdirSync(folder, "utf8")
            .filter(file => (extensions === "*" || extensions.includes(path.extname(file))) && !exclude.includes(file))
            .filter(file => fs.statSync(path.join(folder, file)).isFile());
    },
    // @description walk through the given folder and get all files
    // @params {String} folder folder to walk through
    // @params {Array|String} extensions extensions to include. Default: "*"
    walkdir: (folder, extensions = "*", exclude = []) => {
        const walkSync = (currentFolder, files = []) => {
            const fullFolderPath = path.join(folder, currentFolder);
            fs.readdirSync(fullFolderPath).forEach(file => {
                const filePath = path.join(currentFolder, file);
                const fullFilePath = path.join(fullFolderPath, file);
                if (fs.statSync(fullFilePath).isDirectory()) {
                    return walkSync(filePath, files);
                }
                if (extensions === "*" || extensions.includes(path.extname(file))) {
                    files.push(filePath);
                }
            });
            return files;
        };
        return walkSync("./", []);
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
press.LABEL_LAYOUT = "asset/layout";

// @description source plugin
press.SourcePlugin = (options = {}) => {
    const shouldEmit = options?.emit ?? true, shouldRead = options.read ?? true;
    const processedNodes = new Set();
    return {
        load: context => {
            const folder = path.join(context.source, options?.folder || ".");
            const extensions = options?.extensions || context.extensions;
            const exclude = options?.exclude || context.exclude;
            return press.utils.readdir(folder, extensions, exclude).map(file => {
                processedNodes.add(path.join(folder, file)); // register this node
                return {
                    source: path.join(folder, file),
                    label: options.label || press.LABEL_PAGE,
                    path: path.join(options?.basePath || ".", file),
                    url: press.utils.normalizePath(path.join(options?.basePath || ".", file)),
                };
            });
        },
        transform: (context, node) => {
            if (processedNodes.has(node.source) && shouldRead) {
                node.content = press.utils.read(node.source);
            }
        },
        shouldEmit: (context, node) => {
            return !processedNodes.has(node.source) || shouldEmit;
        },
    };
};

// @description data plugin
press.DataPlugin = (options = {}) => {
    return press.SourcePlugin({
        folder: "./data",
        emit: false,
        extensions: [".json"],
        label: press.LABEL_DATA,
        ...options,
    });
};

// @description partials plugin
press.PartialsPlugin = (options = {}) => {
    return press.SourcePlugin({
        folder: "./partials",
        emit: false,
        label: press.LABEL_PARTIAL,
        ...options,
    });
};

// @description assets plugin
press.AssetsPlugin = (options = {}) => {
    return press.SourcePlugin({
        folder: "./assets",
        read: false,
        extensions: "*",
        label: press.LABEL_ASSET,
        ...options,
    });
};

// @description layouts plugin
press.LayoutsPlugin = (options = {}) => {
    return press.SourcePlugin({
        folder: "./layouts",
        label: press.LABEL_LAYOUT,
        emit: false,
        ...options,
    });
};

// @description generic transform plugin
press.TransformPlugin = (options = {}) => {
    const transformFn = typeof options?.transform === "function" ? options.transform : options;
    return {
        transform: (context, node) => transformFn(node, context),
    };
};

// @description frontmatter plugin
press.FrontmatterPlugin = () => {
    return {
        transform: (_, node) => {
            if (typeof node.content === "string") {
                const result = press.utils.frontmatter(node.content, JSON.parse);
                node.content = result.body || "";
                node.attributes = result.attributes || {};
                node.title = node.attributes?.title || node.path;
                if (node.attributes.permalink) {
                    node.path = node.attributes.permalink;
                    node.url = press.utils.normalizePath(node.path);
                }
            }
        },
    };
};

// @description plugin to generate pages content
press.ContentPagePlugin = (siteData = {}) => {
    return {
        beforeTransform: context => {
            const getNodes = label => context.nodes.filter(n => n.label === label);
            // 1. prepare site data
            Object.assign(siteData, context.config, {
                pages: getNodes(press.LABEL_PAGE),
                data: Object.fromEntries(getNodes(press.LABEL_DATA).map(node => {
                    return [path.basename(node.path, ".json"), JSON.parse(node.content)];
                })),
                partials: getNodes(press.LABEL_PARTIAL),
                layouts: getNodes(press.LABEL_LAYOUT),
                assets: getNodes(press.LABEL_ASSET),
            });
            // 2. register partials into template
            siteData.partials.forEach(partial => {
                context.template.addPartial(path.basename(partial.path), {
                    body: partial.content || "",
                    attributes: partial.attributes || {},
                });
            });
            // 3. process layouts files
            siteData.layouts.forEach(layout => {
                // 3.1. apply the layout to this layout node
                if (layout?.attributes?.layout && layout?.content) {
                    layout.content = applyLayout(layout);
                }
                // 3.2. register layouts into the template
                context.template.addPartial("layout:" + path.basename(layout.path), {
                    body: layout.content || "",
                    attributes: layout.attributes || {},
                });
            });
            // 4. apply layouts to all pages
            if (siteData.layouts.length > 0 && siteData.pages.length > 0) {
                siteData.pages.forEach(page => {
                    if (page?.attributes?.layout && page?.content) {
                        page.content = applyLayout(page);
                    }
                });
            }
        },
        transform: (context, node) => {
            if (node.label === press.LABEL_PAGE && typeof node.content === "string") {
                node.content = context.template(node.content, { site: siteData, page: node });
            }
        },
    };
};

// @description plugin to register mikel helpers and functions
press.UsePlugin = mikelPlugin => {
    return {
        init: context => {
            context.template.use(mikelPlugin);
        },
    };
};

// @description copy plugin
press.CopyAssetsPlugin = (options = {}) => ({
    name: "CopyAssetsPlugin",
    load: () => {
        const filesToCopy = (options?.patterns || []).filter(item => {
            return item.from && fs.existsSync(path.resolve(item.from));
        });
        return filesToCopy.map(item => {
            const filePath = path.join(options?.basePath || ".", item.to || path.basename(item.from));
            return {
                source: path.resolve(item.from),
                path: filePath,
                url: press.utils.normalizePath(filePath),
                label: options?.label || press.LABEL_ASSET,
            };
        });
    },
});

// @description redirections plugin
press.RedirectsPlugin = (options = {}) => ({
    name: "RedirectsPlugin",
    load: () => {
        return (options.redirects || []).map(redirection => ({
            source: redirection.from,
            path: path.join(options?.basePath || ".", redirection.from),
            url: press.utils.normalizePath(path.join(options?.basePath || ".", redirection.from)),
            label: press.LABEL_ASSET,
            content: generateRedirectHTML(redirection.to),
        }));
    },
});

// export press generator
export default press;
