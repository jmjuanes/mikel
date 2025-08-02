export type MikelHelper = (params: {
    args: any[];
    opt: Record<string, any>;
    context: Record<string, any>;
    data: Record<string, any>;
    fn: (context?: Record<string, any>, vars?: Record<string, any>, output?: string[]) => string;
}) => string;

export type MikelPartial = {
    body: string;
    data: Record<string, any>;
};

export type MikelFunction = (params: {
    args: any[];
    opt: Record<string, any>;
    context: Record<string, any>;
}) => string | void;

export type MikelOptions = {
    helpers?: Record<string, MikelHelper>;
    partials?: Record<string, string | MikelPartial>;
    functions?: Record<string, MikelFunction>;
    variables?: Variables;
}

export type Mikel = {
    (template: string, data?: any): string;
    use(options: Partial<MikelOptions>): Mikel;
    addHelper(name: string, fn: MikelHelper): void;
    removeHelper(name: string): void;
    addFunction(name: string, fn: MikelFunction): void;
    removeFunction(name: string): void;
    addPartial(name: string, partial: MikelPartial): void;
    removePartial(name: string): void;
}

declare const mikel: {
    (template: string, data?: any, options?: Partial<MikelOptions>): string;
    create(options?: Partial<MikelOptions>): Mikel;
    escape(str: string): string;
    get(context: any, path: string): any;
    parse(value: string, context?: any, vars?: any): any;
    tokenize(value: string): string[];
    untokenize(value: string[]): string;
};

export default mikel;
