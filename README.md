# Argo

**Argo** is a fast, simple navigation launcher for the Arweave Permaweb. It provides intelligent autocomplete and quicklinks for seamless navigation across Permaweb resources.

## Features

### 1. **Quicklinks**
Fast navigation using bang-style shortcuts. Type `!` followed by a keyword:
- `!gh permaweb` - Search GitHub
- `!yt ao explained` - Search YouTube
- `!a laptop` - Search Amazon
- And many more...

### 2. **ArNS Resolution**
Navigate directly to ArNS names:
- Type `ardrive` → redirects to `https://ardrive.ar.io`
- Type `permamail` → redirects to `https://permamail.ar.io`

### 3. **Undername Support**
Access ArNS undernames seamlessly:
- Type `john_ardrive` → redirects to `https://john_ardrive.ar.io`

### 4. **Transaction ID Handling**
Paste any Arweave transaction ID (43 characters) and it will automatically open in your configured explorer.

### 5. **Special Commands**
- `!tx <txid>` - Open transaction in block explorer
- `!data <txid>` - Open raw transaction data
- `!msg <msgid>` - Open message in ao.link

### 6. **Intelligent Autocomplete**
As you type, Argo suggests:
- Matching quicklinks
- ArNS domains
- Undernames
- Recent searches

### 7. **Headless Mode**
Use Argo as a search endpoint by passing `?q=query` in the URL.

### 8. **Dark Mode**
Toggle between light and dark themes for comfortable viewing.

## Usage

1. **Direct Navigation**: Type an ArNS name like `ardrive` and press Enter
2. **Quicklinks**: Use `!` shortcuts like `!gh search term`
3. **Search**: Type anything else to search using your fallback search engine
4. **Keyboard Shortcuts**: Press `/` to focus the search bar

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
