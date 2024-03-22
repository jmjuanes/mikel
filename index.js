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
    return path === "." ? ctx : (path.split(".").reduce((p, k) => p?.[k], ctx) || "");
};

const compile = (tokens, output, ctx, index, section) => {
    let i = index;
    while (i < tokens.length) {
        if (i % 2 === 0) {
            output.push(tokens[i]);
        }
        else if (tokens[i].startsWith("!")) {
            output.push(get(ctx, tokens[i].slice(1).trim()));
        }
        else if (tokens[i].startsWith("#") || tokens[i].startsWith("^")) {
            const t = tokens[i].slice(1).trim();
            const value = get(ctx, t);
            const negate = tokens[i].startsWith("^");
            if (!negate && value && Array.isArray(value)) {
                const j = i + 1;
                value.forEach(item => {
                    i = compile(tokens, output, item, j, t);
                });
            }
            else {
                const includeOutput = (!negate && !!value) || (negate && !!!value);
                i = compile(tokens, includeOutput ? output : [], ctx, i + 1, t);
            }
        }
        else if (tokens[i].startsWith("/")) {
            if (tokens[i].slice(1).trim() !== section) {
                throw new Error(`Unmatched section end: {{${tokens[i]}}}`);
            }
            break;
        }
        else {
            output.push(escape(get(ctx, tokens[i].trim())));
        }
        i = i + 1;
    }
    return i;
};

export default (str, ctx = {}, output = []) => {
    compile(str.split(/\{\{|\}\}/), output, ctx, 0, "");
    return output.join("");
};