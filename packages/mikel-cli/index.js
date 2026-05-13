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
export const applyRename = (file, renameObject = {}) => {
    for (const pattern of Object.keys(renameObject)) {
        const regex = new RegExp(pattern);
        if (regex.test(file)) {
            return file.replace(regex, renameObject[pattern]);
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
        return await import(configurationPath);
    }
    else if (configurationExtension === ".json") {
        return JSON.parse(await fs.readFile(configurationPath, "utf8"));
    }
    // invalid configuration extension
    throw new Error(`Unknown extension for configuration file '${configurationFile}'`);
};

// @description get the files that matches the provided input files patterns
// it uses Node.js 24+ built-in fs.glob to handle glob patterns.
export const loadInputFiles = async (root, inputFiles) => {
    if (!inputFiles || inputFiles?.length === 0) {
        throw new Error(`No input templates provided.`);
    }
    return expandGlobPatterns(root, Array.isArray(inputFiles) ? inputFiles : [inputFiles]);
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
        const renamedOutputFile = applyRename(file, output?.rename || {});
        return path.resolve(root, path.join(output?.dir || ".", renamedOutputFile));
    }
    // 3. other case???
    throw new Error(`Unknown error resolving output for template '${file}'`);
};

// @description load JSON data from the provided path
export const loadData = async (fileOrObject = null) => {
    if (!fileOrObject) {
        return {};
    }
    // 1. check for object containing data (from config.data)
    if (typeof fileOrObject === "object") {
        return fileOrObject;
    }
    // 2. build the full data file path and check if exists
    const dataPath = path.resolve(process.cwd(), fileOrObject);
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

// @description main build script
export const build = async (root = process.cwd(), input = "", buildOptions = {}) => {
    const config = await loadConfiguration(buildOptions?.config);
    const inputFiles = await loadInputFiles(root, input || config.input || null);
    const data = await loadData(buildOptions?.data || config.data || null);
    const mikelInstance = mikel.create({});

    // load partials from buildOptions
    if (buildOptions?.partial) {
        const partialFiles = await expandGlobPatterns(root, [buildOptions.partial].flat());
        for (let i = 0; i < partialFiles.length; i++) {
            const partialPath = path.resolve(root, partialFiles[i]); // path.resolve(process.cwd(), uniqueFiles[i]);
            try {
                mikelInstance.addPartial(path.basename(partialPath), await fs.readFile(partialPath, "utf8"));
            } catch (error) {
                throw new Error(`Failed to read partial file '${partialFiles[i]}': ${error.message}`);
            }
        }
    }

    // load plugins
    const plugins = buildOptions?.plugin || config.plugins || [];
    for (let i = 0; i < plugins.length; i++) {
        const plugin = plugins[i];
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
    for (let i = 0; i < inputFiles.length; i++) {
        const inputPath = path.resolve(root, inputFiles[i]);
        if (!existsSync(inputPath)) {
            throw new Error(`Template file '${inputPath}' was not found.`);
        }
        let template;
        try {
            template = await fs.readFile(inputPath, "utf8");
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
        if (buildOptions.output || config.output) {
            const outputPath = resolveOutput(root, inputFiles[i], buildOptions.output || config.output);
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
