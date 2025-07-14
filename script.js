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

// アプリケーションの状態管理
let pdfDoc = null;
let currentPage = 1;
let viewMode = 'scroll'; // 'scroll' or 'page'
let contextMenu = null;

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
        showContextMenu(event.clientX, event.clientY);
    }
});

document.addEventListener('click', () => {
    hideContextMenu();
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

// --- レンダリング関数 ---

function render() {
    if (!pdfDoc) return;

    viewerContainer.innerHTML = '';

    if (viewMode === 'scroll') {
        document.body.classList.remove('page-view-mode');
        renderScrollMode();
    } else {
        document.body.classList.add('page-view-mode');
        renderPageMode();
    }
}

async function renderScrollMode() {
    paginationControls.classList.add('hidden');
    for (let i = 1; i <= pdfDoc.numPages; i++) {
        await renderCanvasPage(i);
    }
}

async function renderPageMode() {
    viewerContainer.innerHTML = '';
    paginationControls.classList.remove('hidden');
    await renderCanvasPage(currentPage);
    updatePaginationControls();
}

async function renderCanvasPage(pageNum) {
    try {
        const page = await pdfDoc.getPage(pageNum);
        const viewport = page.getViewport({ scale: 1.5 });

        const pageContainer = document.createElement('div');
        pageContainer.className = 'page-container';
        pageContainer.style.position = 'relative';
        pageContainer.style.width = `${viewport.width}px`;
        pageContainer.style.height = `${viewport.height}px`;
        pageContainer.style.margin = '0 auto';
        if (viewMode === 'scroll') {
            pageContainer.style.marginBottom = '20px';
        }

        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        canvas.height = viewport.height;
        canvas.width = viewport.width;
        canvas.style.display = 'block';
        canvas.style.border = '1px solid #ccc';

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

        pageContainer.appendChild(canvas);
        pageContainer.appendChild(textLayerDiv);
        viewerContainer.appendChild(pageContainer);

        await page.render({
            canvasContext: ctx,
            viewport: viewport,
        }).promise;

        const textContent = await page.getTextContent();
        
        // 最新版のTextLayer APIに対応
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

function updatePaginationControls() {
    pageNumSpan.textContent = `${currentPage} / ${pdfDoc.numPages}`;
    prevPageBtn.disabled = currentPage <= 1;
    nextPageBtn.disabled = currentPage >= pdfDoc.numPages;
}

// --- コピー機能関連 ---

function showContextMenu(x, y) {
    hideContextMenu();

    contextMenu = document.createElement('div');
    contextMenu.className = 'context-menu';
    contextMenu.style.left = `${x}px`;
    contextMenu.style.top = `${y}px`;

    const selectedText = window.getSelection().toString();
    
    const copyItem = document.createElement('div');
    copyItem.className = 'context-menu-item';
    copyItem.textContent = 'コピー';
    if (selectedText) {
        copyItem.addEventListener('click', () => {
            copySelectedText();
            hideContextMenu();
        });
    } else {
        copyItem.className += ' disabled';
    }

    const selectAllItem = document.createElement('div');
    selectAllItem.className = 'context-menu-item';
    selectAllItem.textContent = '全選択';
    selectAllItem.addEventListener('click', () => {
        selectAllText();
        hideContextMenu();
    });

    contextMenu.appendChild(copyItem);
    contextMenu.appendChild(selectAllItem);
    document.body.appendChild(contextMenu);
}

function hideContextMenu() {
    if (contextMenu) {
        contextMenu.remove();
        contextMenu = null;
    }
}

async function copySelectedText() {
    const selectedText = window.getSelection().toString();
    if (selectedText) {
        try {
            await navigator.clipboard.writeText(selectedText);
            console.log('テキストがクリップボードにコピーされました');
            showCopyMessage('テキストがコピーされました');
        } catch (error) {
            console.error('クリップボードへのコピーに失敗しました:', error);
            fallbackCopyText(selectedText);
        }
    }
}

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
    
    setTimeout(() => {
        messageDiv.style.opacity = '1';
    }, 100);
    
    setTimeout(() => {
        messageDiv.style.opacity = '0';
        setTimeout(() => {
            if (messageDiv.parentNode) {
                messageDiv.parentNode.removeChild(messageDiv);
            }
        }, 300);
    }, 3000);
}