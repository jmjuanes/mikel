import fs from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { parseArgs } from "node:util";
import mikel from "mikel";

// @description load JSON data from the provided path
const loadData = async (file = null) => {
    if (!file) {
        return {};
    }
    // build the full data file path and check if exists
    const dataPath = path.resolve(process.cwd(), file);
    if (!existsSync(dataPath)) {
        throw new Error(`Data file '${dataPath}' was not found.`);
    }
    // read the file and parse it as JSON
    const content = await fs.readFile(dataPath, "utf8");
    return JSON.parse(content);
};

// @description load partials
const loadPartials = async (files = []) => {
    const partials = {}; // output partials object
    // const files = [...partialsFiles]; // initialize files to load
    // 1. load directories (TODO)
    // for (let i = 0; i < partialsFolders.length; i++) {
    //     const folder = path.resolve(process.cwd(), partialsFolders[i]);
    //     if (!existsSync(folder)) {
    //         throw new Error(`Folder '${folder}' does not exist.`);
    //     }
    //     // read the content and insert each file inside the files
    //     // TODO: what if folder contains more folders?? Currently it is not supported
    //     (await fs.readdir(folder)).forEach(file => {
    //         files.push(path.join(partialsFolders[i], file));
    //     });
    // }
    // 2. read all files
    for (let i = 0; i < files.length; i++) {
        const file = path.resolve(process.cwd(), files[i]);
        if (!existsSync(file)) {
            throw new Error(`Partial file '${file}' was not found.`);
        }
        // load the file and save it as a partial
        partials[path.basename(file)] = await fs.readFile(file, "utf8");
    }
    // 3. return partials object
    return partials;
};

// @description load javascript modules
const loadModules = async (files = []) => {
    const result = {};
    for (let i = 0; i < files.length; i++) {
        const file = path.resolve(process.cwd(), files[i]);
        if (!existsSync(file)) {
            throw new Error(`Module '${file}' was not found.`);
        }
        const extension = path.extname(file);
        if (extension !== ".js" && extension !== ".mjs") {
            throw new Error(`Module '${file}' is not supported. Only ESM JavaScript (.js or .mjs) files are supported.`);
        }
        // import the module
        const content = (await import(file)) || {};
        if (typeof content === "object" && !!content) {
            Object.assign(result, content);
        }
    }
    return result;
};

// print the help of the tool
const printHelp = () => {
    console.log("Usage: ");
    console.log("  mikel --help");
    console.log("  mikel <template> [...options]");
    console.log("");
    console.log("  -h, --help              Prints the usage information");
    console.log("  -P, --partial <file>    Register a partial");
    console.log("  -H, --helper <file>     Register a helper");
    console.log("  -D, --data <file>       Path to the data file to use (JSON)");
    console.log("  -o, --output <file>     Output file");
    console.log("");
    console.log("Examples:");
    console.log("");
    console.log("mikel template.html --data data.json --output www/index.html");
    console.log("mikel template.html --data data.json --partial header.html --partial footer.html --output www/index.html");
    process.exit(0);
};

// @description main function
const main = async (input = "", options = {}) => {
    // check to print help
    if (options.help) {
        return printHelp();
    }

    // make sure that input file exists
    if (!input) {
        throw new Error(`No input template file provided.`);
    }
    const inputPath = path.resolve(process.cwd(), input);
    if (!fs.existsSync(inputPath)) {
        throw new Error(`Template file '${inputPath}' was not found.`);
    }
    const template = await fs.readFile(inputPath, "utf8");

    // load additional data
    const data = await loadData(options.data);
    const partials = await loadPartials(options.partial);
    const helpers = await loadModules(options.helper);
    const functions = await loadModules(options.function);

    // compile the template
    const result = mikel(template, data || {}, { helpers, functions, partials });

    // check if output argument has been provided to write the result to a file
    // this will also create any intermediary directory that does not exist
    if (options.output) {
        const outputPath = path.resolve(process.cwd(), options.output);
        const outputDirectory = path.dirname(outputPath);
        // make sure that any directory containing the output file exists
        if (!existsSync(outputDirectory)) {
            await fs.mkdir(outputDirectory, { recursive: true });
        }
        await fs.writeFile(outputPath, result, "utf8");
        process.exit(0);
    }
    // if no output file has been provided, print the result to console
    else {
        process.stdout.write(result);
        process.exit(0);
    }
};

// process arguments
const { positionals, values } = parseArgs({
    options: {
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
            shrot: "H",
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
        help: {
            type: "boolean",
            short: "h",
        },
    },
    allowPositionals: true,
});

// run main script
main(positionals[0], values).catch(error => {
    console.error(error.message);
    process.exit(1);
});
