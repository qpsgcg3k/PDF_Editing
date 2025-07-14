# 内部設計書

## 改訂履歴

| バージョン | 改訂日     | 担当者 | 概要     |
| :--- | :--- | :--- | :--- |
| 1.0.0    | 2025-07-10 | Gemini | 初版作成 |
| 1.0.1    | 2025-07-10 | Gemini | ページ送り機能と表示モード切り替え機能の実装詳細追加 |
| 1.0.2    | 2025-07-12 | Gemini | 拡大・縮小機能の実装詳細追加 |
| 1.0.3    | 2025-07-12 | Gemini | PDFダウンロード機能の実装詳細追加 |
| 1.0.4    | 2025-07-14 | Gemini | PDF内のテキスト選択・コピー機能の実装詳細追加 |

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
- **`contextMenu`**: 右クリックメニューのDOM要素を保持する変数 (HTMLElement型、初期値: `null`)。
- **`currentScale`**: 現在の表示倍率 (number型、初期値: 1.5)。

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
- `zoomInBtn`: 拡大ボタン (`<button id="zoom-in">`)
- `zoomOutBtn`: 縮小ボタン (`<button id="zoom-out">`)
- `zoomResetBtn`: リセットボタン (`<button id="zoom-reset">`)
- `downloadPdfBtn`: PDFダウンロードボタン (`<button id="download-pdf">`)

### 3.3. 初期化処理

- **`pdfjsLib.GlobalWorkerOptions.workerSrc`**: PDF.jsのWeb Workerのパスを設定する。これはライブラリが正しく動作するために必須の設定である。

### 3.4. イベントハンドリング

- **`pdfUpload.addEventListener('change', ...)`**: 
    - ファイル選択 (`<input type="file">`) の `change` イベントを監視する。
    - 選択されたPDFファイルを読み込み、`pdfDoc`に設定後、`render()`を呼び出す。
    - PDF読み込み後、ダウンロードボタンを表示する。
- **`viewModeToggle.addEventListener('change', ...)`**: 
    - 表示モード切り替えチェックボックスの `change` イベントを監視する。
    - `viewMode`変数を更新し、`render()`を呼び出す。
- **`prevPageBtn.addEventListener('click', ...)`**: 
    - 「前へ」ボタンの `click` イベントを監視する。
    - `currentPage`をデクリメントし、`renderPageMode()`を呼び出す（`currentPage`が1より大きい場合のみ）。
- **`nextPageBtn.addEventListener('click', ...)`**: 
    - 「次へ」ボタンの `click` イベントを監視する。
    - `currentPage`をインクリメントし、`renderPageMode()`を呼び出す（`currentPage`が総ページ数より小さい場合のみ）。
- **`document.addEventListener('contextmenu', ...)`**: 
    - ドキュメント全体の `contextmenu` イベント（右クリック）を監視する。
    - イベントターゲットが`.text-layer`内にある場合、デフォルトのコンテキストメニューを抑制し、`showContextMenu()`を呼び出す。
- **`document.addEventListener('click', ...)`**: 
    - ドキュメント全体の `click` イベントを監視する。
    - `hideContextMenu()`を呼び出し、カスタムコンテキストメニューを非表示にする。
- **`document.addEventListener('keydown', ...)`**: 
    - ドキュメント全体の `keydown` イベントを監視する。
    - `Ctrl+C`で`copySelectedText()`を、`Ctrl+A`で`selectAllText()`を呼び出す。
- **`zoomInBtn.addEventListener('click', ...)`**: 
    - 拡大ボタンの `click` イベントを監視する。
    - `currentScale`を増加させ、`render()`を呼び出す。
- **`zoomOutBtn.addEventListener('click', ...)`**: 
    - 縮小ボタンの `click` イベントを監視する。
    - `currentScale`を減少させ、`render()`を呼び出す。
- **`zoomResetBtn.addEventListener('click', ...)`**: 
    - リセットボタンの `click` イベントを監視する。
    - `currentScale`を初期値にリセットし、`render()`を呼び出す。
- **`downloadPdfBtn.addEventListener('click', ...)`**: 
    - ダウンロードボタンの `click` イベントを監視する。
    - `downloadPdf()`を呼び出す。

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
    - 指定された`pageNum`のPDFページをCanvasに描画し、テキストレイヤーを追加する共通関数。
    - `pdfDoc.getPage(pageNum)`でページオブジェクトを取得。
    - `page.getViewport()`でビューポート情報を取得（スケールは`currentScale`を使用）。
    - 新しい`<canvas>`要素とテキストレイヤー用の`<div>`要素を作成し、`pageContainer`に追加。
    - `page.render()`でCanvasに描画する。
    - `page.getTextContent()`でテキストコンテンツを取得し、`pdfjsLib.TextLayer`を使用してテキストレイヤーをレンダリングする。
    - エラーハンドリングを含む。
- **`updatePaginationControls()`**: 
    - `pageNumSpan`のテキストを「現在のページ / 総ページ数」の形式で更新する。
    - `prevPageBtn`と`nextPageBtn`の`disabled`プロパティを、`currentPage`と`pdfDoc.numPages`に基づいて設定する。

### 3.6. コピー機能関連関数

- **`showContextMenu(x, y)`**: 
    - 指定された座標 (`x`, `y`) にカスタムの右クリックメニュー (`.context-menu`) を表示する。
    - 現在選択されているテキストの有無に応じて、「コピー」メニューアイテムの有効/無効を切り替える。
    - 「全選択」メニューアイテムも追加する。
- **`hideContextMenu()`**: 
    - 表示されているカスタムの右クリックメニューをDOMから削除し、非表示にする。
- **`copySelectedText()`**: 
    - `window.getSelection().toString()`で現在選択されているテキストを取得する。
    - `navigator.clipboard.writeText()`を使用してクリップボードにテキストをコピーする。
    - コピーに失敗した場合は`fallbackCopyText()`を呼び出す。
    - コピー成功後、`showCopyMessage()`を呼び出す。
- **`selectAllText()`**: 
    - ドキュメント内のすべての`.text-layer`要素のコンテンツを選択する。
- **`fallbackCopyText(text)`**: 
    - `navigator.clipboard`が利用できない環境向けに、一時的な`<textarea>`要素を作成し、`document.execCommand('copy')`を使用してテキストをコピーする。
- **`showCopyMessage(message)`**: 
    - 画面右下隅に、指定されたメッセージを含む一時的な通知 (`.copy-message`) を表示する。
    - フェードイン・フェードアウトのアニメーションを伴う。

### 3.7. 拡大・縮小機能関連関数

- **`updateScale(delta)`**: 
    - `currentScale`を`delta`分だけ増減させる。
    - `currentScale`が最小値（0.5）と最大値（3.0）の範囲に収まるように調整する。
    - `render()`を呼び出してPDFを再描画する。
- **`resetScale()`**: 
    - `currentScale`を初期値（1.5）にリセットする。
    - `render()`を呼び出してPDFを再描画する。

### 3.8. PDFダウンロード機能関連関数

- **`downloadPdf()`**: 
    - 読み込まれているPDFファイル (`pdfDoc`) をダウンロードする。
    - `pdfDoc.getData()`でPDFのバイナリデータを取得し、`Blob`オブジェクトを作成する。
    - `URL.createObjectURL()`でダウンロードURLを生成し、`<a>`要素を作成してクリックイベントをシミュレートすることでダウンロードを実行する。

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
- **テキストレイヤーのスタイル (`.text-layer`):**
    - `position: absolute; left: 0; top: 0; right: 0; bottom: 0;` で親要素（`.page-container`）に重ねて配置。
    - `overflow: hidden; opacity: 0.2; line-height: 1.0;` でテキストの表示と選択を制御。
    - `user-select: text; cursor: text;` でテキスト選択を可能にする。
- **テキストレイヤー内のテキストスパン (`.text-layer > span`):**
    - `color: transparent;` でテキスト自体は透明にし、選択時の背景色のみを表示。
    - `position: absolute; white-space: pre; cursor: text; transform-origin: 0% 0%;` でテキストの配置とカーソルを制御。
- **テキスト選択時のスタイル (`.text-layer > span::selection`, `::-moz-selection`):**
    - `background: rgba(0, 0, 255, 0.3);` で選択時の背景色を設定。
- **右クリックメニュー (`.context-menu`):**
    - `position: absolute; background: white; border: 1px solid #ccc; box-shadow: 0 2px 10px rgba(0,0,0,0.2); z-index: 1000;` でメニューの表示位置、背景、ボーダー、影、重なり順を設定。
    - `min-width: 120px; border-radius: 4px; overflow: hidden;` でサイズと角丸を設定。
- **右クリックメニューアイテム (`.context-menu-item`):**
    - `padding: 8px 12px; cursor: pointer; border-bottom: 1px solid #eee;` でパディング、カーソル、下線を設定。
    - `hover`時の背景色 (`background-color: #f0f0f0;`) と、`disabled`時のスタイル (`opacity: 0.5; cursor: not-allowed;`) を定義。
- **コピー成功メッセージ (`.copy-message`):**
    - `position: fixed; bottom: 20px; right: 20px;` で画面右下固定表示。
    - `background: #333; color: white; padding: 10px 15px; border-radius: 4px; z-index: 1001;` で背景、文字色、パディング、角丸、重なり順を設定。
    - `opacity: 0; transition: opacity 0.3s;` で初期状態の透明度とアニメーションを設定。
- **拡大・縮小ボタン (`.zoom-controls button`):**
    - パディング、ボーダー、背景色、カーソルなどを設定。
- **ダウンロードボタン (`#download-pdf`):**
    - パディング、ボーダー、背景色、カーソルなどを設定。
    - `hidden`クラスが付与されている場合は`display: none`で非表示にする。