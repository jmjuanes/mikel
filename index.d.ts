export type MikelState = Record<string, any>;

export type MikelHelperCallback = (
    data?: Record<string, any>,
    state?: Record<string, any>,
) => string;

export type MikelHelper = (params: {
    args: any[];
    options: Record<string, any>;
    context: {
        tokens: string[];
        data: Record<string, any>;
        state: MikelState;
    },
    fn: MikelHelperCallback;
}) => string;

export type MikelPartial = string;

export type MikelTransform = (content: string) => string;

export type MikelOptions = {
    helpers?: Record<string, MikelHelper>;
    partials?: Record<string, MikelPartial>;
};

export type MikelApi = {
    addHelper(name: string, fn: MikelHelper): void;
    removeHelper(name: string): void;
    addPartial(name: string, partial: MikelPartial): void;
    removePartial(name: string): void;
};

export type MikelPlugin = (ctx: MikelApi) => void;

export type Mikel = MikelApi & {
    (template: string, data?: any): string;
    use(plugin: MikelPlugin): void;
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
