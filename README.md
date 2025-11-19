![WhoisP logo](public/logo.svg)

# WhoisP

WhoisPは、Google Gemini APIを活用した高度な調査・リサーチアプリケーションです。ユーザーが調査クエリを入力すると、AIが自動的に複数ステップの調査計画を立案し、ウェブ検索を実行して根拠のある情報を収集し、最終的に包括的なレポートを生成します。

## 主な機能

- 🔍 **AI駆動の調査計画**: 複雑な質問を複数の調査ステップに自動分解
- 🌐 **リアルタイムWeb検索**: Gemini Grounding機能による最新情報の取得
- 📊 **構造化されたレポート**: 引用付きの証拠とともに整理された調査結果
- 🖼️ **人物画像検索**: Google Custom SearchとWikimedia Commonsからの画像取得
- 📄 **Word形式でエクスポート**: 調査結果をMicrosoft Word形式で保存
- 🌏 **多言語対応**: 英語と日本語をサポート
- ⚡ **ストリーミングレスポンス**: リアルタイムで調査進捗を表示

## 必要な環境

### システム要件

- **Node.js**: バージョン 20.12 以降
- **npm**: Node.jsに同梱（バージョン 9.x 以降推奨）
- **OS**: macOS, Linux, Windows

### 確認方法

ターミナルで以下のコマンドを実行して、バージョンを確認できます：

```bash
node --version  # v20.12.0 以降であることを確認
npm --version   # v9.0.0 以降であることを確認
```

## インストール手順

### 1. リポジトリのクローン

```bash
git clone https://github.com/yourusername/whoisp.git
cd whoisp
```

### 2. 依存関係のインストール

プロジェクトディレクトリで以下を実行：

```bash
npm install
```

インストールが完了するまで数分かかる場合があります。

### 3. 環境変数の設定

#### 3-1. 設定ファイルの作成

プロジェクトルートに `.env.local` ファイルを作成します：

```bash
cp .env.local.example .env.local
```

または、手動で `.env.local` ファイルを作成してください。

#### 3-2. APIキーの取得

WhoisPを使用するには、最低限以下のAPIキーが必要です：

##### **Google Gemini APIキー（必須）**

1. [Google AI Studio](https://makersuite.google.com/app/apikey) にアクセス
2. Googleアカウントでログイン
3. 「APIキーを取得」をクリック
4. 生成されたAPIキーをコピー

または、Google Cloud Platformを使用する場合：

1. [Google Cloud Console](https://console.cloud.google.com/) にアクセス
2. プロジェクトを作成または選択
3. 「APIとサービス」→「認証情報」に移動
4. 「認証情報を作成」→「APIキー」を選択
5. Gemini APIを有効化

##### **Google Custom Search API（画像検索用・オプション）**

人物画像検索機能を使用する場合に必要です：

1. [Google Cloud Console](https://console.cloud.google.com/) で Custom Search API を有効化
2. [Programmable Search Engine](https://programmablesearchengine.google.com/) にアクセス
3. 新しい検索エンジンを作成
4. 「検索するサイト」に `www.google.com` を追加
5. 「画像検索」を有効化
6. 検索エンジンID（CX）をコピー

#### 3-3. `.env.local` の記入

取得したAPIキーを `.env.local` に記入します：

```env
# 必須: Gemini APIキー（いずれか一つ）
GEMINI_API_KEY=your_gemini_api_key_here
# または
GOOGLE_API_KEY=your_google_cloud_api_key_here

# オプション: 使用するモデルを変更する場合（デフォルト: gemini-3-pro-preview）
GEMINI_MODEL=gemini-3-pro-preview

# オプション: 画像検索機能を使用する場合
GOOGLE_API_KEY=your_google_cloud_api_key_here
GOOGLE_CSE_CX=your_custom_search_engine_id_here

# オプション: Vertex AIを使用する場合
# GOOGLE_GENAI_USE_VERTEXAI=true
# GOOGLE_CLOUD_PROJECT=your-project-id
# GOOGLE_CLOUD_LOCATION=us-central1
# GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account.json
```

### 環境変数の詳細

| 変数名 | 必須 | 説明 |
|--------|------|------|
| `GEMINI_API_KEY` | ○※ | Google AI Studio APIキー |
| `GOOGLE_API_KEY` | ○※ | Google Cloud Gemini APIキー（`GEMINI_API_KEY`より優先） |
| `GEMINI_MODEL` | - | 使用するGeminiモデル（デフォルト: `gemini-3-pro-preview`） |
| `GOOGLE_CSE_CX` | - | Google Programmable Search Engine ID（画像検索用） |
| `GOOGLE_GENAI_USE_VERTEXAI` | - | Vertex AI使用時は `true` に設定 |
| `GOOGLE_CLOUD_PROJECT` | △ | Vertex AI使用時に必要なプロジェトID |
| `GOOGLE_CLOUD_LOCATION` | △ | Vertex AI使用時に必要なリージョン（例: `us-central1`） |
| `GOOGLE_APPLICATION_CREDENTIALS` | - | サービスアカウントJSONファイルのパス |

※ `GEMINI_API_KEY` または `GOOGLE_API_KEY` のいずれか一つが必須

## 開発環境での起動

### 開発サーバーの起動

```bash
npm run dev
```

サーバーが起動したら、ブラウザで以下のURLにアクセスします：

- **英語版**: http://localhost:3000
- **日本語版**: http://localhost:3000/ja

ターミナルに表示されるURLが異なる場合は、そちらを使用してください。

### 開発中の便利な機能

- **ホットリロード**: ファイルを保存すると自動的にブラウザが更新されます
- **型チェック**: TypeScriptによる型安全性
- **リンティング**: ESLintによるコード品質チェック

## プロダクションビルド

### ビルド方法

```bash
npm run build
```

ビルドが完了すると、最適化されたプロダクション用のファイルが `.next` ディレクトリに生成されます。

### プロダクション環境での起動

```bash
npm run start
```

デフォルトではポート3000で起動します。

### ポート番号の変更

異なるポートで起動する場合：

```bash
PORT=8080 npm run start
```

## 使用方法

### 基本的な使い方

1. アプリケーションのホームページにアクセス
2. サイドバーの検索ボックスに調査したいクエリを入力
   - 例: "Tell me about Elon Musk's latest projects"
   - 例: "イーロン・マスクの最新プロジェクトについて教えて"
3. Enterキーを押すと調査が開始されます
4. 画面には以下が表示されます：
   - **調査計画**: AIが立案した調査ステップ
   - **証拠収集**: 各ステップの調査結果
   - **最終レポート**: 総合的な分析結果
   - **参照元**: 情報源のリスト

### レポートのエクスポート

調査結果をMicrosoft Word形式でダウンロードできます：

1. 調査が完了したら、「Wordで出力」（Export to Word）ボタンをクリック
2. `.docx` ファイルが自動的にダウンロードされます

### 調査履歴

サイドバーから過去の調査結果にアクセスできます。各調査には固有のURLが割り当てられています。

## トラブルシューティング

### よくある問題と解決方法

#### 1. "Missing API key" エラーが表示される

**原因**: Gemini APIキーが設定されていません

**解決方法**:
- `.env.local` ファイルが存在するか確認
- `GEMINI_API_KEY` または `GOOGLE_API_KEY` が正しく設定されているか確認
- 開発サーバーを再起動: `npm run dev`

#### 2. 画像検索が機能しない

**原因**: Google Custom Search APIが設定されていません

**解決方法**:
- `.env.local` に `GOOGLE_CSE_CX` が設定されているか確認
- Google Custom Search APIが有効化されているか確認
- APIキーに Custom Search API の権限があるか確認

#### 3. ビルドエラーが発生する

**原因**: 依存関係の問題または型エラー

**解決方法**:
```bash
# node_modulesを削除して再インストール
rm -rf node_modules package-lock.json
npm install

# キャッシュをクリア
rm -rf .next

# 再度ビルド
npm run build
```

#### 4. ポート3000が既に使用されている

**解決方法**:
```bash
# 別のポートで起動
PORT=3001 npm run dev
```

#### 5. 調査が途中で止まる

**原因**: APIレート制限またはネットワークエラー

**解決方法**:
- APIキーのクォータを確認
- しばらく待ってから再試行
- ブラウザのコンソールでエラーログを確認

## プロジェクト構成

```
whoisp/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── _components/        # 共有コンポーネント
│   │   ├── api/                # APIルート
│   │   ├── ja/                 # 日本語ページ
│   │   └── page.tsx            # ホームページ
│   ├── server/                 # サーバーサイドロジック
│   │   ├── deepResearch.ts     # リサーチエンジン
│   │   ├── geminiClient.ts     # Gemini APIクライアント
│   │   ├── fetchPersonImages.ts # 画像検索
│   │   └── fetchSubjectImages.ts
│   ├── shared/                 # 共有型定義と定数
│   │   ├── constants.ts        # アプリケーション定数
│   │   ├── utils.ts            # ユーティリティ関数
│   │   └── deep-research-types.ts
│   └── utils/                  # クライアントユーティリティ
├── public/                     # 静的ファイル
├── .env.local                  # 環境変数（要作成）
├── package.json                # 依存関係
└── README.md                   # このファイル
```

## 技術スタック

- **フレームワーク**: Next.js 15.5.4 (App Router)
- **言語**: TypeScript
- **AI**: Google Gemini API
- **スタイリング**: Tailwind CSS
- **レンダリング**: React 19
- **文書生成**: docx.js

## API制限と注意事項

- Gemini APIには無料枠と有料枠があります
- Google Custom Search APIは1日あたり100クエリまで無料です
- 大量のリクエストを行う場合は、APIキーのクォータを確認してください

## 法的情報とプライバシー

アプリケーション内の「Usage notes & disclaimer」（利用規約と免責事項）ページ、または `/disclaimer` から詳細を確認してください。

## ライセンス

このプロジェクトはMITライセンスの下で公開されています。詳細は [LICENSE](./LICENSE) ファイルをご覧ください。

Copyright (c) 2025 CORe Inc.

## サポートとコミュニティ

問題が発生した場合や質問がある場合は、GitHubのIssuesページで報告してください。

---

**Happy Researching! 🔍✨**
