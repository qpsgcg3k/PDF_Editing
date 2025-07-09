import * as pdfjsLib from 'https://cdn.jsdelivr.net/npm/pdfjs-dist@4.4.168/build/pdf.min.mjs';

// PDF.jsの補助プログラム（Worker）の場所を指定
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdn.jsdelivr.net/npm/pdfjs-dist@4.4.168/build/pdf.worker.min.mjs';

const pdfUpload = document.getElementById('pdf-upload');

pdfUpload.addEventListener('change', async (event) => {
    const file = event.target.files[0];
    if (!file || file.type !== 'application/pdf') {
        alert('PDFファイルを選択してください。');
        return;
    }

    const viewerContainer = document.getElementById('viewer-container');
    viewerContainer.innerHTML = ''; // Clear previous PDF

    const fileReader = new FileReader();
    fileReader.onload = async function() {
        try {
            const typedarray = new Uint8Array(this.result);
            const pdf = await pdfjsLib.getDocument({
                data: typedarray,
                cMapUrl: 'https://cdn.jsdelivr.net/npm/pdfjs-dist@4.4.168/cmaps/',
                cMapPacked: true,
            }).promise;

            for (let i = 1; i <= pdf.numPages; i++) {
                const page = await pdf.getPage(i);
                const viewport = page.getViewport({ scale: 1.5 });

                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                canvas.height = viewport.height;
                canvas.width = viewport.width;
                canvas.style.marginBottom = '20px';

                viewerContainer.appendChild(canvas);

                await page.render({
                    canvasContext: ctx,
                    viewport: viewport,
                }).promise;
                console.log(`Page ${i} rendered`);
            }
        } catch (error) {
            console.error('Error rendering PDF:', error);
            alert('PDFの読み込みまたは表示中にエラーが発生しました。');
        }
    };
    fileReader.readAsArrayBuffer(file);
});