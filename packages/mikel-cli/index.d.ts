import type { MikelHelper, MikelPartial, MikelPlugin, MikelPluginObject } from "mikel";

export type MikelCliPlugin = string | [string, ...any] | MikelPlugin | MikelPluginObject;

export type MikelCliConfig = {
    context?: string;
    input?: string | string[];
    output?: string | {
        dir?: string;
        nameMapper?: Record<string, string>;
    };
    partials?: Record<string, string | MikelPartial>;
    helpers?: Record<string, MikelHelper>;
    plugins?: MikelCliPlugin[];
};

export declare const defineConfig: (config: MikelCliConfig) => MikelCliConfig;
export declare const createInput: (name: string, content: string) => string;
export declare const build: (config: MikelCliConfig) => Promise<void>;
