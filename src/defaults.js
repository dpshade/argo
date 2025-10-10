export const quicklinks = [
  // Search engines
  { name: "g", url: "https://www.google.com/search?q=%s" },
  { name: "ddg", url: "https://duckduckgo.com/?q=%s" },

  // Social & Media
  { name: "yt", url: "https://www.youtube.com/results?search_query=%s" },
  { name: "tw", url: "https://twitter.com/search?q=%s" },
  { name: "reddit", url: "https://www.reddit.com/search?q=%s" },

  // Development
  { name: "gh", url: "https://github.com/search?q=%s" },
  { name: "argh", url: "https://github.com/search?q=org:permaweb%20%s&type=code" },
  { name: "npm", url: "https://www.npmjs.com/search?q=%s" },
  { name: "mdn", url: "https://developer.mozilla.org/en-US/search?q=%s" },

  // Shopping
  { name: "a", url: "https://www.amazon.com/s?k=%s" },

  // Arweave/Permaweb specific
  { name: "tx", url: "https://viewblock.io/arweave/tx/%s" },
  { name: "data", url: "https://arweave.net/%s" },
  { name: "msg", url: "https://ao.link/#/message/%s" },
  { name: "ardrive", url: "https://app.ardrive.io" },
  { name: "aowp", url: "https://arweave.net/7n6ySzBAkzD4KZoTviHtskVlbdab_yylEQuuy1BvHqc" },
  { name: "arwp", url: "https://www.arweave.org/files/arweave-lightpaper.pdf" },
  { name: "viewblock", url: "https://viewblock.io/arweave/tx/%s" },
  { name: "aolink", url: "https://ao.link" },
  { name: "cookbook", url: "https://cookbook_ao.ar.io" },
];

// Keep for backwards compatibility in code
export const defaultBangs = quicklinks;

export const defaultSettings = {
  fallbackSearchEngine: "https://duckduckgo.com/?q=%s",
  arweaveExplorer: "https://viewblock.io/arweave/tx/%s",
};
