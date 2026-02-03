// @description parse a single value from YAML
const parseValue = (str = "") => {
    // str = str.trim();
    // 1. quoted strings
    if ((str.startsWith(`"`) && str.endsWith(`"`)) || (str.startsWith(`'`) && str.endsWith(`'`))) {
        return str.slice(1, -1);
    }
    // 2. inline array
    if (str.startsWith("[") && str.endsWith("]")) {
        return str.slice(1, -1).split(',').map(s => parseValue(s));
    }
    // 3. inline object
    if (str.startsWith("{") && str.endsWith("}")) {
        return str.slice(1, -1).split(",").reduce((result, pair) => {
            const [key, value] = pair.split(":");
            if (key && value) {
                result[key.trim()] = parseValue(value.trim());
            }
            return result;
        }, {});
    }
    // 4. booleans
    if (str === "true" || str === "yes" || str === "on") {
        return true;
    }
    if (str === "false" || str === "no" || str === "off") {
        return false;
    }
    // 5. null values
    if (str === "null" || str === "~") {
        return null;
    }
    // 6. numbers
    if (/^-?\d+(\.\d+)?$/.test(str)) {
        return parseFloat(str);
    }
    // 5. return as-is
    return str;
};

// @description get the current indentation level
const getIndent = (line = "") => {
    return line.length - line.trimStart().length;
};

// @description parse a simple YAML string into an object
const parseYaml = (yaml = "") => {
    const lines = yaml.split("\n");
    let i = 0;
    const parse = (minIndent = 0, result = {}) => {
        while (i < lines.length) {
            const line = lines[i];
            const trimmed = line.trim();
            const indent = getIndent(line);
      
            // skip empty and comments
            if (!trimmed || trimmed[0] === "#") {
                i++;
                continue;
            }
            // Return if dedented
            if (indent < minIndent) {
                return result;
            }
            // Array item
            if (trimmed.startsWith("- ")) {
                // First array item - initialize array
                if (!Array.isArray(result)) {
                    result = [];
                }
                const content = trimmed.slice(2).trim();
                i++;
                if (!content) {
                    // Nested content on next lines
                    result.push(parse(indent + 2, {}));
                }
                // inline content with key:value (object)
                else if (content.includes(":")) {
                    const obj = {};
                    const colonIdx = content.indexOf(":");
                    if (colonIdx > 0) {
                        obj[content.slice(0, colonIdx).trim()] = parseValue(content.slice(colonIdx + 1).trim());
                    }
                    // Check for nested content on following lines
                    if (i < lines.length && getIndent(lines[i]) > indent) {
                        Object.assign(obj, parse(indent + 2, {}));
                    }
                    result.push(obj);
                }
                else {
                    // Simple value
                    result.push(parseValue(content));
                }
            }
            // Key-value pair
            else if (trimmed.includes(":")) {
                const colonIdx = trimmed.indexOf(":");
                const key = trimmed.slice(0, colonIdx).trim();
                const value = trimmed.slice(colonIdx + 1).trim();
                i++;
                if (!value) {
                    // Check if next line is an array or object
                    if (i < lines.length && getIndent(lines[i]) > indent) {
                        const nextLine = lines[i].trim();
                        if (nextLine.startsWith("- ")) {
                            result[key] = parse(indent + 2, []);
                        } else {
                            result[key] = parse(indent + 2, {});
                        }
                    } else {
                        result[key] = null;
                    }
                } else {
                    result[key] = parseValue(value);
                }
            }
            else {
                i++;
            }
        }
        return result;
    };
    return parse(0, {});
};

// @description internal method to parse the content of the frontmatter block
const parseFrontmatterBlock = (content = "", parser = null) => {
    // 1. use custom parser if provided
    if (typeof parser === "function") {
        return parser(content);
    }
    // 2. guess format (YAML or JSON)
    const trimmed = content.trim();
    if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
        return JSON.parse(content);
    }
    return parseYaml(content);
};

// @description plugin to register a #frontmatter helper
// @param {Object} options - plugin options
// @param {Function} options.parser - custom YAML parser function
const mikelFrontmatter = (options = {}) => {
    return {
        helpers: {
            frontmatter: params => {
                const variableName = params.options.as || "frontmatter";
                // const format = params.options.format || "yaml";
                const content = parseFrontmatterBlock(params.fn(params.data) || "", options.parser);
                // register the variable (overwrite if it already exists)
                Object.assign(params.variables, {
                    [variableName]: content,
                });
                // don't render anything
                return "";
            },
        },
    };
};

// assign additional metadata to the plugin function
mikelFrontmatter.yamlParser = parseYaml;

// export the plugin as default
export default mikelFrontmatter;
