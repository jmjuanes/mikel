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
    return ts.reduce((p, t, i) => p + (i%2 === 0 && i > 0 ? e : (i > 0) ? s : "") + t, "");
};

// @description parse string arguments
const parseArgs = (argString = "", context = {}, vars = {}) => {
    const [t, ...args] = argString.trim().match(/(?:[^\s"]+|"[^"]*")+/g);
    const argv = args.filter(a => !a.includes("=")).map(a => parse(a, context, vars));
    const opt = Object.fromEntries(args.filter(a => a.includes("=")).map(a => {
        const [k, v] = a.split("=");
        return [k, parse(v, context, vars)];
    }));
    return [t, argv, opt];
};

// @description parse a string value to a native type
const parse = (v, context = {}, vars = {}) => {
    if ((v.startsWith(`"`) && v.endsWith(`"`)) || /^-?\d+\.?\d*$/.test(v) || v === "true" || v === "false" || v === "null") {
        return JSON.parse(v);
    }
    return (v || "").startsWith("@") ? get(vars, v.slice(1)) : get(context, v || ".");
};

// @description tiny front-matter parser
const frontmatter = (str = "", parser = null) => {
    let body = (str || "").trim(), data = {};
    const matches = Array.from(body.matchAll(/^(--- *)/gm))
    if (matches?.length === 2 && matches[0].index === 0) {
        const front = body.substring(0 + matches[0][1].length, matches[1].index).trim();
        body = body.substring(matches[1].index + matches[1][1].length).trim();
        data = typeof parser === "function" ? parser(front) : front;
    }
    return {body, data};
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
    "if": p => !!p.args[0] ? p.fn(p.context) : "",
    "unless": p => !!!p.args[0] ? p.fn(p.context) : "",
    "eq": p => p.args[0] === p.args[1] ? p.fn(p.context) : "",
    "ne": p => p.args[0] !== p.args[1] ? p.fn(p.context) : "",
    "with": p => p.fn(p.args[0]),
};

// @description create a new instance of mikel
const create = (template = "", options = {}) => {
    const helpers = Object.assign({}, defaultHelpers, options?.helpers || {});
    const partials = Object.assign({}, options?.partials || {});
    const functions = options?.functions || {};
    // internal method to compile the template
    const compile = (tokens, output, context, vars, index = 0, section = "") => {
        let i = index;
        while (i < tokens.length) {
            if (i % 2 === 0) {
                output.push(tokens[i]);
            }
            else if (tokens[i].startsWith("#") && typeof helpers[tokens[i].slice(1).trim().split(" ")[0]] === "function") {
                const [t, args, opt] = parseArgs(tokens[i].slice(1), context, vars);
                const j = i + 1;
                output.push(helpers[t]({
                    args: args,
                    opt: opt,
                    context: context,
                    fn: (blockContext = {}, blockVars = {}, blockOutput = []) => {
                        i = compile(tokens, blockOutput, blockContext, {...vars, ...blockVars, root: vars.root}, j, t);
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
                const value = get(context, t);
                const negate = tokens[i].startsWith("^");
                if (!negate && value && Array.isArray(value)) {
                    const j = i + 1;
                    (value.length > 0 ? value : [""]).forEach(item => {
                        i = compile(tokens, value.length > 0 ? output : [], item, vars, j, t);
                    });
                }
                else {
                    const includeOutput = (!negate && !!value) || (negate && !!!value);
                    i = compile(tokens, includeOutput ? output : [], context, vars, i + 1, t);
                }
            }
            else if (tokens[i].startsWith("<")) {
                const t = tokens[i].slice(1).trim(), partialTokens = tokens.slice(i + 1);
                const lastIndex = partialTokens.findIndex((token, j) => {
                    return j % 2 !== 0 && token.trim().startsWith("/") && token.trim().endsWith(t);
                });
                if (typeof partials[t] === "undefined") {
                    partials[t] = untokenize(partialTokens.slice(0, lastIndex));
                }
                i = i + lastIndex + 1;
            }
            else if (tokens[i].startsWith(">")) {
                const [t, args, opt] = parseArgs(tokens[i].slice(1), context, vars);
                if (typeof partials[t] === "string") {
                    const newCtx = args.length > 0 ? args[0] : (Object.keys(opt).length > 0 ? opt : context);
                    compile(tokenize(partials[i]), output, newCtx, vars, 0, "");
                }
            }
            else if (tokens[i].startsWith("=")) {
                const [t, args, opt] = parseArgs(tokens[i].slice(1), context, vars);
                if (typeof functions[t] === "function") {
                    output.push(functions[t]({args, opt, context}) || "");
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
                        return parse(v.trim().slice(1).trim(), context, vars);
                    }
                    // escape the returned value
                    return escape(parse(v.trim(), context, vars));
                });
                output.push(t.find(v => !!v) ?? "");
            }
            i = i + 1;
        }
        return i;
    };
    // entry method to compile the template with the provided data object
    const compileTemplate = (data = {}, output = []) => {
        compile(tokenize(template), output, data, {root: data}, 0, "");
        return output.join("");
    };
    // assign api methods and return method to compile the template
    return Object.assign(compileTemplate, {
        addHelper: (name, fn) => helpers[name] = fn,
        removeHelper: name => delete helpers[name],
        addFunction: (name, fn) => functions[name] = fn,
        removeFunction: name => delete functions[name],
        addPartial: (name, partial) => partials[name] = partial,
        removePartial: name => delete partials[name],
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
mikel.frontmatter = frontmatter;

export default mikel;
