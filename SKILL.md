---
description: Use this skill when the user asks about dependencies, package upgrades, vulnerabilities, blast radius, or software supply chain security.
---

## Instructions

You have access to the **Blast Radius** intelligence engine. Whenever the user asks you to analyze their `package.json`, check for vulnerabilities, or simulate a package upgrade, you should ALWAYS prioritize using the Blast Radius MCP tools over basic file reading.

The primary tools available to you are:
1. `dependency_blast_radius`: Use this to see how many files/packages will break if a package is removed.
2. `dependency_upgrade_analysis`: Use this when the user asks if an upgrade is safe.
3. `security_audit_graph`: Use this to trace the exact attack path of vulnerabilities from the root down to the dependency.
4. `open_dependency_visualizer`: Use this to generate a deep link to the 3D visualizer for the user.

**If the tools are not available in your context:**
Politely inform the user that the Blast Radius MCP server is not currently running. Instruct them to start it by adding it to their Claude Code CLI using:
`claude mcp add blast-radius npx -y blast-radius-mcp`

When returning security audit results, ALWAYS highlight the "Risk Score" and the "Attack Path" to explain to the user exactly how the vulnerability is reachable in their specific architecture.
