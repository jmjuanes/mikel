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

// plugin to copy assets from the provided sources to www folder
export const CopyAssetsPlugin = (patterns = []) => {
    return {
        hooks: {
            "cli:beforeCompile": (_, { config }) => {
                patterns.forEach(pattern => {
                    const files = expandGlobPatterns(config.context, pattern.from);
                    const dist = join(config.context, pattern.to);
                    // 1. check if destination path is a file
                    if (files.length === 1 && !dist.endsWith("/")) {
                        const source = join(config.context, files[0]);
                        mkdirSync(dirname(dist), { recursive: true });
                        cpSync(source, dist, { force: true });
                        console.error(`[CopyAssetsPlugin] ✓ Copied '${source}' -> '${dist}'`);
                        return;
                    }
                    // 2. process each file in the pattern
                    files.forEach(file => {
                        const source = join(config.context, file);
                        const destination = join(config.context, pattern.to, basename(file));
                        mkdirSync(dirname(destination), { recursive: true });
                        cpSync(source, destination, { force: true });
                        console.error(`[CopyAssetsPlugin] ✓ Copied '${source}' -> '${destination}'`);
                    });
                });
            },
        },
    };
};
