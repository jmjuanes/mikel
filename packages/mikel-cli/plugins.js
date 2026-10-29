import { mkdirSync, cpSync } from "node:fs";
import { basename, dirname, join } from "node:path";
import { expandGlobPatterns } from "./index.js";

// default handler method for the progress plugin
const defaultHandler = (percentage = 0, message = "") => {
    console.error(`[${Math.floor(percentage * 100).toString().padStart(3, " ")}%] ${message}`);
};

// plugin to display the process
export const ProgressPlugin = (options = {}) => {
    let total = 0, current = 0;
    const handler = options?.handler || defaultHandler;
    return {
        hooks: {
            "cli:beforeCompile": (_, { files }) => {
                total = files.length; // save the total number of files
            },
            "cli:emit": (_, { source, destination }) => {
                current = current + 1; // increment file count
                handler(current / total, `✓ Saving '${source}' -> '${destination}'`);
            },
            "cli:done": () => {
                handler(1, `✓ Compiled ${total} templates`);
            },
        },
    };
};

const getFilesToCopy = (files, sourcePath, destinationPath) => {
    return files.map(file => {
        return {
            source: join(sourcePath, file),
            destination: join(destinationPath, basename(file)),
        };
    });
};

// @description plugin to copy files into output.dir as part of the build process
export const CopyPlugin = (patterns = []) => {
    return {
        hooks: {
            "cli:afterCompile": (_, { config }) => {
                patterns.forEach(({ from, to }) => {
                    const files = expandGlobPatterns(config.context, [from]);
                    const sourcePath = config.context;
                    const destinationPath = join(config.context, config.output?.dir || ".", to || "./");
                    getFilesToCopy(files, sourcePath, destinationPath).forEach(({ source, destination }) => {
                        mkdirSync(dirname(destination), { recursive: true });
                        cpSync(source, destination, { force: true });
                        defaultHandler(1, `✓ Copied '${source}' -> '${destination}'`);
                    });
                });
            },
        },
    };
};

// @description apply a transform to each input file
export const TransformPlugin = options => {
    const fileMatchesTest = filePath => {
        if (typeof options?.test === "function") {
            return !!options.test(filePath);
        }
        if (options?.test && options?.test instanceof RegExp) {
            return options.test.test(filePath);
        }
        return false;
    };
    return {
        hooks: {
            "cli:template": (content, { file }) => {
                return fileMatchesTest(file.path) ? options.transform(content) : content;
            },
        },
    };
};
