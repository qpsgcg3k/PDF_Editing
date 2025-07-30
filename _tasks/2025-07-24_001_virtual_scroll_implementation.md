# Performance Optimization: Virtual Scroll Implementation

**Parent Issue:** #14

## Task List

- [ ] **1. HTML/CSS Preparation**
    - [ ] Create a placeholder style for pages that are not in the viewport.
- [ ] **2. JavaScript Implementation (Virtual Scroll)**
    - [ ] Modify `renderScrollMode` to implement virtual scrolling.
    - [ ] Use the `Intersection Observer API` to detect when a page enters or leaves the viewport.
    - [ ] Implement logic to render only the visible pages and a few buffer pages.
    - [ ] Implement logic to replace pages that are not in the viewport with placeholders.
- [ ] **3. JavaScript Implementation (Render Task Cancellation)**
    - [ ] Manage rendering tasks in a queue.
    - [ ] Implement logic to cancel rendering tasks for pages that scroll out of view quickly.
- [ ] **4. Testing**
    - [ ] Test with a large PDF file to verify performance improvements.
    - [ ] Confirm that both scroll mode and page-turning mode work correctly.
- [ ] **5. Create Implementation Log**
    - [ ] Create `_docs/2025-07-24_001_virtual_scroll_implementation.md` and leave an implementation log.
