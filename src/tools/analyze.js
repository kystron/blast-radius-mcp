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
exports.runBlastRadiusAnalysis = runBlastRadiusAnalysis;
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
const npm_lock_1 = require("../parsers/npm-lock");
const builder_1 = require("../graph/builder");
const traversal_1 = require("../graph/traversal");
function runBlastRadiusAnalysis(packageName, lockfilePath) {
    // Determine lockfile path
    const targetPath = lockfilePath || path.join(process.cwd(), 'package-lock.json');
    if (!fs.existsSync(targetPath)) {
        throw new Error(`package-lock.json not found at ${targetPath}`);
    }
    // Parse & Build Graph
    const records = (0, npm_lock_1.parseNpmLockfile)(targetPath);
    const graph = (0, builder_1.buildGraph)(records);
    // Find all versions of the requested package
    const targets = graph.findPackages(packageName);
    if (targets.length === 0) {
        throw new Error(`Package ${packageName} not found in dependency tree.`);
    }
    const combinedResult = {
        targets: [],
        blastRadius: {},
        maxDepth: 0
    };
    // Run Reverse BFS for every version found
    for (const target of targets) {
        combinedResult.targets.push(target.id);
        const result = (0, traversal_1.reverseBFS)(graph, target.id);
        combinedResult.blastRadius[target.id] = result.blastRadius;
        if (result.maxDepth > combinedResult.maxDepth) {
            combinedResult.maxDepth = result.maxDepth;
        }
    }
    return combinedResult;
}
//# sourceMappingURL=analyze.js.map