"use client";

import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { SuccessAnimation } from "@/app/_components/ui/SuccessAnimation";
import {
  Users,
  Shield,
  Settings,
  Code,
  Edit2,
  Trash2,
  MoreVertical,
  UserPlus,
  Server,
  Check,
  Github,
  MessageSquare,
  Database,
  FolderOpen,
  Globe,
  X,
  Search,
  Filter,
  Clock,
  Mail,
  AlertCircle,
  Plus,
  ChevronDown,
  ChevronUp,
  Wrench,
} from "lucide-react";

type Role = "admin" | "editor" | "viewer" | string;

type TeamMember = {
  id: string;
  name: string;
  email: string;
  role: Role;
  avatar?: string;
  department?: string;
  joinedAt: string;
  status: "active" | "invited" | "inactive";
  lastLogin?: string;
  invitedBy?: string;
};

const mockTeamMembers: TeamMember[] = [
  {
    id: "1",
    name: "田中 太郎",
    email: "tanaka@example.com",
    role: "admin",
    department: "経営企画部",
    joinedAt: "2023-01-15",
    avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop",
    status: "active",
    lastLogin: "2分前",
  },
  {
    id: "2",
    name: "佐藤 花子",
    email: "sato@example.com",
    role: "editor",
    department: "マーケティング部",
    joinedAt: "2023-03-20",
    avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&h=150&fit=crop",
    status: "active",
    lastLogin: "1時間前",
  },
  {
    id: "3",
    name: "鈴木 一郎",
    email: "suzuki@example.com",
    role: "viewer",
    department: "営業部",
    joinedAt: "2023-06-10",
    avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&h=150&fit=crop",
    status: "active",
    lastLogin: "3日前",
  },
  {
    id: "4",
    name: "高橋 美咲",
    email: "takahashi@example.com",
    role: "editor",
    department: "開発部",
    joinedAt: "2023-08-05",
    avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&h=150&fit=crop",
    status: "invited",
    invitedBy: "田中 太郎",
  },
  {
    id: "5",
    name: "山田 健太",
    email: "yamada@example.com",
    role: "viewer",
    department: "カスタマーサポート部",
    joinedAt: "2023-11-12",
    avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop",
    status: "inactive",
    lastLogin: "30日前",
  },
];

const roleLabels: Record<Role, string> = {
  admin: "管理者",
  editor: "編集者",
  viewer: "閲覧者",
};

const roleColors: Record<Role, string> = {
  admin: "bg-red-100 text-red-800",
  editor: "bg-blue-100 text-blue-800",
  viewer: "bg-gray-100 text-gray-800",
};

type MCPTool = {
  name: string;
  description?: string;
  inputSchema?: any;
};

type MCPServer = {
  id: string;
  name: string;
  description: string;
  logo?: string;
  icon?: React.ComponentType<any>;
  color: string;
  bgColor: string;
  isCustom?: boolean;
  createdBy?: string;
  createdAt?: string;
  tools?: MCPTool[];
};

const mockMCPServers: MCPServer[] = [
  {
    id: "1",
    name: "GitHub API",
    description: "GitHubリポジトリへのアクセス",
    logo: "/logos/github.svg",
    color: "text-gray-900",
    bgColor: "bg-gray-100",
    tools: [
      { name: "create_repository", description: "新しいリポジトリを作成" },
      { name: "get_repository", description: "リポジトリ情報を取得" },
      { name: "list_issues", description: "Issueの一覧を取得" },
      { name: "create_issue", description: "新しいIssueを作成" },
      { name: "create_pull_request", description: "プルリクエストを作成" },
      { name: "merge_pull_request", description: "プルリクエストをマージ" },
    ],
  },
  {
    id: "2",
    name: "Slack Integration",
    description: "Slack通知とメッセージング",
    logo: "/logos/slack.svg",
    color: "text-purple-600",
    bgColor: "bg-purple-100",
    tools: [
      { name: "send_message", description: "チャンネルにメッセージを送信" },
      { name: "send_direct_message", description: "ダイレクトメッセージを送信" },
      { name: "list_channels", description: "チャンネル一覧を取得" },
      { name: "create_channel", description: "新しいチャンネルを作成" },
      { name: "upload_file", description: "ファイルをアップロード" },
    ],
  },
  {
    id: "3",
    name: "PostgreSQL",
    description: "データベースへの読み書き",
    logo: "/logos/postgresql.svg",
    color: "text-blue-600",
    bgColor: "bg-blue-100",
    tools: [
      { name: "execute_query", description: "SQLクエリを実行" },
      { name: "create_table", description: "新しいテーブルを作成" },
      { name: "insert_data", description: "データを挿入" },
      { name: "update_data", description: "データを更新" },
      { name: "delete_data", description: "データを削除" },
      { name: "backup_database", description: "データベースをバックアップ" },
    ],
  },
  {
    id: "4",
    name: "Google Drive",
    description: "ファイルストレージアクセス",
    logo: "/logos/google-drive.svg",
    color: "text-amber-600",
    bgColor: "bg-amber-100",
    tools: [
      { name: "list_files", description: "ファイル一覧を取得" },
      { name: "upload_file", description: "ファイルをアップロード" },
      { name: "download_file", description: "ファイルをダウンロード" },
      { name: "delete_file", description: "ファイルを削除" },
      { name: "share_file", description: "ファイルを共有" },
      { name: "create_folder", description: "フォルダを作成" },
    ],
  },
  {
    id: "5",
    name: "Docker",
    description: "コンテナ管理とデプロイ",
    logo: "/logos/docker.svg",
    color: "text-blue-500",
    bgColor: "bg-blue-50",
    tools: [
      { name: "list_containers", description: "コンテナ一覧を取得" },
      { name: "start_container", description: "コンテナを開始" },
      { name: "stop_container", description: "コンテナを停止" },
      { name: "build_image", description: "イメージをビルド" },
      { name: "deploy_service", description: "サービスをデプロイ" },
      { name: "view_logs", description: "ログを表示" },
    ],
  },
  {
    id: "custom-1",
    name: "社内API Gateway",
    description: "内部システムへのアクセス",
    color: "text-indigo-600",
    bgColor: "bg-indigo-100",
    isCustom: true,
    createdBy: "田中 太郎",
    createdAt: "2024-01-15",
    tools: [
      { name: "get_user_info", description: "ユーザー情報を取得" },
      { name: "update_user_profile", description: "ユーザープロフィールを更新" },
      { name: "get_department_list", description: "部署一覧を取得" },
      { name: "send_notification", description: "社内通知を送信" },
    ],
  },
  {
    id: "custom-2",
    name: "監査ログシステム",
    description: "セキュリティログの管理",
    color: "text-red-600",
    bgColor: "bg-red-100",
    isCustom: true,
    createdBy: "佐藤 花子",
    createdAt: "2024-02-20",
    tools: [
      { name: "query_audit_logs", description: "監査ログを検索" },
      { name: "export_logs", description: "ログをエクスポート" },
      { name: "create_alert", description: "アラートを作成" },
      { name: "generate_report", description: "レポートを生成" },
    ],
  },
];

const defaultMCPsByRole: Record<Role, string[]> = {
  admin: ["1", "2", "3", "4", "5", "custom-1", "custom-2"],
  editor: ["1", "2", "4", "custom-1"],
  viewer: ["1"],
};

const RolesPage = () => {
  const searchParams = useSearchParams();
  const orgId = searchParams.get("org");
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>(mockTeamMembers);
  const [selectedMember, setSelectedMember] = useState<string | null>(null);
  
  // カスタムロールのMCP設定も含めた初期化
  const initialRoleMCPs = {
    ...defaultMCPsByRole,
    "custom-demo-1": [],
    "custom-demo-2": []
  };
  
  const [roleMCPs, setRoleMCPs] = useState<Record<string, string[]>>(initialRoleMCPs);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteEmails, setInviteEmails] = useState<string[]>([]);
  const [currentEmail, setCurrentEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<Role>("viewer");
  const [showSuccessAnimation, setShowSuccessAnimation] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<"all" | "active" | "invited" | "inactive">("all");
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [expandedMCPs, setExpandedMCPs] = useState<string[]>([]);
  const [selectedRole, setSelectedRole] = useState<string | null>(null);
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [roleToolPermissions, setRoleToolPermissions] = useState<Record<string, Record<string, string[]>>>({
    admin: {},
    editor: {},
    viewer: {},
    "custom-demo-1": {},
    "custom-demo-2": {}
  });
  const [isSaving, setIsSaving] = useState(false);
  const [showSaveSuccess, setShowSaveSuccess] = useState(false);
  const [showAddRoleModal, setShowAddRoleModal] = useState(false);
  const [newRoleName, setNewRoleName] = useState("");
  const [newRoleDescription, setNewRoleDescription] = useState("");
  const [customRoles, setCustomRoles] = useState<Array<{id: string; name: string; description: string; color: string}>>([
    {
      id: "custom-demo-1",
      name: "マネージャー",
      description: "チームの管理と承認権限を持つロール",
      color: "bg-purple-100 text-purple-800"
    },
    {
      id: "custom-demo-2", 
      name: "開発者",
      description: "開発環境へのアクセスとデプロイ権限",
      color: "bg-green-100 text-green-800"
    }
  ]);
  const [selectedRoleMenu, setSelectedRoleMenu] = useState<string | null>(null);
  const [showEditRoleModal, setShowEditRoleModal] = useState(false);
  const [showDeleteRoleModal, setShowDeleteRoleModal] = useState(false);
  const [editingRole, setEditingRole] = useState<{id: string; name: string; description: string} | null>(null);
  const [deleteConfirmation, setDeleteConfirmation] = useState("");

  if (!orgId) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="w-full max-w-md rounded-lg bg-white p-8 text-center shadow-lg">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
            <Shield className="h-8 w-8 text-red-600" />
          </div>
          <h1 className="mb-2 text-2xl font-bold text-gray-900">
            アクセスエラー
          </h1>
          <p className="text-gray-600">組織が選択されていません。</p>
        </div>
      </div>
    );
  }

  const handleRoleChange = (memberId: string, newRole: Role) => {
    setTeamMembers((members) =>
      members.map((member) =>
        member.id === memberId ? { ...member, role: newRole } : member,
      ),
    );
  };

  const handleDeleteMember = (memberId: string) => {
    setTeamMembers((members) =>
      members.filter((member) => member.id !== memberId),
    );
  };

  const handleMCPToggle = (role: Role, mcpId: string) => {
    setRoleMCPs((prev) => {
      const isCurrentlyEnabled = prev[role].includes(mcpId);
      
      // MCPを無効にする場合、そのMCPの全てのツール権限もクリア
      if (isCurrentlyEnabled) {
        setRoleToolPermissions(prevPermissions => ({
          ...prevPermissions,
          [role]: {
            ...prevPermissions[role],
            [mcpId]: []
          }
        }));
      }
      
      return {
        ...prev,
        [role]: isCurrentlyEnabled
          ? prev[role].filter((id) => id !== mcpId)
          : [...prev[role], mcpId],
      };
    });
  };

  const handleAddEmail = (email: string) => {
    const trimmedEmail = email.trim();
    if (trimmedEmail && trimmedEmail.includes('@') && !inviteEmails.includes(trimmedEmail)) {
      setInviteEmails([...inviteEmails, trimmedEmail]);
      setCurrentEmail("");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      handleAddEmail(currentEmail);
    }
  };

  const handleRemoveEmail = (index: number) => {
    setInviteEmails(inviteEmails.filter((_, i) => i !== index));
  };

  const handleSendInvites = () => {
    console.log('招待を送信:', inviteEmails, '役割:', inviteRole);
    
    // モックなので実際には送信しない
    setShowInviteModal(false);
    setShowSuccessAnimation(true);
    
    // アニメーション後にリセット
    setTimeout(() => {
      setShowSuccessAnimation(false);
      setInviteEmails([]);
      setCurrentEmail("");
      setInviteRole("viewer");
    }, 3000);
  };

  const filteredMembers = teamMembers.filter(member => {
    const matchesSearch = member.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         member.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         member.department?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = filterStatus === "all" || member.status === filterStatus;
    
    return matchesSearch && matchesStatus;
  });

  const statusBadge = (status: TeamMember["status"]) => {
    const styles = {
      active: "bg-green-100 text-green-800",
      invited: "bg-yellow-100 text-yellow-800",
      inactive: "bg-gray-100 text-gray-800"
    };
    const labels = {
      active: "アクティブ",
      invited: "招待中",
      inactive: "非アクティブ"
    };
    
    return (
      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${styles[status]}`}>
        {labels[status]}
      </span>
    );
  };

  const handleToolPermissionToggle = (role: Role, mcpId: string, toolName: string) => {
    setRoleToolPermissions(prev => {
      const newPermissions = {
        ...prev,
        [role]: {
          ...prev[role],
          [mcpId]: prev[role][mcpId]?.includes(toolName)
            ? prev[role][mcpId].filter(tool => tool !== toolName)
            : [...(prev[role][mcpId] || []), toolName]
        }
      };
      
      // MCPにツールが1つでも有効な場合、MCPを有効にする
      const mcp = mockMCPServers.find(m => m.id === mcpId);
      const enabledTools = newPermissions[role][mcpId] || [];
      const shouldEnableMCP = enabledTools.length > 0;
      
      // MCPの有効/無効状態を更新
      if (shouldEnableMCP && !roleMCPs[role].includes(mcpId)) {
        setRoleMCPs(prevMCPs => ({
          ...prevMCPs,
          [role]: [...prevMCPs[role], mcpId]
        }));
      } else if (!shouldEnableMCP && roleMCPs[role].includes(mcpId)) {
        setRoleMCPs(prevMCPs => ({
          ...prevMCPs,
          [role]: prevMCPs[role].filter(id => id !== mcpId)
        }));
      }
      
      return newPermissions;
    });
  };

  const toggleMCPExpansion = (mcpId: string) => {
    setExpandedMCPs(prev => 
      prev.includes(mcpId) 
        ? prev.filter(id => id !== mcpId)
        : [...prev, mcpId]
    );
  };

  const handleRoleClick = (role: string) => {
    setSelectedRole(role);
    setShowRoleModal(true);
  };

  const handleSaveRolePermissions = async () => {
    setIsSaving(true);
    
    // 実際のAPIコールをシミュレート
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    console.log('保存されたロール権限:', {
      role: selectedRole,
      mcps: selectedRole ? roleMCPs[selectedRole] : [],
      tools: selectedRole ? roleToolPermissions[selectedRole] : {}
    });
    
    setIsSaving(false);
    setShowSaveSuccess(true);
    
    // 成功メッセージを2秒後に非表示
    setTimeout(() => {
      setShowSaveSuccess(false);
      setShowRoleModal(false);
      setSelectedRole(null);
      setExpandedMCPs([]);
    }, 2000);
  };

  const handleAddCustomRole = async () => {
    if (!newRoleName.trim()) return;
    
    setIsSaving(true);
    
    // APIコールをシミュレート
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const newRole = {
      id: `custom-${Date.now()}`,
      name: newRoleName,
      description: newRoleDescription,
      color: "bg-purple-100 text-purple-800"
    };
    
    setCustomRoles([...customRoles, newRole]);
    
    // 新しいロールのデフォルト権限を設定
    setRoleMCPs(prev => ({
      ...prev,
      [newRole.id]: []
    }));
    
    setRoleToolPermissions(prev => ({
      ...prev,
      [newRole.id]: {}
    }));
    
    // フォームをリセット
    setNewRoleName("");
    setNewRoleDescription("");
    setIsSaving(false);
    setShowAddRoleModal(false);
  };

  const handleEditRole = async () => {
    if (!editingRole || !editingRole.name.trim()) return;
    
    setIsSaving(true);
    
    // APIコールをシミュレート
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    setCustomRoles(customRoles.map(role => 
      role.id === editingRole.id 
        ? { ...role, name: editingRole.name, description: editingRole.description }
        : role
    ));
    
    setIsSaving(false);
    setShowEditRoleModal(false);
    setEditingRole(null);
  };

  const handleDeleteRole = async () => {
    if (!editingRole || deleteConfirmation !== editingRole.name) return;
    
    setIsSaving(true);
    
    // APIコールをシミュレート
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // ロールを削除
    setCustomRoles(customRoles.filter(role => role.id !== editingRole.id));
    
    // 関連する権限設定も削除
    setRoleMCPs(prev => {
      const newMCPs = { ...prev };
      delete newMCPs[editingRole.id];
      return newMCPs;
    });
    
    setRoleToolPermissions(prev => {
      const newPermissions = { ...prev };
      delete newPermissions[editingRole.id];
      return newPermissions;
    });
    
    setIsSaving(false);
    setShowDeleteRoleModal(false);
    setEditingRole(null);
    setDeleteConfirmation("");
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        {/* ヘッダーセクション */}
        <div className="mb-8 rounded-xl border border-gray-200 bg-white p-8 shadow-sm">
          <div className="mb-6 flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-blue-100">
                <Users className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">ロール管理</h1>
                <p className="mt-1 text-gray-600">
                  組織のメンバーと権限を管理します
                </p>
              </div>
            </div>
            <button 
              onClick={() => setShowInviteModal(true)}
              className="flex items-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              <UserPlus className="mr-2 h-4 w-4" />
              メンバーを招待
            </button>
          </div>
        </div>

        {/* チームメンバーリスト */}
        <div className="mb-8 rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="border-b border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-gray-900">チームメンバー</h2>
                <p className="mt-1 text-sm text-gray-600">
                  {filteredMembers.length}名のメンバー
                </p>
              </div>
              
              {/* 検索とフィルター */}
              <div className="flex items-center space-x-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    placeholder="名前、メール、部署で検索"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-64 rounded-lg border border-gray-300 pl-10 pr-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value as any)}
                  className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value="all">すべてのステータス</option>
                  <option value="active">アクティブ</option>
                  <option value="invited">招待中</option>
                  <option value="inactive">非アクティブ</option>
                </select>
              </div>
            </div>
          </div>

          {/* テーブルヘッダー */}
          <div className="bg-gray-50 px-6 py-3">
            <div className="flex items-center text-xs font-medium uppercase tracking-wider text-gray-500">
              <div className="flex-1">メンバー</div>
              <div className="w-32 text-center">ステータス</div>
              <div className="w-32 text-center">ロール</div>
              <div className="w-32 text-center">最終ログイン</div>
              <div className="w-20"></div>
            </div>
          </div>

          <div className="divide-y divide-gray-200">
            {filteredMembers.map((member) => (
              <div
                key={member.id}
                className="flex items-center px-6 py-4 hover:bg-gray-50"
              >
                {/* メンバー情報 */}
                <div className="flex flex-1 items-center space-x-3">
                  {member.avatar ? (
                    <img
                      src={member.avatar}
                      alt={member.name}
                      className="h-10 w-10 rounded-full object-cover"
                    />
                  ) : (
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-300 text-sm font-semibold text-gray-700">
                      {member.name.slice(0, 1)}
                    </div>
                  )}
                  <div>
                    <div className="flex items-center">
                      <h3 className="text-sm font-medium text-gray-900">{member.name}</h3>
                      {member.role === "admin" && (
                        <Shield className="ml-2 h-4 w-4 text-red-600" />
                      )}
                    </div>
                    <div className="flex items-center space-x-2 text-xs text-gray-500">
                      <span>{member.email}</span>
                      <span>•</span>
                      <span>{member.department}</span>
                    </div>
                  </div>
                </div>

                {/* ステータス */}
                <div className="w-32 text-center">
                  {statusBadge(member.status)}
                </div>

                {/* ロール */}
                <div className="w-32 text-center">
                  <select
                    value={member.role}
                    onChange={(e) => handleRoleChange(member.id, e.target.value as Role)}
                    disabled={member.status === "invited"}
                    className="rounded-md border border-gray-300 px-2 py-1 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none disabled:bg-gray-100 disabled:cursor-not-allowed"
                  >
                    {Object.entries(roleLabels).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* 最終ログイン */}
                <div className="w-32 text-center">
                  {member.status === "invited" ? (
                    <span className="text-xs text-gray-400">
                      招待者: {member.invitedBy}
                    </span>
                  ) : (
                    <div className="flex items-center justify-center space-x-1 text-xs text-gray-500">
                      <Clock className="h-3 w-3" />
                      <span>{member.lastLogin || "-"}</span>
                    </div>
                  )}
                </div>

                {/* アクション */}
                <div className="w-20 text-right">
                  <div className="relative">
                    <button
                      onClick={() => setSelectedMember(selectedMember === member.id ? null : member.id)}
                      className="rounded p-1 hover:bg-gray-100"
                    >
                      <MoreVertical className="h-4 w-4 text-gray-500" />
                    </button>
                    {selectedMember === member.id && (
                      <div className="absolute right-0 z-10 mt-2 w-48 rounded-md border border-gray-200 bg-white py-1 shadow-lg">
                        {member.status === "invited" && (
                          <button className="flex w-full items-center px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-100">
                            <Mail className="mr-2 h-3.5 w-3.5" />
                            招待を再送信
                          </button>
                        )}
                        {member.status === "inactive" && (
                          <button className="flex w-full items-center px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-100">
                            <UserPlus className="mr-2 h-3.5 w-3.5" />
                            アクティブ化
                          </button>
                        )}
                        <button className="flex w-full items-center px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-100">
                          <Edit2 className="mr-2 h-3.5 w-3.5" />
                          詳細を編集
                        </button>
                        <hr className="my-1" />
                        <button
                          onClick={() => handleDeleteMember(member.id)}
                          className="flex w-full items-center px-3 py-1.5 text-sm text-red-600 hover:bg-red-50"
                        >
                          <Trash2 className="mr-2 h-3.5 w-3.5" />
                          メンバーを削除
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
          
          {filteredMembers.length === 0 && (
            <div className="p-8 text-center">
              <AlertCircle className="mx-auto h-8 w-8 text-gray-400" />
              <p className="mt-2 text-sm text-gray-500">条件に一致するメンバーが見つかりません</p>
            </div>
          )}
        </div>

        {/* ロール説明 */}
        <div className="mb-8 rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-gray-200 p-4">
            <h2 className="text-lg font-bold text-gray-900">ロール管理</h2>
            <button 
              onClick={() => setShowAddRoleModal(true)}
              className="flex items-center rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700"
            >
              <Plus className="mr-1.5 h-4 w-4" />
              カスタムロールを追加
            </button>
          </div>
          
          <div className="grid grid-cols-1 gap-4 p-4 md:grid-cols-3">
            <div 
              onClick={() => handleRoleClick("admin")}
              className="cursor-pointer rounded-lg border-2 border-gray-200 p-4 transition-all hover:border-blue-500 hover:shadow-lg"
            >
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-gray-900">管理者</h3>
                <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-800">
                  Admin
                </span>
              </div>
              <ul className="space-y-1.5 text-xs text-gray-600">
                <li>• すべての機能へのフルアクセス</li>
                <li>• メンバーの招待・削除</li>
                <li>• ロールの変更</li>
                <li>• 組織設定の変更</li>
              </ul>
              <div className="mt-4 flex items-center justify-between">
                <span className="text-xs text-gray-500">クリックして詳細設定</span>
                <Settings className="h-4 w-4 text-gray-400" />
              </div>
            </div>

            <div 
              onClick={() => handleRoleClick("editor")}
              className="cursor-pointer rounded-lg border-2 border-gray-200 p-4 transition-all hover:border-blue-500 hover:shadow-lg"
            >
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-gray-900">編集者</h3>
                <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-800">
                  Editor
                </span>
              </div>
              <ul className="space-y-1.5 text-xs text-gray-600">
                <li>• コンテンツの作成・編集</li>
                <li>• リソースの管理</li>
                <li>• データの閲覧</li>
                <li>• 設定の閲覧のみ</li>
              </ul>
              <div className="mt-4 flex items-center justify-between">
                <span className="text-xs text-gray-500">クリックして詳細設定</span>
                <Settings className="h-4 w-4 text-gray-400" />
              </div>
            </div>

            <div 
              onClick={() => handleRoleClick("viewer")}
              className="cursor-pointer rounded-lg border-2 border-gray-200 p-4 transition-all hover:border-blue-500 hover:shadow-lg"
            >
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-gray-900">閲覧者</h3>
                <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-800">
                  Viewer
                </span>
              </div>
              <ul className="space-y-1.5 text-xs text-gray-600">
                <li>• コンテンツの閲覧のみ</li>
                <li>• データの閲覧</li>
                <li>• 編集権限なし</li>
                <li>• 設定へのアクセスなし</li>
              </ul>
              <div className="mt-4 flex items-center justify-between">
                <span className="text-xs text-gray-500">クリックして詳細設定</span>
                <Settings className="h-4 w-4 text-gray-400" />
              </div>
            </div>

            {/* カスタムロール */}
            {customRoles.map((role) => (
              <div 
                key={role.id}
                className="relative cursor-pointer rounded-lg border-2 border-gray-200 p-4 transition-all hover:border-blue-500 hover:shadow-lg"
              >
                <div className="absolute right-2 top-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedRoleMenu(selectedRoleMenu === role.id ? null : role.id);
                    }}
                    className="rounded p-1 hover:bg-gray-100"
                  >
                    <MoreVertical className="h-4 w-4 text-gray-500" />
                  </button>
                  {selectedRoleMenu === role.id && (
                    <div className="absolute right-0 z-10 mt-2 w-48 rounded-md border border-gray-200 bg-white py-1 shadow-lg">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingRole({ id: role.id, name: role.name, description: role.description });
                          setShowEditRoleModal(true);
                          setSelectedRoleMenu(null);
                        }}
                        className="flex w-full items-center px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-100"
                      >
                        <Edit2 className="mr-2 h-3.5 w-3.5" />
                        名前と説明を編集
                      </button>
                      <hr className="my-1" />
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingRole({ id: role.id, name: role.name, description: role.description });
                          setShowDeleteRoleModal(true);
                          setSelectedRoleMenu(null);
                        }}
                        className="flex w-full items-center px-3 py-1.5 text-sm text-red-600 hover:bg-red-50"
                      >
                        <Trash2 className="mr-2 h-3.5 w-3.5" />
                        ロールを削除
                      </button>
                    </div>
                  )}
                </div>
                
                <div onClick={() => handleRoleClick(role.id)}>
                  <div className="mb-3 flex items-center justify-between pr-8">
                    <h3 className="text-sm font-semibold text-gray-900">{role.name}</h3>
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${role.color}`}>
                      カスタム
                    </span>
                  </div>
                  <p className="text-xs text-gray-600">{role.description}</p>
                  <div className="mt-4 flex items-center justify-between">
                    <span className="text-xs text-gray-500">クリックして詳細設定</span>
                    <Settings className="h-4 w-4 text-gray-400" />
                  </div>
                </div>
              </div>
            ))}
            
            {/* カスタムロールを追加するカード */}
            <div 
              onClick={() => setShowAddRoleModal(true)}
              className="flex cursor-pointer items-center justify-center rounded-lg border-2 border-dashed border-gray-300 p-4 hover:border-gray-400 hover:bg-gray-50"
            >
              <button className="flex flex-col items-center space-y-2 text-gray-500 hover:text-gray-700">
                <Plus className="h-8 w-8" />
                <span className="text-xs font-medium">新しいロールを追加</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 招待モーダル */}
      {showInviteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-30 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-lg bg-white/95 p-6 shadow-xl backdrop-blur-md">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">メンバーを招待</h3>
              <button
                onClick={() => setShowInviteModal(false)}
                className="rounded-lg p-1 hover:bg-gray-100"
              >
                <X className="h-5 w-5 text-gray-500" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  メールアドレス
                </label>
                
                {/* メールタグ表示エリア */}
                <div className="mb-2 flex flex-wrap gap-2">
                  {inviteEmails.map((email, index) => (
                    <div
                      key={index}
                      className="flex items-center gap-1 rounded-full bg-blue-100 px-3 py-1 text-sm text-blue-800"
                    >
                      <span>{email}</span>
                      <button
                        onClick={() => handleRemoveEmail(index)}
                        className="rounded-full hover:bg-blue-200"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>

                {/* メール入力フィールド */}
                <input
                  type="email"
                  value={currentEmail}
                  onChange={(e) => setCurrentEmail(e.target.value)}
                  onKeyDown={handleKeyDown}
                  onBlur={() => handleAddEmail(currentEmail)}
                  placeholder="メールアドレスを入力してEnterキー"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
                <p className="mt-1 text-xs text-gray-500">
                  メールアドレスを入力してEnterキーまたはカンマで追加
                </p>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  役割
                </label>
                <select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value as Role)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  {Object.entries(roleLabels).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  onClick={() => setShowInviteModal(false)}
                  className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  キャンセル
                </button>
                <button
                  onClick={handleSendInvites}
                  disabled={inviteEmails.length === 0}
                  className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:bg-gray-300"
                >
                  招待を送信
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 成功アニメーション */}
      {showSuccessAnimation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-white">
          <SuccessAnimation
            title="招待を送信しました！"
            description={`${inviteEmails.length}名のメンバーに<br />招待メールを送信しました`}
          />
        </div>
      )}

      {/* ロール詳細設定モーダル */}
      {showRoleModal && selectedRole && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm">
          <div className="w-full max-w-4xl rounded-lg bg-white p-6 shadow-xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${
                  selectedRole === "admin" ? "bg-red-100" : selectedRole === "editor" ? "bg-blue-100" : "bg-gray-100"
                }`}>
                  <Shield className={`h-5 w-5 ${
                    selectedRole === "admin" ? "text-red-600" : selectedRole === "editor" ? "text-blue-600" : "text-gray-600"
                  }`} />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    {roleLabels[selectedRole] || customRoles.find(r => r.id === selectedRole)?.name || selectedRole}の権限設定
                  </h3>
                  <p className="text-sm text-gray-600">MCPサーバーとツールの利用権限を管理</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowRoleModal(false);
                  setSelectedRole(null);
                  setExpandedMCPs([]);
                }}
                className="rounded-lg p-1 hover:bg-gray-100"
              >
                <X className="h-5 w-5 text-gray-500" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto">
              <div className="space-y-4 pr-2">
                {mockMCPServers.map((mcp) => {
                  const isEnabled = selectedRole && roleMCPs[selectedRole] ? roleMCPs[selectedRole].includes(mcp.id) : false;
                  const isExpanded = expandedMCPs.includes(mcp.id);
                  
                  return (
                    <div key={mcp.id} className="rounded-lg border border-gray-200 overflow-hidden">
                      <div 
                        className={`p-4 ${isEnabled ? "bg-blue-50" : "bg-gray-50"} cursor-pointer transition-colors hover:bg-opacity-80`}
                        onClick={(e) => {
                          // トグルスイッチをクリックした場合は展開しない
                          if (!(e.target as HTMLElement).closest('label')) {
                            toggleMCPExpansion(mcp.id);
                          }
                        }}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <div className={`flex h-12 w-12 items-center justify-center rounded-lg ${mcp.bgColor} shadow-sm`}>
                              {mcp.logo ? (
                                <img src={mcp.logo} alt={mcp.name} className="h-8 w-8 object-contain" />
                              ) : (
                                <Server className={`h-6 w-6 ${mcp.color}`} />
                              )}
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center space-x-2">
                                <h4 className="font-medium text-gray-900">{mcp.name}</h4>
                                {mcp.isCustom && (
                                  <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800">
                                    カスタム
                                  </span>
                                )}
                              </div>
                              <p className="text-sm text-gray-600">{mcp.description}</p>
                            </div>
                          </div>

                          <div className="flex items-center space-x-3">
                            {mcp.tools && (
                              <div className="flex items-center space-x-2 text-sm text-gray-500">
                                {isExpanded ? (
                                  <ChevronUp className="h-4 w-4" />
                                ) : (
                                  <ChevronDown className="h-4 w-4" />
                                )}
                                <span>{mcp.tools.length}個のツール</span>
                              </div>
                            )}
                            <label className="relative inline-flex cursor-pointer items-center">
                              <input
                                type="checkbox"
                                checked={isEnabled}
                                onChange={() => handleMCPToggle(selectedRole, mcp.id)}
                                className="sr-only"
                              />
                              <div className={`h-6 w-11 rounded-full transition-colors ${
                                isEnabled ? "bg-blue-600" : "bg-gray-200"
                              }`}>
                                <div className={`absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${
                                  isEnabled ? "translate-x-5" : ""
                                }`} />
                              </div>
                            </label>
                          </div>
                        </div>
                      </div>

                      {isExpanded && mcp.tools && (
                        <div className="border-t border-gray-200 bg-white p-4">
                          <h5 className="mb-3 text-sm font-medium text-gray-700">ツール権限</h5>
                          <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                            {mcp.tools.map((tool) => {
                              const isToolAllowed = selectedRole && roleToolPermissions[selectedRole] && roleToolPermissions[selectedRole][mcp.id]?.includes(tool.name) || false;
                              
                              return (
                                <label
                                  key={tool.name}
                                  className={`flex items-center justify-between rounded-lg border p-3 ${
                                    isEnabled ? "cursor-pointer hover:bg-gray-50" : "cursor-not-allowed opacity-50"
                                  }`}
                                >
                                  <div className="flex-1">
                                    <code className="rounded bg-gray-100 px-2 py-0.5 text-xs font-mono text-gray-800">
                                      {tool.name}
                                    </code>
                                    <p className="mt-1 text-xs text-gray-600">{tool.description}</p>
                                  </div>
                                  <input
                                    type="checkbox"
                                    checked={isToolAllowed && isEnabled}
                                    onChange={() => handleToolPermissionToggle(selectedRole, mcp.id, tool.name)}
                                    disabled={!isEnabled}
                                    className="ml-3 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                  />
                                </label>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="mt-4 flex justify-between items-center pt-4 border-t">
              {showSaveSuccess && (
                <div className="flex items-center space-x-2 text-green-600">
                  <Check className="h-5 w-5" />
                  <span className="text-sm font-medium">保存しました</span>
                </div>
              )}
              
              <div className="flex justify-end space-x-3 flex-1">
                <button
                  onClick={() => {
                    setShowRoleModal(false);
                    setSelectedRole(null);
                    setExpandedMCPs([]);
                    setShowSaveSuccess(false);
                  }}
                  disabled={isSaving}
                  className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  閉じる
                </button>
                <button 
                  onClick={handleSaveRolePermissions}
                  disabled={isSaving}
                  className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                >
                  {isSaving ? (
                    <>
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                      <span>保存中...</span>
                    </>
                  ) : (
                    <span>変更を保存</span>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ロール追加モーダル */}
      {showAddRoleModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">新しいロールを追加</h3>
              <button
                onClick={() => {
                  setShowAddRoleModal(false);
                  setNewRoleName("");
                  setNewRoleDescription("");
                }}
                className="rounded-lg p-1 hover:bg-gray-100"
              >
                <X className="h-5 w-5 text-gray-500" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  ロール名
                </label>
                <input
                  type="text"
                  value={newRoleName}
                  onChange={(e) => setNewRoleName(e.target.value)}
                  placeholder="例: マネージャー"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  説明（任意）
                </label>
                <textarea
                  value={newRoleDescription}
                  onChange={(e) => setNewRoleDescription(e.target.value)}
                  placeholder="このロールの権限や責任について説明してください"
                  rows={3}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div className="rounded-lg bg-blue-50 p-3">
                <p className="text-sm text-blue-800">
                  💡 ロールを作成後、MCPサーバーとツールの権限を設定できます。
                </p>
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  onClick={() => {
                    setShowAddRoleModal(false);
                    setNewRoleName("");
                    setNewRoleDescription("");
                  }}
                  disabled={isSaving}
                  className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  キャンセル
                </button>
                <button
                  onClick={handleAddCustomRole}
                  disabled={!newRoleName.trim() || isSaving}
                  className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                >
                  {isSaving ? (
                    <>
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                      <span>作成中...</span>
                    </>
                  ) : (
                    <span>ロールを作成</span>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ロール編集モーダル */}
      {showEditRoleModal && editingRole && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">ロールを編集</h3>
              <button
                onClick={() => {
                  setShowEditRoleModal(false);
                  setEditingRole(null);
                }}
                className="rounded-lg p-1 hover:bg-gray-100"
              >
                <X className="h-5 w-5 text-gray-500" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  ロール名
                </label>
                <input
                  type="text"
                  value={editingRole.name}
                  onChange={(e) => setEditingRole({ ...editingRole, name: e.target.value })}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  説明
                </label>
                <textarea
                  value={editingRole.description}
                  onChange={(e) => setEditingRole({ ...editingRole, description: e.target.value })}
                  rows={3}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  onClick={() => {
                    setShowEditRoleModal(false);
                    setEditingRole(null);
                  }}
                  disabled={isSaving}
                  className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  キャンセル
                </button>
                <button
                  onClick={handleEditRole}
                  disabled={!editingRole.name.trim() || isSaving}
                  className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                >
                  {isSaving ? (
                    <>
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                      <span>保存中...</span>
                    </>
                  ) : (
                    <span>変更を保存</span>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ロール削除モーダル */}
      {showDeleteRoleModal && editingRole && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-100">
                  <AlertCircle className="h-5 w-5 text-red-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900">ロールを削除</h3>
              </div>
              <button
                onClick={() => {
                  setShowDeleteRoleModal(false);
                  setEditingRole(null);
                  setDeleteConfirmation("");
                }}
                className="rounded-lg p-1 hover:bg-gray-100"
              >
                <X className="h-5 w-5 text-gray-500" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="rounded-lg bg-red-50 p-4">
                <p className="text-sm text-red-800">
                  <strong>警告:</strong> ロール「{editingRole.name}」を削除すると、このロールに関連するすべての権限設定が失われます。この操作は取り消せません。
                </p>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  削除を確認するには、ロール名「<span className="font-bold text-red-600">{editingRole.name}</span>」を入力してください
                </label>
                <input
                  type="text"
                  value={deleteConfirmation}
                  onChange={(e) => setDeleteConfirmation(e.target.value)}
                  placeholder={editingRole.name}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
                />
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  onClick={() => {
                    setShowDeleteRoleModal(false);
                    setEditingRole(null);
                    setDeleteConfirmation("");
                  }}
                  disabled={isSaving}
                  className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  キャンセル
                </button>
                <button
                  onClick={handleDeleteRole}
                  disabled={deleteConfirmation !== editingRole.name || isSaving}
                  className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                >
                  {isSaving ? (
                    <>
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                      <span>削除中...</span>
                    </>
                  ) : (
                    <span>ロールを削除</span>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RolesPage;
