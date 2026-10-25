import { mkdirSync, cpSync } from "node:fs";
import { basename, dirname, join } from "node:path";
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

const getFilesToCopy = (files, root, to) => {
    return files.map(file => {
        return {
            source: join(root, file),
            destination: to.endsWith("/") ? join(root, to) : join(root, to, basename(file)),
        };
    });
};

// plugin to copy assets from the provided sources to www folder
export const CopyAssetsPlugin = (patterns = []) => {
    return {
        hooks: {
            "cli:beforeCompile": (_, { config }) => {
                patterns.forEach(({ from, to }) => {
                    const files = expandGlobPatterns(config.context, from);
                    getFilesToCopy(files, config.context, to).forEach(({ source, destination }) => {
                        mkdirSync(dirname(destination), { recursive: true });
                        cpSync(source, destination, { force: true });
                        console.error(`[CopyAssetsPlugin] ✓ Copied '${source}' -> '${destination}'`);
                    });
                });
            },
        },
    };
};
