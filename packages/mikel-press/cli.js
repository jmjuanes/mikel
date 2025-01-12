#!/usr/bin/env node

import * as path from "node:path";
import {parseArgs} from "node:util";
import mikelPress from "./index.js";

// get the configuration file from the provided path
const resolveConfig = value => {
    const configPath = path.resolve(process.cwd(), value || "./press.config.js");
    return import(configPath).then(config => {
        return config?.default || {};
    });
};

// available commands
const commands = {
    build: {
        description: "Generate the static site with the provided configuration.",
        execute: async values => {
            const config = await resolveConfig(values.config);
            return mikelPress.run(config);
        },
        options: {
            config: {
                type: "string",
                short: "c",
                default: "press.config.js",
            },
        },
    },
};

const main = async (args = []) => {
    const [commandName, ...otherArguments] = args;
    if (typeof commands[commandName] !== "undefined") {
        const {values} = parseArgs({
            args: otherArguments,
            options: commands[commandName].options || {},
        });
        return commands[commandName].execute(values);
    }
    // if this command is not available, print help [TODO]
    // return commands.help.execute();
};

// run
main(process.argv.slice(2));
