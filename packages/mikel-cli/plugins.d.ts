import type { MikelPlugin } from "mikel";

export type CopyPattern = {
    from: string;
    to?: string;
};

export declare const CopyPlugin: (patterns: CopyPattern[]) => MikelPlugin; 
export declare const ProgressPlugin: () => MikelPlugin;
