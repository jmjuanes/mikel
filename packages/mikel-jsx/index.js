//
// Adds a single JSX-style <m-name> tag for calling mikel directives
// (helpers and partials — both share the same `#` mechanism now, so
// there's nothing to disambiguate). One prefix, one output shape:
//
//   <m-header title="Hello" />             -->  {{#header title="Hello" /}}
//   <m-if isAdmin>...</m-if>               -->  {{#if isAdmin}}...{{/if}}
//   <m-each users skip={1} />...</m-each>  -->  {{#each users skip=1}}...{{/each}}
//
// Other tags (<div>, <span>, your own custom elements) are left untouched.
//
// Attribute rules:
//   name               --> positional, raw value (bare attribute, dotted paths ok)
//   key="literal"      --> keyword, string literal, always — never auto-typed
//   key={expr}         --> keyword, raw value (variable, string, number, boolean, subexpression...)
//   key="{expr}"       --> same as key={expr}, quoted so HTML linters don't flag it (undocumented, but tested)
//   {expr}             --> positional, raw value (for values that aren't identifiers)
//   {...expr}          --> spread

// @description converts a raw HTML-like attribute string into a mikel argument string.
// Supports, in this order of precedence (order matters for correct matching):
//   {...expr}    --> spread                                      e.g. {...user}
//   key="{expr}" --> keyword, raw value, quoted escape hatch      e.g. limit="{pageSize}"
//   key="text"   --> keyword, string literal, always              e.g. title="Hello"
//   key={expr}   --> keyword, raw value                           e.g. limit={pageSize}, flag={true}
//   {expr}       --> positional, raw value                        e.g. {(eq a b)}
//   name         --> positional, raw value (bare attr)             e.g. isAdmin, users
const ATTR_RE = /\{\s*\.\.\.\s*([^}]+?)\s*\}|([a-zA-Z_][\w-]*)\s*=\s*"\{\s*([^}]+?)\s*\}"|([a-zA-Z_][\w-]*)\s*=\s*"([^"]*)"|([a-zA-Z_][\w-]*)\s*=\s*\{\s*([^}]+?)\s*\}|\{\s*([^}]+?)\s*\}|([a-zA-Z_][\w.-]*)/g;

export const parseAttributes = (raw = "") => {
    const parts = [];
    let m;
    ATTR_RE.lastIndex = 0;
    while ((m = ATTR_RE.exec(raw))) {
        const [, spread, quotedBracedKey, quotedBracedExpr, literalKey, literalValue, bracedKey, bracedExpr, bareExpr, bareName] = m;
        if (spread !== undefined) {
            parts.push(`...${spread.trim()}`);
        } else if (quotedBracedKey !== undefined) {
            parts.push(`${quotedBracedKey}=${quotedBracedExpr.trim()}`);
        } else if (literalKey !== undefined) {
            parts.push(`${literalKey}="${literalValue}"`);
        } else if (bracedKey !== undefined) {
            parts.push(`${bracedKey}=${bracedExpr.trim()}`);
        } else if (bareExpr !== undefined) {
            parts.push(bareExpr.trim());
        } else if (bareName !== undefined) {
            parts.push(bareName);
        }
    }
    return parts.join(" ");
};

// matches a self-closing tag: <m-name attrs />
const SELF_CLOSING_RE = /<m-([a-zA-Z_][\w-]*)((?:\s+[^<>]*?)?)\s*\/>/;

// matches an innermost paired tag: <m-name attrs>...</m-name>. The negative
// lookahead in the content group stops the match before any nested custom
// tag, so the innermost pair is always resolved first.
const PAIRED_RE = /<m-([a-zA-Z_][\w-]*)((?:\s+[^<>]*?)?)\s*>((?:(?!<m-)[\s\S])*?)<\/m-\1\s*>/;

// @description replaces one match at a time, re-searching after each
// replacement (needed since nested tags only become matchable once their
// inner tags have already been resolved)
const replaceAll = (str, re, replacer) => {
    let match;
    while ((match = re.exec(str))) {
        str = str.slice(0, match.index) + replacer(match) + str.slice(match.index + match[0].length);
    }
    return str;
};

// @description the actual template transform: string in, string out.
// No lookup, no ambiguity: every <m-name> becomes {{#name ...}}, since
// helpers and partials are now the same underlying mechanism in mikel.
export const transform = content => {
    // 1. self-closing tags first: no nesting to worry about
    content = replaceAll(content, SELF_CLOSING_RE, ([, name, attrs]) => {
        const args = parseAttributes(attrs);
        const suffix = args ? ` ${args}` : "";
        return `{{#${name}${suffix} /}}`;
    });
    // 2. paired (block) tags, innermost first, repeated until none are left
    content = replaceAll(content, PAIRED_RE, ([, name, attrs, inner]) => {
        const args = parseAttributes(attrs);
        const suffix = args ? ` ${args}` : "";
        return `{{#${name}${suffix}}}${inner}{{/${name}}}`;
    });
    return content;
};

// @description mikel plugin: a factory returning a plain options object for
// mk.use(), following the same convention as mikel.SetStatePlugin — call it
// to get the object, then pass that to use(): mk.use(mikelJsx())
export default () => {
    return {
        transform: transform,
    };
};
