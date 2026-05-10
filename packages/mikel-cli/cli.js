#!/usr/bin/env node

import fs from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { parseArgs } from "node:util";
import mikel from "mikel";

// @description get the files that matches the provided patterns
// this is a utility function to expand glob patterns to actual file paths.
// it uses Node.js 24+ built-in fs.glob to handle glob patterns.
const expandGlobPatterns = async (patterns = []) => {
    const files = [];
    for (let i = 0; i < patterns.length; i++) {
        const pattern = patterns[i];
        if (pattern.includes("*") || pattern.includes("?") || pattern.includes("[")) {
            try {
                // use Node.js 24+ built-in fs.glob
                // https://nodejs.org/api/fs.html#fspromisesglobpattern-options
                for await (const file of fs.glob(pattern, { cwd: process.cwd() })) {
                    files.push(file);
                }
            } catch (error) {
                files.push(pattern);
            }
        } else {
            files.push(pattern);
        }
    }
    // remove duplicates and resolve to absolute paths
    return Array.from(new Set(files)).map(file => {
        return path.resolve(process.cwd(), file);
    });
};

// @description apply a rename to the provided file path based on a rename configuration
// object
const applyRename = (filePath, rename = {}) => {
    const patterns = Object.keys(rename);
    for (let i = 0; i < patterns.length; i++) {
        const regex = new RegExp(patterns[i]);
        if (regex.test(filePath)) {
            return filePath.replace(regex, rename[patterns[i]]);
        }
    }
    // fallback: only returns the basename of the file
    return path.basename(filePath);
};

// load configuration file
const loadConfiguration = async (configurationFile) => {
    if (!configurationFile) {
        return {};
    }
    const configurationPath = path.resolve(process.cwd(), configurationFile);
    if (!existsSync(configurationPath)) {
        throw new Error(`Configuration file '${configurationPath}' was not found.`);
    }
    // check the extension of the file
    const configurationExtension = path.extname(configurationFile);
    if (configurationExtension === ".js") {
        return await import(configurationPath);
    }
    else if (configurationExtension === ".json") {
        const content = await fs.readFile(configurationPath, "utf8");
        return JSON.parse(content);
    }
    else {
        throw new Error(`Unknown extension for configuration file '${configurationFile}'`);
    }
};

// @description loading input files
const loadInput = async (inputFiles) => {
    if (!inputFiles || inputFiles?.length === 0) {
        throw new Error(`No input templates provided.`);
    }
    // expand glob patterns
    return expandGlobPatterns([inputFiles].flat());
};

// @description resolve output
const resolveOutput = (inputFile, outputFile, outputConfig) => {
    // 1. output file is provided via cli arguments
    if (outputFile) {
        return path.resolve(process.cwd(), outputFile);
    }
    // 2. output configuration is provided and it is a string
    else if (outputConfig && typeof outputConfig === "string") {
        return path.resolve(process.cwd(), path.join(outputConfig, inputFile));
    }
    // 3. output configuration is provided and it is an object
    else if (outputConfig && typeof outputConfig === "object") {
        const renamedOutputFile = applyRename(inputFile, outputConfig?.rename || {});
        return path.resolve(process.cwd(), path.join(outputConfig?.dir || ".", renamedOutputFile));
    }
    // 4. other case???
    throw new Error(`Unknown error resolving output for template '${inputFile}'`);
};

// @description load JSON data from the provided path
const loadData = async (fileOrObject = null) => {
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
        const content = await fs.readFile(dataPath, "utf8");
        return JSON.parse(content);
    } catch (error) {
        if (error instanceof SyntaxError) {
            throw new Error(`Invalid JSON in data file '${dataPath}': ${error.message}`);
        }
        throw new Error(`Failed to read data file '${dataPath}': ${error.message}`);
    }
};

// @description load javascript modules
const loadModules = async (patterns = [], callback) => {
    const files = await expandGlobPatterns(patterns);
    
    for (let i = 0; i < files.length; i++) {
        const file = files[i]; // path.resolve(process.cwd(), uniqueFiles[i]);
        if (!existsSync(file)) {
            throw new Error(`File '${file}' was not found.`);
        }
        
        // Check if it's a file (not a directory)
        const stats = await fs.stat(file);
        if (!stats.isFile()) {
            continue; // Skip directories
        }
        
        // import the module
        try {
            await callback(file);
        } catch (error) {
            throw new Error(`Failed to load '${file}': ${error.message}`);
        }
    }
};

// print the help of the tool
const printHelp = () => {
    console.log("Usage: ");
    console.log("  mikel --help");
    console.log("  mikel <template> [...options]");
    console.log("");
    console.log("Options:");
    console.log("  -h, --help              Prints the usage information");
    console.log("  -P, --partial <file>    Register a partial (supports glob patterns, can be used multiple times)");
    console.log("  -H, --helper <file>     Register a helper (supports glob patterns, can be used multiple times)");
    console.log("  -F, --function <file>   Register a function (supports glob patterns, can be used multiple times)");
    console.log("  -L, --plugin <file>     Load a plugin from node_modules (can be used multiple times)");
    console.log("  -D, --data <file>       Path to the data file to use (JSON)");
    console.log("  -o, --output <file>     Output file");
    console.log("");
    console.log("Examples:");
    console.log("  mikel template.html --data data.json --output www/index.html");
    console.log("  mikel template.html --data data.json --partial header.html --partial footer.html --output www/index.html");
    console.log("  mikel template.html --helper helpers.js --function utils.js --output dist/index.html");
    console.log("  mikel template.html --partial 'partials/*.html' --helper 'helpers/*.js' --output dist/index.html");
    console.log("  mikel template.html --partial 'components/**/*.html' --output dist/index.html");
    console.log("");
    process.exit(0);
};

// @description main function
const main = async (inputOption = "", options = {}) => {
    // check to print help
    if (options.help) {
        return printHelp();
    }

    // load configuration file and inputs
    const config = await loadConfiguration(options.config);
    const inputs = await loadInput(inputOption || config.input || null);
    const data = await loadData(options.data || config.data || null);
    const mikelInstance = mikel.create({});

    // if no input files were provided, throw an error and stop processing
    if (!inputs || inputs?.length === 0) {
        throw new Error(`No input templates found`);
    }
    // load plugins
    const plugins = options.plugin || config.plugins || [];
    for (let i = 0; i < plugins.length; i++) {
        const pluginName = Array.isArray(plugins[i]) ? plugins[i][0] : plugins[i];
        const pluginOptions = Array.isArray(plugins[i]) && plugins[i].length === 2 ? plugins[i][1] : null;
        let pluginModule;
        try {
            // try to import the plugin from node_modules
            pluginModule = (await import(pluginName))?.default;
            if (typeof pluginModule !== "function") {
                throw new Error(`Plugin '${pluginName}' does not export a valid plugin function.`);
            }
            mikelInstance.use(pluginModule(pluginOptions));
        } catch (error) {
            throw new Error(`Failed to load plugin '${pluginName}': ${error.message}`);
        }
    }

    // load additional partials, helpers, and functions
    await loadModules(options.partial, async (file) => {
        try {
            mikelInstance.addPartial(path.basename(file), await fs.readFile(file, "utf8"));
        } catch (error) {
            throw new Error(`Failed to read partial file '${file}': ${error.message}`);
        }
    });
    await loadModules(options.helper, async (file) => {
        const extension = path.extname(file);
        if (extension !== ".js" && extension !== ".mjs") {
            throw new Error(`Module '${file}' is not supported. Only ESM JavaScript (.js or .mjs) files are supported.`);
        }
        // import the module
        const content = (await import(file)) || {};
        if (typeof content === "object" && !!content) {
            Object.keys(content).forEach(helperName => {
                mikelInstance.addHelper(helperName, content[helperName]);
            });
        }
    });
    await loadModules(options.function, async (file) => {
        const extension = path.extname(file);
        if (extension !== ".js" && extension !== ".mjs") {
            throw new Error(`Module '${file}' is not supported. Only ESM JavaScript (.js or .mjs) files are supported.`);
        }
        // import the module
        const content = (await import(file)) || {};
        if (typeof content === "object" && !!content) {
            Object.keys(content).forEach(functionName => {
                mikelInstance.addFunction(functionName, content[functionName]);
            });
        }
    });
    // process input files
    for (let i = 0; i < inputs.length; i++) {
        // const inputPath = path.resolve(process.cwd(), inputs[i]);
        const inputPath = inputs[i]; // inputs contains absolute paths already
        const relativeInputPath = path.relative(process.cwd(), inputPath);
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
            throw new Error(`Template compilation failed: ${error.message}`);
        }
        // check if output argument has been provided to write the result to a file
        // this will also create any intermediary directory that does not exist
        if (options.output || config.output) {
            const outputPath = resolveOutput(relativeInputPath, options.output, config.output);
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
        else if (inputs.length === 1) {
            process.stdout.write(result);
        }
        else {
            throw new Error(`Unconsistent usage of input and output arguments.`);
        }
    }
    // exit
    process.exit(0);
};

// process arguments
const { positionals, values } = parseArgs({
    options: {
        config: {
            type: "string",
            short: "c",
        },
        data: {
            type: "string",
            short: "D",
        },
        output: {
            type: "string",
            short: "o",
        },
        helper: {
            type: "string",
            short: "H",
            multiple: true,
        },
        function: {
            type: "string",
            short: "F",
            multiple: true,
        },
        partial: {
            type: "string",
            short: "P",
            multiple: true,
        },
        plugin: {
            type: "string",
            short: "L",
            multiple: true,
        },
        help: {
            type: "boolean",
            short: "h",
        },
    },
    allowPositionals: true,
});

// run main script
main(positionals[0], values).catch(error => {
    console.error(`\n❌ Error: ${error.message}\n`);
    process.exit(1);
});
