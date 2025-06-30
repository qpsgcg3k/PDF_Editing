const pdfUpload = document.getElementById('pdf-upload');
const pdfViewer = document.getElementById('pdf-viewer');
const searchInput = document.getElementById('search-input');
const searchButton = document.getElementById('search-button');
const progressBarContainer = document.getElementById('progress-bar-container');
const progressBar = document.getElementById('progress-bar');
const loadControls = document.getElementById('load-controls');
const loadMoreButton = document.getElementById('load-more-button');
const loadAllButton = document.getElementById('load-all-button');
const pageInfo = document.getElementById('page-info');
const pageNumSpan = document.getElementById('page-num');
const pageCountSpan = document.getElementById('page-count');

let pdfDoc = null;
const scale = 1.5; // This will be adjusted dynamically
let currentPageToRender = 1;
const PAGES_PER_CHUNK = 10;
let isSearching = false;

pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.10.377/pdf.worker.min.js';

async function renderPages(startPage, endPage) {
    for (let num = startPage; num <= endPage; num++) {
        const page = await pdfDoc.getPage(num);
        const a4_width = 826;
        const viewport = page.getViewport({ scale: a4_width / page.getViewport({scale: 1.0}).width });
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        canvas.height = viewport.height;
        canvas.width = viewport.width;
        canvas.classList.add('page');

        const renderContext = {
            canvasContext: ctx,
            viewport: viewport
        };
        await page.render(renderContext).promise;
        pdfViewer.appendChild(canvas);

        // Clean up memory
        page.cleanup();

        pageNumSpan.textContent = num;
        const progress = Math.round((num / pdfDoc.numPages) * 100);
        progressBar.style.width = `${progress}%`;
        progressBar.textContent = `${progress}%`;
    }
}

async function loadPdf(url) {
    pdfViewer.innerHTML = '';
    currentPageToRender = 1;
    loadControls.style.display = 'none';
    pageInfo.style.display = 'none';
    progressBarContainer.style.display = 'block';
    progressBar.style.width = '0%';
    progressBar.textContent = '0%';

    const loadingTask = pdfjsLib.getDocument({
        data: url,
        cMapUrl: 'https://cdn.jsdelivr.net/npm/pdfjs-dist@2.10.377/cmaps/',
        cMapPacked: true,
    });
    pdfDoc = await loadingTask.promise;
    
    pageCountSpan.textContent = pdfDoc.numPages;
    pageInfo.style.display = 'block';

    const initialPagesToRender = Math.min(PAGES_PER_CHUNK, pdfDoc.numPages);
    await renderPages(1, initialPagesToRender);
    currentPageToRender = initialPagesToRender + 1;

    if (currentPageToRender <= pdfDoc.numPages) {
        loadControls.style.display = 'block';
    } else {
        progressBarContainer.style.display = 'none';
    }
}

loadMoreButton.addEventListener('click', async () => {
    const endPage = Math.min(currentPageToRender + PAGES_PER_CHUNK - 1, pdfDoc.numPages);
    await renderPages(currentPageToRender, endPage);
    currentPageToRender = endPage + 1;

    if (currentPageToRender > pdfDoc.numPages) {
        loadControls.style.display = 'none';
        progressBarContainer.style.display = 'none';
    }
});

loadAllButton.addEventListener('click', async () => {
    loadControls.style.display = 'none';
    await renderPages(currentPageToRender, pdfDoc.numPages);
    progressBarContainer.style.display = 'none';
});

pdfUpload.addEventListener('change', e => {
    const file = e.target.files[0];
    if (file.type !== 'application/pdf') {
        console.error(file.name, 'is not a pdf file.');
        return;
    }
    const fileReader = new FileReader();
    fileReader.onload = e => {
        const typedarray = new Uint8Array(e.target.result);
        loadPdf(typedarray);
    };
    fileReader.readAsArrayBuffer(file);
});

let isSearching = false;

async function searchText(text, pageNum) {
    if (pageNum > pdfDoc.numPages) {
        console.log('Search complete.');
        searchButton.disabled = false;
        searchInput.disabled = false;
        isSearching = false;
        progressBarContainer.style.display = 'none';
        return;
    }

    const progress = Math.round(((pageNum - 1) / pdfDoc.numPages) * 100);
    progressBar.style.width = `${progress}%`;
    progressBar.textContent = `Searching... ${progress}%`;

    const page = await pdfDoc.getPage(pageNum);
    const textContent = await page.getTextContent();
    page.cleanup(); // Free up memory

    const textItems = textContent.items;
    for (let i = 0; i < textItems.length; i++) {
        if (textItems[i].str.toLowerCase().includes(text.toLowerCase())) {
            console.log(`Found "${text}" on page ${pageNum}`);
        }
    }

    setTimeout(() => searchText(text, pageNum + 1), 0);
}

searchButton.addEventListener('click', () => {
    if (isSearching) return;

    const searchTerm = searchInput.value;
    if (pdfDoc && searchTerm) {
        isSearching = true;
        searchButton.disabled = true;
        searchInput.disabled = true;

        progressBarContainer.style.display = 'block';
        progressBar.style.width = '0%';
        progressBar.textContent = 'Searching... 0%';

        console.log(`Searching for "${searchTerm}"...`);
        searchText(searchTerm.toLowerCase(), 1);
    }
});
