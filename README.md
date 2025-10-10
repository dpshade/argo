# Argo

**Argo** is a fast, focused navigation launcher for the Arweave Permaweb. It provides intelligent autocomplete, quicklinks, and filtered search modes for seamless navigation across Permaweb resources.

## Features

### 1. **Filter Modes**
Focus your search with dedicated filter modes:
- **All** - Show all available suggestions
- **Arweave** - Filter for transaction commands (tx, raw data, block explorer)
- **ArNS** - Filter for ArNS domains and undernames only
- **Docs** - Quick access to documentation resources
- **Glossary** - Navigate Permaweb terminology and concepts

Click the filter icon on the left of the search bar to select your mode.

### 2. **Quicklinks**
Fast navigation using shortcut syntax:
- `g search term` - Google search
- `gh permaweb` - Search GitHub
- `yt ao explained` - Search YouTube
- `a laptop` - Search Amazon
- 20+ pre-configured quicklinks for common destinations

### 3. **ArNS Resolution**
Navigate directly to ArNS names with intelligent autocomplete:
- Type `ardrive` → redirects to `https://ardrive.ar.io`
- Type `permamail` → redirects to `https://permamail.ar.io`
- Real-time suggestions from 10,000+ ArNS domains

### 4. **Undername Support**
Access ArNS undernames seamlessly:
- Type `john_ardrive` → redirects to `https://john_ardrive.ar.io`
- Dynamic undername discovery using AO process queries

### 5. **Transaction Commands**
Specialized commands for Arweave transaction handling:
- `tx` - Open transaction in ao.link message viewer (paste from clipboard)
- `!tx` - Open raw transaction data (paste from clipboard)
- `!raw` - Open raw data endpoint (paste from clipboard)
- Automatic detection: paste any 43-44 character transaction ID

### 6. **Intelligent Autocomplete**
Context-aware suggestions as you type:
- Matching quicklinks with descriptions
- ArNS domains and undernames
- Transaction commands
- Filtered results based on selected mode

### 7. **Headless Mode**
Use Argo as a search endpoint by passing `?q=query` in the URL for programmatic navigation.

### 8. **Dark Mode**
Built-in theme toggle for comfortable viewing in any lighting condition.

## Usage

1. **Filter Selection**: Click the filter icon to choose your search mode (All, Arweave, ArNS, Docs, Glossary)
2. **Direct Navigation**: Type an ArNS name like `ardrive` and press Enter
3. **Quicklinks**: Type shortcuts like `gh search term` or `yt video topic`
4. **Transaction Lookup**: Type `tx`, `!tx`, or `!raw` then paste a transaction ID
5. **Search**: Type anything else to search using your fallback search engine
6. **Keyboard Navigation**: Use arrow keys to navigate suggestions, Enter to select

## Why Argo?

Named after the legendary ship from Greek mythology, Argo is your vessel for navigating the Permaweb. It combines speed, simplicity, and smart suggestions to make Permaweb navigation effortless.

## Technology

Built with:
- Vue 3
- @ar.io/sdk for ArNS resolution
- @permaweb/aoconnect for ao integration
- Vite for blazing fast builds

## Contributing

Contributions are welcome! Feel free to submit issues or pull requests.

## License

MIT
