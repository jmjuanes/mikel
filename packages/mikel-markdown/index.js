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
        regex: /(?:^``` *([^\n]*)\n([\s\S]*?)\n``` *$)/gm,
        replace: (args, opt) => {
            return render("pre", {class: opt.classNames?.pre}, escape(args[2]));
        },
    },
    code: {
        regex: /`([^`]*?)`/g,
        replace: (args, opt) => {
            return render("code", {class: opt.classNames?.code}, escape(args[1]));
        },
    },
    heading: {
        regex: /^(#+)\s+(.*)/gm,
        replace: (args, opt) => {
            return render("h" + args[1].length, {class: opt.classNames?.heading}, args[2]);
        },
    },
    blockquote: {
        regex: /^[\s]*>\s(.*)/gm,
        replace: (args, opt) => {
            return render("blockquote", {class: opt.classNames?.blockquote}, args[1]);
        },
    },
    image: {
        regex: /\!\[([^\]]*?)\]\(([^)]*?)\)/g,
        replace: (args, opt) => {
            return render("img", {class: opt.classNames?.image, alt: args[1], src: args[2]});
        },
    },
    table: {
        regex: /^\|((?: +[^\n|]+ +\|?)+)\| *\n\|((?: *[:]?[-]+[:]? *\|?)+)\| *\n((?:^\|(?: +[^\n|]+ +\|?)+\| *\n)+)\n/gm,
        replace: (args, opt) => {
            const cn = opt.classNames || {};
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
        replace: (args, opt) => {
            return render("a", {class: opt.classNames?.link, href: args[2]}, args[1]);
        },
    },
    rule: {
        regex: /^.*?(?:---|-\s-\s-|\*\s\*\s\*)/gm,
        replace: (args, opt) => render("hr", {class: opt.classNames?.rule}),
    },
    list: {
        regex: /^[\t\s]*?(?:-|\+|\*)\s(.*)/gm,
        replace: (args, opt) => {
            return render("ul", {class: opt.classNames?.list}, render("li", {class: opt.classNames?.listItem}, args[1]));
        },
        afterRegex: /(<\/ul>\n(?:.*)<ul ?(?:class="[^"]*")?>*)+/g
    },
    orderedList: {
        regex: /^[\t\s]*?(?:\d(?:\)|\.))\s(.*)/gm,
        replace: (args, opt) => {
            return render("ol", {class: opt.classNames?.list}, render("li", {class: opt.classNames?.listItem}, args[1]));
        },
        afterRegex: /(<\/ol>\n(?:.*)<ol ?(?:class="[^"]*")?>*)+/g
    },
    strong: {
        regex: /(?:\*\*|__)([^\n]+?)(?:\*\*|__)/g,
        replace: (args, opt) => {
            return render("strong", {class: opt.classNames?.strong}, args[1]);
        },
    },
    emphasis: {
        regex: /(?:\*|_)([^\n]+?)(?:\*|_)/g,
        replace: (args, opt) => {
            return render("em", {class: opt.classNames?.emphasis}, args[1]);
        },
    },
    paragraph: {
        regex: /^((?:.+(?:\n|$))+)/gm,
        replace: (args, opt) => {
            const line = args[0].trim();
            // check if the line starts with a block tag or is an empty line
            if (!line || /^\<(\/? *(ul|ol|bl|h\d|p|div|sty|scr|t)|!--)/.test(line.slice(0, 4))) {
                return line;
            }
            return render("p", {class: opt.classNames?.paragraph}, line.replace(/\n/g, ""));
        },
    },
};

// @description get only inline expressions
const getInlineExpressions = expressions => {
    const fields = ["code", "link", "strong", "emphasis", "image"].filter(key => !!expressions[key]);
    return Object.fromEntries(fields.map(key => {
        return [key, expressions[key]];
    }));
};

// @description markdown parser
const parser = (str = "", options = {}) => {
    const expressions = options?.expressions || allExpressions; // custom expressions
    const ignoredBlocks = []; // chunks to ignore
    str = str.replace(/\r\n/g, "\n");
    // ignore html blocks
    const htmlBlockRegex = /<!--html-->([\s\S]*?)<!--\/html-->/gm;
    str = str.replace(htmlBlockRegex, match => {
        ignoredBlocks.push(match);
        return `<!--HTML-BLOCK-${(ignoredBlocks.length - 1)}-->`;
    });
    // replace all expressions
    Object.keys(expressions).forEach(key => {
        str = str.replace(expressions[key].regex, (...args) => {
            const value = expressions[key].replace(args, options);
            if (key === "pre" || key === "code") {
                ignoredBlocks.push(value);
                return `<!--HTML-BLOCK-${(ignoredBlocks.length - 1)}-->`;
            }
            // other value --> return the value provided by the renderer
            return value;
        });
        // check for regex to apply after the main refex
        if (typeof expressions[key].afterRegex !== "undefined") {
            str = str.replace(expressions[key].afterRegex, "");
        }
    });
    // replace all the ignored blocks
    ignoredBlocks.forEach((block, index) => {
        str = str.replace(`<!--HTML-BLOCK-${index}-->`, block);
    });
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
                    ...options,
                    expressions: getInlineExpressions(options.expressions || allExpressions),
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
