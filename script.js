
import * as pdfjsLib from 'https://cdn.jsdelivr.net/npm/pdfjs-dist@4.4.168/build/pdf.min.mjs';

// PDF.jsの補助プログラム（Worker）の場所を指定
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdn.jsdelivr.net/npm/pdfjs-dist@4.4.168/build/pdf.worker.min.mjs';

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
let scale = 1.5;

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
                cMapUrl: 'https://cdn.jsdelivr.net/npm/pdfjs-dist@4.4.168/cmaps/',
                cMapPacked: true,
            });
            pdfDoc = await loadingTask.promise;
            currentPage = 1;
            scale = 1.5;
            render();
            downloadPdfBtn.classList.remove('hidden');
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

// 拡大ボタンクリック時の処理
zoomInBtn.addEventListener('click', () => {
    scale += 0.1;
    render();
});

// 縮小ボタンクリック時の処理
zoomOutBtn.addEventListener('click', () => {
    if (scale <= 0.2) return;
    scale -= 0.1;
    render();
});

// リセットボタンクリック時の処理
zoomResetBtn.addEventListener('click', () => {
    scale = 1.5;
    render();
});

// PDFダウンロードボタンクリック時の処理
downloadPdfBtn.addEventListener('click', async () => {
    if (!pdfDoc) return;

    try {
        const originalData = await pdfDoc.getData();
        const blob = new Blob([originalData], { type: 'application/pdf' });
        const url = URL.createObjectURL(blob);

        const a = document.createElement('a');
        a.href = url;
        a.download = 'downloaded.pdf'; // ダウンロードファイル名
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    } catch (error) {
        console.error('Error downloading PDF:', error);
        alert('PDFのダウンロード中にエラーが発生しました。');
    }
});


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
 * 指定されたページ番号のPDFをCanvasに描画する共通関数
 * @param {number} pageNum - 描画するページ番号
 */
async function renderCanvasPage(pageNum) {
    try {
        const page = await pdfDoc.getPage(pageNum);
        const viewport = page.getViewport({ scale: scale });

        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        canvas.height = viewport.height;
        canvas.width = viewport.width;

        viewerContainer.appendChild(canvas);

        await page.render({
            canvasContext: ctx,
            viewport: viewport,
        }).promise;
        console.log(`Page ${pageNum} rendered with scale ${scale}`);
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
