export const resolve = (specifier, context, nextResolve) => {
    if (specifier === "mikel") {
        return nextResolve(new URL("../../index.js", import.meta.url).href);
    }
    return nextResolve(specifier, context);
};
