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

export type MikelPartial = {
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

export type MikelOptions = {
    helpers?: Record<string, MikelHelper>;
    partials?: Record<string, string | MikelPartial>;
    functions?: Record<string, MikelFunction>;
};

export type MikelPluginOptions = MikelOptions & {
    initialState?: MikelState;
};

export type MikelHooks = {
    add: (hookName: string, listener: Function) => void;
    call: (hookName: string, ...args: any[]) => void;
    callWaterfall: (hookName: string, value: any) => any;
};

export type MikelContext = {
    helpers: Record<string, MikelFunction>;
    functions: Record<string, MikelFunction>;
    partials: Record<string, MikelPartial>;
    hooks: MikelHooks;
    initialState: MikelState;
};

export type MikelPlugin = (ctx: MikelContext) => void;

export type Mikel = {
    (template: string, data?: any): string;
    use(plugin: Partial<MikelPluginOptions> | MikelPlugin): void;
    addHelper(name: string, fn: MikelHelper): void;
    removeHelper(name: string): void;
    addFunction(name: string, fn: MikelFunction): void;
    removeFunction(name: string): void;
    addPartial(name: string, partial: string | MikelPartial): void;
    removePartial(name: string): void;
};

export type MikelWrapperPlugin = (options: { header?: string, footer?: string }) => MikelPlugin;
export type MikelStatePlugin = (state: MikelState) => MikelPlugin;

declare const mikel: {
    (template: string, data?: any, options?: Partial<MikelOptions>): string;
    create(options?: Partial<MikelOptions>): Mikel;
    escape(str: string): string;
    get(context: any, path: string): any;
    parse(value: string, context?: any, vars?: any): any;
    tokenize(str: string): string[];
    untokenize(tokens: string[], start?: string, end?: string): string;
    createHooks: () => MikelHooks;
    WrapperPlugin: MikelWrapperPlugin;
    StatePlugin: MikelStatePlugin;
};

export default mikel;
