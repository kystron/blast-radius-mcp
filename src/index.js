"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mcp_js_1 = require("@modelcontextprotocol/sdk/server/mcp.js");
const stdio_js_1 = require("@modelcontextprotocol/sdk/server/stdio.js");
const zod_1 = require("zod");
const analyze_js_1 = require("./tools/analyze.js");
// Initialize the MCP Server
const server = new mcp_js_1.McpServer({
    name: "blast-radius-mcp",
    version: "1.0.0"
});
// Register the dependency_blast_radius tool
server.tool("dependency_blast_radius", "Analyzes the blast radius of a given npm package. Uses Reverse BFS to find all direct and transitive packages that rely on it.", {
    packageName: zod_1.z.string().describe("The name of the npm package to analyze (e.g., 'lodash')"),
    lockfilePath: zod_1.z.string().optional().describe("Optional absolute path to package-lock.json. Defaults to cwd.")
}, async ({ packageName, lockfilePath }) => {
    try {
        const result = (0, analyze_js_1.runBlastRadiusAnalysis)(packageName, lockfilePath);
        return {
            content: [{
                    type: "text",
                    text: JSON.stringify(result, null, 2)
                }]
        };
    }
    catch (error) {
        return {
            isError: true,
            content: [{ type: "text", text: `Error analyzing blast radius: ${error.message}` }]
        };
    }
});
async function main() {
    const transport = new stdio_js_1.StdioServerTransport();
    await server.connect(transport);
    console.error("Blast Radius MCP Server running on stdio");
}
main().catch((error) => {
    console.error("Fatal error:", error);
    process.exit(1);
});
//# sourceMappingURL=index.js.map