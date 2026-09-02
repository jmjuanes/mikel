import type { MikelTransform } from "mikel";

declare function mikelJsxPlugin(): {
    transform: MikelTransform,
};

export default mikelJsxPlugin;

export declare function transform(content: string): string;
export declare function parseAttributes(raw?: string): string;
