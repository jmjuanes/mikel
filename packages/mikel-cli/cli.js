#!/usr/bin/env node

import { parseArgs } from "node:util";
import { build, resolveConfigurationFromArgs } from "./index.js";

// print the help of the tool
const printHelp = () => {
    console.log("Usage: ");
    console.log("  mikel --help");
    console.log("  mikel <template> [...options]");
    console.log("  mikel --config <configurationFile> [...options]");
    console.log("");
    console.log("Options:");
    console.log("  -h, --help              Prints the usage information");
    console.log("  -c, --config <file>     Configuration file to use");
    console.log("  -o, --output <path>     Output file or directory to save compiled templates");
    console.log("  -P, --partial <file>    Register a partial (supports glob patterns, can be used multiple times)");
    console.log("  -H, --helper <file>     Register a helper (supports glob patterns, can be used multiple times)");
    console.log("  -F, --function <file>   Register a function (supports glob patterns, can be used multiple times)");
    console.log("  -L, --plugin <file>     Load a plugin from node_modules (can be used multiple times)");
    console.log("  -D, --data <file>       Path to the data file to use (JSON)");
    console.log("");
    console.log("Examples:");
    console.log("  mikel template.html --data data.json --output www/index.html");
    console.log("  mikel template.html --data data.json --partial header.html --partial footer.html --output www/index.html");
    console.log("  mikel template.html --partial 'components/**/*.html' --output dist/index.html");
    console.log("  mikel template.html --helper helpers.js --function utils.js --output dist/index.html");
    console.log("  mikel template.html --plugin mikel-markdown --output dist/index.html");
    console.log("");
    process.exit(0);
};

// @description main function
const main = async () => {
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
            help: {
                type: "boolean",
                short: "h",
            },
        },
        allowPositionals: true,
    });

    // check to print help
    if (values.help) {
        return printHelp();
    }

    // build with the provided configuration
    try {
        const config = await resolveConfigurationFromArgs(process.cwd(), { positionals, values });
        await build(config);
    }
    catch (error) {
        console.error(`\n❌ ${error.message}\n`);
        process.exit(1);
    }
    process.exit(0);
};

main()
