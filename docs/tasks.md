# LLM ランニングコスト算出 Web システム — タスクリスト

> 本タスクリストは [docs/requirement.md](requirement.md) のすべての要件を満たすために必要な作業を網羅する。
> 各タスクには要件定義書の参照セクションと完了条件を明記する。

---

## Phase 1: プロジェクト初期化

> 参照: [requirement.md セクション 7.1 技術スタック](requirement.md#71-技術スタック) / [セクション 7.4 ディレクトリ構成](requirement.md#74-ディレクトリ構成予定)

### 1-1. Next.js プロジェクトの作成

- [ ] `npx create-next-app@latest` で App Router 構成の Next.js プロジェクトを作成する
  - [ ] TypeScript を有効にする
  - [ ] App Router を選択する
  - [ ] src ディレクトリを使用する構成にする
  - [ ] Tailwind CSS を有効にする
- **完了条件**: `npm run dev` でローカルサーバーが起動し、デフォルトページが表示される

### 1-2. 依存パッケージのインストール

> 参照: [requirement.md セクション 7.1](requirement.md#71-技術スタック) の技術スタック一覧

- [ ] Drizzle ORM 関連パッケージのインストール（`drizzle-orm`, `drizzle-kit`, `@neondatabase/serverless`）
- [ ] shadcn/ui の初期化（`npx shadcn@latest init`）
- [ ] React Hook Form + Zod のインストール（`react-hook-form`, `@hookform/resolvers`, `zod`）
- [ ] Recharts のインストール（`recharts`）
- [ ] dotenv のインストール（シードスクリプト用、`dotenv`）
- **完了条件**: `package.json` にすべての依存パッケージが記載され、`npm install` がエラーなく完了する

### 1-3. 設定ファイルの作成

- [ ] `drizzle.config.ts` を作成し、Neon への接続設定を記述する
  - 参照: [requirement.md セクション 7.1](requirement.md#71-技術スタック) — ORM: Drizzle ORM
  - DATABASE_URL は `.env` / `.env.local` から読み込む（作成済み）
- [ ] `next.config.ts` にサーバーサイド外部パッケージの設定を追加する（Neon ドライバ対応）
- [ ] `.gitignore` に不足があれば追記する（作成済み、確認のみ）
- **完了条件**: `npx drizzle-kit generate` がエラーなく実行可能な状態になる

### 1-4. ディレクトリ構成の作成

> 参照: [requirement.md セクション 7.4](requirement.md#74-ディレクトリ構成予定) のディレクトリツリー

- [ ] `src/app/api/models/` ディレクトリを作成する
- [ ] `src/components/ui/` ディレクトリを作成する（shadcn/ui 初期化時に自動生成される場合あり）
- [ ] `src/lib/db/` ディレクトリを作成する
- [ ] `src/lib/calculation/` ディレクトリを作成する
- [ ] `src/lib/constants/` ディレクトリを作成する
- [ ] `src/types/` ディレクトリを作成する
- **完了条件**: [requirement.md セクション 7.4](requirement.md#74-ディレクトリ構成予定) のツリー構造と一致するディレクトリが存在する

---

## Phase 2: データベース

> 参照: [requirement.md セクション 6 モデル料金マスターデータ](requirement.md#6-モデル料金マスターデータ) / [セクション 7.3 データベース設計](requirement.md#73-データベース設計概要)
>
> ※ [requirement.md セクション 6.5 プロバイダー横断比較](requirement.md#65-プロバイダー横断比較コスト感の目安) は要件定義書上の参照情報（コスト感の目安）であり、システムの機能要件ではない。そのため本タスクリストでは対応タスクを設けない。

### 2-1. Drizzle スキーマ定義（`src/lib/db/schema.ts`）

> 参照: [requirement.md セクション 7.3](requirement.md#73-データベース設計概要) のテーブル一覧 + [セクション 6.1](requirement.md#61-管理するデータ項目) の管理データ項目

- [ ] `providers` テーブルを定義する
  - カラム: `id`（PK）, `name`（OpenAI / Anthropic / Google）, `created_at`, `updated_at`
- [ ] `models` テーブルを定義する
  - カラム: `id`（PK）, `provider_id`（FK → providers）, `name`（モデル名）, `category`（flagship / standard / lightweight / reasoning）, `input_price_per_m_tokens`（$/1M tokens）, `output_price_per_m_tokens`（$/1M tokens）, `cache_write_price_per_m_tokens`（nullable。Anthropic 等のキャッシュ書き込み単価。OpenAI/Google は null）, `cache_read_price_per_m_tokens`（nullable。キャッシュヒット時の割引単価。全プロバイダー共通）, `max_context_length`（nullable）, `is_legacy`（boolean）, `updated_at`
  - ※ Anthropic は Cache Write（書き込み時、基本単価より高い）と Cache Read（読み取り時、大幅割引）の 2 種類の料金がある。OpenAI/Google は Cached Input（= Cache Read に相当）のみ。この差異を正確に表現するため 2 カラムに分割する
  - 参照: [requirement.md セクション 6.1](requirement.md#61-管理するデータ項目) のすべてのデータ項目を網羅すること / [セクション 6.3](requirement.md#63-anthropic-claude-モデル料金一覧) の Cache Write / Cache Read 料金
- [ ] `embedding_models` テーブルを定義する
  - カラム: `id`（PK）, `provider_id`（FK → providers）, `name`（モデル名）, `input_price_per_m_tokens`（$/1M tokens）, `dimensions`（次元数、nullable）, `pricing_tier`（'online' | 'batch'。デフォルト 'online'）, `updated_at`
  - ※ Google の Gemini Embedding はオンライン（$0.150）とバッチ（$0.120）で単価が異なるため、それぞれ別レコードとして保持する
  - 参照: [requirement.md セクション 6.2](requirement.md#62-openai-モデル料金一覧) Embedding モデル / [セクション 6.4](requirement.md#64-google-gemini-モデル料金一覧) Embedding モデル（オンライン + バッチの 2 件）
- [ ] `web_search_tools` テーブルを定義する
  - カラム: `id`（PK）, `provider_id`（FK → providers）, `name`（ツール名）, `price_per_1k_calls`（$/1K calls）, `additional_pricing_notes`（text, nullable）, `updated_at`
  - 参照: [requirement.md セクション 6.2](requirement.md#62-openai-モデル料金一覧) Web Search / [セクション 6.3](requirement.md#63-anthropic-claude-モデル料金一覧) Web Search / [セクション 6.4](requirement.md#64-google-gemini-モデル料金一覧) Grounding
- **完了条件**: `npx drizzle-kit generate` で正常にマイグレーションファイルが生成される

### 2-2. Drizzle クライアント作成（`src/lib/db/index.ts`）

- [ ] Neon serverless ドライバを使用した Drizzle クライアントを作成する
  - `DATABASE_URL` 環境変数から接続する
  - 参照: [requirement.md セクション 7.1](requirement.md#71-技術スタック) — Neon (PostgreSQL) + Drizzle ORM
- **完了条件**: クライアントをインポートしてクエリが実行可能である

### 2-3. マイグレーションの実行

- [ ] `npx drizzle-kit push` または `npx drizzle-kit migrate` で Neon にテーブルを作成する
- **完了条件**: Neon のデータベースに `providers`, `models`, `embedding_models`, `web_search_tools` の 4 テーブルが存在する

### 2-4. シードデータの作成（`src/lib/db/seed.ts`）

> 参照: [requirement.md セクション 6.2〜6.4](requirement.md#62-openai-モデル料金一覧) の全モデル料金データ

- [ ] プロバイダーデータの投入（3 件: OpenAI, Anthropic, Google）
- [ ] OpenAI テキスト生成モデルデータの投入
  - 参照: [requirement.md セクション 6.2](requirement.md#62-openai-モデル料金一覧) テキスト生成モデル（8 件: GPT-5.2, GPT-5.2 pro, GPT-5 mini, GPT-4.1, GPT-4.1 mini, GPT-4.1 nano, GPT-4o, GPT-4o-mini）
- [ ] OpenAI 推論モデルデータの投入
  - 参照: [requirement.md セクション 6.2](requirement.md#62-openai-モデル料金一覧) 推論モデル（2 件: o4-mini, o3-mini）
- [ ] Anthropic テキスト生成モデルデータの投入
  - 参照: [requirement.md セクション 6.3](requirement.md#63-anthropic-claude-モデル料金一覧) 最新モデル（3 件: Opus 4.6, Sonnet 4.5, Haiku 4.5）
- [ ] Anthropic レガシーモデルデータの投入
  - 参照: [requirement.md セクション 6.3](requirement.md#63-anthropic-claude-モデル料金一覧) レガシーモデル（5 件: Opus 4.5, Opus 4.1, Sonnet 4, Opus 4, Haiku 3）
- [ ] Google テキスト生成モデルデータの投入
  - 参照: [requirement.md セクション 6.4](requirement.md#64-google-gemini-モデル料金一覧) テキスト生成モデル（7 件: Gemini 3 Pro Preview, Gemini 3 Flash Preview, Gemini 2.5 Pro, Gemini 2.5 Flash, Gemini 2.5 Flash Lite, Gemini 2.0 Flash, Gemini 2.0 Flash Lite）
- [ ] Embedding モデルデータの投入
  - 参照: [requirement.md セクション 6.2](requirement.md#62-openai-モデル料金一覧) Embedding（2 件: text-embedding-3-small, text-embedding-3-large）/ [セクション 6.4](requirement.md#64-google-gemini-モデル料金一覧) Embedding（2 件: Gemini Embedding オンライン $0.150, Gemini Embedding バッチ $0.120）
  - ※ Google Embedding はオンライン/バッチの 2 件として投入する。バッチ処理も月単位で定期実行するケースがあるため両方保持する
- [ ] Web 検索ツールデータの投入
  - 参照: [requirement.md セクション 6.2](requirement.md#62-openai-モデル料金一覧) Web Search / [セクション 6.3](requirement.md#63-anthropic-claude-モデル料金一覧) Web Search / [セクション 6.4](requirement.md#64-google-gemini-モデル料金一覧) Grounding（合計 4 件）
- [ ] 冪等性を確保する（既存データがあれば UPSERT する）
- **完了条件**: `npm run db:seed` でシードデータが Neon に投入され、全データが [requirement.md セクション 6.2〜6.4](requirement.md#62-openai-モデル料金一覧) の料金表と一致する

### 2-5. package.json にシードスクリプトを追加

- [ ] `"db:seed"` スクリプトを `package.json` に追加する（例: `"tsx src/lib/db/seed.ts"`）
- [ ] `"db:push"` スクリプトを `package.json` に追加する（例: `"drizzle-kit push"`）
- [ ] `"db:generate"` スクリプトを `package.json` に追加する（例: `"drizzle-kit generate"`）
- **完了条件**: `npm run db:seed`, `npm run db:push`, `npm run db:generate` がそれぞれ正常に動作する

---

## Phase 3: API

> 参照: [requirement.md セクション 7.2 構成方針](requirement.md#72-構成方針) — API 設計 / [セクション 8 非機能要件](requirement.md#8-非機能要件) — API 設計

### 3-1. マスターデータ取得 API の作成（`src/app/api/models/route.ts`）

> 参照: [requirement.md セクション 7.2](requirement.md#72-構成方針) — 「Next.js API Routes（Server Side）からマスターデータを取得。クライアントから直接 DB アクセスしない」

- [ ] GET `/api/models` エンドポイントを作成する
  - [ ] `providers` テーブルからプロバイダー一覧を取得する
  - [ ] `models` テーブルからテキスト生成モデル一覧を取得する（プロバイダー情報を結合）
  - [ ] `embedding_models` テーブルから Embedding モデル一覧を取得する（プロバイダー情報を結合）
  - [ ] `web_search_tools` テーブルから Web 検索ツール一覧を取得する（プロバイダー情報を結合）
- [ ] レスポンス型を定義し、型安全なレスポンスを返す
- [ ] エラーハンドリングを実装する（DB 接続エラー等）
- **完了条件**: `GET /api/models` にリクエストすると、全モデル・Embedding・Web 検索ツールのデータが JSON で返却される。レスポンスデータは [requirement.md セクション 6.2〜6.4](requirement.md#62-openai-モデル料金一覧) の全データを含む

### 3-2. クライアント側のデータフェッチ関数

- [ ] `src/lib/api.ts` (or similar) にマスターデータを取得するフェッチ関数を作成する
  - サーバーサイドの API Route を呼び出す形式にする
  - 返却値に適切な型を付与する
- **完了条件**: コンポーネントからフェッチ関数を呼び出すと、型付きのマスターデータが取得できる

---

## Phase 4: 型定義・定数

> 参照: [requirement.md セクション 2.3 デフォルト値](requirement.md#23-デフォルト値一覧ざっくりモード) / [セクション 5.1 トークン換算](requirement.md#51-トークン換算) / [セクション 3.1〜3.4 詳細算定モードの入力項目](requirement.md#31-基本設定必須) / [セクション 4 システムプロンプト推定ヘルパー](requirement.md#4-システムプロンプト文字数の推定ヘルパー)

### 4-1. 型定義の作成（`src/types/index.ts`）

- [ ] マスターデータの型を定義する
  - `Provider` 型（id, name）
  - `Model` 型（id, providerId, name, category, inputPrice, outputPrice, cacheWritePrice（nullable）, cacheReadPrice（nullable）, maxContextLength, isLegacy）
    - ※ Anthropic は Cache Write（書き込み時）と Cache Read（読み取り時）の 2 種類の料金がある。OpenAI/Google は cacheWritePrice を null とし、cacheReadPrice に Cached Input の値を設定する
  - `EmbeddingModel` 型（id, providerId, name, inputPrice, dimensions（nullable）, pricingTier（'online' | 'batch'））
    - ※ Google Embedding はオンライン/バッチで単価が異なるため pricingTier で区別する
  - `WebSearchTool` 型（id, providerId, name, pricePerKCalls, additionalPricingNotes）
  - 参照: [requirement.md セクション 6.1](requirement.md#61-管理するデータ項目) の管理データ項目 / [セクション 6.3](requirement.md#63-anthropic-claude-モデル料金一覧) Cache Write/Read / [セクション 6.4](requirement.md#64-google-gemini-モデル料金一覧) Embedding オンライン/バッチ
- [ ] ざっくり算定モードの入力型を定義する
  - `SimpleModeInput` 型 — 5 項目: モデル選択、日次リクエスト数、入力文字数プリセット、出力文字数プリセット、用途タイプ
  - 参照: [requirement.md セクション 2.1](requirement.md#21-ユーザー入力項目最小限)
- [ ] 詳細算定モードの入力型を定義する
  - `DetailedModeInput` 型 — 36 項目全て
  - 参照: [requirement.md セクション 3.1〜3.4](requirement.md#31-基本設定必須) の全入力項目
- [ ] 用途タイプのプリセット型を定義する
  - `UseCaseType` 型（simpleQA / knowledgeSearch / customerSupport / generalAssistant）
  - 参照: [requirement.md セクション 2.2](requirement.md#22-用途タイプ別プリセット)
- [ ] コスト計算結果の型を定義する
  - `CostResult` 型 — 日次コスト、月次コスト、各処理ステップの内訳、トークン数内訳
  - 参照: [requirement.md セクション 9](requirement.md#9-画面構成概要) の結果表示に必要な項目
- [ ] システムプロンプト推定ヘルパーの入力型を定義する
  - `SystemPromptEstimation` 型 — A1〜E4 の全 17 要素
  - 参照: [requirement.md セクション 4.1](requirement.md#41-システムプロンプトを構成する要素一覧) の全要素
- **完了条件**: すべての型に対して TypeScript の型チェックが通り、`any` / `unknown` を使用していない

### 4-2. デフォルト値定義（`src/lib/constants/defaults.ts`）

> 参照: [requirement.md セクション 2.3](requirement.md#23-デフォルト値一覧ざっくりモード) のデフォルト値一覧

- [ ] ざっくりモードのデフォルト値を定数として定義する
  - 主要言語: 日本語
  - 月の稼働日数: 20 日
  - システムプロンプト文字数: 2,000 文字
  - 1 セッションあたりの平均ターン数: 5 ターン
  - RAG 取得チャンク数: 5 件
  - RAG 1 チャンクあたりの文字数: 500 文字
  - 会話履歴の参照ターン数: 10 ターン
  - 会話履歴圧縮: なし
  - Web 検索取得件数: 3 件
  - 分類のフォールバック率: 20%
  - サブエージェント最大呼び出し回数: 2 回
  - Prompt Caching: なし
  - 安全マージン: 20%
  - 為替レート: 150 円/USD
- [ ] 用途タイプ別プリセットの定義
  - 参照: [requirement.md セクション 2.2](requirement.md#22-用途タイプ別プリセット) の 4 種類のプリセット
  - シンプル Q&A: RAG=OFF, 履歴=OFF, Web=OFF, 分類=OFF
  - 社内ナレッジ検索: RAG=ON, 履歴=OFF, Web=OFF, 分類=OFF
  - カスタマーサポート: RAG=ON, 履歴=ON, Web=OFF, 分類=ON, オーケストレータ=ON
  - 汎用 AI アシスタント: RAG=ON, 履歴=ON, Web=ON, 分類=ON, オーケストレータ=ON
- [ ] 入力文字数プリセットの定義
  - 参照: [requirement.md セクション 2.1](requirement.md#21-ユーザー入力項目最小限) の #3, #4
  - ユーザー入力: 短文（200 文字）/ 中文（1,000 文字）/ 長文（3,000 文字）
  - 出力: 短文（500 文字）/ 中文（1,500 文字）/ 長文（3,000 文字）
- **完了条件**: [requirement.md セクション 2.3](requirement.md#23-デフォルト値一覧ざっくりモード) の全 14 項目のデフォルト値が定数として定義されている

### 4-3. トークン換算係数の定義（`src/lib/constants/defaults.ts` 内）

> 参照: [requirement.md セクション 5.1](requirement.md#51-トークン換算) のトークン換算テーブル

- [ ] 言語別トークン換算係数を定数として定義する
  - 日本語: 1.5 トークン/文字（保守的な値を採用）
  - 英語: 0.25 トークン/文字
  - 混在: 0.7 トークン/文字
- **完了条件**: 3 言語の換算係数が定義され、[requirement.md セクション 5.1](requirement.md#51-トークン換算) の表と一致する

### 4-4. システムプロンプト推定ヘルパーの定数定義（`src/lib/constants/defaults.ts` 内）

> 参照: [requirement.md セクション 4.1](requirement.md#41-システムプロンプトを構成する要素一覧) の全 5 カテゴリ・17 要素

- [ ] A. 行動制約・ガードレール系（A1〜A5）の文字数マッピングを定義する
- [ ] B. ナレッジ・ドメイン系（B1〜B3）の文字数マッピングを定義する
- [ ] C. 入出力制御系（C1〜C5）の文字数マッピングを定義する
- [ ] D. ツール・外部連携系（D1〜D3）の文字数マッピングを定義する
- [ ] E. コンテキスト・セッション系（E1〜E4）の文字数マッピングを定義する
- [ ] ベース文字数（200 文字）を定義する
  - 参照: [requirement.md セクション 4.2](requirement.md#42-推定ロジック) の推定式
- **完了条件**: 全 17 要素のマッピングが定義され、各要素の選択肢（少/中/多 等）に対応する文字数が [requirement.md セクション 4.1](requirement.md#41-システムプロンプトを構成する要素一覧) の表と一致する

---

## Phase 5: コスト計算ロジック

> 参照: [requirement.md セクション 5 コスト計算ロジック概要](requirement.md#5-コスト計算ロジック概要)

### 5-1. トークン換算関数の実装（`src/lib/calculation/cost-calculator.ts`）

> 参照: [requirement.md セクション 5.1](requirement.md#51-トークン換算)

- [ ] 文字数 + 言語 → トークン数 に変換する関数を実装する
  - 入力: 文字数（number）、言語（'ja' | 'en' | 'mixed'）
  - 出力: トークン数（number）
- **完了条件**: 日本語 1,000 文字 → 1,500 トークン、英語 1,000 文字 → 250 トークン、混在 1,000 文字 → 700 トークンが返される

### 5-2. 各処理ステップのコスト計算関数の実装

> 参照: [requirement.md セクション 5.2](requirement.md#52-1-リクエストあたりの処理フローと-api-呼び出し) の処理フロー図

- [ ] トピック分類コスト計算関数
  - セマンティック分類: Embedding API 呼び出し 1 回分のコスト
  - LLM フォールバック: フォールバック率に応じた LLM 呼び出しコスト
  - 参照: [requirement.md セクション 5.2](requirement.md#52-1-リクエストあたりの処理フローと-api-呼び出し) — トピック分類の分岐
- [ ] オーケストレータコスト計算関数
  - ルーティング判断用の LLM 呼び出し 1 回分のコスト
  - 参照: [requirement.md セクション 5.2](requirement.md#52-1-リクエストあたりの処理フローと-api-呼び出し) — オーケストレータの分岐
- [ ] RAG コスト計算関数
  - Embedding API 呼び出し 1 回分（クエリ埋め込み）
  - リランキング有効時の LLM 呼び出し 1 回分
  - RAG チャンク分のインプットトークン増加コスト（チャンク数 x チャンクサイズ x トークン換算係数）
  - 参照: [requirement.md セクション 5.2](requirement.md#52-1-リクエストあたりの処理フローと-api-呼び出し) — RAG の分岐
- [ ] Web 参照コスト計算関数
  - Web 検索 API 呼び出しコスト（回数 x 単価）
  - 要約処理有効時の LLM 呼び出しコスト
  - 検索結果分のインプットトークン増加コスト
  - 参照: [requirement.md セクション 5.2](requirement.md#52-1-リクエストあたりの処理フローと-api-呼び出し) — Web 参照の分岐
- [ ] 会話履歴参照コスト計算関数
  - 参照: [requirement.md セクション 5.4](requirement.md#54-会話履歴によるコスト増大の考慮)
  - 平均インプットトークン増分 = (最大参照ターン数 / 2) x (入力文字数 + 出力文字数) x トークン換算係数
- [ ] メインエージェント応答コスト計算関数
  - インプット = システムプロンプト + 会話履歴 + RAG チャンク + Web 結果 + ユーザー入力 のトークン数
  - アウトプット = 出力文字数のトークン数
  - 参照: [requirement.md セクション 5.2](requirement.md#52-1-リクエストあたりの処理フローと-api-呼び出し) — メインエージェント応答生成
- [ ] サブエージェントコスト計算関数
  - 最大呼び出し回数分の LLM 呼び出しコスト
  - 参照: [requirement.md セクション 5.2](requirement.md#52-1-リクエストあたりの処理フローと-api-呼び出し) — サブエージェントの分岐
- [ ] 会話履歴圧縮コスト計算関数
  - 圧縮頻度に応じた LLM 呼び出しコスト（1 / 圧縮頻度 の確率で発生）
  - 参照: [requirement.md セクション 5.2](requirement.md#52-1-リクエストあたりの処理フローと-api-呼び出し) — 会話履歴圧縮の分岐
- **完了条件**: 各処理ステップが独立した関数として実装され、有効/無効の切り替えに応じて正しいコストを返す

### 5-3. 1 リクエストあたりのコスト統合計算関数

> 参照: [requirement.md セクション 5.3](requirement.md#53-コスト算出式概要) のコスト算出式

- [ ] 全処理ステップのコストを合算する関数を実装する
  - 入力: ユーザーが設定した全パラメータ + 使用モデルの料金情報
  - 出力: 1 リクエストあたりの合計コスト + 各ステップの内訳
- [ ] Prompt Caching 適用ロジックの実装
  - Prompt Caching OFF 時: 全インプットトークンに通常の Input 単価を適用する
  - Prompt Caching ON 時: システムプロンプト部分のトークンに **Cache Read 単価**（`cacheReadPrice`）を適用する。それ以外のインプットトークン（ユーザー入力、会話履歴、RAG チャンク、Web 結果等）には通常の Input 単価を適用する
  - Cache Write コストは計算に含めない（TTL ごとに 1 回のみ発生し、全体の 0.1% 未満のため無視可能）
  - OpenAI/Google: `cacheReadPrice`（= Cached Input 単価）を使用
  - Anthropic: `cacheReadPrice`（= Cache Read 単価）を使用。`cacheWritePrice` は計算に含めない
  - 参照: [requirement.md セクション 5.5](requirement.md#55-prompt-caching-計算ポリシー) — Prompt Caching 計算ポリシー / [セクション 3.4](requirement.md#34-コスト調整) — #33 Prompt Caching
- [ ] 200K tokens 超過時の割増料金適用ロジックの実装
  - 1 リクエストあたりの推定インプットトークン数（システムプロンプト + ユーザー入力 + 会話履歴 + RAG チャンク + Web 結果）を算出する
  - 推定インプットトークン数が 200,000 を超える場合:
    - Anthropic: Input 単価を 2 倍、Output 単価を 2 倍に適用（保守的に最大倍率を採用）
    - Google（Gemini 2.5 以降）: Input 単価を 2 倍、Output 単価を 2 倍に適用
    - OpenAI: 変更なし（コンテキスト長上限を超えた場合は警告表示のみ）
  - 参照: [requirement.md セクション 5.6](requirement.md#56-長文コンテキスト200k-tokens-超過の計算ポリシー) — 長文コンテキスト計算ポリシー
- [ ] 無料枠の非考慮ポリシーの実装
  - Web 検索ツールの無料枠は計算に含めず、全クエリに課金単価を適用する
  - 参照: [requirement.md セクション 5.7](requirement.md#57-無料枠の計算ポリシー) — 無料枠計算ポリシー
- **完了条件**: 任意のパラメータを渡すと、1 リクエストあたりの合計コストと内訳が返される。200K tokens 超過時に Anthropic/Google の割増料金が正しく適用される。無料枠は計算に含まれていない

### 5-4. 月額コスト算出関数

> 参照: [requirement.md セクション 5.3](requirement.md#53-コスト算出式概要) の月額コスト算出式

- [ ] 月額コスト = 日次コスト x 月の稼働日数 x (1 + 安全マージン率) を計算する関数を実装する
  - 入力: 1 リクエストあたりのコスト、1 日あたりのリクエスト数、月の稼働日数、安全マージン率
  - 出力: 日次コスト、月次コスト（USD）、月次コスト（JPY、為替レート適用後）
- **完了条件**: `月額コスト = 日次コスト x 稼働日数 x (1 + 安全マージン率)` の計算が正しく行われ、USD/JPY 両方の値が返される

### 5-5. システムプロンプト推定ヘルパーの計算関数

> 参照: [requirement.md セクション 4.2](requirement.md#42-推定ロジック) の推定ロジック

- [ ] 各要素の選択値を受け取り、推定システムプロンプト文字数を算出する関数を実装する
  - 推定文字数 = ベース文字数（200 文字）+ Σ 各要素の文字数
  - 入力: A1〜E4 の全 17 要素の選択値
  - 出力: 推定文字数（number）
- **完了条件**: [requirement.md セクション 4.1](requirement.md#41-システムプロンプトを構成する要素一覧) の全要素で最大値を選択した場合に、正しい合計値が返される

### 5-6. ざっくりモード用のコスト計算ラッパー関数

> 参照: [requirement.md セクション 2](requirement.md#2-ざっくり算定モード) 全体

- [ ] SimpleModeInput を受け取り、デフォルト値とプリセットを適用して DetailedModeInput に変換する関数を実装する
  - 用途タイプに応じてプリセットを適用する（参照: [requirement.md セクション 2.2](requirement.md#22-用途タイプ別プリセット)）
  - 残りのパラメータにデフォルト値を適用する（参照: [requirement.md セクション 2.3](requirement.md#23-デフォルト値一覧ざっくりモード)）
- [ ] 変換後の DetailedModeInput を 5-3 / 5-4 の関数に渡してコストを算出する
- **完了条件**: ざっくりモードの 5 項目の入力のみで月額コストが算出される

---

## Phase 6: UI コンポーネント

> 参照: [requirement.md セクション 9 画面構成](requirement.md#9-画面構成概要) / [セクション 2 ざっくり算定モード](requirement.md#2-ざっくり算定モード) / [セクション 3 詳細算定モード](requirement.md#3-詳細算定モード) / [セクション 4 推定ヘルパー](requirement.md#4-システムプロンプト文字数の推定ヘルパー)

### 6-1. shadcn/ui コンポーネントの導入

- [ ] 使用する shadcn/ui コンポーネントをインストールする
  - Button, Card, Input, Label, Select, Slider, Switch (Toggle), Tabs, Tooltip, Dialog/Sheet（推定ヘルパー用）
- **完了条件**: 上記コンポーネントが `src/components/ui/` 配下に存在し、インポート可能である

### 6-2. レイアウト（`src/app/layout.tsx`）

- [ ] アプリケーション全体のレイアウトを作成する
  - ヘッダー（アプリ名: 「LLM コスト算出ツール」等）
  - メインコンテンツ領域
  - フッター
  - 参照: [requirement.md セクション 8](requirement.md#8-非機能要件) — レスポンシブ対応
- [ ] メタデータ（title, description）を設定する
- **完了条件**: レイアウトが PC・タブレット・スマートフォンで崩れずに表示される

### 6-3. メインページ（`src/app/page.tsx`）

> 参照: [requirement.md セクション 9](requirement.md#9-画面構成概要) — #1 モード選択

- [ ] API Route（`/api/models`）経由でクライアントサイドからマスターデータを取得する処理を実装する
  - ※ 要件に基づき、マスターデータ取得は API Routes 経由、コスト計算処理はクライアントサイドで実行する
  - 参照: [requirement.md セクション 7.2](requirement.md#72-構成方針) — 「サーバーサイドでマスターデータ取得 → クライアントサイドで計算処理」
  - Client Component として実装し、`useEffect` 等でマスターデータをフェッチする
- [ ] ざっくり算定 / 詳細算定のモード切り替え UI（タブまたはトグル）を実装する
- [ ] 選択されたモードに応じたフォームコンポーネントを表示する
- [ ] 計算結果コンポーネントを表示する（計算処理はクライアントサイドで実行する）
- **完了条件**: タブ切り替えで 2 つのモードが切り替わり、それぞれのフォームが表示される。DB への直接アクセスがクライアントコンポーネントから行われていないこと

### 6-4. ざっくり算定モードフォーム（`src/components/SimpleMode.tsx`）

> 参照: [requirement.md セクション 2.1](requirement.md#21-ユーザー入力項目最小限) の 5 入力項目

- [ ] 使用モデルのセレクトボックスを実装する（マスターデータから動的に生成）
  - プロバイダー別にグループ化して表示する
  - 参照: [requirement.md セクション 2.1](requirement.md#21-ユーザー入力項目最小限) #1
- [ ] 1 日あたりのリクエスト数の数値入力を実装する
  - 参照: [requirement.md セクション 2.1](requirement.md#21-ユーザー入力項目最小限) #2
- [ ] 1 回あたりのユーザー入力文字数のプリセット選択を実装する
  - 短文（〜200 文字）/ 中文（〜1,000 文字）/ 長文（〜3,000 文字）
  - 参照: [requirement.md セクション 2.1](requirement.md#21-ユーザー入力項目最小限) #3
- [ ] 1 回あたりの出力文字数のプリセット選択を実装する
  - 短文（〜500 文字）/ 中文（〜1,500 文字）/ 長文（〜3,000 文字）
  - 参照: [requirement.md セクション 2.1](requirement.md#21-ユーザー入力項目最小限) #4
- [ ] 用途タイプのセレクトボックスを実装する
  - シンプル Q&A / 社内ナレッジ検索 / カスタマーサポート / 汎用 AI アシスタント
  - 選択時に適用されるオプション構成を表示する
  - 参照: [requirement.md セクション 2.1](requirement.md#21-ユーザー入力項目最小限) #5 + [セクション 2.2](requirement.md#22-用途タイプ別プリセット)
- [ ] React Hook Form + Zod でフォームバリデーションを実装する
- [ ] 「算出する」ボタンを実装する（クリックで計算処理を実行）
- **完了条件**: 5 項目すべてが入力可能で、バリデーションが動作し、計算処理が実行される

### 6-5. 詳細算定モードフォーム（`src/components/DetailedMode.tsx`）

> 参照: [requirement.md セクション 3.1〜3.4](requirement.md#31-基本設定必須) の全 36 入力項目

- [ ] 基本設定セクション（#1〜#8）を実装する
  - 参照: [requirement.md セクション 3.1](requirement.md#31-基本設定必須)
  - [ ] 使用モデルのセレクトボックス（マスターデータから動的生成）
  - [ ] 1 日あたりの最大リクエスト数（数値入力）
  - [ ] 月の稼働日数（数値入力、デフォルト 20）
  - [ ] 1 回あたりのユーザー入力最大文字数（数値入力）
  - [ ] 1 回あたりの出力最大文字数（数値入力）
  - [ ] 主要言語（セレクトボックス: 日本語/英語/混在）
  - [ ] システムプロンプトの文字数（数値入力 + 推定ヘルパー起動ボタン）
  - [ ] 1 セッションあたりの平均ターン数（数値入力）
- [ ] マルチエージェント構成セクション（#9〜#15）を実装する
  - 参照: [requirement.md セクション 3.2](requirement.md#32-マルチエージェント構成)
  - [ ] トピック分類の有無（トグル）
  - [ ] セマンティック分類のフォールバック率（スライダー %、トピック分類 ON 時のみ表示）
  - [ ] 分類用モデル（セレクトボックス、トピック分類 ON 時のみ表示）
  - [ ] オーケストレータの有無（トグル）
  - [ ] オーケストレータ用モデル（セレクトボックス、オーケストレータ ON 時のみ表示）
  - [ ] サブエージェント最大呼び出し回数（数値入力）
  - [ ] サブエージェント用モデル（セレクトボックス）
- [ ] RAG セクション（#16〜#21）を実装する
  - 参照: [requirement.md セクション 3.3.1](requirement.md#331-ragretrieval-augmented-generation)
  - [ ] RAG の有無（トグル）
  - [ ] 取得チャンク数（数値入力、RAG ON 時のみ表示）
  - [ ] 1 チャンクあたりの平均文字数（数値入力、RAG ON 時のみ表示）
  - [ ] Embedding モデル（セレクトボックス、RAG ON 時のみ表示。マスターデータから動的生成）
  - [ ] リランキングの有無（トグル、RAG ON 時のみ表示）
  - [ ] リランキング用モデル（セレクトボックス、リランキング ON 時のみ表示）
- [ ] 会話履歴参照セクション（#22〜#26）を実装する
  - 参照: [requirement.md セクション 3.3.2](requirement.md#332-会話履歴参照)
  - [ ] 会話履歴参照の有無（トグル）
  - [ ] 参照する最大ターン数（数値入力、履歴 ON 時のみ表示）
  - [ ] 会話履歴圧縮の有無（トグル、履歴 ON 時のみ表示）
  - [ ] 圧縮頻度（数値入力、圧縮 ON 時のみ表示）
  - [ ] 圧縮用モデル（セレクトボックス、圧縮 ON 時のみ表示）
- [ ] Web 参照セクション（#27〜#32）を実装する
  - 参照: [requirement.md セクション 3.3.3](requirement.md#333-web-参照)
  - [ ] Web 参照の有無（トグル）
  - [ ] Web 検索 API の種類（セレクトボックス、Web ON 時のみ表示。マスターデータから動的生成）
  - [ ] 1 リクエストあたりの検索回数（数値入力、Web ON 時のみ表示）
  - [ ] 検索結果の取得件数（数値入力、Web ON 時のみ表示）
  - [ ] 検索結果の要約処理の有無（トグル、Web ON 時のみ表示）
  - [ ] 要約用モデル（セレクトボックス、要約 ON 時のみ表示）
- [ ] コスト調整セクション（#33〜#36）を実装する
  - 参照: [requirement.md セクション 3.4](requirement.md#34-コスト調整)
  - [ ] Prompt Caching の利用有無（トグル）
  - [ ] 安全マージン（スライダー %、デフォルト 20%）
  - [ ] 表示通貨（セレクトボックス: USD / JPY）
  - [ ] 為替レート（数値入力、JPY 選択時のみ表示、デフォルト 150）
- [ ] React Hook Form + Zod でフォームバリデーションを実装する（全 36 項目）
- [ ] トグルの ON/OFF に連動したサブ項目の表示/非表示制御を実装する
- [ ] 「算出する」ボタンを実装する
- **完了条件**: 全 36 項目が入力可能で、トグルの ON/OFF に連動してサブ項目が表示/非表示され、バリデーションが動作し、計算処理が実行される

### 6-6. システムプロンプト推定ヘルパー UI

> 参照: [requirement.md セクション 4](requirement.md#4-システムプロンプト文字数の推定ヘルパー) 全体

- [ ] ダイアログ（Dialog/Sheet）形式の推定ヘルパー UI を実装する
  - 詳細算定モードの「システムプロンプトの文字数」入力欄の横にヘルパー起動ボタンを配置する
- [ ] A. 行動制約・ガードレール系（A1〜A5）のフォームを実装する
  - 各要素の規模感（少/中/多 等）を選択するセレクトボックスまたはラジオボタン
  - 参照: [requirement.md セクション 4.1 A](requirement.md#a-行動制約ガードレール系)
- [ ] B. ナレッジ・ドメイン系（B1〜B3）のフォームを実装する
  - 参照: [requirement.md セクション 4.1 B](requirement.md#b-ナレッジドメイン系)
- [ ] C. 入出力制御系（C1〜C5）のフォームを実装する
  - 参照: [requirement.md セクション 4.1 C](requirement.md#c-入出力制御系)
- [ ] D. ツール・外部連携系（D1〜D3）のフォームを実装する
  - 参照: [requirement.md セクション 4.1 D](requirement.md#d-ツール外部連携系)
- [ ] E. コンテキスト・セッション系（E1〜E4）のフォームを実装する
  - 参照: [requirement.md セクション 4.1 E](requirement.md#e-コンテキストセッション系)
- [ ] リアルタイムで推定文字数を表示する機能を実装する
  - 要素の選択が変わるたびに合計文字数を再計算して表示する
- [ ] 「この値を適用」ボタンで推定文字数をシステムプロンプト文字数入力欄に反映する
- **完了条件**: 17 要素すべてが選択可能で、リアルタイムに推定文字数が表示され、適用ボタンで入力欄に反映される

### 6-7. コスト結果表示コンポーネント（`src/components/CostResult.tsx`）

> 参照: [requirement.md セクション 9](requirement.md#9-画面構成概要) の結果表示要件

- [ ] 月額コストの表示（大きく目立つように）
  - USD 表示と JPY 表示の切り替え
  - 参照: [requirement.md セクション 9](requirement.md#9-画面構成概要) — USD / JPY の切り替え表示
- [ ] 日次コストの表示
  - 参照: [requirement.md セクション 9](requirement.md#9-画面構成概要) — 日次・月次のコスト表示
- [ ] 各処理ステップごとのコスト内訳テーブルを表示する
  - トピック分類、オーケストレータ、RAG、Web 参照、会話履歴、メインエージェント、サブエージェント、圧縮 の各ステップ
  - 参照: [requirement.md セクション 9](requirement.md#9-画面構成概要) — 各処理ステップごとのコスト内訳
- [ ] インプット/アウトプットトークン数の内訳を表示する
  - 参照: [requirement.md セクション 9](requirement.md#9-画面構成概要) — インプット/アウトプットトークン数の内訳
- [ ] コスト内訳の円グラフまたは棒グラフを Recharts で実装する
  - 参照: [requirement.md セクション 9](requirement.md#9-画面構成概要) — コスト内訳のグラフ可視化
  - 参照: [requirement.md セクション 7.1](requirement.md#71-技術スタック) — Recharts
- [ ] 安全マージン適用前/後の比較表示を実装する
- **完了条件**: 計算実行後に月額/日次コスト、内訳テーブル、トークン数内訳、グラフがすべて表示される

---

## Phase 7: 非機能要件

> 参照: [requirement.md セクション 8 非機能要件](requirement.md#8-非機能要件)

### 7-1. レスポンシブ対応

> 参照: [requirement.md セクション 8](requirement.md#8-非機能要件) — 「PC・タブレット・スマートフォンで閲覧可能」

- [ ] PC（1280px 以上）でのレイアウトを確認・調整する
- [ ] タブレット（768px〜1279px）でのレイアウトを確認・調整する
- [ ] スマートフォン（〜767px）でのレイアウトを確認・調整する
  - フォーム入力項目が縦積みになり操作しやすいこと
  - グラフがスマートフォン幅に収まること
- **完了条件**: 上記 3 ブレークポイントすべてでレイアウトが崩れず、操作可能である

### 7-2. アクセシビリティ（WCAG 2.2 準拠）

> 参照: [requirement.md セクション 8](requirement.md#8-非機能要件) — 「WCAG 2.2 準拠」

- [ ] すべてのフォーム要素に適切なラベル（`<label>`）が紐づいていることを確認する
- [ ] 色のコントラスト比が WCAG 2.2 AA 基準（4.5:1 以上）を満たしていることを確認する
- [ ] キーボードのみで全操作が可能であることを確認する（Tab, Enter, Space, Arrow keys）
- [ ] スクリーンリーダーで主要な操作フローが読み上げられることを確認する
- [ ] フォーカスインジケーターが視認可能であることを確認する
- **完了条件**: 上記すべてのチェック項目を満たし、コンソールにアクセシビリティ関連の警告が出ていない

### 7-3. ブラウザ対応

> 参照: [requirement.md セクション 8](requirement.md#8-非機能要件) — 「モダンブラウザ（Chrome, Firefox, Safari, Edge 最新版）」

- [ ] Chrome 最新版で動作確認する
- [ ] Firefox 最新版で動作確認する
- [ ] Safari 最新版で動作確認する
- [ ] Edge 最新版で動作確認する
- **完了条件**: 上記 4 ブラウザすべてで表示崩れ・機能不全がない

---

## Phase 8: ビルド・デプロイ

> 参照: [requirement.md セクション 7.1](requirement.md#71-技術スタック) — Vercel / [セクション 7.2](requirement.md#72-構成方針)

### 8-1. ビルド確認

- [ ] `npm run build` がエラーなく完了することを確認する
- [ ] TypeScript の型エラーが 0 件であることを確認する
- [ ] リンターエラーが 0 件であることを確認する
- **完了条件**: `npm run build` が exit code 0 で完了する

### 8-2. Vercel デプロイ設定

- [ ] Vercel にプロジェクトを接続する
- [ ] 環境変数 `DATABASE_URL` を Vercel の Environment Variables に設定する
- [ ] デプロイが成功することを確認する
- **完了条件**: Vercel 上でアプリケーションが正常に動作し、全機能が使用可能である

### 8-3. 本番環境での最終動作確認

- [ ] ざっくり算定モードで全用途タイプ（4 種類）のコスト算出が正常に動作することを確認する
  - 参照: [requirement.md セクション 2.2](requirement.md#22-用途タイプ別プリセット) の 4 種類
- [ ] 詳細算定モードで全オプション ON のコスト算出が正常に動作することを確認する
  - 参照: [requirement.md セクション 3](requirement.md#3-詳細算定モード) の全パラメータ
- [ ] 詳細算定モードで全オプション OFF のコスト算出が正常に動作することを確認する
- [ ] システムプロンプト推定ヘルパーが正常に動作することを確認する
  - 参照: [requirement.md セクション 4](requirement.md#4-システムプロンプト文字数の推定ヘルパー)
- [ ] USD / JPY の通貨切り替えが正常に動作することを確認する
- [ ] グラフが正常に描画されることを確認する
- [ ] レスポンシブ表示が正常であることを確認する（PC / タブレット / スマートフォン）
- [ ] コンソールにエラーが出ていないことを確認する
- [ ] 算出結果が DB やストレージに永続化されていないことを確認する
  - DB に算出結果を保存するテーブルやカラムが存在しないこと
  - API Route に算出結果を POST/PUT するエンドポイントが存在しないこと
  - 参照: [requirement.md セクション 7.2](requirement.md#72-構成方針) — 「算出履歴の保存: 不要」 / [セクション 8](requirement.md#8-非機能要件) — 「算出結果は保存しない」
- [ ] 認証機能が存在しないことを確認する
  - ログイン画面・認証ダイアログが存在しないこと
  - 認証ミドルウェア（`middleware.ts` 等）が存在しないこと
  - 認証なしで全機能が使用可能であること
  - 参照: [requirement.md セクション 7.2](requirement.md#72-構成方針) — 「認証: 不要」
- [ ] 管理画面が存在しないことを確認する
  - `/admin`, `/dashboard`, `/settings` 等の管理画面パスが存在しないこと（404 が返されること）
  - 参照: [requirement.md セクション 7.2](requirement.md#72-構成方針) — 「管理画面: 不要」

### 8-4. 上限値算定の保証検証

> 参照: [requirement.md セクション 1.1](requirement.md#11-目的) — 「最大でこれくらいになる（これ以上にはならない）」
> 参照: [docs/e2e-test-scenarios.md セクション K](e2e-test-scenarios.md#k-上限値算定の保証)

- [ ] Prompt Caching ON が必ずコスト削減方向に作用することを確認する
  - 同一条件で Prompt Caching OFF → ON に切り替え、ON 時のコストが OFF 時以下であること
  - 参照: [requirement.md セクション 5.5](requirement.md#55-prompt-caching-計算ポリシー)
- [ ] 会話履歴ターン数の増加がコスト増加方向に作用することを確認する
  - 最大ターン数を 5 → 10 → 20 に変更し、コストが単調増加すること
  - 参照: [requirement.md セクション 5.4](requirement.md#54-会話履歴によるコスト増大の考慮)
- [ ] オプション追加がコスト増加方向に作用することを確認する
  - 全 OFF → RAG ON → 履歴 ON → Web ON → 分類 ON → オーケストレータ ON の順にオプションを追加し、各ステップでコストが増加（または同額以上）であること
- [ ] 安全マージン増加がコスト増加方向に作用することを確認する
  - 安全マージンを 0% → 20% → 50% に変更し、コストが単調増加すること
- [ ] 200K tokens 超過時に割増料金が正しく適用されることを確認する
  - Anthropic/Google モデルで推定インプットトークンが 200K を超える条件を設定し、割増料金が適用されることを確認する
  - 参照: [requirement.md セクション 5.6](requirement.md#56-長文コンテキスト200k-tokens-超過の計算ポリシー)
- **完了条件**: 上記すべての単調性・方向性テストをパスし、計算結果が上限値として妥当であること
