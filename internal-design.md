# 内部設計書

## 改訂履歴

| バージョン | 改訂日     | 担当者 | 概要     |
| :--- | :--- | :--- | :--- |
| 1.0.0    | 2025-07-10 | Gemini | 初版作成 |
| 1.0.1    | 2025-07-10 | Gemini | ページ送り機能と表示モード切り替え機能の実装詳細追加 |

## 1. プロジェクト構成

- **`index.html`**: アプリケーションの基本構造を定義するHTMLファイル。`script.js`は`type="module"`として読み込まれる。
- **`style.css`**: アプリケーションのスタイルを定義するCSSファイル。
- **`script.js`**: アプリケーションの全ロジックを記述するJavaScriptファイル。

## 2. データ管理

### 2.1. データフロー

本アプリケーションでは、サーバーへのデータ保存や`localStorage`による永続化は行わない。データは以下のように一時的に扱われる。

1.  ユーザーが選択したファイルは、`File`オブジェクトとして取得される。
2.  `FileReader` API を使用して、`File`オブジェクトを `ArrayBuffer` に変換する。
3.  変換された `ArrayBuffer` は、`Uint8Array` にラップされ、PDF.jsライブラリに渡される。

### 2.2. アプリケーションの状態管理

- **`pdfDoc`**: 読み込まれたPDFドキュメントオブジェクト (`pdfjsLib.PDFDocumentProxy`型)。
- **`currentPage`**: 現在表示しているページ番号 (number型、初期値: 1)。
- **`viewMode`**: 現在の表示モード (`'scroll'` または `'page'` の文字列、初期値: `'scroll'`)。

## 3. 主要なJavaScript関数とロジック (`script.js`)

`script.js` は、ESモジュールとして実装されている。

### 3.1. 外部ライブラリ

- **PDF.js (`pdfjs-dist`)**: PDFを描画するためのコアライブラリ。CDN経由で動的にインポートされる。
    - `pdf.min.mjs`: メインライブラリ (`https://cdn.jsdelivr.net/npm/pdfjs-dist@4.4.168/build/pdf.min.mjs`)。
    - `pdf.worker.min.mjs`: PDFの解析をバックグラウンドで行うための補助プログラム（Web Worker） (`https://cdn.jsdelivr.net/npm/pdfjs-dist@4.4.168/build/pdf.worker.min.mjs`)。

### 3.2. DOM要素の取得

以下のDOM要素がIDで取得される。

- `pdfUpload`: ファイル選択 (`<input type="file">`)
- `viewerContainer`: PDF描画コンテナ (`<div id="viewer-container">`)
- `viewModeToggle`: 表示モード切り替えチェックボックス (`<input type="checkbox" id="view-mode-toggle">`)
- `paginationControls`: ページ送りコントロールコンテナ (`<div id="pagination-controls">`)
- `prevPageBtn`: 「前へ」ボタン (`<button id="prev-page">`)
- `nextPageBtn`: 「次へ」ボタン (`<button id="next-page">`)
- `pageNumSpan`: ページ番号表示 (`<span id="page-num">`)

### 3.3. 初期化処理

- **`pdfjsLib.GlobalWorkerOptions.workerSrc`**: PDF.jsのWeb Workerのパスを設定する。これはライブラリが正しく動作するために必須の設定である。

### 3.4. イベントハンドリング

- **`pdfUpload.addEventListener('change', ...)`**:
    - ファイル選択 (`<input type="file">`) の `change` イベントを監視する。
    - 選択されたPDFファイルを読み込み、`pdfDoc`に設定後、`render()`を呼び出す。
- **`viewModeToggle.addEventListener('change', ...)`**:
    - 表示モード切り替えチェックボックスの `change` イベントを監視する。
    - `viewMode`変数を更新し、`render()`を呼び出す。
- **`prevPageBtn.addEventListener('click', ...)`**:
    - 「前へ」ボタンの `click` イベントを監視する。
    - `currentPage`をデクリメントし、`renderPageMode()`を呼び出す（`currentPage`が1より大きい場合のみ）。
- **`nextPageBtn.addEventListener('click', ...)`**:
    - 「次へ」ボタンの `click` イベントを監視する。
    - `currentPage`をインクリメントし、`renderPageMode()`を呼び出す（`currentPage`が総ページ数より小さい場合のみ）。

### 3.5. レンダリング関数

- **`render()`**:
    - `pdfDoc`がnullの場合は処理を中断する。
    - `viewerContainer`の内容をクリアする。
    - `viewMode`に応じて、`document.body`に`page-view-mode`クラスを追加/削除し、`renderScrollMode()`または`renderPageMode()`を呼び出す。
- **`renderScrollMode()`**:
    - `paginationControls`に`hidden`クラスを追加し、非表示にする。
    - `pdfDoc.numPages`の数だけループし、各ページに対して`renderCanvasPage()`を呼び出す。
- **`renderPageMode()`**:
    - `viewerContainer`の内容をクリアする。
    - `paginationControls`から`hidden`クラスを削除し、表示する。
    - `currentPage`に対して`renderCanvasPage()`を呼び出す。
    - `updatePaginationControls()`を呼び出し、ページ送りUIを更新する。
- **`renderCanvasPage(pageNum)`**:
    - 指定された`pageNum`のPDFページをCanvasに描画する共通関数。
    - `pdfDoc.getPage(pageNum)`でページオブジェクトを取得。
    - `page.getViewport()`でビューポート情報を取得（スケール1.5）。
    - 新しい`<canvas>`要素を作成し、`viewerContainer`に追加。
    - `page.render()`でCanvasに描画する。
    - エラーハンドリングを含む。
- **`updatePaginationControls()`**:
    - `pageNumSpan`のテキストを「現在のページ / 総ページ数」の形式で更新する。
    - `prevPageBtn`と`nextPageBtn`の`disabled`プロパティを、`currentPage`と`pdfDoc.numPages`に基づいて設定する。

## 4. CSS設計 (`style.css`)

- **Flexboxレイアウト:** `body` 要素に `display: flex` と `flex-direction: column` を適用し、ページ全体の要素を縦方向に中央揃えで配置している。
- **コントロールエリア (`.controls`):** ファイル選択と表示モード切り替えスイッチを横並びに配置。
- **表示モード切り替えスイッチ (`.view-mode-switch`):** ラベルとチェックボックスを横並びに配置。
- **コンテナスタイル (`#viewer-container`):**
    - PDFが表示される領域に枠線、影、背景色などを設定。
    - `overflow: auto` により、コンテナサイズを超える場合にスクロールバーが表示される。
    - **条件付きスタイル:** `body.page-view-mode` クラスが`body`に付与されている場合（ページ送りモード時）は、`height: 80vh`で高さを固定する。
- **Canvasスタイル (`canvas`):**
    - 各ページを表す`<canvas>`に枠線を設定し、ページ間の区切りを明確にしている。
    - `display: block` と `margin: 0 auto` で、コンテナ内での中央揃えを実現している。
    - **条件付きスタイル:** `body:not(.page-view-mode)` が`body`に付与されている場合（スクロールモード時）は、`margin-bottom: 20px`を適用し、ページ間に余白を設ける。
- **ページ送りコントロール (`#pagination-controls`):**
    - ボタンとページ番号表示を横並びに配置。
    - `hidden`クラスが付与されている場合は`display: none`で非表示にする。
    - ボタンのスタイル（パディング、ボーダー、背景色、カーソル）と、`disabled`時のスタイル（カーソル、透明度）を定義。