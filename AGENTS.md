# AGENTS.md

## Project Overview
Argo is a fast, focused navigation launcher for the Arweave Permaweb. It provides intelligent autocomplete, filtered search modes, and quick launch capabilities for seamless navigation across Permaweb resources.

Built with Vue 3, it focuses on dual functionality: **Discovery** (multi-select filters for finding content) and **Launch** (direct access to ArNS domains, transactions, and future hyperbeam hashpaths).

**Current Features**: Multi-select filters, transaction shortcuts, ArNS resolution, undername support, automatic transaction detection.
**Future Roadmap**: Launch/Find mode split, Hyperbeam integration for device calling via hashpaths.

## Setup Commands
- Install dependencies: `bun install`
- Start dev server: `bun run dev`
- Build for production: `bun run build`
- Preview build: `bun run preview`
- Deploy: `bun run deploy` (builds project, deployment handled by GitHub Actions)

## Code Style
- Vue 3 Composition API with `<script setup>`
- JavaScript (ES6+), no TypeScript
- Use existing composables and helpers from `/src/composables/` and `/src/helpers/`
- Follow established component patterns in `/src/components/`
- Consistent formatting, no semicolons
- Prefer functional patterns where possible

## Testing & Quality
- Build verification: `bun run build` (ensure no build errors)
- Test in browser after dev server starts
- Check Vue DevTools for component issues
- Verify ArNS resolution and AO integration functionality
- Test mobile responsiveness

## Project Structure
```
src/
├── components/          # Vue components
│   ├── ArweaveWalletConnection.vue
│   ├── BangEditor.vue
│   ├── Explorer.vue
│   ├── HeadlessRedirect.vue
│   ├── KeyboardShortcuts.vue
│   ├── LoadingScreen.vue
│   ├── ResultDisplay.vue
│   ├── SearchBar.vue
│   └── UrlForm.vue
├── composables/         # Vue composables
│   ├── useAppState.js
│   ├── useBangs.js
│   ├── useKeyboardShortcuts.js
│   ├── useSearch.js
│   └── useWallet.js
├── helpers/            # Utility functions
│   ├── arnsResolver.js
│   ├── arweaveWallet.js
│   ├── bangHelpers.js
│   ├── cacheModule.js
│   ├── searchLogic.js
│   └── walletManager.js
├── assets/             # Static assets
├── App.vue            # Main app component
├── main.js            # App entry point
├── polyfills.js       # Browser polyfills
└── store.js           # State management
```

## Key Dependencies
- **Vue 3** - Frontend framework
- **@ar.io/sdk** - ArNS resolution and AR.IO integration
- **@permaweb/aoconnect** - AO process integration
- **lodash** - Utility functions
- **Vite** - Build tool and dev server

## Core Features to Maintain

### Discovery Features
- Multi-select filters (All, ArNS, Docs, Glossary)
- ArNS domain resolution with autocomplete (10,000+ domains)
- Undername support (mobile inline, desktop side panel)
- Real-time content filtering and suggestions

### Launch Features  
- Transaction shortcuts (tx, data, raw, msg)
- Automatic transaction ID detection
- Direct ArNS navigation
- Headless mode support

### User Experience
- Dark mode toggle
- Keyboard navigation
- Mobile-first responsive design

### Future Features (Coming Soon)
- Launch/Find mode split for focused workflows
- Hyperbeam integration for hashpath creation and device calling

## Development Guidelines
- Use existing composables for state management
- Follow established patterns in components
- Maintain mobile-first responsive design
- Test ArNS resolution functionality
- Verify AO integration works correctly
- Check keyboard shortcuts functionality
- Ensure dark mode compatibility
- Focus on discovery and launch workflows
- Prepare for future launch/find mode separation

## Security Considerations
- Never commit wallet files or private keys
- Use environment variables for sensitive data
- Follow Arweave security best practices
- Validate user inputs for ArNS names and transaction IDs

## Deployment
- GitHub Actions handle automatic deployment
- Two workflows: `deploy-arweave.yml` and `deploy-vercel.yml`
- Uses permaweb-deploy for Arweave deployment
- No manual deployment required
- Build artifacts go to `/dist` directory

## Common Tasks
- Modifying search logic: Update `useSearch.js` and `searchLogic.js`
- Adding new filters: Update filter components and search logic
- ArNS resolution improvements: Update `arnsResolver.js`
- Transaction handling: Modify transaction detection and shortcut logic
- Styling changes: Modify `/src/assets/styles.css`
- Component updates: Follow existing component patterns
- Preparing for launch/find mode: Plan component separation for future updates

## Legacy Components (Being Phased Out)
- Bang-related functionality (`useBangs.js`, `bangHelpers.js`, `BangEditor.vue`) - Do not extend or enhance
- Focus development on filter-based discovery and direct launch capabilities

## File Patterns to Avoid
- Do not add Lua files (project uses JavaScript/Vue only)
- Do not commit wallet files or private keys
- Avoid adding unrelated project files
- Follow existing .gitignore patterns
- Do not create new bang-related features (focus on filters and launch capabilities)