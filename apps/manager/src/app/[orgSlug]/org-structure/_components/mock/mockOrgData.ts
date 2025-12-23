/**
 * メンバー情報型
 */
export type Member = {
  id: string;
  name: string;
  avatarUrl?: string; // プロフィール画像URL（オプション）
  initials: string; // アバターがない場合のイニシャル（例: "YT"）
};

/**
 * ロール情報型（ノード表示用）
 */
export type Role = {
  roleSlug: string;
  name: string;
};

/**
 * 部署データ型
 */
export type Department = {
  id: string;
  name: string;
  icon: string; // lucide-reactのアイコン名（例: "Building2"）
  color: string;
  leader: Member; // 部署長/責任者
  members: Member[]; // メンバー一覧
  memberCount: number;
  roles?: Role[]; // 割り当てられたロール一覧
  isRoot?: boolean; // ルート組織かどうか
};

/**
 * 部署間の親子関係
 */
export type DepartmentRelation = {
  parentId: string;
  childId: string;
};

/**
 * 組織構造全体のデータ
 */
export type OrgData = {
  departments: Department[];
  relations: DepartmentRelation[];
};

/**
 * モックデータ: 株式会社テックソリューションズの組織構造
 *
 * 階層構造:
 * - 本社 (ルート)
 *   - 開発部
 *     - 開発1課（フロントエンド）
 *     - 開発2課（バックエンド）
 *   - 営業部
 *   - 総務部
 */
export const mockOrgData: OrgData = {
  departments: [
    {
      id: "dept-1",
      name: "本社",
      icon: "Building2",
      color: "#6366f1", // Indigo
      leader: { id: "u1", name: "山田太郎", initials: "YT" },
      members: [
        { id: "u1", name: "山田太郎", initials: "YT" },
        { id: "u2", name: "佐藤花子", initials: "SH" },
        { id: "u3", name: "鈴木一郎", initials: "SI" },
        { id: "u4", name: "田中美咲", initials: "TM" },
        { id: "u5", name: "高橋健太", initials: "TK" },
      ],
      memberCount: 5,
      isRoot: true,
    },
    {
      id: "dept-2",
      name: "開発部",
      icon: "Code2",
      color: "#3b82f6", // Blue
      leader: { id: "u6", name: "伊藤大輔", initials: "ID" },
      members: [
        { id: "u6", name: "伊藤大輔", initials: "ID" },
        { id: "u7", name: "渡辺愛", initials: "WA" },
        { id: "u8", name: "中村翔", initials: "NS" },
        { id: "u9", name: "小林優子", initials: "KY" },
      ],
      memberCount: 4,
    },
    {
      id: "dept-3",
      name: "営業部",
      icon: "Briefcase",
      color: "#8b5cf6", // Purple
      leader: { id: "u10", name: "加藤直樹", initials: "KN" },
      members: [
        { id: "u10", name: "加藤直樹", initials: "KN" },
        { id: "u11", name: "吉田真由", initials: "YM" },
        { id: "u12", name: "山本隆", initials: "YR" },
        { id: "u13", name: "松井花", initials: "MH" },
        { id: "u14", name: "木下誠", initials: "KM" },
        { id: "u15", name: "森本美咲", initials: "MM" },
      ],
      memberCount: 6,
    },
    {
      id: "dept-4",
      name: "総務部",
      icon: "FileText",
      color: "#ec4899", // Pink
      leader: { id: "u16", name: "斎藤香織", initials: "SK" },
      members: [
        { id: "u16", name: "斎藤香織", initials: "SK" },
        { id: "u17", name: "松本剛", initials: "MT" },
        { id: "u18", name: "石井美穂", initials: "IM" },
      ],
      memberCount: 3,
    },
    {
      id: "dept-5",
      name: "開発1課",
      icon: "Monitor",
      color: "#14b8a6", // Teal
      leader: { id: "u19", name: "井上さくら", initials: "IS" },
      members: [
        { id: "u19", name: "井上さくら", initials: "IS" },
        { id: "u20", name: "木村拓也", initials: "KT" },
        { id: "u21", name: "林美穂", initials: "HM" },
        { id: "u22", name: "清水悠太", initials: "SY" },
        { id: "u23", name: "森下莉子", initials: "MR" },
        { id: "u24", name: "池田航", initials: "IW" },
        { id: "u25", name: "石川奈々", initials: "IN" },
      ],
      memberCount: 7,
    },
    {
      id: "dept-6",
      name: "開発2課",
      icon: "Database",
      color: "#f59e0b", // Amber
      leader: { id: "u26", name: "前田信也", initials: "MN" },
      members: [
        { id: "u26", name: "前田信也", initials: "MN" },
        { id: "u27", name: "岡田彩花", initials: "OA" },
        { id: "u28", name: "長谷川誠", initials: "HM" },
        { id: "u29", name: "中島健太", initials: "NK" },
        { id: "u30", name: "橋本優子", initials: "HY" },
      ],
      memberCount: 5,
    },
  ],
  relations: [
    { parentId: "dept-1", childId: "dept-2" },
    { parentId: "dept-1", childId: "dept-3" },
    { parentId: "dept-1", childId: "dept-4" },
    { parentId: "dept-2", childId: "dept-5" },
    { parentId: "dept-2", childId: "dept-6" },
  ],
};
