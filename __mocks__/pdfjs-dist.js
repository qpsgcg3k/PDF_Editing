const mockRenderTask = {
  promise: new Promise(resolve => setTimeout(resolve, 500)), // Simulate async rendering
  cancel: jest.fn(), // Mock the cancel method
};

const mockRender = jest.fn().mockImplementation(() => mockRenderTask);

const getPageMock = jest.fn().mockImplementation(pageNum => Promise.resolve({
  getViewport: jest.fn().mockReturnValue({ width: 600, height: 800 }),
  render: mockRender, // Use the shared mockRender
  getTextContent: jest.fn().mockResolvedValue({ items: [] }),
}));

module.exports = {
  GlobalWorkerOptions: { workerSrc: '' },
  getDocument: jest.fn().mockImplementation(() => ({
    promise: Promise.resolve({
      numPages: 10,
      getPage: getPageMock,
    }),
  })),
  TextLayer: jest.fn().mockImplementation(() => ({
    render: jest.fn().mockResolvedValue(undefined)
  })),
  // テストから直接アクセスできるようにエクスポート
  __getPageMock: getPageMock,
  __mockRender: mockRender,
  __mockRenderTask: mockRenderTask, // Export the task itself to check cancel
};