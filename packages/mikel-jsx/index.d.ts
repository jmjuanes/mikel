import type { MikelPlugin } from "mikel";

// mikel-jsx registers a single preTransform on the mikel context and
// exposes no other public API, so its type is exactly mikel's own
// MikelPlugin signature: (ctx: MikelContext) => void.
declare const mikelJsxPlugin: MikelPlugin;

export default mikelJsxPlugin;
