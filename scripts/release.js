import fs from "node:fs";
import path from "node:path";

// tiny helper to read and write a JSON file
const readJson = file => JSON.parse(fs.readFileSync(file, "utf8"));
const writeJson = (file, data) => fs.writeFileSync(file, JSON.stringify(data, null, "    "), "utf8");

// read the package.json
const pkg = readJson(path.join(process.cwd(), "package.json"));

// Fix the version in each package.json of the packages folder
const packagesDir = path.join(process.cwd(), "packages");
fs.readdirSync(packagesDir).forEach(dir => {
    const packageFile = path.join(packagesDir, dir, "package.json");
    const packageContent = readJson(packageFile);
    // 1. change version in package.json
    packageContent.version = pkg.version;
    // 2. change version in dependencies and devDependencies
    ["dependencies", "devDependencies"].forEach(type => {
        Object.keys(packageContent[type] || {}).forEach(dep => {
            if (dep === "mikel") {
                packageContent[type][dep] = "^" + pkg.version;
            }
        });
    });
    // 3. write the new package.json
    writeJson(packageFile, packageContent);
});
    