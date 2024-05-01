const tags = /\{\{|\}\}/;
const escapedChars = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;",
};

const escape = str => {
    return str.toString().replace(/[&<>\"']/g, m => escapedChars[m]);
};

const get = (ctx, path) => {
    return (path === "." ? ctx : path.split(".").reduce((p, k) => p?.[k], ctx)) ?? "";
};

const helpers = new Map(Object.entries({
    "each": ({value, fn}) => {
        return (typeof value === "object" ? Object.entries(value || {}) : [])
            .map((item, index) => fn(item[1], {index: index, key: item[0], value: item[1]}))
            .join("");
    },
    "if": ({value, fn, context}) => !!value ? fn(context) : "",
    "unless": ({value, fn, context}) => !!!value ? fn(context) : "",
}));

const hasHelper = (name, options) => {
    return helpers.has(name) || typeof options?.helpers?.[name] === "function";
};
const getHelper = (name, options) => {
    return helpers.get(name) || options?.helpers?.[name];
};

const compile = (tokens, output, context, opt, index = 0, section = "", vars = {}) => {
    let i = index;
    while (i < tokens.length) {
        if (i % 2 === 0) {
            output.push(tokens[i]);
        }
        else if (tokens[i].startsWith("@")) {
            output.push(get({...(opt?.variables), ...vars}, tokens[i].slice(1).trim() ?? "_") ?? "");
        }
        else if (tokens[i].startsWith("!")) {
            output.push(get(context, tokens[i].slice(1).trim()));
        }
        else if (tokens[i].startsWith("#") && hasHelper(tokens[i].slice(1).trim().split(" ")[0], opt)) {
            const [t, v] = tokens[i].slice(1).trim().split(" ");
            const j = i + 1;
            output.push(getHelper(t, opt)({
                context: context,
                key: v || "",
                value: !!v ? get(context, v) : null,
                options: opt,
                fn: (blockContext = {}, blockVars = {}, blockOutput = []) => {
                    i = compile(tokens, blockOutput, blockContext, opt, j, t, {root: vars.root, ...blockVars});
                    return blockOutput.join("");
                },
            }));
            // Make sure that this block has been executed
            if (i + 1 === j) {
                i = compile(tokens, [], {}, opt, j, t, vars);
            }
        }
        else if (tokens[i].startsWith("#") || tokens[i].startsWith("^")) {
            const t = tokens[i].slice(1).trim();
            const value = get(context, t);
            const negate = tokens[i].startsWith("^");
            if (!negate && value && Array.isArray(value)) {
                const j = i + 1;
                (value.length > 0 ? value : [""]).forEach(item => {
                    i = compile(tokens, value.length > 0 ? output : [], item, opt, j, t, vars);
                });
            }
            else {
                const includeOutput = (!negate && !!value) || (negate && !!!value);
                i = compile(tokens, includeOutput ? output : [], context, opt, i + 1, t, vars);
            }
        }
        else if (tokens[i].startsWith(">")) {
            const [t, v] = tokens[i].slice(1).trim().split(" ");
            if (typeof opt?.partials?.[t] === "string") {
                compile(opt.partials[t].split(tags), output, v ? get(context, v) : context, opt, 0, "", vars);
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

export default (str, context = {}, opt = {}, output = []) => {
    compile(str.split(tags), output, context, opt, 0, "", {root: context});
    return output.join("");
};
