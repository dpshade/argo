export const defaultBangs = [
  { name: "yt", url: "https://www.youtube.com/results?search_query=%s" },
  { name: "gh", url: "https://github.com/search?q=%s" },
  {
    name: "argh",
    url: "https://github.com/search?q=org:permaweb%20%s&type=code",
  },
  { name: "arwp", url: "https://www.arweave.org/files/arweave-lightpaper.pdf" },
  {
    name: "aowp",
    url: "https://arweave.net/7n6ySzBAkzD4KZoTviHtskVlbdab_yylEQuuy1BvHqc",
  },
  { name: "a", url: "https://www.amazon.com/s?k=%s" },
];

export const defaultSettings = {
  fallbackSearchEngine: "https://duckduckgo.com/?q=%s",
  arweaveExplorer: "ao.link/#/message/%s",
};
