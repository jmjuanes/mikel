#!/usr/bin/env node

import * as fs from "node:fs";
import * as path from "node:path";
import * as http from "node:http";
import {parseArgs} from "node:util";
import mime from "mime/lite";
import {
    createContextFromConfig,
    partialBuildContext,
    startContextWatch,
} from "./index.js";

// check if the provided path is a directory
const isDirectory = directory => fs.existsSync(directory) && fs.statSync(directory).isDirectory();

// get the configuration file from the provided path
const resolveConfig = value => {
    const configPath = path.resolve(value || "./press.config.js");
    return import(configPath).then(config => {
        return config?.default || {};
    });
};

// send file as a response
const sendFile = (response, filePath) => {
    const pathExists = fs.existsSync(filePath);
    // 1. File exists: send file with the correct MIME type
    if (pathExists) {
        response.writeHead(200, {
            "Content-Type": mime.getType(path.extname(filePath)) || "text/plain",
        });
        fs.createReadStream(filePath).pipe(response);
        return;
    }
    // 2. File does not exist: send a 404 message
    response.writeHead(404);
    response.end("Not found");
};

const main = (args = []) => {
    const [command, ...otherArguments] = args;
    const {values} = parseArgs({
        args: otherArguments,
        options: {
            config: {
                type: "string",
                short: "c",
                default: "press.config.js",
            },
            port: {
                type: "string",
                short: "p",
                default: "3000",
            },
            watch: {
                type: "boolean",
                short: "w",
                default: false,
            },
        },
    });
    // TODO: validate command and arguments
    resolveConfig(values.config || "press.config.js").then(config => {
        const context = createContextFromConfig(config);
        // initialize server
        if (command === "serve") {
            const port = parseInt(values.port || "3000");
            const server = http.createServer((request, response) => {
                console.log(`${request.method} ${request.url}`);
                const url = path.join(context.destination, path.normalize(request.url));
                // check for directory
                if (url.endsWith("/") || isDirectory(url)) {
                    return sendFile(response, path.join(url, "index.html"));
                }
                // check if we have to append the '.html' extension
                if (!fs.existsSync(url) && fs.existsSync(url + ".html")) {
                    return sendFile(response, url + ".html");
                }
                // just send requested file
                sendFile(response, url);
            });
            // launch server
            server.listen(port);
            console.log(`Server running at http://127.0.0.1:${port}/`);
            // start watch on the context nodes
            if (values.watch) {
                startContextWatch(context);
            }
        }
        // initial build
        partialBuildContext(context, context.nodes);
    });
};

// run
main(process.argv.slice(2));
