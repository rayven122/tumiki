// 複数部分TLD（Top Level Domain）のリスト
const MULTI_PART_TLD_ARRAY = [
  // 日本
  "co.jp",
  "or.jp",
  "ne.jp",
  "ac.jp",
  "ad.jp",
  "ed.jp",
  "go.jp",
  "gr.jp",
  "lg.jp",
  // イギリス
  "co.uk",
  "org.uk",
  "me.uk",
  "ac.uk",
  "gov.uk",
  "sch.uk",
  // オーストラリア
  "com.au",
  "net.au",
  "org.au",
  "edu.au",
  "gov.au",
  "asn.au",
  "id.au",
  // カナダ
  "co.ca",
  "net.ca",
  "org.ca",
  "gov.ca",
  "ab.ca",
  "bc.ca",
  "mb.ca",
  "nb.ca",
  "nf.ca",
  "nl.ca",
  "ns.ca",
  "nt.ca",
  "nu.ca",
  "on.ca",
  "pe.ca",
  "qc.ca",
  "sk.ca",
  "yk.ca",
  // インド
  "co.in",
  "net.in",
  "org.in",
  "gov.in",
  "ac.in",
  "edu.in",
  "res.in",
  "mil.in",
  "nic.in",
  // ドイツ
  "com.de",
  "net.de",
  "org.de",
  // フランス
  "com.fr",
  "asso.fr",
  "nom.fr",
  "prd.fr",
  "presse.fr",
  "tm.fr",
  "aeroport.fr",
  "assedic.fr",
  "avocat.fr",
  "avoues.fr",
  "cci.fr",
  "chambagri.fr",
  "chirurgiens-dentistes.fr",
  "experts-comptables.fr",
  "geometre-expert.fr",
  "gouv.fr",
  "greta.fr",
  "huissier-justice.fr",
  "medecin.fr",
  "notaires.fr",
  "pharmacien.fr",
  "port.fr",
  "veterinaire.fr",
  // ブラジル
  "com.br",
  "net.br",
  "org.br",
  "gov.br",
  "edu.br",
  "mil.br",
  "art.br",
  "esp.br",
  "etc.br",
  "eti.br",
  "fim.br",
  "fnd.br",
  "fot.br",
  "fst.br",
  "g12.br",
  "imb.br",
  "ind.br",
  "inf.br",
  "jor.br",
  "lel.br",
  "mat.br",
  "med.br",
  "mus.br",
  "not.br",
  "ntr.br",
  "odo.br",
  "ppg.br",
  "pro.br",
  "psc.br",
  "psi.br",
  "qsl.br",
  "rec.br",
  "slg.br",
  "srv.br",
  "tmp.br",
  "trd.br",
  "tur.br",
  "tv.br",
  "vet.br",
  "zlg.br",
  // 中国
  "com.cn",
  "net.cn",
  "org.cn",
  "edu.cn",
  "gov.cn",
  "mil.cn",
  "ac.cn",
  "ah.cn",
  "bj.cn",
  "cq.cn",
  "fj.cn",
  "gd.cn",
  "gs.cn",
  "gz.cn",
  "gx.cn",
  "ha.cn",
  "hb.cn",
  "he.cn",
  "hi.cn",
  "hk.cn",
  "hl.cn",
  "hn.cn",
  "jl.cn",
  "js.cn",
  "jx.cn",
  "ln.cn",
  "mo.cn",
  "nm.cn",
  "nx.cn",
  "qh.cn",
  "sc.cn",
  "sd.cn",
  "sh.cn",
  "sn.cn",
  "sx.cn",
  "tj.cn",
  "tw.cn",
  "xj.cn",
  "xz.cn",
  "yn.cn",
  "zj.cn",
  // その他よく使用される複数部分TLD
  "co.nz",
  "net.nz",
  "org.nz",
  "ac.nz",
  "govt.nz",
  "geek.nz",
  "gen.nz",
  "kiwi.nz",
  "maori.nz",
  "iwi.nz",
  "school.nz",
  "co.za",
  "net.za",
  "org.za",
  "edu.za",
  "gov.za",
  "mil.za",
  "ac.za",
  "law.za",
  "nom.za",
  "school.za",
  "tm.za",
  "web.za",
];

// O(1)検索のためのSet（パフォーマンス最適化）
// 注意: バンドルサイズ最適化が必要な場合は、動的インポートやtree-shakingを検討
const MULTI_PART_TLD_SET = new Set(MULTI_PART_TLD_ARRAY);

/**
 * 指定されたホスト名が複数部分TLDを持つかチェックする
 * @param hostname - チェック対象のホスト名
 * @returns 複数部分TLDが見つかった場合はその長さ、見つからない場合は0
 */
const getMultiPartTldLength = (hostname: string): number => {
  const lowerHostname = hostname.toLowerCase();

  // 最大で4部分まで（例: pvt.k12.ma.us）チェック
  for (let i = 2; i <= 4; i++) {
    const parts = lowerHostname.split(".");
    if (parts.length >= i) {
      const possibleTld = parts.slice(-i).join(".");
      if (MULTI_PART_TLD_SET.has(possibleTld)) {
        return i;
      }
    }
  }

  return 0;
};

/**
 * サブドメインを除去してルートドメインを取得する関数
 * @param hostname - ホスト名
 * @returns ルートドメインまたは元のホスト名
 */
export const getRootDomain = (hostname: string): string => {
  // IPv4アドレスの場合はそのまま返す
  if (/^\d+\.\d+\.\d+\.\d+$/.test(hostname)) {
    return hostname;
  }

  // localhostの場合はそのまま返す
  if (hostname === "localhost") {
    return hostname;
  }

  const parts = hostname.split(".");

  // ドメインが2つ以下の部分しかない場合（例: example.com）はそのまま返す
  if (parts.length <= 2) {
    return hostname;
  }

  // wwwサブドメインの場合はそのまま返す
  if (parts[0] === "www") {
    return hostname;
  }

  // 複数部分TLDをチェック
  const tldLength = getMultiPartTldLength(hostname);
  if (tldLength > 0) {
    // 複数部分TLD + ドメイン名を返す
    // 例: api.example.co.jp -> example.co.jp (tldLength=2, so take -3 parts)
    return parts.slice(-(tldLength + 1)).join(".");
  }

  // 通常のTLD（.com, .org等）の場合は最後の2つの部分を返す
  // 例: api.example.com -> example.com
  return parts.slice(-2).join(".");
};

/**
 * URLからドメイン名を抽出する関数
 * @param url - 抽出対象のURL
 * @returns ドメイン名またはnull（無効なURLの場合）
 */
export const extractDomainFromUrl = (url: string): string | null => {
  if (!url.trim()) {
    return null;
  }

  try {
    // URLが相対パスの場合やプロトコルがない場合を考慮
    const normalizedUrl = url.startsWith("http") ? url : `https://${url}`;
    const urlObject = new URL(normalizedUrl);
    const hostname = urlObject.hostname;

    // 有効なホスト名かチェック（ドットが含まれているかIPアドレスかlocalhost）
    if (
      !hostname ||
      (!hostname.includes(".") &&
        hostname !== "localhost" &&
        !/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(hostname))
    ) {
      return null;
    }

    // サブドメインを除去してルートドメインを取得
    return getRootDomain(hostname);
  } catch {
    return null;
  }
};

/**
 * ドメイン名から複数のファビコンURLを生成する関数
 * フォールバック戦略に基づいて優先度順にURLを返す
 * @param domain - ドメイン名
 * @param size - ファビコンのサイズ（デフォルト: 32）
 * @returns ファビコンURLの配列（優先度順）
 */
export const getFaviconUrls = (domain: string, size = 32): string[] => {
  if (!domain) return [];

  return [
    // 1. Google Favicon Service (最も信頼性が高い)
    `https://www.google.com/s2/favicons?domain=${domain}&sz=${size}`,
    // 2. DuckDuckGo Favicon Service (バックアップ)
    `https://icons.duckduckgo.com/ip3/${domain}.ico`,
  ];
};

/**
 * URLからファビコンURLのリストを取得する関数
 * @param url - MCPサーバーのURL
 * @param size - ファビコンのサイズ（デフォルト: 32）
 * @returns ファビコンURLの配列
 */
export const getFaviconUrlsFromUrl = (url: string, size = 32): string[] => {
  const domain = extractDomainFromUrl(url);
  return domain ? getFaviconUrls(domain, size) : [];
};
