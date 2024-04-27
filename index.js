const tags = /\{\{|\}\}/;
const escapedChars = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;",
};

const getIterableValues = values => {
    if (!!values && typeof values === "object" && Object.keys(values).length > 0) {
        return Object.entries(values);
    }
    return [null];
};

const escape = str => {
    return str.toString().replace(/[&<>\"']/g, m => escapedChars[m]);
};

const get = (data, path) => {
    return path === "." ? data : (path.split(".").reduce((p, k) => p?.[k], data) || "");
};

const compile = (tokens, output, data, opt, index = 0, section = "", ctx = {}) => {
    let i = index;
    while (i < tokens.length) {
        if (i % 2 === 0) {
            output.push(tokens[i]);
        }
        else if (tokens[i].startsWith("@")) {
            const k = tokens[i].slice(1).trim();
            if (typeof ctx[k] !== "undefined") {
                output.push(ctx[k]);
            }
        }
        else if (tokens[i].startsWith("!")) {
            output.push(get(data, tokens[i].slice(1).trim()));
        }
        else if (tokens[i].startsWith("#each ")) {
            const [t, v] = tokens[i].slice(1).trim().split(" ");
            const j = i + 1;
            getIterableValues(get(data, v)).forEach(item => {
                const [k, v] = (item || [0, ""]);
                i = compile(tokens, !!item ? output : [], v, opt, j, t, {index: k, key: k, value: v});
            });
        }
        else if (tokens[i].startsWith("#if ") || tokens[i].startsWith("#unless ")) {
            const [t, v] = tokens[i].slice(1).trim().split(" ");
            const value = get(data, v);
            const includeOutput = (t === "if" && !!value) || (t === "unless" && !!!value);
            i = compile(tokens, includeOutput ? output : [], data, opt, i + 1, t);
        }
        else if (tokens[i].startsWith("#") || tokens[i].startsWith("^")) {
            const t = tokens[i].slice(1).trim();
            const value = get(data, t);
            const negate = tokens[i].startsWith("^");
            if (!negate && value && Array.isArray(value)) {
                const j = i + 1;
                (value.length > 0 ? value : [""]).forEach(item => {
                    i = compile(tokens, value.length > 0 ? output : [], item, opt, j, t);
                });
            }
            else {
                const includeOutput = (!negate && !!value) || (negate && !!!value);
                i = compile(tokens, includeOutput ? output : [], data, opt, i + 1, t);
            }
        }
        else if (tokens[i].startsWith(">")) {
            const [t, v] = tokens[i].slice(1).trim().split(" ");
            if (typeof opt?.partials?.[t] === "string") {
                compile(opt.partials[t].split(tags), output, v ? get(data, v) : data, opt, 0, "");
            }
        }
        else if (tokens[i].startsWith("/")) {
            if (tokens[i].slice(1).trim() !== section) {
                throw new Error(`Unmatched section end: {{${tokens[i]}}}`);
            }
            break;
        }
        else {
            output.push(escape(get(data, tokens[i].trim())));
        }
        i = i + 1;
    }
    return i;
};

export default (str, data = {}, opt = {}, output = []) => {
    compile(str.split(tags), output, data, opt, 0, "");
    return output.join("");
};
