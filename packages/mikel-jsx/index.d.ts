import type { MikelTransform } from "mikel";

declare function mikelJsxPlugin(): {
    transform: MikelTransform,
};

export default mikelJsxPlugin;
