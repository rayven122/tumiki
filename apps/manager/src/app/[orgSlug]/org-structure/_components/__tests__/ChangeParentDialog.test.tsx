/**
 * @vitest-environment jsdom
 */
import * as React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, test, expect, vi, beforeEach } from "vitest";
import { ChangeParentDialog } from "../ChangeParentDialog";
import type { Department } from "@/features/org-structure/utils/mock/mockOrgData";
import type { DepartmentEdgeType } from "@/features/org-structure/components/edges/DepartmentEdge";

// Reactをグローバルに設定（コンポーネント内で使用するため）
(globalThis as unknown as { React: typeof React }).React = React;

// テスト用のモックデータ
const mockDepartments: Department[] = [
  {
    id: "root",
    name: "ルート組織",
    icon: "Building2",
    color: "#6366f1",
    leader: { id: "u1", name: "山田太郎", initials: "YT" },
    members: [{ id: "u1", name: "山田太郎", initials: "YT" }],
    memberCount: 1,
    isRoot: true,
  },
  {
    id: "dept-a",
    name: "部署A",
    icon: "Code2",
    color: "#3b82f6",
    leader: { id: "u2", name: "佐藤花子", initials: "SH" },
    members: [{ id: "u2", name: "佐藤花子", initials: "SH" }],
    memberCount: 1,
  },
  {
    id: "dept-b",
    name: "部署B",
    icon: "Briefcase",
    color: "#8b5cf6",
    leader: { id: "u3", name: "鈴木一郎", initials: "SI" },
    members: [{ id: "u3", name: "鈴木一郎", initials: "SI" }],
    memberCount: 1,
  },
  {
    id: "dept-b-child",
    name: "部署Bの子",
    icon: "FileText",
    color: "#ec4899",
    leader: { id: "u4", name: "田中美咲", initials: "TM" },
    members: [{ id: "u4", name: "田中美咲", initials: "TM" }],
    memberCount: 1,
  },
];

const mockEdges: DepartmentEdgeType[] = [
  { id: "root-a", source: "root", target: "dept-a", type: "department" },
  { id: "root-b", source: "root", target: "dept-b", type: "department" },
  {
    id: "b-child",
    source: "dept-b",
    target: "dept-b-child",
    type: "department",
  },
];

describe("ChangeParentDialog", () => {
  const mockOnClose = vi.fn();
  const mockOnChangeParent = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  test("ダイアログが閉じている時は何も表示されない", () => {
    render(
      <ChangeParentDialog
        isOpen={false}
        onClose={mockOnClose}
        targetDepartment={mockDepartments[1]!}
        departments={mockDepartments}
        edges={mockEdges}
        onChangeParent={mockOnChangeParent}
      />,
    );

    expect(screen.queryByText("親部署を変更")).not.toBeInTheDocument();
  });

  test("ダイアログが開いている時はタイトルが表示される", () => {
    render(
      <ChangeParentDialog
        isOpen={true}
        onClose={mockOnClose}
        targetDepartment={mockDepartments[1]!}
        departments={mockDepartments}
        edges={mockEdges}
        onChangeParent={mockOnChangeParent}
      />,
    );

    expect(screen.getByText("親部署を変更")).toBeInTheDocument();
    expect(
      screen.getByText("「部署A」の新しい親部署を選択してください"),
    ).toBeInTheDocument();
  });

  test("現在の親部署が表示される", () => {
    render(
      <ChangeParentDialog
        isOpen={true}
        onClose={mockOnClose}
        targetDepartment={mockDepartments[1]!}
        departments={mockDepartments}
        edges={mockEdges}
        onChangeParent={mockOnChangeParent}
      />,
    );

    expect(screen.getByText("ルート組織")).toBeInTheDocument();
    expect(screen.getByText("現在の親部署")).toBeInTheDocument();
  });

  test("キャンセルボタンをクリックするとonCloseが呼ばれる", () => {
    render(
      <ChangeParentDialog
        isOpen={true}
        onClose={mockOnClose}
        targetDepartment={mockDepartments[1]!}
        departments={mockDepartments}
        edges={mockEdges}
        onChangeParent={mockOnChangeParent}
      />,
    );

    fireEvent.click(screen.getByText("キャンセル"));
    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  test("自分自身は選択可能な親リストに含まれない", () => {
    render(
      <ChangeParentDialog
        isOpen={true}
        onClose={mockOnClose}
        targetDepartment={mockDepartments[1]!} // 部署A
        departments={mockDepartments}
        edges={mockEdges}
        onChangeParent={mockOnChangeParent}
      />,
    );

    // セレクトボックスを開く
    fireEvent.click(screen.getByRole("combobox"));

    // 自分自身（部署A）は選択肢に含まれない
    const options = screen.getAllByRole("option");
    const optionTexts = options.map((opt) => opt.textContent);
    expect(optionTexts).not.toContain("部署A");
  });

  test("現在の親は選択可能な親リストに含まれない", () => {
    render(
      <ChangeParentDialog
        isOpen={true}
        onClose={mockOnClose}
        targetDepartment={mockDepartments[1]!} // 部署A
        departments={mockDepartments}
        edges={mockEdges}
        onChangeParent={mockOnChangeParent}
      />,
    );

    // セレクトボックスを開く
    fireEvent.click(screen.getByRole("combobox"));

    // 現在の親（ルート組織）は選択肢に含まれない
    const options = screen.getAllByRole("option");
    const optionTexts = options.map((opt) => opt.textContent);
    expect(optionTexts).not.toContain("ルート組織 (ルート)");
  });

  test("子孫ノードは選択可能な親リストに含まれない", () => {
    render(
      <ChangeParentDialog
        isOpen={true}
        onClose={mockOnClose}
        targetDepartment={mockDepartments[2]!} // 部署B
        departments={mockDepartments}
        edges={mockEdges}
        onChangeParent={mockOnChangeParent}
      />,
    );

    // セレクトボックスを開く
    fireEvent.click(screen.getByRole("combobox"));

    // 子孫（部署Bの子）は選択肢に含まれない
    const options = screen.getAllByRole("option");
    const optionTexts = options.map((opt) => opt.textContent);
    expect(optionTexts).not.toContain("部署Bの子");
  });

  test("targetDepartmentがnullの場合は何もレンダリングされない", () => {
    const { container } = render(
      <ChangeParentDialog
        isOpen={true}
        onClose={mockOnClose}
        targetDepartment={null}
        departments={mockDepartments}
        edges={mockEdges}
        onChangeParent={mockOnChangeParent}
      />,
    );

    expect(container.firstChild).toBeNull();
  });

  test("新しい親部署を選択すると変更ボタンが有効になる", () => {
    render(
      <ChangeParentDialog
        isOpen={true}
        onClose={mockOnClose}
        targetDepartment={mockDepartments[1]!} // 部署A
        departments={mockDepartments}
        edges={mockEdges}
        onChangeParent={mockOnChangeParent}
      />,
    );

    // 初期状態では変更ボタンは無効
    expect(screen.getByText("変更する")).toBeDisabled();

    // セレクトボックスを開いて部署Bを選択
    fireEvent.click(screen.getByRole("combobox"));
    fireEvent.click(screen.getByText("部署B"));

    // 変更ボタンが有効になる
    expect(screen.getByText("変更する")).not.toBeDisabled();
  });

  test("変更ボタンをクリックするとonChangeParentが呼ばれる", () => {
    render(
      <ChangeParentDialog
        isOpen={true}
        onClose={mockOnClose}
        targetDepartment={mockDepartments[1]!} // 部署A
        departments={mockDepartments}
        edges={mockEdges}
        onChangeParent={mockOnChangeParent}
      />,
    );

    // セレクトボックスを開いて部署Bを選択
    fireEvent.click(screen.getByRole("combobox"));
    fireEvent.click(screen.getByText("部署B"));

    // 変更ボタンをクリック
    fireEvent.click(screen.getByText("変更する"));

    // onChangeParentが正しい引数で呼ばれる
    expect(mockOnChangeParent).toHaveBeenCalledWith("dept-a", "dept-b");
    // ダイアログが閉じる
    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });
});
