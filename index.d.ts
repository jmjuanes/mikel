export type MikelHelperCallback = (
    data?: Record<string, any>,
    state?: Record<string, any>,
) => string;

export type MikelHelper = (params: {
    name: string;
    args: any[];
    options: Record<string, any>;
    context: {
        tokens: string[];
        data: Record<string, any>;
        state: Record<string, any>;
        directives: Record<string, any>;
    },
    fn: MikelHelperCallback;
}) => string;

export type MikelPartial = string | {
    body: string;
    data?: Record<string, any>;
    attributes?: Record<string, any>;
};

export type MikelHook = (value: any, context?: any) => any; 

export type MikelHookManager = {
    register: (name: string, listener: MikelHook) => void;
    dispatch: (name: string, value: any, context?: any) => any;
};

export type MikelOptions = {
    helpers: Record<string, MikelHelper>;
    partials: Record<string, MikelPartial>;
    hooks: Record<string, MikelHook>;
    initialState: Record<string, any>;
};

export type MikelPlugin = Partial<MikelOptions>;

export type Mikel = {
    (template: string, data?: any): string;
    use(plugin: MikelPlugin): void;
};

// DEPRECATED
declare const mikel: {
    (template: string, data?: any, options?: Partial<MikelOptions>): string;
    create(options?: Partial<MikelOptions>): Mikel;
    escape(str: string): string;
    get(context: any, path: string): any;
    parse(value: string, context?: any, vars?: any): any;
    tokenize(str: string): string[];
    untokenize(tokens: string[], start?: string, end?: string): string;
};

// default mikel instance
export default mikel;

// factory
export declare const createMikel : (options?: Partial<MikelOptions>) => mikel;
export declare const createHooksManager : (hooks?: any) => MikelHookManager;

// plugins
export declare const SetStatePlugin : (name: string, value: any) => MikelPlugin;
export declare const SetHelperPlugin : (name: string, helper: MikelHelper) => MikelPlugin;
export declare const SetPartialPlugin : (name: string, partial: MikelPartial) => MikelPlugin;

// utilities
export declare const parse: (value: string, context?: any, state?: any) => any;
export declare const escape: (str: string) => string;
export declare const tokenize: (str: string) => string[];
export declare const untokenize: (tokens: string[], start?: string, end?: string) => string;
