import { mkdirSync, cpSync } from "node:fs";
import { basename, dirname, join, resolve } from "node:path";
import { expandGlobPatterns } from "./index.js";

// plugin to display the process
export const ProgressPlugin = () => {
    return {
        hooks: {
            "cli:beforeCompile": (_, { files }) => {
                console.error(`[ProgressPlugin] Processing ${files.length} files...`);
            },
            "cli:emit": (_, { source, destination }) => {
                console.error(`[ProgressPlugin] ✓ Saving '${source}' -> '${destination}'`);
            },
            "cli:done": () => {
                console.error(`[ProgressPlugin] ✓ Done`);
            },
        },
    };
};

const getFilesToCopy = (files, sourcePath, destinationPath) => {
    return files.map(file => {
        return {
            source: join(sourcePath, file),
            destination: destinationPath.endsWith("/") ? join(destinationPath, basename(file)) : destinationPath,
        };
    });
};

// plugin to copy assets from the provided sources to www folder
export const CopyAssetsPlugin = (patterns = []) => {
    return {
        hooks: {
            "cli:afterCompile": (_, { config }) => {
                patterns.forEach(({ from, to }) => {
                    const files = expandGlobPatterns(config.context, [from]);
                    const sourcePath = config.context;
                    const destinationPath = resolve(config.context, join(config.output?.dir || ".", to || "./"));
                    getFilesToCopy(files, sourcePath, destinationPath).forEach(({ source, destination }) => {
                        mkdirSync(dirname(destination), { recursive: true });
                        cpSync(source, destination, { force: true });
                        console.error(`[CopyAssetsPlugin] ✓ Copied '${source}' -> '${destination}'`);
                    });
                });
            },
        },
    };
};
