export const WIDGET_URI = "ui://widget/genesis-ops.html";

export function buildWidgetHtml() {
  return `
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Genesis Ops Widget</title>
    <style>
      :root {
        color-scheme: light;
        --bg: #f4f5ef;
        --panel: #fffaf2;
        --border: rgba(16, 33, 26, 0.12);
        --text: #10211a;
        --muted: rgba(16, 33, 26, 0.66);
        --accent: #2a628f;
        --danger: #9f3b32;
      }

      * { box-sizing: border-box; }
      body {
        margin: 0;
        font-family: ui-sans-serif, system-ui, sans-serif;
        background:
          radial-gradient(circle at top left, rgba(29, 122, 82, 0.16), transparent 25%),
          linear-gradient(180deg, rgba(255,255,255,0.75), rgba(244,245,239,1));
        color: var(--text);
      }
      main { padding: 20px; }
      .panel {
        background: rgba(255, 250, 242, 0.92);
        border: 1px solid var(--border);
        border-radius: 20px;
        padding: 16px;
        box-shadow: 0 18px 60px rgba(16, 33, 26, 0.08);
      }
      .grid { display: grid; gap: 12px; }
      .results { grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); }
      .eyebrow {
        font-size: 11px;
        letter-spacing: 0.22em;
        text-transform: uppercase;
        color: var(--accent);
        margin: 0 0 8px 0;
      }
      h1, h2, h3, p { margin: 0; }
      h1 { font-size: 24px; margin-bottom: 10px; }
      h2 { font-size: 18px; margin-bottom: 10px; }
      h3 { font-size: 14px; margin-bottom: 6px; }
      p { font-size: 13px; line-height: 1.6; color: var(--muted); }
      code {
        display: inline-block;
        padding: 2px 8px;
        border-radius: 999px;
        background: rgba(42, 98, 143, 0.08);
        color: var(--accent);
        font-size: 11px;
      }
      pre {
        white-space: pre-wrap;
        word-break: break-word;
        background: #0f1b16;
        color: #d5e5db;
        border-radius: 16px;
        padding: 14px;
        font-size: 12px;
        overflow: auto;
      }
      .danger { color: var(--danger); }
    </style>
  </head>
  <body>
    <main>
      <div id="root" class="panel"></div>
    </main>
    <script>
      const root = document.getElementById("root");

      function render(payload) {
        if (!root) return;
        if (!payload) {
          root.innerHTML = "<p>No tool output available yet.</p>";
          return;
        }

        if (payload.results) {
          root.innerHTML = [
            '<p class="eyebrow">Genesis Search</p>',
            "<h1>Search results</h1>",
            '<div class="grid results">' +
              payload.results.map((item) => (
                '<section class="panel">' +
                  '<p class="eyebrow">' + item.kind + '</p>' +
                  '<h3>' + item.title + '</h3>' +
                  '<p>' + item.summary + '</p>' +
                  '<p style="margin-top:10px"><code>' + item.id + '</code></p>' +
                '</section>'
              )).join("") +
            '</div>'
          ].join("");
          return;
        }

        if (payload.record) {
          root.innerHTML = [
            '<p class="eyebrow">Genesis Fetch</p>',
            "<h1>" + payload.record.title + "</h1>",
            '<p style="margin-bottom:14px">' + payload.record.url + "</p>",
            "<pre>" + payload.record.text + "</pre>"
          ].join("");
          return;
        }

        root.innerHTML = "<pre>" + JSON.stringify(payload, null, 2) + "</pre>";
      }

      const initial = window.openai?.toolOutput ?? window.openai?.widgetState ?? null;
      render(initial);

      window.addEventListener("message", (event) => {
        const payload = event.data?.params?.result?.structuredContent ?? event.data?.structuredContent;
        if (payload) {
          render(payload);
        }
      });
    </script>
  </body>
</html>`.trim();
}
