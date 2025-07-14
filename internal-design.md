# 内部設計書

## 1. システムアーキテクチャ
本システムは、HTML、CSS、JavaScriptで構成されるクライアントサイドアプリケーションである。PDFのレンダリングには、JavaScriptライブラリであるPDF.jsを使用する。主要な機能は`script.js`に集約されており、DOM操作を通じてUIと連携する。

## 2. 主要モジュールと役割

### 2.1. `index.html`
- アプリケーションのエントリポイント。
- UIの骨格（PDFアップロード、ビューアコンテナ、ズーム、ページネーションコントロールなど）を定義する。
- `style.css`を読み込み、`script.js`を`type="module"`で読み込む。

### 2.2. `style.css`
- アプリケーションの視覚的なスタイルを定義する。
- PDFビューアのレイアウト、コントロール要素のスタイリング、テキストレイヤーの表示などを担当する。
- 特に、`body.page-view-mode`セレクタを用いて、表示モードに応じたスタイル切り替えを行う。

### 2.3. `script.js`
アプリケーションの主要なロジックを実装する。

#### 2.3.1. PDF.jsの読み込みと設定
- `pdfjsLib`をCDNからESモジュールとしてインポートする。
- `GlobalWorkerOptions.workerSrc`を設定し、PDFの解析・描画をバックグラウンドワーカーで行う。
- 複数のCDNソースからのフォールバック読み込みを試みる`loadPDFJS`関数を実装し、堅牢性を高める。

#### 2.3.2. DOM要素の取得と状態管理
- 必要なDOM要素（`pdf-upload`, `viewer-container`, `view-mode-toggle`など）をIDで取得する。
- アプリケーションの状態を管理する変数:
    - `pdfDoc`: 現在読み込まれているPDFドキュメントオブジェクト。
    - `currentPage`: 現在表示中のページ番号。
    - `viewMode`: 現在の表示モード（`'scroll'`または`'page'`）。
    - `currentScale`: 現在の表示倍率。
    - `contextMenu`: 右クリックメニューのDOM要素。

#### 2.3.3. イベントリスナー
- `pdfUpload`: `change`イベントをリッスンし、ファイル選択時にPDFの読み込みと初期レンダリングを行う。
- `viewModeToggle`: `change`イベントをリッスンし、表示モードを切り替えて再レンダリングを行う。
- `prevPageBtn`, `nextPageBtn`: `click`イベントをリッスンし、ページ送りモードでのページナビゲーションを処理する。
- `zoomInBtn`, `zoomOutBtn`, `zoomResetBtn`: `click`イベントをリッスンし、表示倍率の変更と再レンダリングを行う。
- `downloadPdfBtn`: `click`イベントをリッスンし、PDFのダウンロード処理を行う。
- `document`: `contextmenu`イベントをリッスンし、テキストレイヤー上での右クリック時にカスタムコンテキストメニューを表示する。
- `document`: `click`イベントをリッスンし、コンテキストメニューを非表示にする。
- `document`: `keydown`イベントをリッスンし、`Ctrl+C`（コピー）と`Ctrl+A`（全選択）のショートカットを処理する。

#### 2.3.4. レンダリング関数
- `render()`: 現在の`viewMode`に基づいて`renderScrollMode()`または`renderPageMode()`を呼び出すメインレンダリング関数。
- `renderScrollMode()`: PDFの全ページをループで`viewer-container`に描画する。各ページは独立したCanvasとテキストレイヤーを持つ。
- `renderPageMode()`: `currentPage`の1ページのみを`viewer-container`に描画し、ページネーションコントロールを更新する。
- `renderCanvasPage(pageNum)`: 指定されたページ番号のPDFをCanvasに描画し、PDF.jsの`TextLayer`を使用してテキスト選択可能なレイヤーを追加する。`currentScale`を適用する。
- `updatePaginationControls()`: ページネーションUI（ページ番号、ボタンの有効/無効状態）を更新する。

#### 2.3.5. コピー機能関連
- `showContextMenu(x, y)`: 指定された座標にカスタム右クリックメニューを作成・表示する。
- `hideContextMenu()`: カスタム右クリックメニューを非表示にする。
- `copySelectedText()`: `window.getSelection()`で選択されたテキストを`navigator.clipboard.writeText()`でクリップボードにコピーする。失敗時はフォールバックとして`document.execCommand('copy')`を試みる。
- `selectAllText()`: `.text-layer`内の全テキストを選択する。
- `fallbackCopyText(text)`: `textarea`要素を一時的に作成し、`document.execCommand('copy')`でテキストをコピーする。
- `showCopyMessage(message)`: コピー結果をユーザーに通知する一時的なメッセージ（トースト）を表示する。

#### 2.3.6. ズーム機能関連
- `updateScale(delta)`: `currentScale`を`delta`分増減させ、`render()`を呼び出して再描画する。倍率には最小値と最大値（0.5〜3.0）を設定する。
- `resetScale()`: `currentScale`を初期値（1.5）にリセットし、`render()`を呼び出して再描画する。

#### 2.3.7. PDFダウンロード機能関連
- `downloadPdf()`: `pdfDoc.getData()`でPDFのバイナリデータを取得し、`Blob`オブジェクトとしてURLを生成、`<a>`タグを用いてダウンロードをトリガーする。

## 3. データフロー
1. **ファイル選択**: ユーザーが`pdf-upload`でPDFファイルを選択。
2. **ファイル読み込み**: `FileReader`がファイルを`ArrayBuffer`として読み込む。
3. **PDF解析**: `pdfjsLib.getDocument()`が`ArrayBuffer`からPDFドキュメントを解析し、`pdfDoc`に格納。
4. **レンダリング**: `render()`関数が`pdfDoc`と`viewMode`, `currentScale`に基づいてCanvasにPDFページを描画し、テキストレイヤーを重ねる。
5. **ユーザー操作**: ユーザーのUI操作（ズーム、ページ送り、モード切り替え、テキスト選択など）に応じて、`currentScale`, `currentPage`, `viewMode`などの状態変数が更新され、`render()`が再呼び出しされる。
6. **テキストコピー**: ユーザーがテキストを選択しコピー操作を行うと、`window.getSelection()`からテキストを取得し、クリップボードAPIを通じてコピーされる。
7. **PDFダウンロード**: ユーザーがダウンロードボタンをクリックすると、`pdfDoc`から元のPDFデータが取得され、Blobとしてダウンロードされる。

## 4. 技術的考慮事項
- **PDF.js**: PDFのレンダリングとテキスト抽出のコア機能を提供する。CDN経由で読み込むことで、アプリケーションのバンドルサイズを削減し、常に最新版を利用できる。
- **ES Modules**: `script.js`は`type="module"`で読み込まれており、モジュールシステムを利用して`pdfjsLib`をインポートする。
- **パフォーマンス**: 大容量PDFの描画負荷を軽減するため、PDF.jsのワーカーを利用し、メインスレッドのブロックを避ける。スクロールモードでは全ページを一度に描画するため、初期表示に時間がかかる可能性がある。
- **セキュリティ**: CDNからのスクリプト読み込みは、CDNの信頼性に依存する。`cMapUrl`と`cMapPacked`の設定は、PDFのテキスト描画に必要なCMapsを効率的に読み込むために重要。
- **DOM操作**: `innerHTML`のクリアと再構築を多用しており、大規模なDOM操作が発生する。パフォーマンスが問題になる場合は、より効率的なDOM更新戦略（例: 仮想DOM）の検討が必要になる可能性がある。
