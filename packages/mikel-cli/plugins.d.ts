import type { MikelPlugin } from "mikel";

export type CopyAssetsPattern = { from: string, to: string; };

export declare const CopyAssetsPlugin : (patterns: CopyAssetsPattern[]) => MikelPlugin; 
