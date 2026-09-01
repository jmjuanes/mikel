const escapedChars = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;",
};

const escape = s => s.toString().replace(/[&<>\"']/g, m => escapedChars[m]);

// @description get the value in the provided object and the given path string
const get = (data, path = ".") => {
    if (path === "." || path === "this") {
        return data ?? "";
    }
    return path.replace(/^this\./, "").split(".").reduce((x, k) => x?.[k], data) ?? "";
};

// @description tokenize the provided string
const tokenize = (str = "") => {
    return str.replace(/\{\{!--[\s\S]*?--}}/g, "").split(/\{\{|\}\}/);
}

// @description untokenize the provided tokens array and get a string
const untokenize = (ts = [], s = "{{", e = "}}") => {
    return ts.length > 0 ? ts.reduce((p, t, i) => p + (i % 2 === 0 ? e : s) + t) : "";
};

// @description parse string arguments
const parseArgs = (str = "", data = {}, state = {}, fns = {}, argv = [], opt = {}) => {
    const [t, ...args] = str.trim().match(/(?:[^\s"]+|"[^"]*")+/g);
    args.forEach(argStr => {
        if (argStr.includes("=") && !argStr.startsWith(`"`) && !argStr.startsWith(`'`)) {
            const [k, v] = argStr.split("=");
            opt[k] = parse(v, data, state, fns);
        }
        else if (argStr.startsWith("...")) {
            const value = parse(argStr.replace(/^\.{3}/, ""), data, state, fns);
            if (!!value && typeof value === "object") {
                Array.isArray(value) ? argv.push(...value) : Object.assign(opt, value);
            }
        }
        else {
            argv.push(parse(argStr, data, state, fns));
        }
    });
    return [t, argv, opt];
};

// @description parse a string value to a native type
const parse = (v, data = {}, state = {}, fns = {}) => {
    if ((v.startsWith(`"`) && v.endsWith(`"`)) || (v.startsWith(`'`) && v.endsWith(`'`)) || /^-?\d+\.?\d*$/.test(v) || v === "true" || v === "false" || v === "null") {
        const normalized = (v.startsWith(`'`) && v.endsWith(`'`)) ? `"${v.slice(1, -1).replace(/"/g, '\\"')}"` : v;
        return JSON.parse(normalized);
    }
    return (v || "").startsWith("@") ? get(state, v.slice(1)) : get(data, v || ".");
};

// @description find the index of the closing token
const findClosingToken = (tokens, i, token) => {
    while(i < tokens.length) {
        if (i % 2 > 0) {
            if (tokens[i].startsWith("/") && tokens[i].slice(1).trim() === token) {
                return i;
            }
            else if (tokens[i].startsWith("#") && tokens[i].slice(1).trim().split(" ")[0] === token) {
                i = findClosingToken(tokens, i + 1, token);
            }
        }
        i = i + 1;
    }
    throw new Error(`Unmatched section end: {{${token}}}`);
};

// @description internal method to compile the template
const compile = (tokens, output, data = {}, directives = {}, state = {}, index = 0, section = "") => {
    let i = index;
    while (i < tokens.length) {
        if (i % 2 === 0) {
            output.push(tokens[i]);
        }
        else if (tokens[i].startsWith("#")) {
            const value = tokens[i].slice(1).replace(/\s*\/$/, ""); // removes self-closing directive character
            const isSelfClosing = tokens[i].trim().endsWith("/");
            const [t, args, opt] = parseArgs(value, data, state);
            const j = i + 1;
            if (!isSelfClosing) {
                i = findClosingToken(tokens, j, t);
            }
            // only compile if there is a directive with this name
            if (typeof directives[t] === "function") {
                const result = directives[t]({
                    context: Object.freeze({
                        state: state,
                        directives: directives,
                        data: data,
                        tokens: tokens.slice(j, i),
                    }),
                    args: args,
                    options: opt,
                    fn: (blockData = {}, customBlockState = {}, blockOutput = []) => {
                        if (!isSelfClosing) {
                            const blockState = {
                                ...state,
                                ...customBlockState,
                                parent: data,
                                root: state.root,
                            };
                            compile(tokens, blockOutput, blockData, directives, blockState, j, t);
                        }
                        return blockOutput.join("");
                    },
                });
                output.push(result);
            }
        }
        else if (tokens[i].startsWith("/")) {
            if (tokens[i].slice(1).trim() !== section) {
                throw new Error(`Unmatched section end: {{${tokens[i]}}}`);
            }
            break;
        }
        else {
            const t = tokens[i].split("||").map(v => {
                // check if the returned value should not be escaped
                if (v.trim().startsWith("!")) {
                    return parse(v.trim().slice(1).trim(), data, state);
                }
                // escape the returned value
                return escape(parse(v.trim(), data, state));
            });
            output.push(t.find(v => !!v) ?? "");
        }
        i = i + 1;
    }
    return i;
};

// internal method to extract data passed to a partial
const getPartialDataFromParams = params => {
    // 1. positional argument is provided, return the first argument
    if (params.args.length > 0) {
        return params.args[0];
    }
    // 2. optional arguments provided, return them
    if (Object.keys(params.options).length > 0) {
        return params.options;
    }
    // other case, return the data
    return params.context.data || {};
};

// utility method to create a partial directive
const createPartial = partial => {
    return params => {
        const partialResult = [];
        const partialData = getPartialDataFromParams(params);
        const partialState = {
            ...params.context.state,
            content: params.fn(params.context.data),
        };
        compile(tokenize(partial), partialResult, partialData, params.context.directives, partialState, 0, "");
        return partialResult.join("");
    };
};

// @description default directives
const defaultDirectives = {
    "each": p => {
        const values = p.options?.items || p.args[0] || {};
        const items = typeof values === "object" ? Object.entries(values) : [];
        const skip = p.options?.skip || 0;
        const limit = Math.min(items.length - (p.options?.skip || 0), p.options?.limit || items.length);
        const result = items.slice(skip, skip + limit).map((item, index) => {
            return p.fn(item[1], {
                index: index, 
                key: item[0],
                value: item[1],
                first: index === 0,
                last: index === items.length - 1,
            });
        });
        return result.join("");
    },
    "if": p => !!(p.options?.condition ?? p.args[0]) ? p.fn(p.context.data) : "",
    "unless": p => !!!(p.options?.condition ?? p.args[0]) ? p.fn(p.context.data) : "",
    "eq": p => (p.options?.left ?? p.args[0]) === (p.options?.right ?? p.args[1]) ? p.fn(p.context.data) : "",
    "ne": p => (p.options?.left ?? p.args[0]) !== (p.options?.right ?? p.args[1]) ? p.fn(p.context.data) : "",
    "with": p => p.fn(p.options?.context ?? p.args[0]),
    "escape": p => escape(p.fn(p.context.data)),
    "raw": p => untokenize(p.context.tokens),
    "slot": p => {
        if (typeof p.context.state.slot === "undefined") {
            p.context.state.slot = {};
        }
        p.context.state.slot[(p.options?.name ?? p.args[0]).trim()] = p.fn(p.context.data);
        return "";
    },
};

// @description create a new instance of mikel
const create = (options = {}) => {
    const directives = Object.assign({}, defaultDirectives); // map to save directives (helpers and partials)
    const transforms = new Set(); // to save pretransforms
    const state = {}; // Object.assign({}, options?.initialState || {});
    // 1. add initial helpers and partials
    Object.keys(options?.helpers || {}).forEach(key => directives[key] = options.helpers[key]);
    Object.keys(options?.partials || {}).forEach(key => directives[key] = createPartial(options.partials[key]));
    // 2. entry method to compile the template with the provided data object
    const compileTemplate = (template, data = {}, output = []) => {
        const input = Array.from(transforms).reduce((content, fn) => fn(content), template);
        compile(tokenize(input), output, data, directives, { ...state, root: data }, 0, "");
        return output.join("");
    };
    // 3. generate api methods
    const mk = Object.freeze({
        addHelper: (name, value) => directives[name] = value,
        removeHelper: name => delete directives[name],
        addPartial: (name, value) => directives[name] = createPartial(value || ""),
        removePartial: name => delete directives[name],
    });
    // 4. return merged compileTemplate and api methods
    return Object.assign(compileTemplate, mk, {
        use: (plugin) => {
            if (typeof plugin === "function") {
                plugin(mk);
            }
            else if (typeof plugin === "object" && !!plugin) {
                // 1. merge directives and internal state
                Object.keys(plugin?.helpers || {}).forEach(key => directives[key] = plugin.helpers[key]);
                Object.keys(plugin?.partials || {}).forEach(key => directives[key] = createPartial(plugin.partials[key]));
                Object.assign(state, plugin?.initialState || {});
                // 2. if a transform function is provided, include it
                if (typeof plugin?.transform === "function") {
                    transforms.add(plugin.transform);
                }
            }
        },
    });
};

// @description main compiler function
const mikel = (template = "", data = {}, options = {}) => {
    return create(options)(template, data);
};

// @description plugin to define a new state variable
mikel.SetStatePlugin = (name, value) => {
    return {
        initialState: {
            [name]: value,
        },
    };
};

// @description assign utilities
mikel.create = create;
mikel.escape = escape;
mikel.get = get;
mikel.parse = parse;
mikel.tokenize = tokenize;
mikel.untokenize = untokenize;

export default mikel;
