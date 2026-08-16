# Blast Radius MCP 🌌🚀

Blast Radius is an AI-powered **Dependency Decision Engine & Visual Security OS** built for the Model Context Protocol (MCP). It allows AI agents like Claude to natively reason about software supply chains, simulate upgrade impacts, trace vulnerability attack paths, and generate a 3D visualization of your project's dependency topology.

## Why this exists

Most security scanners just tell you: *“You have a HIGH vulnerability in lodash.”*

**Blast Radius tells your AI:**
*“The vulnerability in lodash is 3 levels deep. It is reachable via your `express` entry point. If you try to upgrade `zod` to fix another issue, it will break your production build because of a peer-dependency mismatch in `package-b`.”*

Instead of a flat list of CVEs, Blast Radius treats your dependencies as a **living graph** that AI agents can query and manipulate.

---

## ⚡ Core Capabilities

The MCP server exposes four powerful tools to Claude:

### 1. `dependency_blast_radius`
Calculates the exact "blast radius" if a package is removed or compromised, mapped out by depth.
- Maps direct vs. transitive impact.
- Helps the AI understand how deeply embedded a library is before suggesting a refactor.

### 2. `dependency_upgrade_analysis`
Simulates the impact of upgrading an npm package by evaluating precise `semver` constraints across the entire graph.
**Example AI Query:** *"Can I safely upgrade zod to 4.0.0?"*
```json
{
  "upgrade": { "package": "zod", "from": ["3.25.76"], "to": "4.0.0" },
  "impact": {
    "depth_1": [
      {
        "name": "blast-radius-mcp",
        "status": "BREAK",
        "reason": "requires ^3.22.4 (does not satisfy 4.0.0)"
      },
      {
        "name": "@modelcontextprotocol/sdk",
        "status": "SAFE",
        "reason": "supports ^3.25 || ^4.0"
      }
    ]
  },
  "summary": { "safe": 1, "warning": 0, "break": 1 }
}
```

### 3. `security_audit_graph`
Queries the live **Open Source Vulnerability (OSV)** database and runs a Reverse BFS traversal to map out **Attack Paths**.
- Doesn't just find vulnerabilities—it traces exactly how an attacker reaches them from your root project.
- Prioritizes risks using a bespoke `Severity / Reachability Depth` algorithm.

### 4. `open_dependency_visualizer`
A visual "Security Operating System." Returns a deep-link to an interactive 3D Galaxy Viewer served directly from the MCP process.
- **⭐ Gold Stars**: Root applications
- **🌎 Blue Planets**: Direct dependencies
- **🔴 Pulsing Supernovas**: Vulnerable packages
- **⚡ Glowing Edges**: Traced attack paths

---

## 🏗️ Architecture

```text
                 Blast Radius MCP
                       |
        ┌──────────────┴──────────────┐
        |                             |
        v                             v
   MCP stdio                    Express Server
   (Claude API)                 (localhost:3000)
        |                             |
 ┌──────┴──────┐                      v
 |             |              React 3D Galaxy
Upgrade      OSV               (force-graph)
 Engine     Engine
```

---

## 🚀 Getting Started

### 1. Build the project
```bash
npm install
npm run build

cd ui
npm install
npm run build
```

### 2. Configure Claude Desktop
Add the following to your `claude_desktop_config.json`:
```json
{
  "mcpServers": {
    "blast-radius": {
      "command": "node",
      "args": ["/absolute/path/to/blast-radius-mcp/dist/index.js"]
    }
  }
}
```

### 3. Ask Claude!
Try asking Claude:
- *"Analyze the blast radius of `typescript` in this project."*
- *"Simulate an upgrade of `express` to version `5.0.0`. What breaks?"*
- *"Run a security audit and show me the attack paths."*
- *"Open the 3D visualizer and focus on the `lodash` package."*

---

## 🔮 Future Roadmap (Phase 3)
Because the Security Engine relies on the agnostic **OSV Database**, the core intelligence layer already supports Python (`pip`), Rust (`cargo`), and Go (`go`). Future updates will introduce lockfile parsers for these ecosystems, instantly granting them full upgrade simulation and 3D attack-path visualization capabilities.
