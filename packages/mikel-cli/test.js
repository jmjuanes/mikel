import { describe, it } from "node:test";
import { execSync } from "node:child_process";
import assert from "node:assert";
import fs from "node:fs";
import path from "node:path";

import { applyRename } from "./index.js";

describe("utility function", () => {
    describe("applyRename", () => {
        it("should apply the rename", () => {
            const newFileName = applyRename("src/index.mustache", {
                "^src/(.+)\\.mustache$": "$1.html",
            });
            assert.strictEqual(newFileName, "index.html");
        });

        it("should fallback to basename if no matches", () => {
            assert.strictEqual(applyRename("src/index.mustache", {}), "index.mustache");
        });
    });
});

// test("CLI - compila un template a stdout", () => {
//     const dir = mkdtempSync(path.join("/tmp", "mikel-test-"));
//     try {
//         writeFileSync(path.join(dir, "template.html"), "Hello {{name}}!");
//         writeFileSync(path.join(dir, "data.json"), JSON.stringify({ name: "World" }));
//         const result = execSync(
//             `node cli.js ${path.join(dir, "template.html")} --data ${path.join(dir, "data.json")}`
//         ).toString();
//         assert.strictEqual(result, "Hello World!");
//     } finally {
//         rmSync(dir, { recursive: true });
//     }
// });
// 
// test("CLI - compila a archivo de output", () => {
//     const dir = mkdtempSync(path.join("/tmp", "mikel-test-"));
//     try {
//         writeFileSync(path.join(dir, "template.html"), "Hello {{name}}!");
//         writeFileSync(path.join(dir, "data.json"), JSON.stringify({ name: "World" }));
//         const outputFile = path.join(dir, "output.html");
//         execSync(
//             `node cli.js ${path.join(dir, "template.html")} --data ${path.join(dir, "data.json")} --output ${outputFile}`
//         );
//         assert.strictEqual(readFileSync(outputFile, "utf8"), "Hello World!");
//     } finally {
//         rmSync(dir, { recursive: true });
//     }
// });
