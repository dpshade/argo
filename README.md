# Argo

**Argo** is a fast, focused navigation launcher for the Arweave Permaweb. It provides intelligent autocomplete, quicklinks, and filtered search modes for seamless navigation across Permaweb resources.

## Features

### Core Discovery

**Multi-Select Filters**
Focus your search with flexible multi-select filters:
- **All** - Show all available suggestions
- **ArNS** - Filter for ArNS domains and undernames
- **Docs** - Quick access to documentation resources
- **Glossary** - Navigate Permaweb terminology and concepts

Click the filter icon to select multiple filters simultaneously, or choose "All" to see everything. Filters work together to show exactly what you need.

**ArNS Resolution**
Navigate directly to ArNS names with intelligent autocomplete:
- Type `ardrive` → redirects to `https://ardrive.ar.io`
- Type `permamail` → redirects to `https://permamail.ar.io`
- Real-time suggestions from 10,000+ ArNS domains

**Undername Support**
Access ArNS undernames seamlessly:
- Type `john_ardrive` → redirects to `https://john_ardrive.ar.io`
- Dynamic undername discovery using AO process queries
- **Mobile**: Undernames display automatically inline beneath their parent ArNS domain
- **Desktop**: Undernames appear in a dedicated side panel when hovering over ArNS domains

### Quick Launch

**Transaction Shortcuts**
Fast access to transaction resources when you paste a transaction ID:
- **tx** - View transaction in ViewBlock explorer
- **data** - View transaction data on arweave.net
- **raw** - View raw transaction data
- **msg** - Open transaction in ao.link message viewer

**Automatic Transaction Detection**
Intelligent transaction ID recognition:
- Paste any 43-44 character transaction ID
- Automatically shows transaction shortcuts (tx, data, raw, msg)
- One-click access to different transaction views

**HyperBEAM Launcher**
Build and execute HyperBEAM hashpaths with intelligent autocomplete:
- Device name suggestions (~json@1.0, ~cron@1.0, ~process@1.0, etc.)
- Operation autocomplete for each device (serialize, deserialize, compute, etc.)
- Parameter hints showing required/optional parameters
- Path-aware cursor tracking for complex hashpaths
- Support for 13 devices:
  - **Codec Devices**: json@1.0, ans104@1.0, httpsig@1.0, structured@1.0, flat@1.0
  - **Core Devices**: cron@1.0, cache@1.0, meta@1.0, message@1.0, process@1.0, scheduler@1.0, relay@1.0, router@1.0

**Example HyperBEAM Paths:**
```
/~json@1.0/serialize/           # Serialize message to JSON
/~cron@1.0/once/                # Schedule one-time execution
/txid/~json@1.0/deserialize/    # Deserialize transaction data
/~process@1.0/compute/          # Execute process computation
```

### Advanced Features

**Headless Mode**
Use Argo as a search endpoint by passing `?q=query` in the URL for programmatic navigation.

**Dark Mode**
Built-in theme toggle for comfortable viewing in any lighting condition.

**Keyboard Navigation**
Use arrow keys to navigate suggestions, Enter to select, with full keyboard accessibility.

**Mobile-First Design**
Responsive design that works seamlessly across all devices.

## Usage

1. **Filter Selection**: Click the filter icon to select one or more filters (ArNS, Docs, Glossary) or choose "All"
2. **Direct Navigation**: Type an ArNS name like `ardrive` and press Enter
3. **Transaction Lookup**: Paste any 43-44 character transaction ID to see shortcuts (tx, data, raw, msg)
4. **HyperBEAM Launcher** (press `Ctrl+H` or click HyperBEAM button):
   - Type `/~` to see device suggestions
   - Select a device with Tab or Enter
   - Continue typing to see operation suggestions
   - Build complex paths: `/~json@1.0/serialize/`
   - Press Enter to launch the hashpath at forward.computer
5. **Undername Access**:
   - **Mobile**: Scroll through undernames shown inline beneath ArNS domains
   - **Desktop**: Use arrow keys (← →) to navigate between main suggestions and undername panel
6. **Documentation**: Use filters to quickly find docs and glossary terms
7. **Search**: Type anything else for general web search
8. **Keyboard Navigation**: Use arrow keys to navigate suggestions, Enter to select

## Why Argo?

Named after the legendary ship from Greek mythology, Argo is your vessel for navigating the Permaweb. It combines speed, simplicity, and smart suggestions to make Permaweb navigation effortless.

## Technology

Built with:
- Vue 3
- @ar.io/sdk for ArNS resolution
- @permaweb/aoconnect for ao integration
- Vite for blazing fast builds

## Development

### Setup Commands
- Install dependencies: `bun install`
- Start dev server: `bun run dev`
- Build for production: `bun run build`
- Preview build: `bun run preview`

### Code Style
- Vue 3 Composition API with `<script setup>`
- JavaScript (ES6+), no TypeScript
- Use existing composables and helpers from `/src/composables/` and `/src/helpers/`
- Follow established component patterns in `/src/components/`
- Consistent formatting, no semicolons
- Prefer functional patterns where possible

### Testing & Quality
- Build verification: `bun run build` (ensure no build errors)
- Test in browser after dev server starts
- Check Vue DevTools for component issues
- Verify ArNS resolution and AO integration functionality
- Test mobile responsiveness

## Deployment

- GitHub Actions handle automatic deployment
- Two workflows: `deploy-arweave.yml` and `deploy-vercel.yml`
- Uses permaweb-deploy for Arweave deployment
- No manual deployment required
- Build artifacts go to `/dist` directory

## Future Plans

### Launch/Find Mode Split
Separate input modes for discovery vs. direct launching, providing more focused user experiences for different use cases.

### Enhanced HyperBEAM Integration
Build on the current HyperBEAM launcher with:
- **Dynamic Operation Fetching**: Query `/~device@version/info/keys` endpoints for real-time operation discovery
- **YAML Spec Integration**: Auto-generate device catalog from HyperBEAM YAML specifications when device_yml branch merges
- **Parameter Validation**: Runtime validation using device schemas
- **HTTP Method Indicators**: Show GET/POST badges for operations
- **Usage Examples**: Display recipe examples from device specs
- **More Devices**: Expand beyond the current 13 devices to cover all HyperBEAM devices

### Enhanced Filtering
Improve filter capabilities with more granular options and smarter content categorization.

## Contributing

We welcome contributions! If you'd like to work on any of these items or suggest new features:

1. Check the [Issues](https://github.com/dpshade/argo/issues) page
2. Comment on an issue you'd like to work on
3. Submit a pull request with your changes

## License

MIT