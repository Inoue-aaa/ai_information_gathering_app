# AIニュースダッシュボード MVP

Next.js App Router + TypeScript + Tailwind CSS で作る、日本語UIの AI ニュース収集アプリです。

## セットアップ

```bash
npm install
npm run dev
```

`.env.local` を作成し、Gemini 要約を使う場合は以下を設定します。

```bash
GEMINI_API_KEY=your_gemini_api_key_here
```

ブラウザで `http://localhost:3000` を開くと、以下の3タブで記事を確認できます。

- 注目記事
- 公式情報
- 保存済み

## 収集方針

- 注目記事: Hacker News の `topstories` / `newstories` を使い、AI関連キーワードで抽出
- 公式情報: OpenAI / Anthropic / Google / Meta の公式ページを provider ごとの adapter で取得
- 保存 / 既読: `localStorage`

## localStorage キー

- `ai-news:saved`
- `ai-news:read`
- `ai-news:savedSnapshots`
- `ai-news:summaries`

## 要約機能

- 各記事カードの「要約する」を押した時だけ Gemini API で要約を生成
- APIキーはサーバー側の `GEMINI_API_KEY` を使用
- 生成結果は `localStorage` に保存し、再表示時はキャッシュを優先
- 初期モデルは `gemini-2.5-flash-lite`

## 将来の拡張ポイント

- `lib/services/feed-service.ts`
  - リクエスト時取得を、共有キャッシュ参照 + stale fallback に差し替えやすい入口です
- `lib/config/summary.ts`
  - 要約モデルを `gemini-2.5-flash` などへ差し替える入口です
- `lib/services/summarize-article.ts`
  - 要約プロンプトや Gemini 呼び出し方式を調整する責務を集約しています
- `lib/sources/official/create-official-source-adapter.ts`
  - provider追加や、RSS/HTML取得戦略の差し替えポイントです
- `app/api/feed/route.ts`
  - 後で Cron や Blob/KV とつなぐ際も Route Handler は薄いまま維持できます
