import type { MikelTransform } from "mikel";

declare function mikelJsxPlugin(): {
    transforms: {
        jsx: MikelTransform,
    };
};

export default mikelJsxPlugin;
