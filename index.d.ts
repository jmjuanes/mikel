export type MikelHelperCallback = (
    data?: Record<string, any>,
    state?: Record<string, any>,
) => string;

export type MikelHelper = (params: {
    args: any[];
    options: Record<string, any>;
    tokens: string[];
    data: Record<string, any>;
    state: Record<string, any>;
    fn: MikelHelperCallback;
}) => string;

export type MikelPartial = string | {
    body: string;
    data: Record<string, any>;
};

export type MikelFunction = (params: {
    args: any[];
    options: Record<string,any>;
    data: Record<string, any>;
    state: Record<string, any>;
}) => string | void;

export type MikelState = Record<string, string>;

export type MikelTransform = (content: string) => string;

export type MikelOptions = {
    helpers?: Record<string, MikelHelper>;
    partials?: Record<string, MikelPartial>;
    functions?: Record<string, MikelFunction>;
};

export type MikelPluginOptions = MikelOptions & {
    initialState?: MikelState;
};

export type MikelContext = {
    helpers: Record<string, MikelFunction>;
    functions: Record<string, MikelFunction>;
    partials: Record<string, MikelPartial>;
    initialState: MikelState;
    preTransforms: MikelTransform[];
    postTransforms: MikelTransform[];
};

export type MikelPlugin = (ctx: MikelContext) => void;

export type Mikel = {
    (template: string, data?: any): string;
    use(plugin: Partial<MikelPluginOptions> | MikelPlugin): void;
    addHelper(name: string, fn: MikelHelper): void;
    removeHelper(name: string): void;
    addFunction(name: string, fn: MikelFunction): void;
    removeFunction(name: string): void;
    addPartial(name: string, partial: MikelPartial): void;
    removePartial(name: string): void;
};

export type MikelSetStatePlugin = (name: string, value: any) => MikelPlugin;

declare const mikel: {
    (template: string, data?: any, options?: Partial<MikelOptions>): string;
    create(options?: Partial<MikelOptions>): Mikel;
    escape(str: string): string;
    get(context: any, path: string): any;
    parse(value: string, context?: any, vars?: any): any;
    tokenize(str: string): string[];
    untokenize(tokens: string[], start?: string, end?: string): string;
    SetStatePlugin: MikelSetStatePlugin;
};

export default mikel;
