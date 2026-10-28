import fs from "fs";
import { PackageRecord } from "../graph/types.js";


function extractPackageName(packagePath: string): string {

    const marker = "node_modules/";

    const index = packagePath.lastIndexOf(marker);

    if (index === -1) {
        return "";
    }


    const name = packagePath.substring(index + marker.length);


    // Scoped package
    // node_modules/@scope/package

    if (name.startsWith("@")) {

        const parts = name.split("/");

        if (parts.length >= 2) {
            return `${parts[0]}/${parts[1]}`;
        }

    }


    // Normal package

    return name.split("/")[0];
}



export function parseNpmLock(lockfilePath: string): PackageRecord[] {

    const raw = fs.readFileSync(lockfilePath, "utf-8");

    const lock = JSON.parse(raw);


    if (!lock.packages) {

        throw new Error(
            "Only npm lockfile v2/v3 packages format is supported"
        );

    }


    const records: PackageRecord[] = [];


    for (const [packagePath, packageInfo] of Object.entries(lock.packages)) {


        const pkg: any = packageInfo;


        // Skip root package

        if (packagePath === "") {
            continue;
        }


        if (!pkg.version) {
            continue;
        }


        const name = extractPackageName(packagePath);


        if (!name) {
            continue;
        }



        records.push({

            name,

            version: pkg.version,

            path: packagePath,

            dependencies:
                pkg.dependencies || {},

            devDependencies:
                pkg.devDependencies || {},

            peerDependencies:
                pkg.peerDependencies || {},

            peerDependenciesMeta:
                pkg.peerDependenciesMeta || {},

            optionalDependencies:
                pkg.optionalDependencies || {},

            ecosystem: "npm",

            isDev:
                pkg.dev === true

        });


    }


    return records;

}