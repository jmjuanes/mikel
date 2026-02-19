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

export type MikelOptions = {
    helpers?: Record<string, MikelHelper>;
    partials?: Record<string, string | MikelPartial>;
    functions?: Record<string, MikelFunction>;
};

export type MikelUseOptions = MikelOptions & {
    initialState?: Record<string, any>;
};

export type Mikel = {
    (template: string, data?: any): string;
    use(options: Partial<MikelUseOptions>): void;
    addHelper(name: string, fn: MikelHelper): void;
    removeHelper(name: string): void;
    addFunction(name: string, fn: MikelFunction): void;
    removeFunction(name: string): void;
    addPartial(name: string, partial: string | MikelPartial): void;
    removePartial(name: string): void;
}

declare const mikel: {
    (template: string, data?: any, options?: Partial<MikelOptions>): string;
    create(options?: Partial<MikelOptions>): Mikel;
    escape(str: string): string;
    get(context: any, path: string): any;
    parse(value: string, context?: any, vars?: any): any;
    tokenize(str: string): string[];
    untokenize(tokens: string[], start?: string, end?: string): string;
};

export default mikel;
