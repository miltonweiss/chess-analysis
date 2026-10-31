import { getAiStatus } from "@/lib/ai/service";

export async function GET() {
  return Response.json(getAiStatus());
}
