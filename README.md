# 灯りの四人

夜のギルドに、四人の旅を紙芝居で残すサイトです。閲覧は誰でもできます。新しい旅を始めるのは、`@engawa.jp` と `@fledge-inc.com` の Google アカウントだけです。

本番: https://lantern.engawa5656.com

## 流れ

1. 十二人から四人を引く。
2. 場所と敵をその場で作り、敵のスケッチを描く。
3. 8枚の紙芝居を文章・絵・読み上げで作る。結末は成功です。
4. ギルドの掲示板に依頼メモとして残る。

紙芝居は読み上げが終わると次の絵へ進み、前の絵は右へ抜けます。BGM は掲示板、生成中、物語で曲が変わります。

## 手元で動かす

```sh
npm install
cp .env.example .env
npm run dev
```

`.env` に `OPENAI_API_KEY` を書いてください。`VITE_API_BASE` が空なら、生成ジョブは手元のメモリとディスクで回ります。

## 環境変数

名前は [`.env.example`](.env.example) にあります。キーやパスワードはリポジトリに入れません。

| 変数 | 用途 |
| --- | --- |
| `OPENAI_API_KEY` | 物語、場所、敵、絵、読み上げ |
| `VITE_API_BASE` | フロントが叩く API |
| `VITE_COGNITO_DOMAIN` / `VITE_COGNITO_CLIENT_ID` | Google ログイン |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | Cognito の Google 連携 |
| `SUNO_API_KEY` | BGM を API で作るときだけ |

## 生成に使うモデル

| もの | モデル |
| --- | --- |
| 物語の文章 | `gpt-6-astra` |
| 場所と敵 | `gpt-4o-mini` |
| 場面絵・敵スケッチ・肖像 | `gpt-image-1`（JPEG） |
| 読み上げ | `gpt-4o-mini-tts` |

## スクリプト

```sh
npm run dev                 # 開発サーバ
npm run build               # サイトを dist/web へ
npm run generate:portraits  # 冒険者の肖像を描き直す
npm run generate:enemies    # 見本の敵スケッチを描き直す
npm run compress:cards      # 既存のカード PNG を JPEG にする
npm run compress:enemies    # 既存の敵 PNG を JPEG にする
npm run compress:scenes     # S3 上の場面 PNG を JPEG にする
npm run suno:bgm            # BGM の Style / Exclude を表示する
npm run deploy:lantern      # サイトを本番へ
npm run deploy:api          # API を本番へ
```

BGM の曲名と Style は [`data/suno-bgm.json`](data/suno-bgm.json) です。できた MP3 は `public/bgm/` に置きます。

## 本番

- サイトは CloudFront。`npm run deploy:lantern`
- API は API Gateway と Lambda。`npm run deploy:api`
- 冒険の絵と JSON は S3 に置きます。

許可ドメインは [`src/guild.ts`](src/guild.ts) の `GUILD_DOMAINS` です。
