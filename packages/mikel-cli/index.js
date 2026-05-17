import fs from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import mikel from "mikel";

// @description get the files that matches the provided patterns
// this is a utility function to expand glob patterns to actual file paths.
// it uses Node.js 24+ built-in fs.glob to handle glob patterns.
export const expandGlobPatterns = async (root, patterns = []) => {
    const files = [];
    for (const pattern of patterns) {
        if (pattern.includes("*") || pattern.includes("?") || pattern.includes("[")) {
            // use Node.js 24+ built-in fs.glob
            // https://nodejs.org/api/fs.html#fspromisesglobpattern-options
            for await (const file of fs.glob(pattern, { cwd: root })) {
                files.push(file);
            }
        } else {
            files.push(pattern);
        }
    }
    // remove duplicates
    return Array.from(new Set(files));
};

// @description apply a rename to the provided file path based on a rename configuration
// object
export const applyNameMapping = (file, mapping = {}) => {
    for (const pattern of Object.keys(mapping)) {
        const regex = new RegExp(pattern);
        if (regex.test(file)) {
            return file.replace(regex, mapping[pattern]);
        }
    }
    // fallback: only returns the basename of the file
    return path.basename(file);
};

// @description load configuration file from the provided path
export const loadConfiguration = async (configurationFile) => {
    if (!configurationFile) {
        return {};
    }
    const configurationPath = path.resolve(process.cwd(), configurationFile);
    if (!existsSync(configurationPath)) {
        throw new Error(`Configuration file '${configurationPath}' was not found.`);
    }
    // check the extension of the file
    const configurationExtension = path.extname(configurationFile);
    if (configurationExtension === ".js" || configurationExtension === ".mjs") {
        return (await import(configurationPath)).default;
    }
    else if (configurationExtension === ".json") {
        return JSON.parse(await fs.readFile(configurationPath, "utf8"));
    }
    // invalid configuration extension
    throw new Error(`Unknown extension for configuration file '${configurationFile}'`);
};

// @description get the files that matches the provided input files patterns
export const loadInputFiles = async (root, inputFiles) => {
    if (!inputFiles || inputFiles?.length === 0) {
        throw new Error(`No input templates provided.`);
    }
    // 1. iterate inputFiles and extract virtual files and glob/relative files paths
    const files = [], patterns = [];
    (Array.isArray(inputFiles) ? inputFiles : [inputFiles]).forEach(file => {
        // 1.1. check if file starts with 'data:' --> load as virtual file
        if (!!file && file.startsWith("data:")) {
            const rest = file.slice(5);
            const sep = rest.indexOf(";base64,");
            files.push({
                path: rest.slice(0, sep),
                content: Buffer.from(rest.slice(sep + 8), "base64").toString("utf-8"),
            });
        }
        // 1.2. other case, treat as patter/glob
        else if (!!file) {
            patterns.push(file);
        }
    });
    // 2. expand glob patterns and append them into files array
    (await expandGlobPatterns(root, patterns)).forEach(filePath => {
        files.push({
            path: filePath,
        });
    });
    // 3. return processed files
    return files;
};

// @description resolve output
export const resolveOutput = (root, file, output) => {
    // 1. the provided output is an string
    if (!!output && typeof output === "string") {
        // directory if ends with /, otherwise treat as output file
        return path.resolve(root, output.endsWith("/") ? path.join(output, file) : output);
    }
    // 2. output configuration is provided as an object
    else if (!!output && typeof output === "object") {
        const renamedOutputFile = applyNameMapping(file, output?.nameMapper || {});
        return path.resolve(root, path.join(output?.dir || ".", renamedOutputFile));
    }
    // 3. other case???
    throw new Error(`Unknown error resolving output for template '${file}'`);
};

// @description load JSON data from the provided path
export const loadData = async (root, fileOrObject = null) => {
    if (!fileOrObject) {
        return {};
    }
    // 1. check for object containing data (from config.data)
    if (typeof fileOrObject === "object") {
        return fileOrObject;
    }
    // 2. build the full data file path and check if exists
    const dataPath = path.resolve(root, fileOrObject);
    if (!existsSync(dataPath)) {
        throw new Error(`Data file '${dataPath}' was not found.`);
    }
    // 3. read the file and parse it as JSON
    try {
        return JSON.parse(await fs.readFile(dataPath, "utf8"));
    } catch (error) {
        if (error instanceof SyntaxError) {
            throw new Error(`Invalid JSON in data file '${dataPath}': ${error.message}`);
        }
        throw new Error(`Failed to read data file '${dataPath}': ${error.message}`);
    }
};

// @description load partials
const loadPartials = async (root, patterns = []) => {
    const files = await expandGlobPatterns(root, [patterns].flat());
    const partials = {};
    for (const file of files) {
        try {
            partials[path.basename(file)] = await fs.readFile(path.resolve(root, file), "utf8");
        } catch (error) {
            throw new Error(`Failed to read partial file '${file}': ${error.message}`);
        }
    }
    return partials;
};

// @description load javascript modules from the specified patterns
const loadModules = async (root, patterns = []) => {
    const files = await expandGlobPatterns(root, [patterns].flat());
    const loadedModules = {};
    for (const file of files) {
        const filePath = path.resolve(root, file);
        //only javascript modules are supported, so we have to check the extension of the file
        const extension = path.extname(filePath);
        if (extension !== ".js" && extension !== ".mjs") {
            throw new Error(`Module '${filePath}' is not supported. Only ESM JavaScript (.js or .mjs) files are supported.`);
        }
        // import the module and call the register method
        const module = await import(filePath);
        for (const [name, fn] of Object.entries(module)) {
            if (typeof fn === "function") {
                loadedModules[name] = fn;
            }
        }
    }
    return loadedModules;
};

// @description build a configuration object from CLI arguments
export const resolveConfigurationFromArgs = async (root = process.cwd(), args = {}) => {
    const config = await loadConfiguration(args?.values?.config);

    // resolve partials, helpers and functions from cli arguments
    const partials = await loadPartials(root, args?.values?.partial || []);
    const helpers = await loadModules(root, args?.values?.helper || []);
    const functions = await loadModules(root, args?.values?.function || []);

    // return parsed configuration object
    return {
        context: config.context || root,
        input: (!!args?.positionals && Array.isArray(args?.positionals) && args.positionals.length > 0) ? args.positionals : config.input,
        output: args?.values?.output || config.output,
        data: args?.values?.data || config.data,
        partials: Object.assign(config.partials || {}, partials),
        helpers: Object.assign(config.helpers || {}, helpers),
        functions: Object.assign(config.functions || {}, functions),
        plugins: args?.values?.plugin || config.plugins || [],
    };
};

// @description main build script
export const build = async (config = {}) => {
    const inputFiles = await loadInputFiles(config.context, config.input);
    const data = await loadData(config.context, config.data);
    const mikelInstance = mikel.create({
        helpers: config.helpers,
        functions: config.functions,
        partials: config.partials,
    });

    // load plugins
    for (const plugin of config.plugins) {
        // check if the provided plugin is a function or an object
        if (typeof plugin === "function" || (typeof plugin === "object" && !Array.isArray(plugin) && !!plugin)) {
            mikelInstance.use(plugin);
        }
        else {
            const pluginName = Array.isArray(plugin) ? plugin[0] : plugin;
            const pluginOptions = Array.isArray(plugin) && plugin.length > 1 ? plugin.slice(1) : [];
            try {
                // try to import the plugin from node_modules
                const pluginModule = (await import(pluginName))?.default;
                if (typeof pluginModule !== "function") {
                    throw new Error(`Plugin '${pluginName}' does not export a valid plugin function.`);
                }
                mikelInstance.use(pluginModule(...pluginOptions));
            } catch (error) {
                throw new Error(`Failed to load plugin '${pluginName}': ${error.message}`);
            }
        }
    }

    // process input files
    for (const inputFile of inputFiles) {
        const inputPath = path.resolve(config.context, inputFile.path);
        // if (!existsSync(inputPath)) {
        //     throw new Error(`Template file '${inputPath}' was not found.`);
        // }
        let template;
        try {
            template = inputFile.content ? inputFile.content : (await fs.readFile(inputPath, "utf8"));
        } catch (error) {
            throw new Error(`Failed to read template file '${inputPath}': ${error.message}`);
        }
        // compile the template
        let result;
        try {
            result = mikelInstance(template, data);
        } catch (error) {
            throw new Error(`Template compilation error: ${error.message}`);
        }
        // check if output argument has been provided to write the result to a file
        // this will also create any intermediary directory that does not exist
        if (config.output) {
            const outputPath = resolveOutput(config.context, inputFile.path, config.output);
            const outputDirectory = path.dirname(outputPath);
            // make sure that any directory containing the output file exists
            if (!existsSync(outputDirectory)) {
                try {
                    await fs.mkdir(outputDirectory, { recursive: true });
                } catch (error) {
                    throw new Error(`Failed to create output directory '${outputDirectory}': ${error.message}`);
                }
            }
            try {
                await fs.writeFile(outputPath, result, "utf8");
                console.error(`✓ Saving '${inputPath}' -> '${outputPath}'`);
            } catch (error) {
                throw new Error(`Failed to write output file '${outputPath}': ${error.message}`);
            }
        }
        // if no output file has been provided, print the result to console
        else if (inputFiles.length === 1) {
            process.stdout.write(result);
        }
        else {
            throw new Error(`Unconsistent usage of input and output arguments.`);
        }
    }
};

// @description utility method to provide a typed configuration
export const defineConfig = (config = {}) => config;

// @description utility method to create dinamic input entries
export const createInput = (name, content) => {
    return `data:${name};base64,${Buffer.from(content, "utf-8").toString("base64")}`;
};
