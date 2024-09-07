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

// @description create a new instance of mikel
const create = (template = "", options = {}) => {
    // initialize internal context
    // TODO: we want to allow overwrite default helpers?
    const helpers = Object.assign(options?.helpers || {}, {
        "each": (value, opt) => {
            return (typeof value === "object" ? Object.entries(value || {}) : [])
                .map((item, index, items) => opt.fn(item[1], {index: index, key: item[0], value: item[1], first: index === 0, last: index === items.length - 1}))
                .join("");
        },
        "if": (value, opt) => !!value ? opt.fn(opt.context) : "",
        "unless": (value, opt) => !!!value ? opt.fn(opt.context) : "",
        "eq": (a, b, opt) => a === b ? opt.fn(opt.context) : "",
        "ne": (a, b, opt) => a !== b ? opt.fn(opt.context) : "",
        "with": (value, opt) => opt.fn(value),
    });
    const partials = options?.partials || {};
    const functions = options?.functions || {};
    // internal method to compile the template
    const compile = (tokens, output, context, vars, index = 0, section = "") => {
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
                        i = compile(tokens, blockOutput, blockContext, {...vars, ...blockVars, root: vars.root}, j, t);
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
                        i = compile(tokens, value.length > 0 ? output : [], item, vars, j, t);
                    });
                }
                else {
                    const includeOutput = (!negate && !!value) || (negate && !!!value);
                    i = compile(tokens, includeOutput ? output : [], context, vars, i + 1, t);
                }
            }
            else if (tokens[i].startsWith(">")) {
                const [t, v] = tokens[i].slice(1).trim().split(" ");
                if (typeof partials[t] === "string") {
                    compile(partials[t].split(tags), output, v ? get(context, v) : context, vars, 0, "");
                }
            }
            else if (tokens[i].startsWith("=")) {
                const [t, ...args] = tokens[i].slice(1).trim().match(/(?:[^\s"]+|"[^"]*")+/g);
                if (typeof functions[t] === "function") {
                    output.push(functions[t](...args.map(v => parse(v, context, vars))) || "");
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
    // entry method to compile the template with the provided data object
    const compileTemplate = (data = {}, output = []) => {
        compile(template.split(tags), output, data, {}, 0, "");
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
