export type MikelHelper = (params: {
    args: any[];
    opt: Record<string, any>;
    tokens: string[];
    data: Record<string, any>;
    variables: Record<string, any>;
    fn: (blockData?: Record<string, any>, blockVars?: Record<string, any>, blockOutput?: string[]) => string;
}) => string;

export type MikelPartial = {
    body: string;
    data: Record<string, any>;
};

export type MikelFunction = (params: {
    args: any[];
    opt: Record<string, any>;
    data: Record<string, any>;
    variables: Record<string, any>;
}) => string | void;

export type MikelContext = {
    helpers: Record<string, MikelHelper>;
    partials: Record<string, string | MikelPartial>;
    functions: Record<string, MikelFunction>;
    variables: Record<string, any>;
};

export type MikelOptions = {
    helpers?: Record<string, MikelHelper>;
    partials?: Record<string, string | MikelPartial>;
    functions?: Record<string, MikelFunction>;
    variables?: Record<string, any>;
};

export type Mikel = {
    (template: string, data?: any): string;
    use(options: Partial<MikelOptions> | ((ctx: MikelContext) => void)): Mikel;
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
