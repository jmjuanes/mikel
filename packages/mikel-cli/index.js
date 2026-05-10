// @description get the files that matches the provided patterns
// this is a utility function to expand glob patterns to actual file paths.
// it uses Node.js 24+ built-in fs.glob to handle glob patterns.
export const expandGlobPatterns = async (patterns = []) => {
    const files = [];
    for (let i = 0; i < patterns.length; i++) {
        const pattern = patterns[i];
        if (pattern.includes("*") || pattern.includes("?") || pattern.includes("[")) {
            try {
                // use Node.js 24+ built-in fs.glob
                // https://nodejs.org/api/fs.html#fspromisesglobpattern-options
                for await (const file of fs.glob(pattern, { cwd: process.cwd() })) {
                    files.push(file);
                }
            } catch (error) {
                files.push(pattern);
            }
        } else {
            files.push(pattern);
        }
    }
    // remove duplicates and resolve to absolute paths
    return Array.from(new Set(files)).map(file => {
        return path.resolve(process.cwd(), file);
    });
};

// @description apply a rename to the provided file path based on a rename configuration
// object
export const applyRename = (filePath, rename = {}) => {
    const patterns = Object.keys(rename);
    for (let i = 0; i < patterns.length; i++) {
        const regex = new RegExp(patterns[i]);
        if (regex.test(filePath)) {
            return filePath.replace(regex, rename[patterns[i]]);
        }
    }
    // fallback: only returns the basename of the file
    return path.basename(filePath);
};
