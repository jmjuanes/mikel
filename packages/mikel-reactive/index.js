// internal key to save vdom object reference
const VDOM_KEY = "_$vdom";

// modes for parsing HTML string
const MODE_TEXT = 1;
const MODE_TAG_START = 2;
const MODE_TAG_END = 3;
const MODE_PROP_NAME = 4;
const MODE_PROP_VALUE = 5;

// available namepsaces
const NAMESPACES = {
    "svg": "http://www.w3.org/2000/svg",
    "xhtml": "http://www.w3.org/1999/xhtml",
    "xlink": "http://www.w3.org/1999/xlink",
    "xml": "http://www.w3.org/XML/1998/namespace",
    "xmlns": "http://www.w3.org/2000/xmlns/",
};

// @description extract the namespace from a node tag
// "svg:g" => ["g", "http://www.w3.org/2000/svg"]
// "svg"   => ["svg", "http://www.w3.org/2000/svg"]
// "div"   => ["div", null]
const extractNamespace = (tagName = "") => {
    // 1. tag has the namespace on it (for example 'svg:g')
    if (tagName.indexOf(":") > 1) {
        const [space, tag] = tagName.split(":");
        return [tag, NAMESPACES[space] || null];
    }
    // 2. tag has a specific space (for example 'svg')
    else if (!!NAMESPACES[tagName]) {
        return [tagName, NAMESPACES[tagName]];
    }
    // namespace not necessary for the provided tag
    return [tagName, null];
};

// set a property to the element
const setProperty = (el, name, newValue = null, oldValue = null) => {
    if (name === "className" || name === "class") {
        el.className = newValue || "";
    }
    else if (name === "checked" || name === "value" || name === "disabled") {
        el[name] = newValue;
    }
    else if (name === "style") {
        if (typeof newValue === "string") {
            el.style.cssText = newValue;
        }
        else if (typeof newValue === "object") {
            Object.keys(newValue).forEach(key => {
                el.style[key] = newValue[key];
            });
        }
        else {
            el.style.cssText = "";
        }
    }
    else if (name.startsWith("on")) {
        const eventName = name.slice(2).toLowerCase();
        if (typeof oldValue === "function") {
            el.removeEventListener(eventName, oldValue);
        }
        if (typeof newValue === "function") {
            el.addEventListener(eventName, newValue);
        }
    }
    else if (newValue !== null && name !== "key") {
        el.setAttribute(name, newValue);
    }
    else if (name !== "key") {
        el.removeAttribute(name);
    }
};

// Check if there are differences between two nodes
const nodesDiffs = (node1, node2) => {
    // Check if nodes have the same type
    if (typeof node1 !== typeof node2) { 
        return true; 
    }
    // Check if nodes are strings
    else if (typeof node1 === "string" && node1 !== node2) { 
        return true; 
    }
    // Check if nodes has not the same tag
    else if (node1.type !== node2.type) { 
        return true; 
    }
    // Default, nodes are the same
    return false;
};

// @description main vdom element creator
const h = (tag, props = {}, children = []) => {
    return {
        tag: tag.toLowerCase().trim(), 
        props: props || {}, 
        children: (children || []).flat().filter(c => !!c),
    };
};

const parse = (literal, values, ctx = {i: 0, j: 0}, closing = null) => {
    const children = [];
    let mode = MODE_TEXT, buffer = "", current = null, quote = null;
    while (ctx.i < literal.length) {
        while (ctx.j < literal[ctx.i].length) {
            const char = literal[ctx.i][ctx.j];
            const nextChar = literal[ctx.i][ctx.j + 1];
            // We found a '<' character
            if (mode === MODE_TEXT && char === "<") {
                if (buffer.trim() !== "") {
                    children.push(buffer);
                }
                buffer = "";
                mode = MODE_TAG_START;
            }
            // We are in TAG_START mode and we found a '/' character with empty buffer
            else if (mode === MODE_TAG_START && char === "/" && !buffer) {
                mode = MODE_TAG_END;
            }
            // We are in TAG_START mode and we found a '/' character with non empty buffer
            else if (mode === MODE_TAG_START && char === "/" && buffer && nextChar === ">") {
                children.push(h(buffer, {}));
                buffer = "";
                mode = MODE_TEXT;
                ctx.j = ctx.j + 1; // Skip next '>'
            }
            // We are in TAG_START mode and we found a '>' character
            else if (mode === MODE_TAG_START && char === ">") {
                ctx.j = ctx.j + 1;
                children.push(h(buffer, {}, (parse(literal, values, ctx, buffer) || [])));
                buffer = "";
                mode = MODE_TEXT;
            }
            // We are in TAG_START mode and we found a whitespace character
            else if (mode === MODE_TAG_START && char === " ") {
                current = [buffer, {}, [], ""];
                buffer = "";
                mode = MODE_PROP_NAME;
            }
            // We are in PROP_NAME mode and we found a '/' character
            else if (mode === MODE_PROP_NAME && char === "/" && nextChar === ">") {
                if (buffer.trim() !== "") {
                    current[1][buffer.trim()] = true;
                }
                children.push(h(current[0], current[1], current[2]));
                current = null;
                mode = MODE_TEXT;
                buffer = "";
                ctx.j = ctx.j + 1; // Skip next '>'
            }
            // We found a '>' character and we are in property name mode
            else if (mode === MODE_PROP_NAME && char === ">") {
                if (buffer.trim() !== "") {
                    current[1][buffer.trim()] = true;
                }
                ctx.j = ctx.j + 1;
                current[2] = parse(literal, values, ctx, current[0]);
                children.push(h(current[0], current[1], current[2]));
                current = null;
                mode = MODE_TEXT;
                buffer = "";
            }
            // We found a '>' character and we are in closing tagname
            else if (mode === MODE_TAG_END && char === ">") {
                if (buffer !== closing) {
                    throw new Error(`Unexpected closing tag. Expected '${closing}' but got '${buffer}'`);
                }
                return children;
            }
            // We found a '=' character and we are in PROP_NAME mode
            else if (mode === MODE_PROP_NAME && char === "=") {
                current[3] = buffer.trim();
                buffer = "";
                mode = MODE_PROP_VALUE;
                if (nextChar === `"` || nextChar === `'`) {
                    ctx.j = ctx.j + 1;
                    quote = nextChar;
                }
            }
            // We found a whitespace character and we are in PROP_NAME mode
            else if (mode === MODE_PROP_NAME && char === " ") {
                if (buffer.trim() !== "") {
                    current[1][buffer.trim()] = true;
                }
                buffer = "";
            }
            // End of property value
            else if (mode === MODE_PROP_VALUE && char === quote) {
                current[1][current[3]] = buffer;
                quote = null;
                buffer = "";
                mode = MODE_PROP_NAME;
            }
            // Other case, save character in buffer
            else {
                buffer = buffer + char;
            }
            ctx.j++;
        }
        ctx.j = 0;
        if (ctx.i < values.length) {
            // Check if we are in PROP_VALUE mode
            if (mode === MODE_PROP_VALUE) {
                current[1][current[3]] = values[ctx.i];
                mode = MODE_PROP_NAME;
                if (literal[ctx.i + 1][ctx.j] === quote) {
                    ctx.j = ctx.j + 1;
                }
            }
            // Check if we are in TAG_START or TAG_END modes
            else if (mode === MODE_TAG_START || mode === MODE_TAG_END) {
                buffer = values[ctx.i];
            }
            // Check if we are in text mode
            else if (mode === MODE_TEXT) {
                if (buffer.trim() !== "") {
                    children.push(buffer);
                }
                children.push(values[ctx.i]);
                buffer = "";
            }
        }
        ctx.i++;
    }
    // If we are at the end of the literal and we have buffer not added
    if (buffer.trim() !== "") {
        children.push(buffer);
    }
    return children;
};

const html = (literal, ...values) => {
    return parse(literal, values || [], {i: 0, j: 0}, null)[0];
};

// @description mount an element
const mount = (el, parent = null) => {
    let node = null;
    // check for text node
    if (typeof el !== "object" || !el) {
        node = document.createTextNode(el ?? "");
    }
    else {
        // 1. create the new DOM element
        const [tagName, namespace] = extractNamespace(el.tag);
        node = namespace ? document.createElementNS(namespace, tagName) : document.createElement(tagName);
        // 2. mount children
        (el.children || []).forEach(child => mount(child, node));
        // 3. assign element props and attributes
        Object.keys(el.props || {})
            .filter(propName => propName !== "html")
            .forEach(propName => setProperty(node, propName, el.props[propName]));
    }
    // mount the new node
    if (parent) {
        parent.appendChild(node);
    }
    return node;
};

// @description render an element
const render = (el, parent = null) => {
    let node = null;
    // 1. no parent has been provided or is the first time the element is rendered
    if (!parent || !parent[VDOM_KEY]) {
        node = mount(el, parent);
    }
    // 2. There is a previously rendered element
    if (parent && parent[VDOM_KEY]) {
        update(parent, el, parent[VDOM_KEY]);
    }
    // 3. save reference to the rendered tree in the parent element
    if (parent) {
        parent[VDOM_KEY] = el;
    }
    return node;
};

// update an element
const update = (parent, newNode, oldNode, index = 0) => {
    // check for no old node --> mount this new element
    if (!oldNode) { 
        return mount(newNode, parent);
    }
    // if there is not new element --> remove the old element
    else if (!newNode) { 
        return parent.removeChild(parent.childNodes[index]); 
    }
    // if nodes has changed or associated key is different
    else if (nodesDiffs(newNode, oldNode) || newNode?.props?.key !== oldNode?.props?.key) {
        return parent.replaceChild(mount(newNode), parent.childNodes[index]);
    }
    // change the properties only if element is not an string
    else if (newNode && typeof newNode !== "string") {
        // get the full properties values and update the element attributes
        const props = new Set([...Object.keys(newNode.props || {}), ...Object.keys(oldNode.props || {})]);
        Array.from(props).forEach(name => {
            if (name !== "key") {
                const newValue = newNode.props[name];
                const oldValue = oldNode.props[name];
                // check if this property does not exists in the new element
                if (!newValue) {
                    setProperty(parent.childNodes[index], name, null, oldValue);
                }
                // check if this property exists in the old element or values are not the same
                else if (!oldValue || newValue !== oldValue) {
                    setProperty(parent.childNodes[index], name, newValue, oldValue)
                }
            }
        });
        // update the children for all element
        const maxLength = Math.max(newNode?.children?.length || 0, oldNode?.children?.length || 0);
        for (let i = 0; i < maxLength; i++) {
            update(parent.childNodes[index], newNode.children?.[i] || null, oldNode.children?.[i] || null, i);
        }
    }
};

// generate a reactive state
const createState = (initialState = {}) => {
    const state = {
        current: Object.assign({}, initialState),
        pendingChanges: {}, // to store pending changes in state
        listeners: new Set(), // to store state change listeners
    };
    // manage state listeners
    state.current.$on = listener => state.listeners.add(listener);
    state.current.$off = listener => state.listeners.delete(listener);
    // update state
    state.current.$update = (newState = {}, force = false) => {
        Object.assign(state.pendingChanges, typeof newState === "function" ? newState(state.current) : newState);
        return Promise.resolve(1).then(() => {
            if (Object.keys(state.pendingChanges).length > 0 || force) {
                Object.assign(state.current, state.pendingChanges);
                state.pendingChanges = {};
                Array.from(state.listeners).forEach(fn => fn());
            }
        });
    };
    // this is just an alias to $update with force set to true
    state.current.$forceUpdate = () => {
        return state.current.$update({}, true);
    };
    return state.current;
};

// @descript main reactive method
const reactive = (options = {}) => {
    const template = options.template;
    const state = createState(options?.data || {});
    state.$el = options.el || options.parent;
    // each time the state changes, we render the template and update the DOM
    state.$on(() => {
        render(html(template(state)), state.$el);
    });
    // render for the first time
    state.$update({}, true).then(() => {
        if (typeof options.mount === "function") {
            options.mount(state);
        }
    });
};

// assign methods to reactive object
reactive.html = html;
reactive.render = render;
reactive.update = update;
reactive.mount = mount;

export default reactive;
