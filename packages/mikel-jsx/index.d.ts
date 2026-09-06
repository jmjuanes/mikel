import type { MikelHook } from "mikel";

declare function mikelJsxPlugin(): {
    hooks: {
        preprocess: MikelHook,
        processPartial: MikelHook,
    },
};

export default mikelJsxPlugin;

export declare function transform(content: string): string;
export declare function parseAttributes(raw?: string): string;
