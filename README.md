# Blast Radius MCP

**Understand dependency risk before you change your code.**

Blast Radius MCP is an open-source dependency analysis and security visualization tool built with TypeScript and the Model Context Protocol (MCP). It helps developers and AI assistants analyze dependency relationships, evaluate package upgrade compatibility, investigate known vulnerabilities, and explore dependency graphs through a 3D dashboard.

Blast Radius MCP is designed to help developers and AI assistants investigate dependency relationships, upgrade impact, and known security vulnerabilities in one workflow.

Instead of treating dependencies as a flat list, Blast Radius models them as a graph to help developers understand the potential impact of changes and security issues.

## Author & Attribution

**Created and maintained by TSP LEGEND.**

- **Author:** TSP LEGEND
- **GitHub:** [@kystron](https://github.com/kystron)
- **Repository:** [Blast Radius MCP](https://github.com/kystron/blast-radius-mcp)
- **License:** MIT

Please preserve the applicable copyright and license notices when redistributing this project, as required by the MIT License.

## Why Blast Radius?

Traditional dependency scanners identify vulnerable packages, but developers also need to understand how those packages relate to the rest of their applications.

Questions that matter include:

- Which packages depend on a particular library?
- What could break if a dependency is upgraded?
- Which installed packages have known vulnerabilities?
- How are vulnerable packages connected to other dependencies?
- Can AI assistants help investigate these questions using structured dependency data?

Blast Radius combines graph-based analysis, vulnerability intelligence, MCP tools, and interactive visualization to make dependency analysis more actionable.

## Features

### 1. Dependency Blast-Radius Analysis

Explore dependency relationships to understand the potential impact of package changes.

- Analyze dependency and dependent relationships.
- Investigate direct and transitive dependencies represented in the graph.
- Understand how packages are connected.
- Help AI assistants reason about potential dependency changes.

### 2. Dependency Upgrade Analysis

Evaluate the potential impact of upgrading an installed npm package.

Capabilities include:

- Validate requested target versions.
- Identify installed package versions.
- Examine dependency and peer-dependency constraints.
- Flag potential compatibility problems.
- Identify indirect dependents affected by an upgrade.
- Handle malformed lockfiles and missing packages through validation.

**Example question:**

> Can I upgrade Zod to version 4 without breaking my dependency tree?

The analyzer helps identify packages whose declared version constraints may conflict with the proposed version.

**Note:** Dependency compatibility analysis cannot guarantee that an upgrade will work at runtime. Application tests and build validation are still necessary.

### 3. Vulnerability Analysis with OSV

Blast Radius integrates with the [Open Source Vulnerabilities database](https://osv.dev/) to investigate known vulnerabilities in supported dependency data.

Capabilities include:

- Batch vulnerability queries.
- Deduplication of package-version queries.
- Vulnerability detail retrieval.
- Severity classification when advisory data supports it.
- Local caching to reduce repeated requests.
- Dependency-graph analysis to help investigate vulnerability reachability.

Vulnerability results depend on the available advisory data and successful queries. An empty result does not prove that an application is completely secure.

### 4. Interactive 3D Dependency Visualization

Explore dependency relationships through a browser-based 3D dashboard.

The project combines an Express server with a React frontend built using Vite and a 3D force-graph library.

The visualization is designed to make dependency relationships and security findings easier to explore.

### 5. Model Context Protocol Integration

Blast Radius exposes dependency-analysis functionality through MCP tools so compatible AI clients can interact with the project.

The current tool names include:

- `dependency_blast_radius`
- `dependency_upgrade_analysis`
- `security_audit_graph`
- `open_dependency_visualizer`

The behavior available through each tool depends on the current implementation and the dependency data being analyzed.

## Architecture

```text
                    AI Assistant
                         |
                         | MCP
                         v
                  Blast Radius MCP
                         |
              +----------+----------+
              |                     |
              v                     v
       Dependency Analysis   Security Analysis
              |                     |
              v                     v
       Dependency Graph        OSV Integration
              |                     |
              +----------+----------+
                         |
                         v
                    Express API
                         |
                         v
                React 3D Dashboard
                  localhost:3000
```

## Technology Stack

| Component | Technology |
|---|---|
| Language | TypeScript |
| AI integration | Model Context Protocol SDK |
| API server | Express |
| Version compatibility | SemVer |
| Vulnerability intelligence | OSV API |
| Frontend | React |
| Frontend build | Vite |
| Visualization | 3D force-graph |
| Automated testing | Node.js test runner |

## Getting Started

### Prerequisites

Install:

- Node.js and npm.
- Git.
- An MCP-compatible client if you want to use the AI integration.

### 1. Clone the repository

```bash
git clone https://github.com/kystron/blast-radius-mcp.git
cd blast-radius-mcp
```

### 2. Install dependencies

```bash
npm install
```

### 3. Build the project

```bash
npm run build
```

The root build script compiles the TypeScript application and builds the frontend.

### 4. Start the application

```bash
npm start
```

The application starts the MCP server and its Express-based visualization API. The dashboard is configured to use port `3000`.

Open:

```text
http://localhost:3000
```

Keep the application process running while using the dashboard or connecting an MCP client.

### 5. Configure Claude Desktop

Add a server entry to your Claude Desktop configuration file, adjusting the path to match your local installation.

Example for Windows:

```json
{
  "mcpServers": {
    "blast-radius": {
      "command": "node",
      "args": [
        "C:\\TSP_CORE\\blast-radius-mcp\\dist\\index.js"
      ]
    }
  }
}
```

Replace the example path if your project is installed elsewhere.

After saving the configuration, restart Claude Desktop and verify that the server connects successfully.

For further details, see the [official MCP documentation](https://modelcontextprotocol.io/).

## Example Questions

Once the server is connected and the relevant tools are available, try asking:

- "Analyze the dependency blast radius of TypeScript in this project."
- "Evaluate the potential impact of upgrading Express."
- "Investigate known vulnerabilities in the installed dependencies."
- "Help me understand which dependencies are connected to a vulnerable package."
- "Open the dependency visualization."

Results depend on the project being analyzed and the capabilities exposed by the running server.

## Testing and Validation

Run the automated upgrade-analysis tests:

```bash
npm test
```

The current test suite covers:

- Analysis of installed packages.
- Rejection of packages that are not installed.
- Missing lockfiles.
- Breaking dependency constraints.
- Compatible peer-dependency ranges.
- Invalid target versions.
- Malformed lockfiles.
- Multiple installed versions.
- Indirect dependency relationships.

Run TypeScript type checking:

```bash
npx tsc --noEmit
```

Audit root dependencies:

```bash
npm audit
```

Audit frontend dependencies separately:

```bash
cd ui
npm audit
```

Passing tests, successful builds, and clean dependency audits are useful validation signals, but they do not prove that every security-analysis result is correct or that the application is free from vulnerabilities.

## Current Scope and Limitations

Blast Radius MCP is an evolving open-source project.

- **Dependency parsing:** The current documented workflow focuses on npm lockfiles.
- **Upgrade analysis:** Declared version compatibility does not guarantee runtime