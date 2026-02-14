"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export function Disclaimer() {
  return (
    <Card className="border-amber-200 bg-amber-50/50 dark:border-amber-900 dark:bg-amber-950/20">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium">本ツールについて</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-xs text-muted-foreground">
        <div>
          <p className="font-medium text-foreground mb-1">算出対象に含まれるもの</p>
          <div className="flex flex-wrap gap-1">
            <Badge variant="outline" className="text-xs">LLM テキスト生成 API</Badge>
            <Badge variant="outline" className="text-xs">Embedding API</Badge>
            <Badge variant="outline" className="text-xs">Web 検索 API</Badge>
          </div>
        </div>
        <div>
          <p className="font-medium text-foreground mb-1">算出対象に含まれないもの</p>
          <div className="flex flex-wrap gap-1">
            <Badge variant="secondary" className="text-xs">インフラ費用（サーバー・DB）</Badge>
            <Badge variant="secondary" className="text-xs">開発費</Badge>
            <Badge variant="secondary" className="text-xs">運用保守費</Badge>
            <Badge variant="secondary" className="text-xs">ベクトルDB費用</Badge>
          </div>
        </div>
        <div className="border-t pt-2 space-y-1">
          <p>※ 本ツールの算出結果は LLM API 利用料の<strong>上限概算</strong>です。実際の料金は使用状況により変動します。</p>
          <p>※ モデルの料金はプロバイダーにより予告なく変更される場合があります。</p>
          <p>※ 料金データ最終取得日: 2026-02-14</p>
        </div>
      </CardContent>
    </Card>
  );
}
