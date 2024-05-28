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

const defaultHelpers = {
    "each": ({value, fn}) => {
        const items = (typeof value === "object" ? Object.entries(value || {}) : []);
        return items
            .map((item, index) => fn(item[1], {index: index, key: item[0], value: item[1], first: index === 0, last: index === items.length - 1}))
            .join("");
    },
    "if": ({value, fn, context}) => !!value ? fn(context) : "",
    "unless": ({value, fn, context}) => !!!value ? fn(context) : "",
};

const compile = (tokens, output, context, partials, helpers, vars, index = 0, section = "") => {
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
            const [t, v] = tokens[i].slice(1).trim().split(" ");
            const j = i + 1;
            output.push(helpers[t]({
                context: context,
                key: v || ".",
                value: v.startsWith("@") ? get(vars, v.slice(1)) : get(context, v || "."),
                fn: (blockContext = {}, blockVars = {}, blockOutput = []) => {
                    i = compile(tokens, blockOutput, blockContext, partials, helpers, {...vars, ...blockVars, root: vars.root}, j, t);
                    return blockOutput.join("");
                },
            }));
            // Make sure that this block has been executed
            if (i + 1 === j) {
                i = compile(tokens, [], {}, partials, helpers, vars, j, t);
            }
        }
        else if (tokens[i].startsWith("#") || tokens[i].startsWith("^")) {
            const t = tokens[i].slice(1).trim();
            const value = get(context, t);
            const negate = tokens[i].startsWith("^");
            if (!negate && value && Array.isArray(value)) {
                const j = i + 1;
                (value.length > 0 ? value : [""]).forEach(item => {
                    i = compile(tokens, value.length > 0 ? output : [], item, partials, helpers, vars, j, t);
                });
            }
            else {
                const includeOutput = (!negate && !!value) || (negate && !!!value);
                i = compile(tokens, includeOutput ? output : [], context, partials, helpers, vars, i + 1, t);
            }
        }
        else if (tokens[i].startsWith(">")) {
            const [t, v] = tokens[i].slice(1).trim().split(" ");
            if (typeof partials[t] === "string") {
                compile(partials[t].split(tags), output, v ? get(context, v) : context, partials, helpers, vars, 0, "");
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
    compile(str.split(tags), output, context, partials, helpers, variables, 0, "");
    return output.join("");
};

// @description assign utilities
mikel.escape = escape;
mikel.get = get;

export default mikel;
