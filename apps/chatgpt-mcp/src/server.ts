import { createMcpExpressApp } from "@modelcontextprotocol/sdk/server/express.js";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { registerAppResource, registerAppTool, RESOURCE_MIME_TYPE } from "@modelcontextprotocol/ext-apps/server";
import { z } from "zod";

import { fetchGenesisRecord, getWidgetSnapshot, searchGenesisRecords } from "./data.js";
import { buildWidgetHtml, WIDGET_URI } from "./widget.js";

type McpRequest = {
  body: unknown;
};

type McpResponse = {
  headersSent: boolean;
  json(payload: unknown): void;
  status(code: number): McpResponse;
  on(event: "close", listener: () => void): void;
  writeHead(code: number): { end(payload: string): void };
};

export function createGenesisMcpServer() {
  const server = new McpServer(
    { name: "genesis-chatgpt-mcp", version: "0.1.0" },
    { capabilities: { logging: {} } }
  );

  registerAppResource(
    server,
    "Genesis Ops Widget",
    WIDGET_URI,
    {
      description: "Read-only widget for Genesis retraining and eta_thermo operations data.",
      _meta: {
        ui: {
          prefersBorder: true,
          csp: {
            connectDomains: [],
            resourceDomains: [],
          },
        },
      },
    },
    async () => ({
      contents: [
        {
          uri: WIDGET_URI,
          mimeType: RESOURCE_MIME_TYPE,
          text: buildWidgetHtml(),
          _meta: {
            ui: {
              prefersBorder: true,
              csp: {
                connectDomains: [],
                resourceDomains: [],
              },
            },
          },
        },
      ],
    })
  );

  registerAppTool(
    server,
    "search",
    {
      title: "Genesis Search",
      description:
        "Use this when you need to search Genesis retraining telemetry, prompt ledger entries, alerts, or internal reference documents.",
      inputSchema: {
        query: z.string().min(2),
      },
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        openWorldHint: false,
        idempotentHint: true,
      },
      _meta: {
        ui: { resourceUri: WIDGET_URI },
        "openai/outputTemplate": WIDGET_URI,
        "openai/toolInvocation/invoking": "Searching telemetry",
        "openai/toolInvocation/invoked": "Search results ready",
      },
    },
    async ({ query }) => {
      const results = await searchGenesisRecords(query);
      const snapshot = await getWidgetSnapshot();
      return {
        content: [
          {
            type: "text",
            text: `Found ${results.length} Genesis records matching "${query}".`,
          },
        ],
        structuredContent: {
          query,
          results,
          snapshot,
        },
        _meta: {
          query,
          results,
        },
      };
    }
  );

  registerAppTool(
    server,
    "fetch",
    {
      title: "Genesis Fetch",
      description:
        "Use this when you already have a Genesis record ID and need the exact prompt, cycle, promotion, or document content.",
      inputSchema: {
        id: z.string(),
      },
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        openWorldHint: false,
        idempotentHint: true,
      },
      _meta: {
        ui: { resourceUri: WIDGET_URI },
        "openai/outputTemplate": WIDGET_URI,
        "openai/toolInvocation/invoking": "Fetching record",
        "openai/toolInvocation/invoked": "Record ready",
      },
    },
    async ({ id }) => {
      const record = await fetchGenesisRecord(id);
      const snapshot = await getWidgetSnapshot();
      if (!record) {
        return {
          content: [
            {
              type: "text",
              text: `No Genesis record found for ${id}.`,
            },
          ],
          structuredContent: {
            record: null,
            snapshot,
          },
          _meta: {
            record: null,
          },
        };
      }

      return {
        content: [
          {
            type: "text",
            text: `Fetched ${record.title}.`,
          },
        ],
        structuredContent: {
          record,
          snapshot,
        },
        _meta: {
          record,
        },
      };
    }
  );

  return server;
}

export function createGenesisMcpApp() {
  const app = createMcpExpressApp();

  app.get("/healthz", (_req: McpRequest, res: McpResponse) => {
    res.json({ ok: true, service: "genesis-chatgpt-mcp" });
  });

  app.post("/mcp", async (req: McpRequest, res: McpResponse) => {
    const server = createGenesisMcpServer();
    const transport = new StreamableHTTPServerTransport({});

    try {
      await server.connect(transport as Parameters<typeof server.connect>[0]);
      await transport.handleRequest(
        req as unknown as Parameters<typeof transport.handleRequest>[0],
        res as unknown as Parameters<typeof transport.handleRequest>[1],
        req.body
      );
      res.on("close", () => {
        transport.close();
        server.close();
      });
    } catch (error) {
      if (!res.headersSent) {
        res.status(500).json({
          jsonrpc: "2.0",
          error: {
            code: -32603,
            message: error instanceof Error ? error.message : "Internal server error",
          },
          id: null,
        });
      }
    }
  });

  app.get("/mcp", (_req: McpRequest, res: McpResponse) => {
    res.writeHead(405).end(
      JSON.stringify({
        jsonrpc: "2.0",
        error: { code: -32000, message: "Method not allowed." },
        id: null,
      })
    );
  });

  app.delete("/mcp", (_req: McpRequest, res: McpResponse) => {
    res.writeHead(405).end(
      JSON.stringify({
        jsonrpc: "2.0",
        error: { code: -32000, message: "Method not allowed." },
        id: null,
      })
    );
  });

  return app;
}
