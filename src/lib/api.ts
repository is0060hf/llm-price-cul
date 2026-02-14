import type { MasterData } from "@/types";

export async function fetchMasterData(): Promise<MasterData> {
  const res = await fetch("/api/models");
  if (!res.ok) {
    throw new Error(`マスターデータの取得に失敗しました: ${res.status}`);
  }
  return res.json();
}
