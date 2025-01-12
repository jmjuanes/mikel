import {describe, it} from "node:test";
import assert from "node:assert";
import m from "./index.js";

describe("utils", () => {
    describe("frontmatter", () => {
        const frontmatter = lines => m.utils.frontmatter(lines.join("\n"), true);

        it("should return empty data if no frontmatter is present", () => {
            const result = frontmatter([
                `Hello world`,
            ]);
            assert.equal(result.body, "Hello world");
            assert.equal(Object.keys(result.data).length, 0);
        });

        it("should return parsed frontmatter", () => {
            const result = frontmatter([
                `---`,
                `DATA`,
                `---`,
                `Hello world`,
            ]);
            assert.equal(result.body, "Hello world");
            assert.equal(result.data, "DATA");
        });
    });
});
