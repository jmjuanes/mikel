const MIKEL_TEMPLATE_TYPE = Symbol.for("mikel.template");

// Convert an string in camelCase format to kebab-case
const camelToKebabCase = str => str.replace(/[A-Z]/g, letter => `-${letter.toLowerCase()}`);

// Get unique values
const unique = list => Array.from(new Set(list || []));

// Render html string
const renderHtml = htmlString => {
    const template = document.createElement("template");
    template.innerHTML = htmlString;
    return template.content.firstChild;
};

const registerElementEvents = (element, callback) => {
    const attrs = element.attributes;
    if (attrs && attrs.length) {
        for (let i = 0; i < attrs.length; i++) {
            const name = attrs.item(i).name;
            if (name.startsWith("on")) {
                element.removeAttribute(name);
                callback(element, name.slice(2).toLowerCase());
            }
        }
    }
    // Iterate over child nodes
    element.childNodes.forEach(child => {
        if (child.nodeType === 1) {
            registerElementEvents(child, callback);
        }
    });
};

// Check if the provided object is a valid template object
const isValidTemplateObject = obj => {
    return typeof obj === "object" && obj?.["$$typeof"] === MIKEL_TEMPLATE_TYPE;
};

const getStringValue = value => {
    return [value].flat().map(v => (v ?? "").toString()).join("").replace("'", `\'`);
};

// Compile a template object
const compile = template => {
    const {literal, values} = template;
    let result = "", events = [];
    // Internal method to process inner templates and append them to our current
    // result and events
    const processInteralTemplate = innerTemplate => {
        const [_result, _events] = compile(innerTemplate);
        result = result + _result;
        events.push(..._events);
    };
    values.forEach((value, index) => {
        const lit = literal[index];
        result = result + lit;
        // Check for a template object
        if (value && isValidTemplateObject(value)) {
            return processInteralTemplate(value);
        }
        // TODO: we would need to check if we are inside a HTML tag
        if (lit.endsWith("=") || lit.endsWith(`="`)) {
            const isEventAttritube = lit.split(" ").pop().startsWith("on");
            if (isEventAttritube) {
                events.push(value);
            }
            // Get the value to replace
            const replacedVal = getStringValue(value);
            if (lit.endsWith("=")) {
                result = result + `"${replacedVal}"`;
            }
            else if (lit.endsWith(`="`)) {
                result = result + replacedVal;
            }
        }
        else if (value && Array.isArray(value)) {
            value.forEach(v => {
                if (v && isValidTemplateObject(v)) {
                    return processInteralTemplate(v);
                }
                // Check for string value
                else if (typeof v === "string" && !!v) {
                    result = result + v;
                }
            });
        }
        else {
            result = result + (value || "").toString();
        }
    });
    // Append last literal item
    result = result + literal[literal.length - 1];
    return [result, events];
};

// Returns a HTML template object
export const html = (literal, ...values) => {
    return {
        $$typeof: MIKEL_TEMPLATE_TYPE,
        literal: literal || [],
        values: values || [],
    };
};

// Compile a template object
export const render = template => {
    const [result, events] = compile(template);
    const element = renderHtml(result.trim());
    registerElementEvents(element, (child, eventName) => {
        const eventListener = events.shift();
        if (typeof eventListener === "function") {
            child.addEventListener(eventName, eventListener);
        }
    });
    return element;
};

// Mount a template object
export const mount = (parent, template) => {
    parent.replaceChildren();
    parent.appendChild(render(template));
};

// Classmap helper
export const classMap = classList => {
    const classNames = Object.keys(classList || {})
        .filter(k => !!classList[k])
        .map(k => k.split(" "));
    return unique(classNames.flat()).join(" ");
};

// Stylemap helper
export const styleMap = styleList => {
    return Object.keys(styleList || {})
        .map(k => `${camelToKebabCase(k)}:${styleList[k]};`)
        .join("");
};

export default {
    html,
    render,
    mount,
    classMap,
    styleMap,
};
