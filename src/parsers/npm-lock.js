"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseNpmLockfile = parseNpmLockfile;
const fs = __importStar(require("fs"));
const types_1 = require("../graph/types");
function parseNpmLockfile(filePath) {
    const content = fs.readFileSync(filePath, 'utf-8');
    const lockfile = JSON.parse(content);
    const records = [];
    const rootName = lockfile.name || 'root-project';
    // Check if v3 format (has 'packages' object)
    if (lockfile.packages) {
        for (const [path, pkgInfo] of Object.entries(lockfile.packages)) {
            // Root project
            if (path === "") {
                const dependencies = Object.keys(pkgInfo.dependencies || {});
                records.push({
                    name: rootName,
                    version: pkgInfo.version || '0.0.0',
                    dependencies: dependencies,
                    ecosystem: 'npm'
                });
                continue;
            }
            // node_modules packages
            // Path looks like "node_modules/express" or "node_modules/foo/node_modules/bar"
            const parts = path.split('node_modules/');
            const name = parts[parts.length - 1]; // e.g., "express"
            if (!name)
                continue;
            // In v3, "dependencies" represents standard runtime dependencies.
            // There are also "devDependencies", "peerDependencies", etc.
            // For blast radius, we typically want all of them.
            const allDeps = {
                ...pkgInfo.dependencies,
                ...pkgInfo.devDependencies,
                ...pkgInfo.peerDependencies
            };
            records.push({
                name,
                version: pkgInfo.version || 'unknown',
                dependencies: Object.keys(allDeps),
                ecosystem: 'npm'
            });
        }
    }
    else if (lockfile.dependencies) {
        // Fallback for v1 lockfiles (legacy)
        console.warn("Legacy package-lock.json v1 detected. Precision may be lower.");
        function walkDependencies(deps) {
            for (const [name, info] of Object.entries(deps)) {
                const requiredDeps = info.requires ? Object.keys(info.requires) : [];
                records.push({
                    name,
                    version: info.version,
                    dependencies: requiredDeps,
                    ecosystem: 'npm'
                });
                if (info.dependencies) {
                    walkDependencies(info.dependencies);
                }
            }
        }
        walkDependencies(lockfile.dependencies);
    }
    return records;
}
//# sourceMappingURL=npm-lock.js.map