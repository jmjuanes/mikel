interface MikelTemplateOptions {
    functions: {[key: string]: (args: any) => string};
    helpers: {[key: string]: (args: any) => string};
    partials: {[key: string]: string};
}

interface FrontmatterResult {
    body: string;
    attributes: any;
}

interface VirtualPageOptions {
    content?: string;
    file?: string;
    extname?: string;
    basename?: string;
    frontmatter?: (str: string) => FrontmatterResult;
    transform?: (str: string) => string;
}

interface VirtualPage {
    content: string;
    attributes: any;
    name: string;
    extname: string;
    basename: string;
    url: string;
}

interface SiteConfig {
    source: string;
    destination: string;
    layout: string;
    layoutContent: string;
    dataDir: string;
    pagesDir: string;
    assetsDir: string;
    frontmatter: (str: string) => FrontmatterResult;
    mikel: Partial<MikelTemplateOptions>;
    plugins: any[];
}

declare module "mikel-press" {
    export function frontmatter(str: string): FrontmatterResult;
    export function createVirtualPage(options: VirtualPageOptions): VirtualPage;
    export function run(config: Partial<SiteConfig>): void;
}
