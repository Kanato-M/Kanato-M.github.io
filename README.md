# Kanato-M.github.io

松谷 奏 (Kanato Matsutani) の個人サイト — <https://kanato-m.github.io/>
研究（EIC / ePIC・AC-LGAD）、CV、旅行・ゲーム・音楽を日英 2 か国語で掲載しています。

ビルド不要の静的サイト（HTML / CSS / JavaScript のみ）です。`main` ブランチに push すると GitHub Pages に反映されます。

## ページ構成

| パス | 内容 | データ |
|---|---|---|
| `index.html` | ホーム（イベントディスプレイ風アニメーション、近況、お知らせ） | `data/news.json` |
| `research/` | 研究内容（質量の起源・EIC・AC-LGAD の解説、TOF シミュレーター、リンク集） | HTML に直接記述 |
| `cv/` | CV（タイムライン、発表、受賞、研究滞在マップ、PDF） | `data/cv.json`, `cv/*.pdf` |
| `hobby/travel/` | 旅行（地図＋写真） | `data/travel.json`, `photos/travel/` |
| `hobby/games/` | ゲーム・パズル保管庫 | `data/games.json`, `games/<id>/` |
| `hobby/music/` | プレイリスト・カラオケ・音楽理論ノート・サウンドラボ | `data/music.json`, `notes/music/*.md` |
| `admin/` | オーナー専用の編集ページ | — |

## 日英切り替え

- 右上の `JA / EN` ボタンで切り替え（選択は localStorage に保存。初回はブラウザの言語設定に従う）。
- HTML では `<span lang="ja">…</span><span lang="en">…</span>` のように両方を書き、CSS で片方を隠しています。
- JSON データでは `{ "ja": "…", "en": "…" }` の形で書きます（片方だけでも可。無い言語はもう片方を表示）。

## サイト上で編集する（管理ページ）

`/admin/` を開き、GitHub の **Fine-grained personal access token** を貼り付けて接続すると、
旅行写真のアップロードや各データの編集ができ、「コミットして公開」で 1 回のコミットとしてリポジトリに保存されます。

1. <https://github.com/settings/personal-access-tokens/new> でトークンを作成
   - Repository access: **Only select repositories** → `Kanato-M.github.io`
   - Repository permissions: **Contents → Read and write**（他は不要）
2. `/admin/` でトークンを貼り付けて「接続」
3. 編集 → 「コミットして公開」→ 1〜2 分で GitHub Pages に反映

ポイント
- 管理ページ自体は誰でも開けますが、**書き込み権限のあるトークンがないと何もできません**。トークンはブラウザ内にのみ保存され、リポジトリには書き込まれません。
- 写真はブラウザ内で長辺 2000px の JPEG（＋サムネイル 480px）に縮小され、**EXIF（GPS 位置情報など）は削除**されてから保存されます。写真に GPS 情報があれば、場所の緯度経度は自動入力されます。
- iPhone の HEIC はブラウザによって読めないため、JPEG で書き出してからアップロードしてください（Safari なら通常そのまま可）。
- ゲームは「フォルダを選択」で `index.html` を含むフォルダごと `games/<id>/` にアップロードできます。

## 手で編集する場合

- **旅行**: `data/travel.json` の `places` に追加し、写真は `photos/travel/<id>/` に置いて `photos` に `{ "src": "photos/travel/<id>/xxx.jpg", "caption": {"ja": "", "en": ""} }` を追加。
- **ゲーム**: `games/<id>/index.html` を置き、`data/games.json` に登録。
- **音楽ノート**: `notes/music/<id>.ja.md`（と `.en.md`）を書き、`data/music.json` の `theory` に登録。
- **リンク（ORCID, INSPIRE など）**: `assets/js/main.js` 冒頭の `SITE.links` に URL を入れるとフッターとホームに表示されます。

## ローカルで確認

```bash
python3 -m http.server 8000
```

<http://localhost:8000/> を開く（`file://` では JSON の読み込みができないため、簡易サーバーを使ってください）。

## 使用ライブラリ（`assets/vendor/` に同梱）

- [Leaflet](https://leafletjs.com/) 1.9.4 — 地図（BSD-2-Clause）／ 地図タイル: © OpenStreetMap contributors, © CARTO
- [exifr](https://github.com/MikeKovarik/exifr) 7 — 写真の EXIF 読み取り（MIT）
- [marked](https://marked.js.org/) 15 — Markdown 表示（MIT）
