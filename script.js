// 最新版のPDF.jsを使用（推奨）
import * as pdfjsLib from 'https://cdn.jsdelivr.net/npm/pdfjs-dist@latest/build/pdf.min.mjs';

// Worker設定
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdn.jsdelivr.net/npm/pdfjs-dist@latest/build/pdf.worker.min.mjs';

// フォールバック付きの安全な読み込み関数
async function loadPDFJS() {
    const cdnOptions = [
        {
            lib: 'https://cdn.jsdelivr.net/npm/pdfjs-dist@latest/build/pdf.min.mjs',
            worker: 'https://cdn.jsdelivr.net/npm/pdfjs-dist@latest/build/pdf.worker.min.mjs'
        },
        {
            lib: 'https://unpkg.com/pdfjs-dist@latest/build/pdf.min.mjs',
            worker: 'https://unpkg.com/pdfjs-dist@latest/build/pdf.worker.min.mjs'
        }
    ];

    for (const option of cdnOptions) {
        try {
            const pdfjs = await import(option.lib);
            pdfjs.GlobalWorkerOptions.workerSrc = option.worker;
            return pdfjs;
        } catch (error) {
            console.warn(`Failed to load PDF.js from ${option.lib}:`, error);
        }
    }
    
    throw new Error('Failed to load PDF.js from all CDN sources');
}

// DOM要素の取得
const pdfUpload = document.getElementById('pdf-upload');
const viewerContainer = document.getElementById('viewer-container');
const viewModeToggle = document.getElementById('view-mode-toggle');
const paginationControls = document.getElementById('pagination-controls');
const prevPageBtn = document.getElementById('prev-page');
const nextPageBtn = document.getElementById('next-page');
const pageNumSpan = document.getElementById('page-num');
const zoomInBtn = document.getElementById('zoom-in');
const zoomOutBtn = document.getElementById('zoom-out');
const zoomResetBtn = document.getElementById('zoom-reset');
const downloadPdfBtn = document.getElementById('download-pdf');

// アプリケーションの状態管理
let pdfDoc = null;
let currentPage = 1;
let viewMode = 'scroll'; // 'scroll' or 'page'
let contextMenu = null;
let currentScale = 1.5; // 初期表示倍率

// --- イベントリスナー ---

// PDFファイル選択時の処理
pdfUpload.addEventListener('change', async (event) => {
    const file = event.target.files[0];
    if (!file || file.type !== 'application/pdf') {
        alert('PDFファイルを選択してください。');
        return;
    }

    const fileReader = new FileReader();
    fileReader.onload = async function() {
        try {
            const typedarray = new Uint8Array(this.result);
            const loadingTask = pdfjsLib.getDocument({
                data: typedarray,
                cMapUrl: 'https://cdn.jsdelivr.net/npm/pdfjs-dist@latest/cmaps/',
                cMapPacked: true,
            });
            pdfDoc = await loadingTask.promise;
            currentPage = 1;
            render();
            downloadPdfBtn.classList.remove('hidden'); // PDF読み込み後にダウンロードボタンを表示
        } catch (error) {
            console.error('Error loading PDF:', error);
            alert('PDFの読み込み中にエラーが発生しました。');
        }
    };
    fileReader.readAsArrayBuffer(file);
});

// 表示モード切り替え時の処理
viewModeToggle.addEventListener('change', () => {
    viewMode = viewModeToggle.checked ? 'page' : 'scroll';
    render();
});

// 「前へ」ボタンクリック時の処理
prevPageBtn.addEventListener('click', () => {
    if (currentPage <= 1) return;
    currentPage--;
    renderPageMode();
});

// 「次へ」ボタンクリック時の処理
nextPageBtn.addEventListener('click', () => {
    if (currentPage >= pdfDoc.numPages) return;
    currentPage++;
    renderPageMode();
});

// 右クリックメニュー関連
document.addEventListener('contextmenu', (event) => {
    if (event.target.closest('.text-layer')) {
        event.preventDefault();
        showContextMenu(event.pageX, event.pageY);
    }
});

document.addEventListener('mousedown', (event) => {
    // メニュー要素の外側がクリックされた場合のみメニューを隠す
    if (contextMenu && !contextMenu.contains(event.target)) {
        hideContextMenu();
    }
});

// キーボードショートカット
document.addEventListener('keydown', (event) => {
    if (event.ctrlKey && event.key === 'c') {
        copySelectedText();
    }
    if (event.ctrlKey && event.key === 'a') {
        if (document.querySelector('.text-layer')) {
            event.preventDefault();
            selectAllText();
        }
    }
});

// 拡大・縮小ボタンのイベントリスナー
zoomInBtn.addEventListener('click', () => updateScale(0.2));
zoomOutBtn.addEventListener('click', () => updateScale(-0.2));
zoomResetBtn.addEventListener('click', () => resetScale());

// PDFダウンロードボタンのイベントリスナー
downloadPdfBtn.addEventListener('click', () => downloadPdf());

// --- レンダリング関数 ---

/**
 * 現在の表示モードに応じて適切なレンダリング関数を呼び出す
 */
function render() {
    if (!pdfDoc) return;

    viewerContainer.innerHTML = ''; // 表示をクリア

    if (viewMode === 'scroll') {
        document.body.classList.remove('page-view-mode');
        renderScrollMode();
    } else {
        document.body.classList.add('page-view-mode');
        renderPageMode();
    }
}

/**
 * スクロール表示モード：全ページを一度に描画する
 */
async function renderScrollMode() {
    paginationControls.classList.add('hidden');
    for (let i = 1; i <= pdfDoc.numPages; i++) {
        await renderCanvasPage(i);
    }
}

/**
 * ページ送り表示モード：現在の1ページだけを描画する
 */
async function renderPageMode() {
    viewerContainer.innerHTML = ''; // 念のためクリア
    paginationControls.classList.remove('hidden');
    await renderCanvasPage(currentPage);
    updatePaginationControls();
}

/**
 * 指定されたページ番号のPDFをCanvasに描画し、テキストレイヤーを追加する
 * @param {number} pageNum - 描画するページ番号
 */
async function renderCanvasPage(pageNum) {
    try {
        const page = await pdfDoc.getPage(pageNum);
        const viewport = page.getViewport({ scale: currentScale }); // currentScaleを使用

        // ページコンテナを作成
        const pageContainer = document.createElement('div');
        pageContainer.className = 'page-container';
        pageContainer.style.position = 'relative';
        pageContainer.style.width = `${viewport.width}px`;
        pageContainer.style.height = `${viewport.height}px`;
        pageContainer.style.margin = '0 auto';
        if (viewMode === 'scroll') {
            pageContainer.style.marginBottom = '20px';
        }

        // Canvas要素を作成
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        canvas.height = viewport.height;
        canvas.width = viewport.width;
        canvas.style.display = 'block';
        canvas.style.border = '1px solid #ccc';

        // テキストレイヤー用のdivを作成
        const textLayerDiv = document.createElement('div');
        textLayerDiv.className = 'text-layer';
        textLayerDiv.style.position = 'absolute';
        textLayerDiv.style.left = '0';
        textLayerDiv.style.top = '0';
        textLayerDiv.style.right = '0';
        textLayerDiv.style.bottom = '0';
        textLayerDiv.style.overflow = 'hidden';
        textLayerDiv.style.opacity = '0.2';
        textLayerDiv.style.lineHeight = '1.0';

        // ページコンテナに追加
        pageContainer.appendChild(canvas);
        pageContainer.appendChild(textLayerDiv);
        viewerContainer.appendChild(pageContainer);

        // PDFページを描画
        await page.render({
            canvasContext: ctx,
            viewport: viewport,
        }).promise;

        // テキストレイヤーを描画
        const textContent = await page.getTextContent();
        
        // テキストレイヤーをレンダリング
        const textLayer = new pdfjsLib.TextLayer({
            textContentSource: textContent,
            container: textLayerDiv,
            viewport: viewport,
            textDivs: [],
            textContentItemsStr: [],
            isOffscreenCanvasSupported: false
        });

        await textLayer.render();

        console.log(`Page ${pageNum} rendered with text layer`);
    } catch (error) {
        console.error(`Error rendering page ${pageNum}:`, error);
    }
}

/**
 * ページ送りUIの状態を更新する
 */
function updatePaginationControls() {
    pageNumSpan.textContent = `${currentPage} / ${pdfDoc.numPages}`;
    prevPageBtn.disabled = currentPage <= 1;
    nextPageBtn.disabled = currentPage >= pdfDoc.numPages;
}

// --- コピー機能関連 ---

/**
 * 右クリックメニューを表示する
 */
function showContextMenu(x, y) {
    hideContextMenu(); // 既存のメニューを隠す

    contextMenu = document.createElement('div');
    contextMenu.className = 'context-menu';
    contextMenu.style.left = `${x}px`;
    contextMenu.style.top = `${y}px`;
    contextMenu.addEventListener('mousedown', (e) => {
        // クリックされた要素がメニュー項目でない場合のみ
        if (!e.target.closest('.menu-item')) {
            e.stopPropagation();
            e.preventDefault();
        }
    });

    const selectedText = window.getSelection().toString();
    
    // コピーメニューアイテム
    const copyItem = document.createElement('div');
    copyItem.className = 'context-menu-item';
    copyItem.textContent = 'コピー';
    
    copyItem.addEventListener('mousedown', () => { // 'click'から'mousedown'に変更
        if (!copyItem.classList.contains('disabled')) {
            copySelectedText();
            hideContextMenu();
        }
    });

    if (!selectedText) {
        copyItem.className += ' disabled';
    }

    // 全選択メニューアイテム
    const selectAllItem = document.createElement('div');
    selectAllItem.className = 'context-menu-item';
    selectAllItem.textContent = '全選択';
    selectAllItem.addEventListener('mousedown', () => { // 'click'から'mousedown'に変更
        selectAllText();
        hideContextMenu();
    });

    contextMenu.appendChild(copyItem);
    contextMenu.appendChild(selectAllItem);
    document.body.appendChild(contextMenu);
}

/**
 * 右クリックメニューを隠す
 */
function hideContextMenu() {
    if (contextMenu) {
        contextMenu.remove();
        contextMenu = null;
    }
}

/**
 * 選択されたテキストをクリップボードにコピーする
 */
async function copySelectedText() {
    const selectedText = window.getSelection().toString();
    if (selectedText) {
        try {
            await navigator.clipboard.writeText(selectedText);
            console.log('テキストがクリップボードにコピーされました');
            
            // 成功メッセージを表示（オプション）
            showCopyMessage('テキストがコピーされました');
        } catch (error) {
            console.error('クリップボードへのコピーに失敗しました:', error);
            
            // フォールバック: 従来の方法でコピーを試行
            fallbackCopyText(selectedText);
        }
    }
}

/**
 * テキスト全体を選択する
 */
function selectAllText() {
    const textLayers = document.querySelectorAll('.text-layer');
    if (textLayers.length > 0) {
        const selection = window.getSelection();
        selection.removeAllRanges();
        
        textLayers.forEach(layer => {
            const range = document.createRange();
            range.selectNodeContents(layer);
            selection.addRange(range);
        });
    }
}

/**
 * フォールバック: 従来の方法でテキストをコピーする
 */
function fallbackCopyText(text) {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    document.body.appendChild(textArea);
    textArea.select();
    
    try {
        document.execCommand('copy');
        console.log('フォールバック方法でコピーが成功しました');
        showCopyMessage('テキストがコピーされました');
    } catch (error) {
        console.error('フォールバック方法でもコピーに失敗しました:', error);
        showCopyMessage('コピーに失敗しました');
    }
    
    document.body.removeChild(textArea);
}

/**
 * コピー結果のメッセージを表示する
 */
function showCopyMessage(message) {
    const messageDiv = document.createElement('div');
    messageDiv.textContent = message;
    messageDiv.style.cssText = `
        position: fixed;
        bottom: 20px;
        right: 20px;
        background: #333;
        color: white;
        padding: 10px 15px;
        border-radius: 4px;
        z-index: 1001;
        font-size: 14px;
        opacity: 0;
        transition: opacity 0.3s;
    `;
    
    document.body.appendChild(messageDiv);
    
    // フェードイン
    setTimeout(() => {
        messageDiv.style.opacity = '1';
    }, 100);
    
    // 3秒後にフェードアウト
    setTimeout(() => {
        messageDiv.style.opacity = '0';
        setTimeout(() => {
            if (messageDiv.parentNode) {
                messageDiv.parentNode.removeChild(messageDiv);
            }
        }, 300);
    }, 3000);
}

// --- 拡大・縮小機能関連 ---

/**
 * PDFの表示倍率を更新する
 * @param {number} delta - 倍率の増減値
 */
function updateScale(delta) {
    if (!pdfDoc) return;
    currentScale = Math.max(0.5, Math.min(currentScale + delta, 3.0)); // 最小0.5, 最大3.0
    render();
}

/**
 * PDFの表示倍率をリセットする
 */
function resetScale() {
    if (!pdfDoc) return;
    currentScale = 1.5; // 初期倍率にリセット
    render();
}

// --- PDFダウンロード機能関連 ---

/**
 * 現在表示されているPDFをダウンロードする
 */
async function downloadPdf() {
    if (!pdfDoc) {
        alert('ダウンロードするPDFがありません。');
        return;
    }

    try {
        const pdfData = await pdfDoc.getData();
        const blob = new Blob([pdfData], { type: 'application/pdf' });
        const url = URL.createObjectURL(blob);

        const a = document.createElement('a');
        a.href = url;
        a.download = 'downloaded_pdf.pdf'; // ダウンロードファイル名
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        console.log('PDFがダウンロードされました。');
    } catch (error) {
        console.error('PDFダウンロード中にエラーが発生しました:', error);
        alert('PDFのダウンロード中にエラーが発生しました。');
    }
}
