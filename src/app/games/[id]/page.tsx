import { redirect } from "next/navigation";

export default async function StoredGamePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  let gameId = id;
  try {
    gameId = decodeURIComponent(id);
  } catch {
    gameId = id;
  }
  redirect(`/analyze?game=${encodeURIComponent(gameId)}`);
}
