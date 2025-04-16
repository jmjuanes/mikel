declare type HelperFunction = (params: {
    args: any[];
    opt: Record<string, any>;
    context: Record<string, any>;
    data: Record<string, any>;
    fn: (context?: Record<string, any>, vars?: Record<string, any>, output?: string[]) => string;
}) => string;

declare interface Helpers {
    [key: string]: HelperFunction;
}

declare interface Partials {
    [key: string]: string;
}

declare interface Functions {
    [key: string]: (params: {
        args: any[];
        opt: Record<string, any>;
        context: Record<string, any>;
    }) => string | void;
}

declare interface Variables {
    [key: string]: any;
}

declare interface MikelOptions {
    helpers?: Helpers;
    partials?: Partials;
    functions?: Functions;
    variables?: Variables;
}

declare interface MikelTemplate {
    (data?: any): string;
    use(options: Partial<MikelOptions>): MikelTemplate;
    addHelper(name: string, fn: HelperFunction): void;
    removeHelper(name: string): void;
    addFunction(name: string, fn: (params: any) => string | void): void;
    removeFunction(name: string): void;
    addPartial(name: string, partial: string): void;
    removePartial(name: string): void;
}

declare const mikel: {
    (template: string, data?: any, options?: Partial<MikelOptions>): string;
    create(template: string, options?: Partial<MikelOptions>): MikelTemplate;
    escape(str: string): string;
    get(context: any, path: string): any;
    parse(value: string, context?: any, vars?: any): any;
    tokenize(value: string): string[];
    untokenize(value: string[]): string;
};

export default mikel;
