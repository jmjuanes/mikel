import { mkdirSync, cpSync } from "node:fs";
import { basename, dirname, join } from "node:path";
import { expandGlobPatterns } from "./index.js";

// method to copy assets from the provided sources to www folder
export const CopyAssetsPlugin = (patterns = []) => {
    return {
        hooks: {
            "cli:beforeCompile": ({ config }) => {
                patterns.forEach(pattern => {
                    const files = expandGlobPatterns(config.context, pattern.from);
                    const dist = join(config.context, pattern.to);
                    // 1. check if destination path is a file
                    if (files.length === 1 && !dist.endsWith("/")) {
                        mkdirSync(dirname(dist), { recursive: true });
                        cpSync(join(config.context, files[0]), dist, { force: true });
                        return;
                    }
                    // 2. process each file in the pattern
                    files.forEach(file => {
                        const source = join(config.context, file);
                        const destination = join(config.context, pattern.to, basename(file));
                        mkdirSync(dirname(destination), { recursive: true });
                        cpSync(source, destination, { force: true });
                    });
                });
            },
        },
    };
};
