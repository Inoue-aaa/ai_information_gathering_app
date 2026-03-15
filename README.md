# AIニュースダッシュボード MVP

Next.js App Router + TypeScript + Tailwind CSS で作る、日本語UIの AI ニュース収集アプリです。

## セットアップ

```bash
npm install
npm run dev
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

## 将来の拡張ポイント

- `lib/services/feed-service.ts`
  - リクエスト時取得を、共有キャッシュ参照 + stale fallback に差し替えやすい入口です
- `lib/sources/official/create-official-source-adapter.ts`
  - provider追加や、RSS/HTML取得戦略の差し替えポイントです
- `app/api/feed/route.ts`
  - 後で Cron や Blob/KV とつなぐ際も Route Handler は薄いまま維持できます
