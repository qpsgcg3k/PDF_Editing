# 内部設計書

## 改訂履歴

| バージョン | 改訂日     | 担当者 | 概要     |
| :--- | :--- | :--- | :--- |
| 1.0.0    | 2025-07-10 | Gemini | 初版作成 |

## 1. プロジェクト構成

- **`index.html`**: アプリケーションの基本構造を定義するHTMLファイル。
- **`style.css`**: アプリケーションのスタイルを定義するCSSファイル。
- **`script.js`**: アプリケーションの全ロジックを記述するJavaScriptファイル。

## 2. データ管理

### 2.1. データフロー

本アプリケーションでは、サーバーへのデータ保存や`localStorage`による永続化は行わない。データは以下のように一時的に扱われる。

1.  ユーザーが選択したファイルは、`File`オブジェクトとして取得される。
2.  `FileReader` API を使用して、`File`オブジェクトを `ArrayBuffer` に変換する。
3.  変換された `ArrayBuffer` は、`Uint8Array` にラップされ、PDF.jsライブラリに渡される。

## 3. 主要なJavaScript関数とロジック (`script.js`)

`script.js` は、ESモジュールとして実装されている。

### 3.1. 外部ライブラリ

- **PDF.js (`pdfjs-dist`)**: PDFを描画するためのコアライブラリ。CDN経由で動的にインポートされる。
    - `pdf.min.mjs`: メインライブラリ。
    - `pdf.worker.min.mjs`: PDFの解析をバックグラウンドで行うための補助プログラム（Web Worker）。

### 3.2. 初期化処理

- **`pdfjsLib.GlobalWorkerOptions.workerSrc`**: PDF.jsのWeb Workerのパスを設定する。これはライブラリが正しく動作するために必須の設定である。

### 3.3. イベントハンドリング

- **`pdfUpload.addEventListener('change', ...)`**:
    - ファイル選択 (`<input type="file">`) の `change` イベントを監視する。
    - このイベントハンドラがアプリケーションのメインロジックとなる。

### 3.4. PDF処理ロジック

イベントハンドラ内の処理は以下の通り。

1.  **ファイル取得と検証:**
    - `event.target.files[0]` から選択されたファイルを取得する。
    - ファイルが存在しない、またはMIMEタイプが `application/pdf` でない場合は、警告を表示して処理を中断する。
2.  **ビューワーのクリア:**
    - `viewerContainer.innerHTML = ''` により、以前表示されていたPDFの内容をクリアする。
3.  **ファイル読み込み:**
    - `FileReader` インスタンスを作成する。
    - `readAsArrayBuffer()` でファイルの読み込みを開始する。
    - `onload` イベントハンドラ内で、読み込み完了後の処理を定義する。
4.  **PDFレンダリング:**
    - `try...catch` ブロックでエラー処理を行う。
    - `this.result` (読み込まれたArrayBuffer) から `Uint8Array` を作成する。
    - `pdfjsLib.getDocument()` を呼び出し、PDFドキュメントオブジェクトを取得する。この際、日本語などの文字化けを防ぐために`cMapUrl`と`cMapPacked`オプションを指定する。
    - `for`ループでPDFの全ページを順番に処理する (`pdf.numPages`)。
    - **ページごとの処理:**
        - `pdf.getPage(i)` でページオブジェクトを取得する。
        - `page.getViewport()` でページの表示サイズ情報を取得する。
        - `<canvas>` 要素を動的に生成し、ビューポートのサイズに合わせて高さを設定する。
        - `viewerContainer` に生成した`<canvas>`を追加する。
        - `page.render()` を呼び出し、`<canvas>`にページの内容を描画する。

## 4. CSS設計 (`style.css`)

- **Flexboxレイアウト:** `body` 要素に `display: flex` と `flex-direction: column` を適用し、ページ全体の要素を縦方向に中央揃えで配置している。
- **コンテナスタイル (`#viewer-container`):**
    - PDFが表示される領域に枠線、影、背景色などを設定し、視覚的なまとまりを持たせている。
    - `overflow: auto` により、コンテナサイズを超える場合にスクロールバーが表示される。
- **Canvasスタイル (`canvas`):**
    - 各ページを表す`<canvas>`に枠線を設定し、ページ間の区切りを明確にしている。
    - `display: block` と `margin: 0 auto` で、コンテナ内での中央揃えを実現している。
