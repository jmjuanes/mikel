/**
 * Options for the mikel-frontmatter plugin
 */
export interface MikelFrontmatterOptions {
    /**
     * Custom parser function to override the default YAML/JSON parser
     * @param content - The raw frontmatter content string
     * @returns Parsed data object
     */
    parser?: (content: string, format: string) => Record<string, any>;
}

/**
 * YAML parser function
 * @param yaml - YAML string to parse
 * @returns Parsed object
 */
export type YamlParser = (yaml: string) => Record<string, any>;

/**
 * TOML parser function
 * @param toml - TOML string to parse
 * @returns Parsed object
 */
export type TomlParser = (toml: string) => Record<string, any>;

/**
 * Mikel frontmatter plugin
 * @param options - Plugin configuration options
 * @returns Plugin object with helpers
 */
declare function mikelFrontmatter(options?: MikelFrontmatterOptions): void;

/**
 * YAML parser exposed for direct use
 */
declare namespace mikelFrontmatter {
    export const yamlParser: YamlParser;
    export const tomlParser: TomlParser;
}

export default mikelFrontmatter;
