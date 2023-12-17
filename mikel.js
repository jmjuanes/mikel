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

// Returns a HTML template object
export const html = (literal, ...values) => {
    return {literal, values};
};

// Compile a template object
export const render = template => {
    const {literal, values} = template;
    let result = "", events = [];
    values.forEach((value, index) => {
        let lit = literal[index];
        result = result + lit;
        // Check if value is an array of items --> join them to a single string
        if (value && Array.isArray(value)) {
            value = value.join("");
        }
        // Check if we are inside a HTML tag
        if (lit.endsWith("=") || lit.endsWith(`="`)) {
            const isEventAttritube = lit.split(" ").pop().startsWith("on");
            if (isEventAttritube) {
                events.push(value);
            }
            // Get the value to replace
            const replacedVal = (value ?? "").toString().replace("'", `\'`);
            if (lit.endsWith("=")) {
                result = result + `"${replacedVal}"`;
            }
            else if (lit.endsWith(`="`)) {
                result = result + replacedVal;
            }
        }
        else {
            // TODO: we would need to check the type of value
            result = result + value;
        }
    });
    // Append last literal item
    result = result + literal[literal.length - 1];
    // return {result, events};
    // Renderize element
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
