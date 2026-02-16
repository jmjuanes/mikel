// @description split a string by separator, ignoring separators inside quotes
const splitSafe = (str = "", separator = ",") => {
    const result = [];
    let current = "", inQuotes = false, quoteChar = null;
    for (let i = 0; i < str.length; i++) {
        const char = str[i];
        if ((char === '"' || char === "'")) {
            if (!inQuotes) {
                inQuotes = true;
                quoteChar = char;
            } else if (char === quoteChar) {
                inQuotes = false;
                quoteChar = null;
            }
        }
        if (char === separator && !inQuotes) {
            result.push(current);
            current = "";
        } else {
            current = current + char;
        }
    }
    result.push(current);
    return result;
};

// @description parse a single value from YAML
const parseValue = (str = "") => {
    // 1. quoted strings
    if ((str.startsWith(`"`) && str.endsWith(`"`)) || (str.startsWith(`'`) && str.endsWith(`'`))) {
        return str.slice(1, -1);
    }
    // 2. inline array
    if (str.startsWith("[") && str.endsWith("]")) {
        return splitSafe(str.slice(1, -1), ",").map(item => parseValue(item.trim()));
    }
    // 3. inline object
    if (str.startsWith("{") && str.endsWith("}")) {
        return splitSafe(str.slice(1, -1), ",").reduce((result, pair) => {
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

// @description extract a key-value pair from a line
const extractKeyValue = (line = "", separator = ":") => {
    const separatorIndex = line.indexOf(separator);
    return [
        line.slice(0, separatorIndex).trim(),
        line.slice(separatorIndex + 1).trim(),
    ];
};

// @description parse a simple YAML string into an object
const parseYaml = (yaml = "") => {
    const lines = yaml.split("\n").filter(line => {
        return line.trim() !== "" && !line.trim().startsWith("#");
    });
    let i = 0;
    const parse = (minIndent = 0, result = {}) => {
        while (i < lines.length) {
            const line = lines[i].trim();
            const indent = getIndent(lines[i]);
            // 1. return if dedented
            if (indent < minIndent) {
                return result;
            }
            // 2. array item
            else if (line.startsWith("- ")) {
                // first array item - initialize array
                if (!Array.isArray(result)) {
                    result = [];
                }
                const content = line.slice(2).trim();
                i++;
                // check for nested content on next lines
                if (!content) {
                    result.push(parse(indent + 2, {}));
                }
                // inline content with key:value (object)
                else if (content.includes(":")) {
                    const obj = {};
                    const [key, value] = extractKeyValue(content, ":");
                    obj[key] = !!value ? parseValue(value) : null;
                    // check for nested content on following lines
                    if (i < lines.length && getIndent(lines[i]) > indent) {
                        Object.assign(obj, parse(indent + 2, {}));
                    }
                    result.push(obj);
                }
                // simple value
                else {
                    result.push(parseValue(content));
                }
            }
            // 3. key-value pair
            else if (line.includes(":")) {
                const [key, value] = extractKeyValue(line, ":");
                i++;
                result[key] = null;
                // check for inline content with key: value (object)
                if (value) {
                    result[key] = parseValue(value);
                }
                // check if the next line is an array or object
                else if (!value && i < lines.length && getIndent(lines[i]) > indent) {
                    result[key] = parse(indent + 2, lines[i].trim().startsWith("- ") ? [] : {});
                }
            }
            // 4. other case??
            else {
                i++;
            }
        }
        return result;
    };
    return parse(0, {});
};

// @description parse a simple TOML string into an object
const parseToml = (toml = "") => {
    const lines = toml.split("\n");
    const result = {};
    let currentTable = result;
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!!line && !line.startsWith("#")) {
            // 1. table header [section] or [[array]]
            if (line.startsWith("[") && line.endsWith("]")) {
                const isArray = line.startsWith("[[") && line.endsWith("]]");
                const path = isArray ? line.slice(2, -2).trim() : line.slice(1, -1).trim();
                currentTable = result;
                path.split(".").forEach((part, index, parts) => {
                    const isLast = index === parts.length - 1;
                    // 1.1. if is an array of tables and is the last part
                    if (isLast && isArray) {
                        if (!Array.isArray(currentTable[part])) {
                            currentTable[part] = [];
                        }
                        currentTable[part].push({});
                        currentTable = currentTable[part][currentTable[part].length - 1];
                    }
                    // 1.2. other cases
                    else {
                        if (!currentTable[part]) {
                            currentTable[part] = {};
                        }
                        if (Array.isArray(currentTable[part])) {
                            currentTable = currentTable[part][currentTable[part].length - 1];
                        }
                        else {
                            currentTable = currentTable[part];
                        }
                    }
                });
            }
            // 2. key-value pair: key = value
            else if (line.includes("=")) {
                const [key, value] = extractKeyValue(line, "=");
                currentTable[key] = parseValue(value);
            }
        }
    }
    return result;
};
 

// @description internal method to parse the content of the frontmatter block
const parseFrontmatterBlock = (content = "", format = "yaml", parser = null) => {
    // 1. use custom parser if provided
    if (typeof parser === "function") {
        return parser(content, format);
    }
    // 2. use the appropriate parser based on the format
    if (format === "json") {
        return JSON.parse(content.trim());
    }
    if (format === "toml") {
        return parseToml(content);
    }
    // 3. fallback to YAML
    return parseYaml(content);
};

// @description plugin to register a #frontmatter helper
// @param {Object} options - plugin options
// @param {Function} options.parser - custom YAML parser function
const mikelFrontmatter = (options = {}) => ({
    helpers: {
        frontmatter: params => {
            const variableName = params.options.as || "frontmatter";
            const format = params.options.format || "yaml";
            // register the variable (overwrite if it already exists)
            Object.assign(params.state, {
                [variableName]: parseFrontmatterBlock(params.fn(params.data) || "", format, options.parser),
            });
            // don't render anything
            return "";
        },
    },
});

// assign additional metadata to the plugin function
mikelFrontmatter.yamlParser = parseYaml;
mikelFrontmatter.tomlParser = parseToml;

// export the plugin as default
export default mikelFrontmatter;
