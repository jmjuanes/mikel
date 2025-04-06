const escape = str => encodeURIComponent(str);

const expressions = {
    pre: {
        regex: /(?:^```(?:[^\n]*)\n([\s\S]*?)\n``` *$)/gm,
        replace: args => `<pre>${escape(args[1])}</pre>`,
    },
    heading: {
        regex: /^(#+)\s+(.*)/gm,
        replace: args => `<h${args[1].length}>${args[2]}</h${args[1].length}>`,
    },
    blockquote: {
        regex: /^[\s]*>\s(.*)/gm,
        replace: args => `<blockquote>${args[1]}</blockquote>`,
    },
    code: {
        regex: /`([^`]*?)`/g,
        replace: args => `<code>${escape(args[1])}</code>`,
    },
    image: {
        regex: /!\[([^\]]*?)\]\(([^)]*?)\)/g,
        replace: args => `<img alt="${args[1]}" src="${args[2]}" />`,
    },
    table: {
        regex: /^\|((?: +[^\n|]+ +\|?)+)\| *\n\|((?: *[:]?[-]+[:]? *\|?)+)\| *\n((?:^\|(?: +[^\n|]+ +\|?)+\| *\n)+)\n/gm,
        replace: args => {
            // args[1] --> table header
            // args[3] --> table body
            const head = args[1].trim().split("|").map(c => `<td>${c.trim()}</td>`);
            const body = args[3].replace(/\r/g, "").split("\n").map(line => {
                line = line.trim().replace(/^\|/m, "").replace(/\|$/m, "").trim();
                if (line.length === 0) {
                    return "";
                }
                return `<tr>${line.split("|").map(c => `<td>${c.trim()}</td>`).join("")}</tr>`;
            });
            return `<table><thead><tr>${head.join("")}</tr></thead><tbody>${body.join("")}</tbody></table>`;
        },
    },
    link: {
        regex: /\[(.*?)\]\(([^\t\n\s]*?)\)/gm,
        replace: args => `<a href="${args[2]}">${args[1]}</a>`,
    },
    rule: {
        regex: /^.*?(?:---|-\s-\s-|\*\s\*\s\*)/gm,
        replacement: () => "<hr />",
    },
    list: {
        regex: /^[\t\s]*?(?:-|\+|\*)\s(.*)/gm,
        replace: args => `<ul><li>${args[1]}</li></ul>`,
        afterRegex: /(<\/ul>\n(?:.*)<ul>*)+/g
    },
    orderedList: {
        regex: /^[\t\s]*?(?:\d(?:\)|\.))\s(.*)/gm,
        replace: args => `<ol><li>${args[1]}</li></ol>`,
        afterRegex: /(<\/ol>\n(?:.*)<ol>*)+/g
    },
    strong: {
        regex: /(?:\*\*|__)([^\n]+?)(?:\*\*|__)/g,
        replace: args => `<strong>${args[1]}</strong>`,
    },
    emphasis: {
        regex: /(?:\*|_)([^\n]+?)(?:\*|_)/g,
        replace: args => `<em>${args[1]}</em>`,
    },
    paragraph: {
        regex: /^((?:.+(?:\n|$))+)/gm,
        replace: args => {
            const line = args[0].trim();
            // Check if the line starts with a block tag
            if (/^\<\/?(ul|ol|bl|h\d|p|div|sty|scr).*/.test(line.slice(0, 4)) === true) {
                return line;
            }
            return `<p>${line.replace(/\n/g, "")}</p>`;
        }
    }
};

// @description markdown parser
const parser = str => {
    const ignoredBlocks = []; // Chunks to ignore
    str = str.replace(/\r\n/g, "\n");
    // Replace all <script> tags
    // str = str.replace(/<script[^\0]*?>([^\0]*?)<\/script>/gmi, function (match, content) {
    //     return "&lt;script&gt;" + content + "&lt;/script&gt;";
    // });
    // Replace all expressions
    Object.keys(expressions).forEach(key => {
        str = str.replace(expressions[key].regex, (...args) => {
            const value = expressions[key].replace(args);
            // Check for 'pre' block
            if (key === "pre") {
                ignoredBlocks.push(value);
                return `<pre>{IGNORED%${(ignoredBlocks.length - 1)}}</pre>\n`;
            }
            // Other value --> return the value provided by the renderer
            return value;
        });
        // Check for regex to apply after the main refex
        if (typeof expressions[key].afterRegex !== "undefined") {
            str = str.replace(expressions[key].afterRegex, "");
        }
    });
    // Replace all line breaks expressions
    // str = str.replace(/^\n\n+/gm, function () {
    //     return renderer("br", {});
    // });
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
                return parser(params.fn(params.data) || "");
            },
        },
    };
};

// assign additional options for this plugin
markdownPlugin.parser = parser;
markdownPlugin.expressions = expressions;

// export the plugin
export default markdownPlugin;
