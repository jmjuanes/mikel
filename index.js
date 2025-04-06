const escapedChars = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;",
};

const escape = s => s.toString().replace(/[&<>\"']/g, m => escapedChars[m]);

const get = (c, p) => (p === "." ? c : p.split(".").reduce((x, k) => x?.[k], c)) ?? "";

// @description tokenize and untokenize methods
const tokenize = (str = "") => str.split(/\{\{|\}\}/);
const untokenize = (ts = [], s = "{{", e = "}}") => {
    return ts.reduce((p, t, i) => p + (i % 2 === 0 ? e : s) + t);
};

// @description parse string arguments
const parseArgs = (argString = "", data = {}, vars = {}) => {
    const [t, ...args] = argString.trim().match(/(?:[^\s"]+|"[^"]*")+/g);
    const argv = args.filter(a => !a.includes("=")).map(a => parse(a, data, vars));
    const opt = Object.fromEntries(args.filter(a => a.includes("=")).map(a => {
        const [k, v] = a.split("=");
        return [k, parse(v, data, vars)];
    }));
    return [t, argv, opt];
};

// @description parse a string value to a native type
const parse = (v, data = {}, vars = {}) => {
    if ((v.startsWith(`"`) && v.endsWith(`"`)) || /^-?\d+\.?\d*$/.test(v) || v === "true" || v === "false" || v === "null") {
        return JSON.parse(v);
    }
    return (v || "").startsWith("@") ? get(vars, v.slice(1)) : get(data, v || ".");
};

// @description default helpers
const defaultHelpers = {
    "each": p => {
        const items = typeof p.args[0] === "object" ? Object.entries(p.args[0] || {}) : [];
        const limit = Math.min(items.length - (p.opt.skip || 0), p.opt.limit || items.length);
        return items.slice(p.opt.skip || 0, (p.opt.skip || 0) + limit)
            .map((item, index) => p.fn(item[1], {index: index, key: item[0], value: item[1], first: index === 0, last: index === items.length - 1}))
            .join("");
    },
    "if": p => !!p.args[0] ? p.fn(p.data) : "",
    "unless": p => !!!p.args[0] ? p.fn(p.data) : "",
    "eq": p => p.args[0] === p.args[1] ? p.fn(p.data) : "",
    "ne": p => p.args[0] !== p.args[1] ? p.fn(p.data) : "",
    "with": p => p.fn(p.args[0]),
    "escape": p => escape(p.fn(p.data)),
};

// @description create a new instance of mikel
const create = (template = "", options = {}) => {
    const ctx = {
        tokens: tokenize(template),
        helpers: Object.assign({}, defaultHelpers, options?.helpers || {}),
        partials: Object.assign({}, options?.partials || {}),
        functions: options?.functions || {},
        variables: {},
    };
    // internal method to compile the template
    const compile = (tokens, output, data, vars, index = 0, section = "") => {
        let i = index;
        while (i < tokens.length) {
            if (i % 2 === 0) {
                output.push(tokens[i]);
            }
            else if (tokens[i].startsWith("#") && typeof ctx.helpers[tokens[i].slice(1).trim().split(" ")[0]] === "function") {
                const [t, args, opt] = parseArgs(tokens[i].slice(1), data, vars);
                const j = i + 1;
                output.push(ctx.helpers[t]({
                    args: args,
                    opt: opt,
                    data: data,
                    context: data,
                    fn: (blockData = {}, blockVars = {}, blockOutput = []) => {
                        i = compile(tokens, blockOutput, blockData, {...vars, ...blockVars, root: vars.root}, j, t);
                        return blockOutput.join("");
                    },
                }));
                // Make sure that this block is executed at least once
                if (i + 1 === j) {
                    i = compile(tokens, [], {}, {}, j, t);
                }
            }
            else if (tokens[i].startsWith("#") || tokens[i].startsWith("^")) {
                const t = tokens[i].slice(1).trim();
                const value = get(data, t);
                const negate = tokens[i].startsWith("^");
                if (!negate && value && Array.isArray(value)) {
                    const j = i + 1;
                    (value.length > 0 ? value : [""]).forEach(item => {
                        i = compile(tokens, value.length > 0 ? output : [], item, vars, j, t);
                    });
                }
                else {
                    const includeOutput = (!negate && !!value) || (negate && !!!value);
                    i = compile(tokens, includeOutput ? output : [], data, vars, i + 1, t);
                }
            }
            else if (tokens[i].startsWith("<")) {
                const t = tokens[i].slice(1).trim(), partialTokens = tokens.slice(i + 1);
                const lastIndex = partialTokens.findIndex((token, j) => {
                    return j % 2 !== 0 && token.trim().startsWith("/") && token.trim().endsWith(t);
                });
                if (typeof ctx.partials[t] === "undefined") {
                    ctx.partials[t] = untokenize(partialTokens.slice(0, lastIndex));
                }
                i = i + lastIndex + 1;
            }
            else if (tokens[i].startsWith(">")) {
                const [t, args, opt] = parseArgs(tokens[i].replace(/^>{1,2}/, ""), data, vars);
                const blockContent = []; // to store partial block content
                if (tokens[i].startsWith(">>")) {
                    i = compile(tokens, blockContent, data, vars, i + 1, t);
                }
                if (typeof ctx.partials[t] === "string" || typeof ctx.partials[t]?.body === "string") {
                    const newData = args.length > 0 ? args[0] : (Object.keys(opt).length > 0 ? opt : data);
                    const newVars = {
                        ...vars,
                        content: blockContent.join(""),
                        partial: ctx.partials[t]?.attributes || ctx.partials[t]?.data || {},
                    };
                    compile(tokenize(ctx.partials[t]?.body || ctx.partials[t]), output, newData, newVars, 0, "");
                }
            }
            else if (tokens[i].startsWith("=")) {
                const [t, args, opt] = parseArgs(tokens[i].slice(1), data, vars);
                if (typeof ctx.functions[t] === "function") {
                    output.push(ctx.functions[t]({args, opt, data}) || "");
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
                        return parse(v.trim().slice(1).trim(), data, vars);
                    }
                    // escape the returned value
                    return escape(parse(v.trim(), data, vars));
                });
                output.push(t.find(v => !!v) ?? "");
            }
            i = i + 1;
        }
        return i;
    };
    // entry method to compile the template with the provided data object
    const compileTemplate = (data = {}, output = []) => {
        compile(ctx.tokens, output, data, {root: data, ...ctx.variables}, 0, "");
        return output.join("");
    };
    // assign api methods and return method to compile the template
    return Object.assign(compileTemplate, {
        use: newOptions => {
            if (typeof newOptions === "function") {
                newOptions(ctx);
            }
            else if (!!newOptions && typeof newOptions === "object") {
                ["helpers", "functions", "partials", "variables"].forEach(field => {
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
    return create(template, options)(data);
};

// @description assign utilities
mikel.create = create;
mikel.escape = escape;
mikel.get = get;
mikel.parse = parse;

export default mikel;
