import type { MikelHelper, MikelFunction, MikelPartial, MikelPlugin } from "mikel";

export type MikelCliPlugin = string | [string, ...any] | MikelPlugin;

export type MikelCliConfig = {
    context?: string;
    input?: string | string[];
    output?: string | {
        dir?: string;
        nameMapper?: Record<string, string>;
    };
    partials?: Record<string, string | MikelPartial>;
    helpers?: Record<string, MikelHelper>;
    functions?: Record<string, MikelFunction>;
    plugins?: MikelCliPlugin[];
};

export declare const defineConfig: (config: MikelCliConfig) => MikelCliConfig;
export declare const build: (config: MikelCliConfig) => Promise<void>;
