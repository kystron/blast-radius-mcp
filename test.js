import { runBlastRadiusAnalysis } from './dist/tools/analyze.js';

try {
    const result = runBlastRadiusAnalysis('zod');
    console.log(JSON.stringify(result, null, 2));
} catch (e) {
    console.error(e);
}
