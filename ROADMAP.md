# Argo Roadmap

This roadmap outlines planned features, improvements, and fixes for Argo.

## Active Issues

### 1. Update Logo and Favicon
[Issue #1](https://github.com/dpshade/argo/issues/1)

Replace the current logo and favicon with a new design that better represents Argo as a Permaweb navigation launcher.

**Priority:** Medium
**Status:** Open

**Tasks:**
- Design or source new logo
- Create favicon in multiple sizes (16x16, 32x32, 192x192, 512x512)
- Update logo in header/navbar
- Update favicon files and references in index.html
- Ensure logo works well in both light and dark modes

---

### 2. Fix Mobile Primary Screen
[Issue #2](https://github.com/dpshade/argo/issues/2)

The search bar should render similarly to desktop on the primary screen, but maintain full-screen mode when focused.

**Priority:** High
**Status:** Open

**Current Behavior:**
- Mobile has different default rendering
- Search bar appearance inconsistent with desktop

**Expected Behavior:**
- Search bar renders like desktop on primary screen
- Full-screen mode activates only when user focuses/taps the search input
- Maintains existing full-screen functionality for better mobile UX

---

### 3. Fix Permawebfuel Docs for AR.IO
[Issue #3](https://github.com/dpshade/argo/issues/3)

Improve permawebfuel documentation integration, specifically for AR.IO related content.

**Priority:** Medium
**Status:** Open

**Issues:**
- AR.IO specific documentation may not be properly indexed or displayed
- Documentation search results need better filtering/relevance
- Potential gaps in AR.IO SDK and gateway documentation

**Related Files:**
- `src/helpers/docsModule.js`
- Documentation source: https://fuel_permawebllms.arweave.net/docs-index.json

---

### 4. Consider Additional Filter Options
[Issue #4](https://github.com/dpshade/argo/issues/4)

Evaluate and potentially implement additional filter options to improve search experience.

**Priority:** Low
**Status:** Open

**Current Filters:**
- All
- ArNS
- Docs
- Glossary

**Potential New Filters:**
- Transactions (separate TX shortcuts from general results)
- AO (AO-specific resources and processes)
- Apps/DApps (Permaweb applications)
- Bookmarks/Favorites (user-saved items)
- Recent/History (recently visited)

---

### 5. Optimize Search Performance
[Issue #5](https://github.com/dpshade/argo/issues/5)

Improve search performance and responsiveness across all search operations.

**Priority:** High
**Status:** Open

**Performance Areas:**

1. **ArNS Domain Search**
   - Optimize search algorithm for 3,879+ domains
   - Implement fuzzy matching more efficiently
   - Consider indexing or caching strategies

2. **Undername Fetching**
   - Implement retry logic with exponential backoff for failed fetches
   - Add request debouncing/throttling to prevent API spam
   - Cache successful responses with TTL
   - Handle CORS/503 errors more gracefully

3. **Documentation Search**
   - Optimize docs index loading and searching
   - Implement lazy loading for large documentation sets
   - Consider web workers for heavy search operations

4. **Glossary Search**
   - Optimize 232+ glossary term searches
   - Improve search relevance scoring

5. **General Optimizations**
   - Debounce search input appropriately
   - Minimize re-renders in Vue components
   - Profile and optimize computed properties
   - Consider virtualization for long suggestion lists
   - Optimize bundle size and lazy load modules

---

## Recently Completed

### Mobile Undername Display
**Completed:** 2025-10-10

- Fixed Vue reactivity for automatic inline undername display on mobile
- Undernames now appear inline beneath parent ArNS domains on mobile
- Desktop maintains side panel for undernames

### Multi-Select Filters
**Completed:** 2025-10-10

- Replaced single-mode search with multi-select filter system
- Users can now select multiple filters simultaneously (ArNS, Docs, Glossary)
- Improved search flexibility and UX

### Failed Fetch Handling
**Completed:** 2025-10-10

- Removed caching of failed undername fetches
- System now retries when network errors occur
- Better handling of CORS/503 errors from AO testnet

---

## Future Considerations

- **Browser Extension:** Package Argo as a browser extension for easier access
- **Keyboard Shortcuts:** Global keyboard shortcuts for power users
- **Custom Search Engines:** Allow users to configure their own search endpoints
- **Bookmarks/Favorites:** Save frequently accessed ArNS domains
- **Search History:** Track and suggest recently visited resources
- **PWA Support:** Make Argo installable as a Progressive Web App
- **Offline Mode:** Cache ArNS domains and docs for offline access
- **Analytics:** Optional privacy-respecting usage analytics
- **Themes:** Additional theme options beyond dark/light mode
- **Export/Import Settings:** Sync settings across devices

---

## Contributing

We welcome contributions! If you'd like to work on any of these items or suggest new features:

1. Check the [Issues](https://github.com/dpshade/argo/issues) page
2. Comment on an issue you'd like to work on
3. Submit a pull request with your changes

## Versioning

This roadmap is subject to change based on user feedback and project priorities. Issues are tracked on GitHub and this document will be updated as items are completed or priorities shift.
