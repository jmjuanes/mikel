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

describe("cli", () => {
    const execute = (args) => {
        return execSync(`node --import=./loader.js ./cli.js ${args}`);
    };

    it("should compile a template to stdout", () => {
        const dir = fs.mkdtempSync(path.join("/tmp", "mikel-test-"));
        try {
            fs.writeFileSync(path.join(dir, "template.html"), "Hello {{name}}!");
            fs.writeFileSync(path.join(dir, "data.json"), JSON.stringify({ name: "World" }));

            const result = execute(`${path.join(dir, "template.html")} --data ${path.join(dir, "data.json")}`).toString();
            assert.strictEqual(result, "Hello World!");
        } finally {
            fs.rmSync(dir, { recursive: true });
        }
    });

    it("should compile a template to a file", () => {
        const dir = fs.mkdtempSync(path.join("/tmp", "mikel-test-"));
        try {
            fs.writeFileSync(path.join(dir, "template.html"), "Hello {{name}}!");
            fs.writeFileSync(path.join(dir, "data.json"), JSON.stringify({ name: "World" }));
            const outputFile = path.join(dir, "output.html");

            execute(`${path.join(dir, "template.html")} --data ${path.join(dir, "data.json")} --output ${outputFile}`);
            assert.strictEqual(fs.readFileSync(outputFile, "utf8"), "Hello World!");
        } finally {
            fs.rmSync(dir, { recursive: true });
        }
    });
});
