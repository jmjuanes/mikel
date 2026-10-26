import { mkdirSync, cpSync } from "node:fs";
import { basename, dirname, join } from "node:path";
import { expandGlobPatterns } from "./index.js";

// plugin to display the process
export const ProgressPlugin = () => {
    let totalFiles = 0, currentFile = 0;
    return {
        hooks: {
            "cli:beforeCompile": (_, { files }) => {
                totalFiles = files.length;
            },
            "cli:emit": (_, { source, destination }) => {
                currentFile = currentFile + 1; // increment files count
                const porcentage = Math.floor(currentFile * 100 / totalFiles).toString();
                console.error(`[${porcentage.padStart(3, " ")}%] ✓ Saving '${source}' -> '${destination}'`);
            },
            "cli:done": () => {
                console.error(`[100%] ✓ Compiled ${totalFiles} templates`);
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
                patterns.forEach(({ from, to }, index) => {
                    const files = expandGlobPatterns(config.context, [from]);
                    const sourcePath = config.context;
                    const destinationPath = join(config.context, config.output?.dir || ".", to || "./");
                    getFilesToCopy(files, sourcePath, destinationPath).forEach(({ source, destination }) => {
                        mkdirSync(dirname(destination), { recursive: true });
                        cpSync(source, destination, { force: true });
                        console.error(`[100%] ✓ Copied '${source}' -> '${destination}'`);
                    });
                });
            },
        },
    };
};
