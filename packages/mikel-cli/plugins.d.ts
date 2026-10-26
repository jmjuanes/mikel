import type { MikelPlugin } from "mikel";

export type CopyPattern = {
    from: string;
    to?: string;
};

export type ProgressOptions = {
    handler?: (percentage: number, message: string) => void;
};

export declare const CopyPlugin: (patterns: CopyPattern[]) => MikelPlugin; 
export declare const ProgressPlugin: (options?: ProgressOptions) => MikelPlugin;
