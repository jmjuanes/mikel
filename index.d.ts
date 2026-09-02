export type MikelState = Record<string, any>;

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
        state: MikelState;
        directives: Record<string, any>;
    },
    fn: MikelHelperCallback;
}) => string;

export type MikelPartial = string | {
    body: string;
    data?: Record<string, any>;
    attributes?: Record<string, any>;
};

export type MikelTransform = (content: string) => string;

export type MikelOptions = {
    helpers?: Record<string, MikelHelper>;
    partials?: Record<string, MikelPartial>;
    transform?: MikelTransform;
    initialState?: MikelState;
};

export type Mikel = {
    (template: string, data?: any): string;
    use(options: MikelOptions): void;
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
