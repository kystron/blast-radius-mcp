import * as fs from 'fs';
import { PackageRecord } from '../graph/types.js';

export function parseNpmLockfile(filePath: string): PackageRecord[] {
    const content = fs.readFileSync(filePath, 'utf-8');
    const lockfile = JSON.parse(content);
    
    const records: PackageRecord[] = [];
    const rootName = lockfile.name || 'root-project';
    
    // Check if v3 format (has 'packages' object)
    if (lockfile.packages) {
        for (const [path, pkgInfo] of Object.entries<any>(lockfile.packages)) {
            // Root project
            if (path === "") {
                const dependencies = { ...pkgInfo.dependencies, ...pkgInfo.devDependencies };
                records.push({
                    name: rootName,
                    version: pkgInfo.version || '0.0.0',
                    dependencies: dependencies,
                    peerDependencies: pkgInfo.peerDependencies || {},
                    ecosystem: 'npm'
                });
                continue;
            }
            
            // node_modules packages
            const parts = path.split('node_modules/');
            const name = parts[parts.length - 1]; // e.g., "express"
            
            if (!name) continue;
            
            records.push({
                name,
                version: pkgInfo.version || 'unknown',
                dependencies: pkgInfo.dependencies || {},
                peerDependencies: pkgInfo.peerDependencies || {},
                ecosystem: 'npm'
            });
        }
    } else if (lockfile.dependencies) {
        // Fallback for v1 lockfiles (legacy)
        console.warn("Legacy package-lock.json v1 detected. Precision may be lower.");
        
        function walkDependencies(deps: any) {
            for (const [name, info] of Object.entries<any>(deps)) {
                // v1 lockfiles store "requires" mapping instead of constraints in dependencies
                const requiredDeps = info.requires || {};
                records.push({
                    name,
                    version: info.version,
                    dependencies: requiredDeps,
                    peerDependencies: {}, // v1 doesn't track peer constraints well
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
