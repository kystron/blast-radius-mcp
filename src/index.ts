#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { runBlastRadiusAnalysis } from "./tools/analyze.js";
import { runUpgradeAnalysis } from "./tools/upgrade.js";
import { runFullSecurityAudit } from "./tools/audit.js";
import express from "express";
import cors from "cors";
import { apiRouter } from "./api/routes.js";
import * as path from "path";
import { fileURLToPath } from "url";

// Initialize the MCP Server
const server = new McpServer({
  name: "blast-radius-mcp",
  version: "1.0.0"
});

// Register the dependency_blast_radius tool
server.tool(
  "dependency_blast_radius",
  "Analyzes the blast radius of a given npm package. Uses Reverse BFS to find all direct and transitive packages that rely on it.",
  {
    packageName: z.string().describe("The name of the npm package to analyze (e.g., 'lodash')"),
    lockfilePath: z.string().optional().describe("Optional absolute path to package-lock.json. Defaults to cwd.")
  },
  async ({ packageName, lockfilePath }) => {
    try {
      const result = runBlastRadiusAnalysis(packageName, lockfilePath);
      
      return {
        content: [{ 
            type: "text", 
            text: JSON.stringify(result, null, 2) 
        }]
      };
    } catch (error: any) {
      return {
        isError: true,
        content: [{ type: "text", text: `Error analyzing blast radius: ${error.message}` }]
      };
    }
  }
);

server.tool(
  "dependency_upgrade_analysis",
  "Analyzes the impact of upgrading an npm package to a target version. Reports SAFE, WARNING, or BREAK statuses.",
  {
    packageName: z.string().describe("The name of the npm package to upgrade (e.g., 'zod')"),
    targetVersion: z.string().describe("The new version you want to upgrade to (e.g., '4.0.0')"),
    lockfilePath: z.string().optional().describe("Optional absolute path to package-lock.json. Defaults to cwd.")
  },
  async ({ packageName, targetVersion, lockfilePath }) => {
    try {
      const result = runUpgradeAnalysis(packageName, targetVersion, lockfilePath);
      
      return {
        content: [{ 
            type: "text", 
            text: JSON.stringify(result, null, 2) 
        }]
      };
    } catch (error: any) {
      return {
        isError: true,
        content: [{ type: "text", text: `Error analyzing upgrade impact: ${error.message}` }]
      };
    }
  }
);

server.tool(
  "security_audit_graph",
  "Analyzes the full dependency graph for known OSV vulnerabilities, calculates risk scores, and maps attack paths.",
  {
    lockfilePath: z.string().optional().describe("Optional absolute path to package-lock.json. Defaults to cwd.")
  },
  async ({ lockfilePath }) => {
    try {
      const result = await runFullSecurityAudit(lockfilePath);
      
      return {
        content: [{ 
            type: "text", 
            text: JSON.stringify(result, null, 2) 
        }]
      };
    } catch (error: any) {
      return {
        isError: true,
        content: [{ type: "text", text: `Error analyzing security vulnerabilities: ${error.message}` }]
      };
    }
  }
);

server.tool(
  "open_dependency_visualizer",
  "Returns a URL to the interactive 3D Security Galaxy visualizer. Use this when the user asks to see the graph or visualize dependencies.",
  {
    focus: z.string().optional().describe("The name of the package to auto-focus the camera on (e.g. 'lodash').")
  },
  async ({ focus }) => {
    let url = "http://localhost:3000";
    if (focus) {
        url += `?focus=${encodeURIComponent(focus)}`;
    }
    
    return {
      content: [{ 
          type: "text", 
          text: `The 3D Security Galaxy is running! Click here to view: [${url}](${url})` 
      }]
    };
  }
);

async function main() {
  // 1. Start Express Server
  const app = express();
  app.use(cors());
  app.use(express.json());
  
  app.use('/api', apiRouter);

  // Serve Vite React app if it's built
  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  const uiDistPath = path.join(__dirname, '../../ui/dist');
  app.use(express.static(uiDistPath));
  
  app.get('*', (req, res) => {
      res.sendFile(path.join(uiDistPath, 'index.html'));
  });

  app.listen(3000, () => {
      console.error("Galaxy API Server running on port 3000"); // Use stderr so it doesn't break MCP stdio
  });

  // 2. Start MCP Server
  const transport = new StdioServerTransport();
  await server.connect(transport);

  console.error("Blast Radius MCP Server running on stdio");
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
