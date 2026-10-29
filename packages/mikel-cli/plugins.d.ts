import type { MikelPlugin } from "mikel";

export type CopyPattern = {
    from: string;
    to?: string;
};

export type ProgressOptions = {
    handler?: (percentage: number, message: string) => void;
};

export type TransformPluginOptions = {
    test: ((filePath: string) => boolean) | RegExp;
    transform: (content: string) => string;
};

export declare const CopyPlugin: (patterns: CopyPattern[]) => MikelPlugin; 
export declare const ProgressPlugin: (options?: ProgressOptions) => MikelPlugin;
export declare const TransformPlugin: (options: TransformPluginOptions) => MikelPlugin;
