const escapedChars = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;",
};

const escape = s => s.toString().replace(/[&<>\"']/g, m => escapedChars[m]);

// @description custom method to render the provided tag and content
// @param tag {string} tag to render
// @param props {object} attributes to add to the tag
// @param content {string} content to add to the tag
// @return {string} the rendered tag
// @example render("div", {class: "my-class"}, "Hello world") --> '<div class="my-class">Hello world</div>'
const render = (tag, props = {}, content = "") => {
    const attrs = Object.keys(props).filter(k => !!props[k]).map(k => `${k}="${props[k]}"`);
    if (tag === "hr" || tag === "img") {
        return `<${[tag, ...attrs].join(" ")} />`;
    }
    return `<${[tag, ...attrs].join(" ")}>${content}</${tag}>`;
};

// @description all available expressions
const allExpressions = {
    pre: {
        regex: /(?:^```(?:[^\n]*)\n([\s\S]*?)\n``` *$)/gm,
        replace: (args, cn) => render("pre", {class: cn.pre}, escape(args[1])),
    },
    code: {
        regex: /`([^`]*?)`/g,
        replace: (args, cn) => render("code", {class: cn.code}, escape(args[1])),
    },
    heading: {
        regex: /^(#+)\s+(.*)/gm,
        replace: (args, cn) => render("h" + args[1].length, {class: cn.heading}, args[2]),
    },
    blockquote: {
        regex: /^[\s]*>\s(.*)/gm,
        replace: (args, cn) => render("blockquote", {class: cn.blockquote}, args[1]),
    },
    image: {
        regex: /\!\[([^\]]*?)\]\(([^)]*?)\)/g,
        replace: (args, cn) => render("img", {class: cn.image, alt: args[1], src: args[2]}),
    },
    table: {
        regex: /^\|((?: +[^\n|]+ +\|?)+)\| *\n\|((?: *[:]?[-]+[:]? *\|?)+)\| *\n((?:^\|(?: +[^\n|]+ +\|?)+\| *\n)+)\n/gm,
        replace: (args, cn) => {
            // args[1] --> table header
            // args[3] --> table body
            const head = args[1].trim().split("|").map(c => {
                return render("td", {class: cn.tableColumn}, c.trim());
            });
            const body = args[3].replace(/\r/g, "").split("\n").map(line => {
                line = line.trim().replace(/^\|/m, "").replace(/\|$/m, "").trim();
                if (line.length === 0) {
                    return "";
                }
                const cols = line.split("|").map(c => {
                    return render("td", {class: cn.tableColumn}, c.trim());
                });
                return render("tr", {class: cn.tableRow}, cols.join(""));
            });
            const thead = render("thead", {class: cn.tableHead}, "<tr>" + head.join("") + "</tr>");
            const tbody = render("tbody", {class: cn.tableBody}, body.join(""));
            return render("table", {class: cn.table}, thead + tbody);
        },
    },
    link: {
        regex: /\[(.*?)\]\(([^\t\n\s]*?)\)/gm,
        replace: (args, cn) => render("a", {class: cn.link, href: args[2]}, args[1]),
    },
    rule: {
        regex: /^.*?(?:---|-\s-\s-|\*\s\*\s\*)/gm,
        replacement: (args, cn) => render("hr", {class: cn.rule}),
    },
    list: {
        regex: /^[\t\s]*?(?:-|\+|\*)\s(.*)/gm,
        replace: (args, cn) => {
            return render("ul", {class: cn.list}, render("li", {class: cn.listItem}, args[1]));
        },
        afterRegex: /(<\/ul>\n(?:.*)<ul ?(?:class=".*")?>*)+/g
    },
    orderedList: {
        regex: /^[\t\s]*?(?:\d(?:\)|\.))\s(.*)/gm,
        replace: (args, cn) => {
            return render("ol", {class: cn.list}, render("li", {class: cn.listItem}, args[1]));
        },
        afterRegex: /(<\/ol>\n(?:.*)<ol ?(?:class=".*")?>*)+/g
    },
    strong: {
        regex: /(?:\*\*|__)([^\n]+?)(?:\*\*|__)/g,
        replace: (args, cn) => render("strong", {class: cn.strong}, args[1]),
    },
    emphasis: {
        regex: /(?:\*|_)([^\n]+?)(?:\*|_)/g,
        replace: (args, cn) => render("em", {class: cn.emphasis}, args[1]),
    },
    paragraph: {
        regex: /^((?:.+(?:\n|$))+)/gm,
        replace: (args, cn) => {
            const line = args[0].trim();
            // Check if the line starts with a block tag
            if (/^\<\/?(ul|ol|bl|h\d|p|div|sty|scr).*/.test(line.slice(0, 4)) === true) {
                return line;
            }
            return render("p", {class: cn.paragraph}, line.replace(/\n/g, ""));
        }
    }
};

// @description inline expressions
const inlineExpressions = Object.fromEntries(["code", "link", "strong", "emphasis"].map(key => {
    return [key, allExpressions[key]];
}));

// @description markdown parser
const parser = (str = "", options = {}) => {
    const classNames = options?.classNames || {}; // custom classNames
    const expressions = options?.expressions || allExpressions; // custom expressions
    const ignoredBlocks = []; // chunks to ignore
    str = str.replace(/\r\n/g, "\n");
    // replace all expressions
    Object.keys(expressions).forEach(key => {
        str = str.replace(expressions[key].regex, (...args) => {
            const value = expressions[key].replace(args, classNames);
            if (key === "pre" || key === "code") {
                ignoredBlocks.push(value);
                return `<pre>{IGNORED%${(ignoredBlocks.length - 1)}}</pre>`;
            }
            // other value --> return the value provided by the renderer
            return value;
        });
        // check for regex to apply after the main refex
        if (typeof expressions[key].afterRegex !== "undefined") {
            str = str.replace(expressions[key].afterRegex, "");
        }
    });
    // Replace all the ignored blocks
    for (let i = ignoredBlocks.length - 1; i >= 0; i--) {
        str = str.replace(`<pre>{IGNORED%${i}}</pre>`, ignoredBlocks[i]);
    }
    return str;
};

// @description markdown plugin
// @param options {object} options for this plugin
const markdownPlugin = (options = {}) => {
    return {
        helpers: {
            markdown: params => {
                return parser(params.fn(params.data) || "", options);
            },
            inlineMarkdown: params => {
                return parser(params.fn(params.data) || "", {
                    expressions: inlineExpressions,
                    ...options,
                });
            },
        },
    };
};

// assign additional options for this plugin
markdownPlugin.parser = parser;
markdownPlugin.render = render;
markdownPlugin.expressions = allExpressions;

// export the plugin
export default markdownPlugin;
