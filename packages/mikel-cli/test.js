import { describe, it } from "node:test";
import { execSync } from "node:child_process";
import assert from "node:assert";
import fs from "node:fs";
import path from "node:path";

import { applyNameMapping } from "./index.js";

describe("utility functions", () => {
    describe("applyNameMapping", () => {
        it("should apply the rename", () => {
            const newFileName = applyNameMapping("src/index.mustache", {
                "^src/(.+)\\.mustache$": "$1.html",
            });
            assert.strictEqual(newFileName, "index.html");
        });

        it("should fallback to basename if no matches", () => {
            assert.strictEqual(applyNameMapping("src/index.mustache", {}), "index.mustache");
        });

        it("should apply the first match", () => {
            const newFileName = applyNameMapping("src/index.mustache", {
                "^src/(.+)\\.mustache$": "$1.html",
                "^src/(.+)$": "$1.txt",
            });
            assert.strictEqual(newFileName, "index.html");
        });
        
        it("should work with subdirectories", () => {
            const newFileName = applyNameMapping("src/docs/guide/index.mustache", {
                "^src/(.+)\\.mustache$": "$1.html",
            });
            assert.strictEqual(newFileName, "docs/guide/index.html");
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

    it("should process multiple inputs with a configuration file", () => {
        const dir = fs.mkdtempSync(path.join("/tmp", "mikel-test-"));
        try {
            fs.writeFileSync(path.join(dir, "a.html"), "Hello {{name}}!");
            fs.writeFileSync(path.join(dir, "b.html"), "Bye {{name}}!");
            fs.writeFileSync(path.join(dir, "data.json"), JSON.stringify({ name: "World" }));
            fs.writeFileSync(path.join(dir, "mikel.config.json"), JSON.stringify({
                input: [path.join(dir, "a.html"), path.join(dir, "b.html")],
                output: { dir: path.join(dir, "dist/") },
                data: path.join(dir, "data.json"),
            }));
            execute(`--config ${path.join(dir, "mikel.config.json")}`);
            assert.strictEqual(fs.readFileSync(path.join(dir, "dist/a.html"), "utf8"), "Hello World!");
            assert.strictEqual(fs.readFileSync(path.join(dir, "dist/b.html"), "utf8"), "Bye World!");
        } finally {
            fs.rmSync(dir, { recursive: true });
        }
    });

    it("should compile with partials", () => {
        const dir = fs.mkdtempSync(path.join("/tmp", "mikel-test-"));
        try {
            fs.writeFileSync(path.join(dir, "template.html"), "{{> greeting.html}}");
            fs.writeFileSync(path.join(dir, "greeting.html"), "Hello {{name}}!");
            fs.writeFileSync(path.join(dir, "data.json"), JSON.stringify({ name: "World" }));
            const result = execute(
                `${path.join(dir, "template.html")} --data ${path.join(dir, "data.json")} --partial ${path.join(dir, "greeting.html")}`
            );
            assert.strictEqual(result.toString(), "Hello World!");
        } finally {
            fs.rmSync(dir, { recursive: true });
        }
    });

});
