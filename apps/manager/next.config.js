/** @type {import("next").NextConfig} */
const config = {
  // 静的アセットのgzip圧縮を有効化（60-80%のファイルサイズ削減）
  compress: true,
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "www.google.com",
        pathname: "/s2/favicons",
      },
      {
        protocol: "https",
        hostname: "icons.duckduckgo.com",
        pathname: "/ip3/**",
      },
    ],
  },
};

export default config;
