import { getAiConfig } from "@/lib/ai/config";
import { getProvider } from "@/lib/ai/providers";
import { explainMoveRequestSchema } from "@/lib/ai/schemas/request";
import { explainMove, getDefaultDeps } from "@/lib/ai/service";

export async function POST(request: Request) {
  const config = getAiConfig();
  const bodyText = await request.text();

  if (bodyText.length > config.maxBodyBytes) {
    return Response.json(
      {
        ok: false,
        error: { code: "payload_too_large", message: "Request body too large" },
      },
      { status: 413 },
    );
  }

  let body: unknown;
  try {
    body = JSON.parse(bodyText);
  } catch {
    return Response.json(
      {
        ok: false,
        error: { code: "invalid_request", message: "Invalid JSON body" },
      },
      { status: 400 },
    );
  }

  const parsed = explainMoveRequestSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      {
        ok: false,
        error: { code: "invalid_request", message: "Invalid request payload" },
      },
      { status: 400 },
    );
  }

  const clientId =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";

  const provider = getProvider();
  const deps = getDefaultDeps(provider);

  const result = await explainMove(
    parsed.data.context,
    {
      regenerate: parsed.data.regenerate,
      clientId,
    },
    deps,
  );

  const status = result.ok ? 200 : result.error.code === "rate_limited" ? 429 : 500;
  return Response.json(result, { status });
}
