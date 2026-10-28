# Blast Radius MCP

**Understand dependency risk before you change your code.**

Blast Radius MCP is an open-source dependency analysis and security visualization tool built with TypeScript and the Model Context Protocol (MCP). It helps developers and AI assistants understand dependency relationships, evaluate package upgrade compatibility, investigate known vulnerabilities, and explore dependency graphs through a 3D dashboard.

Instead of treating dependencies as a flat list, Blast Radius models them as a graph that can be analyzed to understand the potential impact of changes and security issues.

## Why Blast Radius?

Traditional dependency scanners identify vulnerable packages, but developers also need to understand how those packages relate to the rest of their applications.

Questions that matter include:

- Which packages depend on a particular library?
- What could break if a dependency is upgraded?
- Which installed packages have known security vulnerabilities?
- How are vulnerable packages connected to other dependencies?
- Can an AI assistant help investigate these questions using structured dependency data?

Blast Radius aims to make dependency analysis more actionable by combining graph-based analysis, vulnerability intelligence, MCP tools, and interactive visualization.

## Features

### 1. Dependency Blast-Radius Analysis

Explore dependency relationships to understand the potential impact of package changes.

- Analyze dependency and dependent relationships.
- Identify direct and transitive dependencies represented in the graph.
- Investigate how packages are connected.
- Help AI assistants reason about the potential impact of dependency changes.

### 2. Dependency Upgrade Analysis

Evaluate the potential impact of upgrading an installed npm package.

The upgrade analyzer uses semantic versioning and dependency constraints to identify compatibility concerns.

Capabilities include:

- Validate requested target versions.
- Identify installed package versions.
- Examine dependency and peer-dependency constraints.
- Flag potential breaking compatibility.
- Identify indirect dependents affected by an upgrade.
- Handle malformed lockfiles and missing packages with validation errors.

**Example question:**

> Can I upgrade `zod` to version 4 without breaking my dependency tree?

The analyzer can help identify packages whose declared version constraints may conflict with the proposed version.

**Important:** Compatibility analysis is not a guarantee that an upgrade will succeed. Runtime behavior, APIs, build configuration, and application-level tests must also be considered.

### 3. Vulnerability Analysis with OSV

Blast Radius integrates with the [Open Source Vulnerabilities (OSV) database](https://osv.dev/) to investigate known vulnerabilities in supported dependency data.

The security analysis includes:

- Batch vulnerability queries.
- Deduplication of package-version queries.
- Vulnerability detail retrieval.
- Severity classification when supported by the available advisory data.
- Local caching to reduce repeated requests.
- Dependency-graph analysis to help investigate vulnerability reachability.

Vulnerability information depends on the data returned by OSV. An empty result does not prove that a package or application is completely secure.

### 4. Interactive 3D Dependency Visualization

Explore dependency relationships through a browser-based 3D dashboard.

The project combines an Express server with a React-based visualization built using Vite and a 3D force-graph library.

The visualization is intended to make dependency relationships and security findings easier to explore than a flat package list.

### 5. Model Context Protocol Integration

Blast Radius exposes dependency-analysis functionality through MCP tools so compatible AI clients can interact with the project.

The existing tool names include:

- `dependency_blast_radius`
- `dependency_upgrade_analysis`
- `security_audit_graph`
- `open_dependency_visualizer`

The available behavior depends on the current implementation and the dependency data being analyzed.

## Architecture

```text
                  AI Assistant
                       |
                       | Model Context Protocol
                       v
                Blast Radius MCP
                       |
          +------------+------------+
          |                         |
          v                         v
   Dependency Analysis       Security Analysis
          |                         |
          v                         v
    Dependency Graph          OSV Integration
          |                         |
          +------------+------------+
                       |
                       v
                 Express API
                       |
                       v
              React 3D Dashboard
                 localhost:3000
```

### Technology Stack

| Component | Technology |
|---|---|
| Language | TypeScript |
| AI integration | Model Context Protocol SDK |
| API server | Express |
| Dependency compatibility | SemVer |
| Vulnerability intelligence | OSV API |
| Frontend | React |
| Frontend build tool | Vite |
| Visualization | 3D force-graph |
| Automated tests | Node.js test runner |

## Getting Started

### Prerequisites

Install the following before running the project:

- Node.js with npm.
- Git.
- An MCP-compatible client if you want to use the MCP integration.

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

The application starts the MCP server and its Express-based visualization API. The dashboard is configured to run on port `3000`.

Open the following address in your browser:

```text
http://localhost:3000
```

Keep the process running while using the dashboard or connecting an MCP client.

If port `3000` is already occupied, investigate the existing process and the application's port configuration before starting another instance.

## Connecting to Claude Desktop

Blast Radius can be configured as a local MCP server for a compatible Claude Desktop installation.

Add a server entry to your Claude Desktop configuration file, adjusting the path to match your local installation.

Example:

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

Replace the example path if you cloned the project into a different directory.

After saving the configuration, restart Claude Desktop and check whether the server connects successfully.

Refer to the [official MCP documentation](https://modelcontextprotocol.io/) for information about MCP clients and server configuration.

## Example Questions

Once the server is connected and the relevant tools are available, try prompts such as:

- "Analyze the dependency blast radius of TypeScript in this project."
- "Evaluate the potential impact of upgrading Express to a newer version."
- "Investigate known vulnerabilities in the installed dependencies."
- "Help me understand which dependencies are connected to a vulnerable package."
- "Open the dependency visualization."

The answers depend on the project being analyzed, the available dependency data, and the capabilities exposed by the running server.

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

Check root dependencies for known advisories:

```bash
npm audit
```

Check frontend dependencies separately:

```bash
cd ui
npm audit
```

A successful build, passing tests, and a clean dependency audit are useful validation signals, but they do not establish that every security-analysis result is correct or that the application is free from vulnerabilities.

## Current Scope and Limitations

Blast Radius is an evolving open-source project.

- **Dependency parsing:** The current documented workflow focuses on npm lockfiles.
- **Upgrade analysis:** Declared version compatibility does not guarantee runtime compatibility.
- **Vulnerability coverage:** Results depend on OSV data and successful query processing.
- **Severity:** Advisory severity may be unavailable or require interpretation.
- **Security conclusions:** Graph reachability and vulnerability findings should be reviewed in the context of the actual application.
- **Ecosystem support:** Python, Rust, and Go support should be considered future work until their complete parsing and analysis workflows are implemented and tested.
- **Testing:** The current automated suite focuses on dependency upgrade analysis. Additional scanner, API, and end-to-end tests would improve confidence.

Blast Radius is a decision-support tool. It should complement—not replace—security reviews, dependency maintenance, application testing, and other software supply-chain security controls.

## Roadmap

Potential areas for future development include:

- Dedicated vulnerability-scanner tests.
- More comprehensive API and end-to-end tests.
- Improved dependency-depth and attack-path visualization.
- Better handling of large dependency graphs.
- Additional lockfile parsers and ecosystem support.
- Improved visualization performance and frontend code splitting.
- Continuous integration for builds, tests, and dependency audits.
- Clearer contribution workflows and release documentation.

Roadmap items are proposals, not claims that the functionality is already implemented.

## Contributing

Contributions, bug reports, testing, and documentation improvements are welcome.

To contribute:

1. Fork the repository.
2. Create a branch for your change.
3. Make the change and add relevant tests.
4. Run the automated tests and build checks.
5. Submit a pull request explaining the change and its validation.

For security-sensitive findings, avoid publishing exploitable details before coordinating an appropriate disclosure.

## License

Blast Radius MCP is distributed under the MIT License. See [`LICENSE`](LICENSE) for the license text.

## Project

**Repository:** [kystron/blast-radius-mcp](https://github.com/kystron/blast-radius-mcp)

Built to help developers and AI assistants understand the impact of dependency changes and make more informed software supply-chain security decisions.