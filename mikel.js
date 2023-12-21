const MIKEL_TEMPLATE_TYPE = Symbol.for("mikel.template");
const NODE_TEXT_TYPE = Symbol.for("node.text");
const NODE_COMMENT_TYPE = Symbol.for("node.comment");
const NODE_HTML_TYPE = Symbol.for("node.html");

// Private list with all available events
const eventsNames = Object.keys(window).filter(n => n && n.startsWith("on"));

// Convert an string in camelCase format to kebab-case
const camelToKebabCase = str => str.replace(/[A-Z]/g, letter => `-${letter.toLowerCase()}`);

// Get unique values
const unique = list => Array.from(new Set(list || []));

// Gets the node type
const getNodeType = node => {
    if (node.nodeType === 3) {
        return NODE_TEXT_TYPE;
    }
	else if (node.nodeType === 8) {
        return NODE_COMMENT_TYPE;
    }
    else if (node.nodeType === 1) {
        // return NODE_HTML_TYPE;
        return node.tagName.toLowerCase();
    }
    return null;
};

// Gets node attributes
const getNodeAttributes = node => {
    return Object.fromEntries(Array.from(node?.attributes || []).map(item => {
        return [item.name, item.value];
    }));
};

const getNodeListeners = node => {
    const eventsListeners = eventsNames
        .filter(e => typeof node[e] === "function")
        .map(eventName => ([eventName, node[eventName]]));
    return Object.fromEntries(eventsListeners);
};

// Render html string
const renderHtml = htmlString => {
    const template = document.createElement("template");
    template.innerHTML = htmlString;
    return cleanHtml(template.content);
};

// Remove useless nodes
// Based on https://www.sitepoint.com/removing-useless-nodes-from-the-dom/
const cleanHtml = node => {
    Array.from(node.childNodes).forEach(child => {
        const type = getNodeType(child);
        const value = child.nodeValue;
        if (type === NODE_COMMENT_TYPE || (type === NODE_TEXT_TYPE && !/\S/.test(value) && value.includes("\n"))) {
            node.removeChild(child);
        }
        else if (type && type !== NODE_TEXT_TYPE) {
            cleanHtml(child);
        }
    });
    return node;
};

const registerElementEvents = (element, callback) => {
    const attrs = element.attributes;
    if (attrs && attrs.length) {
        for (let i = 0; i < attrs.length; i++) {
            const name = attrs.item(i).name;
            if (name.startsWith("on")) {
                element.removeAttribute(name);
                callback(element, name.toLowerCase());
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

export const diff = (source, target) => {
    const sourceNodes = Array.from(source.childNodes);
    const targetNodes = Array.from(target.childNodes);
    // 1. Check if source is empty
    if (sourceNodes.length === 0) {
        return targetNodes.forEach(node => {
            source.appendChild(node);
        });
    }
    const parent = sourceNodes[0].parentNode;
    // 2. Check if source has more dom nodes
    if (sourceNodes.length > targetNodes.length) {
        const count = sourceNodes.length - targetNodes.length;
        for (let i = count; i > 0; i--) {
            parent.removeChild(sourceNodes[sourceNodes.length - i]);
        }
    }
    // 3. Iterate over all child nodes of target
    targetNodes.forEach((targetChild, index) => {
        const sourceChild = sourceNodes[index];
        // 3.1 Check if source child is not defined
        if (!sourceChild) {
            return parent.appendChild(targetChild);
        }
        // 3.2 Check if nodes are differente
        if (getNodeType(sourceChild) !== getNodeType(targetChild)) {
            return parent.replaceChild(targetChild, sourceChild);
        }
        // 3.3 Check if they are text nodes
        if (getNodeType(targetChild) === NODE_TEXT_TYPE) {
            sourceChild.textContent = targetChild.textContent;
            return;
        }
        // 3.4 Patch attributes
        const sourceAttributes = getNodeAttributes(sourceChild);
        const targetAttributes = getNodeAttributes(targetChild);
        Object.keys(targetAttributes).forEach(key => {
            // If the attribute is not present in sourcedom then add it
            // If exists but have different value, update the attribute
            if (sourceAttributes[key] !== targetAttributes[key]) {
                sourceChild.setAttribute(key, targetAttributes[key]);
            }
        });
        // Remove attributes in source that are not in target
        Object.keys(sourceAttributes).forEach(key => {
            if (typeof targetAttributes[key] === "undefined") {
                sourceChild.removeAttribute(key);
            }
        });
        // 3.6 Patch events listeners
        const sourceListeners = getNodeListeners(sourceChild);
        const targetListeners = getNodeListeners(targetChild);
        Object.keys(targetListeners).forEach(key => {
            sourceChild[key] = targetListeners[key];
        });
        Object.keys(sourceListeners).forEach(key => {
            if (typeof targetListeners[key] !== "function") {
                delete sourceChild[key];
            }
        });
        // 3.7 Check if target has child nodes
        if (targetChild.hasChildNodes()) {
            diff(sourceChild, targetChild);
        }
    });
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
export const render = (parent, template) => {
    const [result, events] = compile(template);
    const element = renderHtml(result.trim());
    registerElementEvents(element, (child, eventName) => {
        const eventListener = events.shift();
        if (typeof eventListener === "function") {
            child[eventName] = eventListener;
        }
    });
    diff(parent, element);
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
    classMap,
    styleMap,
};
