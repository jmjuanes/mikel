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

// @description tokenize args
const tokenizeArgs = (str = "", tokens = [], strings = []) => {
    let current = "", depth = 0;
    // 1. replace strings
    str = str.replace(/"([^"\\]|\\.)*"/g, (match) => {
        const id = `__STR${strings.length}__`;
        strings.push(match);
        return id;
    });
    // 2. tokenize arguments
    for (let i = 0; i < str.length; i++) {
        const c = str[i];
        if (c === "(") {
            depth++;
            current = current + c;
        } else if (c === ")") {
            depth--;
            current = current + c;
        } else if (c === " " && depth === 0) {
            if (current.trim()) {
                tokens.push(current.trim());
            }
            current = "";
        } else {
            current = current + c;
        }
    }
    // 3. add current token
    if (current.trim()) {
        tokens.push(current.trim());
    }
    // 4. replace strings back and return parsed tokens
    return tokens.map(token => {
        return token.replace(/__STR(\d+)__/g, (_, i) => strings[i]);
    });
};

// @description parse string arguments
const parseArgs = (str = "", data = {}, state = {}, fns = {}, argv = [], opt = {}) => {
    const [t, ...args] = tokenizeArgs(str.trim());
    args.forEach(argStr => {
        if (argStr.includes("=") && !argStr.startsWith(`"`)) {
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

// @description evaluate an expression
const evaluateExpression = (str = "", data = {}, state = {}, fns = {}) => {
    const [fnName, args, options] = parseArgs(str, data, state, fns);
    if (typeof fns[fnName] === "function") {
        return fns[fnName]({ args, options, data, state });
    }
    // if no function has been found with this name
    // throw new Error(`Unknown function '${fnName}'`);
    return "";
};

// @description parse a string value to a native type
const parse = (v, data = {}, state = {}, fns = {}) => {
    if (v.startsWith("(") && v.endsWith(")")) {
        return evaluateExpression(v.slice(1, -1).trim(), data, state, fns);
    }
    if ((v.startsWith(`"`) && v.endsWith(`"`)) || /^-?\d+\.?\d*$/.test(v) || v === "true" || v === "false" || v === "null") {
        return JSON.parse(v);
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
const compile = (ctx, tokens, output, data, state, index = 0, section = "") => {
    let i = index;
    while (i < tokens.length) {
        if (i % 2 === 0) {
            output.push(tokens[i]);
        }
        else if (tokens[i].startsWith("#") && typeof ctx.helpers[tokens[i].slice(1).trim().split(" ")[0]] === "function") {
            const [t, args, opt] = parseArgs(tokens[i].slice(1), data, state);
            const j = i + 1;
            i = findClosingToken(tokens, j, t);
            output.push(ctx.helpers[t]({
                args: args,
                options: opt,
                tokens: tokens.slice(j, i),
                data: data,
                state: state,
                fn: (blockData = {}, customBlockState = {}, blockOutput = []) => {
                    const blockState = {
                        ...state,
                        ...customBlockState,
                        helper: {
                            name: t,
                            options: opt || {},
                            args: args || [],
                            context: blockData,
                        },
                        parent: data,
                        root: state.root,
                    };
                    compile(ctx, tokens, blockOutput, blockData, blockState, j, t);
                    return blockOutput.join("");
                },
            }));
        }
        else if (tokens[i].startsWith("#") || tokens[i].startsWith("^")) {
            const t = tokens[i].slice(1).trim();
            const value = get(data, t);
            const negate = tokens[i].startsWith("^");
            if (!negate && value && Array.isArray(value)) {
                const j = i + 1;
                (value.length > 0 ? value : [""]).forEach(item => {
                    i = compile(ctx, tokens, value.length > 0 ? output : [], item, state, j, t);
                });
            }
            else {
                const includeOutput = (!negate && !!value) || (negate && !!!value);
                i = compile(ctx, tokens, includeOutput ? output : [], data, state, i + 1, t);
            }
        }
        // DEPRECATED
        else if (tokens[i].startsWith(">*")) {
            const t = tokens[i].slice(2).trim(), partialTokens = tokens.slice(i + 1);
            const lastIndex = partialTokens.findIndex((token, j) => {
                return j % 2 !== 0 && token.trim().startsWith("/") && token.trim().endsWith(t);
            });
            if (typeof ctx.partials[t] === "undefined") {
                ctx.partials[t] = untokenize(partialTokens.slice(0, lastIndex));
            }
            i = i + lastIndex + 1;
        }
        else if (tokens[i].startsWith(">")) {
            const [t, args, opt] = parseArgs(tokens[i].replace(/^>{1,2}/, ""), data, state);
            const blockContent = []; // to store partial block content
            const partials = Object.assign({}, ctx.partials, state.partials || {});
            if (tokens[i].startsWith(">>")) {
                i = compile(ctx, tokens, blockContent, data, state, i + 1, t);
            }
            if (typeof partials[t] === "string" || typeof partials[t]?.body === "string") {
                const partialBody = partials[t]?.body || partials[t];
                const partialData = args.length > 0 ? args[0] : (Object.keys(opt).length > 0 ? opt : data);
                const partialState = {
                    ...state,
                    content: blockContent.join(""),
                    partial: {
                        name: t,
                        attributes: partials[t]?.attributes || partials[t]?.data || {},
                        args: args || [],
                        options: opt || {},
                        context: partialData,
                    },
                };
                compile(ctx, tokenize(partialBody), output, partialData, partialState, 0, "");
            }
        }
        else if (tokens[i].startsWith("=")) {
            output.push(evaluateExpression(tokens[i].slice(1), data, state, ctx.functions) ?? "");
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

// @description default helpers
const defaultHelpers = {
    "each": p => {
        const items = typeof p.args[0] === "object" ? Object.entries(p.args[0] || {}) : [];
        const limit = Math.min(items.length - (p.options?.skip || 0), p.options?.limit || items.length);
        return items.slice(p.options?.skip || 0, (p.options?.skip || 0) + limit)
            .map((item, index) => {
                return p.fn(item[1], {
                    index: index, 
                    key: item[0],
                    value: item[1],
                    first: index === 0,
                    last: index === items.length - 1,
                });
            })
            .join("");
    },
    "if": p => !!p.args[0] ? p.fn(p.data) : "",
    "unless": p => !!!p.args[0] ? p.fn(p.data) : "",
    "eq": p => p.args[0] === p.args[1] ? p.fn(p.data) : "",
    "ne": p => p.args[0] !== p.args[1] ? p.fn(p.data) : "",
    "with": p => p.fn(p.args[0]),
    "escape": p => escape(p.fn(p.data)),
    "raw": p => untokenize(p.tokens),
    "slot": params => {
        if (typeof params.state.slot === "undefined") {
            params.state.slot = {};
        }
        params.state.slot[params.args[0].trim()] = params.fn(params.data);
        return "";
    },
    "macro": params => {
        if (typeof params.state.partials === "undefined") {
            params.state.partials = {};
        }
        params.state.partials[params.args[0].trim()] = untokenize(params.tokens).trim();
        return "";
    },
};

// @description create a new instance of mikel
const create = (options = {}) => {
    const ctx = Object.freeze({
        helpers: Object.assign({}, defaultHelpers, options?.helpers || {}),
        partials: Object.assign({}, options?.partials || {}),
        functions: options?.functions || {},
    });
    // entry method to compile the template with the provided data object
    const compileTemplate = (template, data = {}, output = []) => {
        compile(ctx, tokenize(template), output, data, { root: data }, 0, "");
        return output.join("");
    };
    // assign api methods and return method to compile the template
    return Object.assign(compileTemplate, {
        use: newOptions => {
            if (typeof newOptions === "function") {
                newOptions(compileTemplate);
            }
            else if (!!newOptions && typeof newOptions === "object") {
                ["helpers", "functions", "partials"].forEach(field => {
                    Object.assign(ctx[field], newOptions?.[field] || {});
                });
            }
            return compileTemplate;
        },
        addHelper: (name, fn) => ctx.helpers[name] = fn,
        removeHelper: name => delete ctx.helpers[name],
        addFunction: (name, fn) => ctx.functions[name] = fn,
        removeFunction: name => delete ctx.functions[name],
        addPartial: (name, partial) => ctx.partials[name] = partial,
        removePartial: name => delete ctx.partials[name],
    });
};

// @description main compiler function
const mikel = (template = "", data = {}, options = {}) => {
    return create(options)(template, data);
};

// @description assign utilities
mikel.create = create;
mikel.escape = escape;
mikel.get = get;
mikel.parse = parse;
mikel.tokenize = tokenize;
mikel.untokenize = untokenize;

export default mikel;
