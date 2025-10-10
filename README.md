# Argo

**Argo** is a fast, focused navigation launcher for the Arweave Permaweb. It provides intelligent autocomplete, quicklinks, and filtered search modes for seamless navigation across Permaweb resources.

## Features

### 1. **Multi-Select Filters**
Focus your search with flexible multi-select filters:
- **All** - Show all available suggestions
- **ArNS** - Filter for ArNS domains and undernames
- **Docs** - Quick access to documentation resources
- **Glossary** - Navigate Permaweb terminology and concepts

Click the filter icon to select multiple filters simultaneously, or choose "All" to see everything. Filters work together to show exactly what you need.

### 2. **Transaction Shortcuts**
Fast access to transaction resources when you paste a transaction ID:
- **tx** - View transaction in ViewBlock explorer
- **data** - View transaction data on arweave.net
- **raw** - View raw transaction data
- **msg** - Open transaction in ao.link message viewer

### 3. **ArNS Resolution**
Navigate directly to ArNS names with intelligent autocomplete:
- Type `ardrive` → redirects to `https://ardrive.ar.io`
- Type `permamail` → redirects to `https://permamail.ar.io`
- Real-time suggestions from 10,000+ ArNS domains

### 4. **Undername Support**
Access ArNS undernames seamlessly:
- Type `john_ardrive` → redirects to `https://john_ardrive.ar.io`
- Dynamic undername discovery using AO process queries
- **Mobile**: Undernames display automatically inline beneath their parent ArNS domain
- **Desktop**: Undernames appear in a dedicated side panel when hovering over ArNS domains

### 5. **Automatic Transaction Detection**
Intelligent transaction ID recognition:
- Paste any 43-44 character transaction ID
- Automatically shows transaction shortcuts (tx, data, raw, msg)
- One-click access to different transaction views

### 6. **Intelligent Autocomplete**
Context-aware suggestions as you type:
- ArNS domains with real-time matching
- Undernames for discovered ArNS domains
- Transaction shortcuts when TX ID is detected
- Documentation and glossary results
- Filtered results based on selected filters

### 7. **Headless Mode**
Use Argo as a search endpoint by passing `?q=query` in the URL for programmatic navigation.

### 8. **Dark Mode**
Built-in theme toggle for comfortable viewing in any lighting condition.

## Usage

1. **Filter Selection**: Click the filter icon to select one or more filters (ArNS, Docs, Glossary) or choose "All"
2. **Direct Navigation**: Type an ArNS name like `ardrive` and press Enter
3. **Transaction Lookup**: Paste any 43-44 character transaction ID to see shortcuts (tx, data, raw, msg)
4. **Undername Access**:
   - **Mobile**: Scroll through undernames shown inline beneath ArNS domains
   - **Desktop**: Use arrow keys (← →) to navigate between main suggestions and undername panel
5. **Documentation**: Use filters to quickly find docs and glossary terms
6. **Search**: Type anything else for general web search
7. **Keyboard Navigation**: Use arrow keys to navigate suggestions, Enter to select

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
