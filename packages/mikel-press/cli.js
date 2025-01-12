import * as path from "node:path";
import parseArgs from "node:util";
import mikelPress from "./index.js";

const main = (args = []) => {
    // const [command, ...otherArguments] = args;
    const {values} = parseArgs({
        // args: otherArguments,
        options: {
            config: {
                type: "string",
                short: "c",
                default: "press.config.js",
            },
        },
    });
    const configPath = path.resolve(process.cwd(), values.config);
    // at this moment only build command is allowed
    import(configPath).then(config => {
        return mikelPress.run(config.default || {});
    });
};

// run
main(process.argv.slice(2))
