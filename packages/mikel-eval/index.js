// @description comparision variables
const comparationCharacters = ["=", "!", "<", ">", "&", "|"];
const comparationFunctions = {
    "===": (a, b) => a === b,
    "!==": (a, b) => a !== b,
    "==": (a, b) => a === b,
    "!=": (a, b) => a !== b,
    "<=": (a, b) => a <= b,
    ">=": (a, b) => a >= b,
    "<": (a, b) => a < b,
    ">": (a, b) => a > b,
    "&&": (a, b) => a && b,
    "||": (a, b) => a || b,
};

// @description: get a nested object value
const getIn = (c, p) => {
    return (p === "." ? c : p.split(".").reduce((x, k) => x?.[k], c));
};

// parse a next character
const nextChar = ctx => {
    ctx.pos = ctx.pos + 1;
    ctx.current = (ctx.pos < ctx.str.length) ? ctx.str.charAt(ctx.pos) : -1;
};

// check if the current character is the provided character
const checkChar = (ctx, ch) =>{
    while (ctx.current === " ") {
        nextChar(ctx);
    }
    // Check if the current character is the provided character
    if (ctx.current === ch) {
        nextChar(ctx);
        return true;
    }
    return false;
};

// parse a expression: addition or substraaction
const parseExpression = ctx => {
    let x = parseTerm(ctx);
    for (;;) {
        if (checkChar(ctx, "+")) {
            x = x + parseTerm(ctx); // addition
        }
        else if (checkChar(ctx, "-")) {
            x = x - parseTerm(ctx); // subtraction
        }
        else {
            return x;
        }
    }
};

// parse a term: multiplication or division
const parseTerm = ctx => {
    let x = parseComparison(ctx);
    for (;;) {
        if (checkChar(ctx, "*")) {
            x = x * parseComparison(ctx);
        }
        else if (checkChar(ctx, "/")) {
            x = x / parseComparison(ctx);
        }
        else if (checkChar(ctx, "%")) {
            x = x % parseComparison(ctx);
        }
        else {
            return x;
        }
    }
};

// parse a comparison
const parseComparison = ctx => {
    let x = parseFactor(ctx);
    for(;;) {
        // save the current starting position
        const startPos = ctx.pos;
        if (comparationCharacters.indexOf(ctx.current) !== -1) {
            while (comparationCharacters.indexOf(ctx.current) !== -1) {
                nextChar(ctx);
            }
            // get the comparison operator
            const comparator = ctx.str.substring(startPos, ctx.pos)
            if (typeof comparationFunctions[comparator] !== "function") {
                throw new Error(`Unknown operator '${comparator}'`);
            }
            x = comparationFunctions[comparator](x, parseFactor(ctx));
        }
        else {
            return x;
        }
    }
};

// parse a list of items
const parseList = ctx => {
    const items = [];
    do {
        items.push(parseExpression(ctx));
    }
    while(checkChar(ctx, ","));
    return items;
};

// parse a factor
const parseFactor = ctx => {
    if (checkChar(ctx, "!")) {
        return !parseFactor(ctx);
    }
    if (checkChar(ctx, "+")) {
        return parseFactor(ctx);
    }
    if (checkChar(ctx, "-")) {
        return -parseFactor(ctx);
    }
    let x;
    const startPos = ctx.pos;
    // subexpression
    if (checkChar(ctx, "(")) { 
        x = parseExpression(ctx);
        checkChar(ctx, ")");
    }
    else if (checkChar(ctx, "[")) {
        x = parseList(ctx);
        checkChar(ctx, "]");
    }
    // string factor
    else if (checkChar(ctx, "'")) {
        x = "";
        while(ctx.current !== "'") {
            x = x + ctx.current;
            nextChar(ctx);
        }
        checkChar(ctx, "'");
    }
    // digit
    else if ((ctx.current >= "0" && ctx.current <= "9") || ctx.current == ".") {
        while ((ctx.current >= "0" && ctx.current <= "9") || ctx.current == ".") {
            nextChar(ctx);
        }
        x = parseFloat(ctx.str.substring(startPos, ctx.pos));
    }
    // values functions
    else if (ctx.current !== -1 && ctx.current.match(/^[A-Za-z]$/) !== null) {
        while (ctx.current !== -1 && ctx.current.match(/^[a-zA-Z\[\]'"0-9\.\_]$/) !== null) {
            nextChar(ctx);
        }
        let name = ctx.str.substring(startPos, ctx.pos);
        if (name === "null" || name === "true" || name === "false") {
            x = JSON.parse(name); // parse null, true or false
        }
        // check if there is a function to apply
        else if (typeof ctx.functions[name] === "function") {
            if (!checkChar(ctx, "(")) {
                throw new Error(`Unexpected character '${ctx.current}' after function name '${name}'`);
            }
            const args = parseList(ctx);
            if (!checkChar(ctx, ")")) {
                throw new Error(`Unexpected character '${ctx.current}' after function arguments`);
            }
            // execute the function and save the value
            x = ctx.functions[name].apply(null, args);
        }
        else {
            x = getIn(ctx.values, name);
        }
    }
    else {
        throw new Error(`Unexpected character '${ctx.current}' at position ${ctx.pos}`);
    }
    // exponential operator ?
    if (checkChar(ctx, "^")) {
        x = Math.pow(x, parseFactor(ctx));
    }
    return x;
};

// @description default functions
const defaultFunctions = {
    // common functions
    len: x => {
        if (Array.isArray(x) || typeof x === "string") {
            return x.length;
        } else if (typeof x === "object" && x !== null) {
            return Object.keys(x).length;
        }
        throw new Error(`len() cannot be applied to type ${typeof x}`);
    },
    in: (x, item) => {
        if (Array.isArray(x) || typeof x === "string") {
            return x.includes(item);
        }
        else if (typeof x === "object" && x !== null) {
            return Object.values(x).includes(item);
        }
        throw new Error(`in() cannot be applied to type ${typeof x}`);
    },
    type: x => typeof x,
    if: (condition, trueValue, falseValue) => {
        if (typeof condition !== "boolean") {
            throw new Error(`if() expects a boolean condition, got ${typeof condition}`);
        }
        return condition ? trueValue : falseValue;
    },
    // array functions
    indexOf: (array, item) => {
        if (!Array.isArray(array)) {
            throw new Error(`indexOf() expects an array, got ${typeof array}`);
        }
        return array.indexOf(item);
    },
    join: (array, separator = ",") => {
        if (!Array.isArray(array)) {
            throw new Error(`join() expects an array, got ${typeof array}`);
        }
        return array.join(separator);
    },
    // object functions
    valueOf: (obj, key) => {
        if (typeof obj !== "object" || obj === null) {
            throw new Error(`valueOf() expects an object, got ${typeof obj}`);
        }
        return obj[key];
    },
    // string functions
    startsWith: (str, prefix) => {
        if (typeof str !== "string") {
            throw new Error(`startsWith() expects a string, got ${typeof str}`);
        }
        return str.startsWith(prefix);
    },
    endsWith: (str, suffix) => {
        if (typeof str !== "string") {
            throw new Error(`endsWith() expects a string, got ${typeof str}`);
        }
        return str.endsWith(suffix);
    },
    replace: (str, search, replacement) => {
        if (typeof str !== "string") {
            throw new Error(`replace() expects a string, got ${typeof str}`);
        }
        return str.replaceAll(search, replacement || "");
    },
    toUpperCase: str => {
        if (typeof str !== "string") {
            throw new Error(`toUpperCase() expects a string, got ${typeof str}`);
        }
        return str.toUpperCase();
    },
    toLowerCase: str => {
        if (typeof str !== "string") {
            throw new Error(`toLowerCase() expects a string, got ${typeof str}`);
        }
        return str.toLowerCase();
    },
    trim: str => {
        if (typeof str !== "string") {
            throw new Error(`trim() expects a string, got ${typeof str}`);
        }
        return str.trim();
    },
    // mathematical functions
    min: (...args) => Math.min(...args),
    max: (...args) => Math.max(...args),
    abs: x => Math.abs(x),
    round: x => Math.round(x),
    ceil: x => Math.ceil(x),
    floor: x => Math.floor(x),
    sqrt: x => Math.sqrt(x),
    pow: (x, y) => Math.pow(x, y),
    random: () => Math.random(),
};

// @description: evaluate a string expression
// @param str {string} the expression to evaluate
// @param options {object} the options to use
// @param options.values {object} context where the expression will be evaluated
// @param options.functions {object} functions to use in the expression
const evaluate = (str = "", options = {}) => {
    const context = {
        pos: 0,
        current: str.charAt(0) || "",
        str: str,
        values: options.values || {},
        functions: {
            ...defaultFunctions,
            ...(options.functions || {}),
        },
    };
    const result = parseExpression(context);
    if (context.pos < context.str.length) {
        throw new Error(`Unexpected '${context.current}' at position ${context.pos}`);
    }
    return result;
};

// @description evaluate plugin
const evaluatePlugin = (options = {}) => {
    return mikelInstance => {
        mikelInstance.addFunction("eval", params => {
            return evaluate(params.args[0], {
                values: params.data,
                functions: options?.functions || {},
            });
        });
        mikelInstance.addHelper("when", params => {
            const condition = evaluate(params.args[0], {
                values: params.data,
                functions: options?.functions || {},
            });
            return !!condition ? params.fn(params.data) : "";
        });
    };
};

// assign additional options for this plugin
evaluatePlugin.evaluate = evaluate;
evaluatePlugin.defaultFunctions = defaultFunctions;

// export the evaluate plugin
export default evaluatePlugin;
