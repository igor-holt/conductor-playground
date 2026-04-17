import { createGenesisMcpApp } from "./server.js";

const port = Number(process.env.PORT ?? 2091);
const app = createGenesisMcpApp();

app.listen(port, (error?: Error) => {
  if (error) {
    console.error("Failed to start MCP server", error);
    process.exit(1);
  }
  console.log(`Genesis ChatGPT MCP listening on http://127.0.0.1:${port}/mcp`);
});
