const tags = /\{\{|\}\}/;
const escapedChars = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;",
};

const escape = s => s.toString().replace(/[&<>\"']/g, m => escapedChars[m]);

const get = (c, p) => (p === "." ? c : p.split(".").reduce((x, k) => x?.[k], c)) ?? "";

const parse = (v, context = {}, vars = {}) => {
    if ((v.startsWith(`"`) && v.endsWith(`"`)) || /^-?\d*\.?\d*$/.test(v) || v === "true" || v === "false" || v === "null") {
        return JSON.parse(v);
    }
    return (v || "").startsWith("@") ? get(vars, v.slice(1)) : get(context, v || ".");
};

const defaultHelpers = {
    "each": (value, opt) => {
        return (typeof value === "object" ? Object.entries(value || {}) : [])
            .map((item, index, items) => opt.fn(item[1], {index: index, key: item[0], value: item[1], first: index === 0, last: index === items.length - 1}))
            .join("");
    },
    "if": (value, opt) => !!value ? opt.fn(opt.context) : "",
    "unless": (value, opt) => !!!value ? opt.fn(opt.context) : "",
};

const compile = (tokens, output, context, partials, helpers, vars, fn = {}, index = 0, section = "") => {
    let i = index;
    while (i < tokens.length) {
        if (i % 2 === 0) {
            output.push(tokens[i]);
        }
        else if (tokens[i].startsWith("@")) {
            output.push(get(vars, tokens[i].slice(1).trim() ?? "_") ?? "");
        }
        else if (tokens[i].startsWith("!")) {
            output.push(get(context, tokens[i].slice(1).trim()));
        }
        else if (tokens[i].startsWith("#") && typeof helpers[tokens[i].slice(1).trim().split(" ")[0]] === "function") {
            const [t, ...args] = tokens[i].slice(1).trim().match(/(?:[^\s"]+|"[^"]*")+/g);
            const j = i + 1;
            output.push(helpers[t](...args.map(v => parse(v, context, vars)), {
                context: context,
                fn: (blockContext = {}, blockVars = {}, blockOutput = []) => {
                    i = compile(tokens, blockOutput, blockContext, partials, helpers, {...vars, ...blockVars, root: vars.root}, fn, j, t);
                    return blockOutput.join("");
                },
            }));
            // Make sure that this block is executed at least once
            if (i + 1 === j) {
                i = compile(tokens, [], {}, {}, helpers, {}, {}, j, t);
            }
        }
        else if (tokens[i].startsWith("#") || tokens[i].startsWith("^")) {
            const t = tokens[i].slice(1).trim();
            const value = get(context, t);
            const negate = tokens[i].startsWith("^");
            if (!negate && value && Array.isArray(value)) {
                const j = i + 1;
                (value.length > 0 ? value : [""]).forEach(item => {
                    i = compile(tokens, value.length > 0 ? output : [], item, partials, helpers, vars, fn, j, t);
                });
            }
            else {
                const includeOutput = (!negate && !!value) || (negate && !!!value);
                i = compile(tokens, includeOutput ? output : [], context, partials, helpers, vars, fn, i + 1, t);
            }
        }
        else if (tokens[i].startsWith(">")) {
            const [t, v] = tokens[i].slice(1).trim().split(" ");
            if (typeof partials[t] === "string") {
                compile(partials[t].split(tags), output, v ? get(context, v) : context, partials, helpers, vars, fn, 0, "");
            }
        }
        else if (tokens[i].startsWith("=")) {
            const [t, ...args] = tokens[i].slice(1).trim().match(/(?:[^\s"]+|"[^"]*")+/g);
            if (typeof fn[t] === "function") {
                output.push(fn[t](...args.map(v => parse(v, context, vars))) || "");
            }
        }
        else if (tokens[i].startsWith("/")) {
            if (tokens[i].slice(1).trim() !== section) {
                throw new Error(`Unmatched section end: {{${tokens[i]}}}`);
            }
            break;
        }
        else {
            output.push(escape(get(context, tokens[i].trim())));
        }
        i = i + 1;
    }
    return i;
};

// @description main compiler function
const mikel = (str, context = {}, opt = {}, output = []) => {
    const partials = Object.assign({}, opt.partials || {});
    const helpers = Object.assign({}, defaultHelpers, opt.helpers || {});
    const variables = Object.assign({}, opt.variables || {}, {root: context});
    compile(str.split(tags), output, context, partials, helpers, variables, opt.functions || {}, 0, "");
    return output.join("");
};

// @description assign utilities
mikel.escape = escape;
mikel.get = get;
mikel.parse = parse;

export default mikel;
