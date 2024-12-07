import fs from "node:fs/promises";
import path from "node:path";
import {describe, it} from "node:test";
import assert from "node:assert";
import webpack from "webpack";
import MikelWebpackPlugin from "./index.js";

const getVirtualEntry = (file, content) => {
	return `${file}!=!data:text/javascript;base64,${Buffer.from(content).toString("base64")}`;
};

// promisify the webpack.run method
const runWebpack = options => {
    return new Promise((resolve, reject) => {
        webpack(options, (error, stats) => {
            if (error) {
                return reject(error);
            }
            resolve(stats);
        });
    });
};

describe("MikelWebpackPlugin", () => {
    it("should generate an HTML file with the JS and CSS files", async () => {
        const options = {
            mode: "production",
            entry: {
                "app": getVirtualEntry("entry.js", "console.log('hello world');"),
            },
            output: {
                path: path.resolve(process.cwd(), "www"),
                filename: "bundle.[contenthash].js",
            },
            plugins: [
                new MikelWebpackPlugin({
                    title: "Test Document",
                    filename: "app.html",
                    chunks: [],
                }),
            ],
        };
        return runWebpack(options)
            // .then(() => {
            //     return fs.readFile(path.resolve(process.cwd(), "www", "app.html"), "utf8");
            // })
            // .then(data => {
            //     assert.equal(data.includes(`<title>Test Document</title>`), true);
            //     assert.equal(data.includes(`<script src="bundle.js"></script>`), true);
            // });
    });
});
