# マルチエージェントアバターモード 設計計画

## 概要

複数のAIエージェント（小春1, 小春2, 小春3...）を動的に生成し、同時に画面に表示して並列で動作させる機能。サブエージェントの数に応じて柔軟にアバターが増減し、Coordinatorが自動でタスクを分配する。

## 完成イメージ

```
+------------------------------------------------------------------+
|                    背景画像 (サイバーパンク)                        |
|                                                                    |
|   +------+  +------+  +------+  +------+  +------+                |
|   |小春1 |  |小春2 |  |小春3 |  |小春4 |  |小春5 |  ... (動的増減)  |
|   |検索中|  |分析中|  |報告中|  |待機中|  |実行中|                  |
|   +------+  +------+  +------+  +------+  +------+                |
|                                                                    |
| +--------------------+                           +---------------+ |
| | チャットパネル      |                           | エージェント   | |
| |                    |                           | 管理パネル     | |
| | [Coordinator]      |                           | +3 / -1 ボタン | |
| | タスクを5つに分解... |                           +---------------+ |
| |                    |                                             |
| | [タスク進捗]        |                                             |
| | ■■■□□ 60%          |                                             |
| +--------------------+                                             |
+------------------------------------------------------------------+
```

---

## アーキテクチャ概要

### システム構成図

```
┌─────────────────────────────────────────────────────────────────┐
│                        ユーザーインターフェース                     │
│  ┌─────────────────┐  ┌──────────────────────────────────────┐  │
│  │ MultiAgentViewer │  │         AgentManagementPanel         │  │
│  │  (Three.js)      │  │  [エージェント追加/削除/役割設定]      │  │
│  └─────────────────┘  └──────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                      状態管理層 (Jotai)                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐  │
│  │ agentRegistry │  │ agentStates  │  │ taskCoordinationState│  │
│  │ (エージェント │  │ (各エージェ  │  │ (タスク分配・進捗)    │  │
│  │  定義リスト)  │  │  ントの状態) │  │                      │  │
│  └──────────────┘  └──────────────┘  └──────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                      エージェント実行層                           │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │                    Coordinator Agent                       │  │
│  │  - ユーザー指示の解釈                                       │  │
│  │  - サブタスクへの分解                                       │  │
│  │  - 適切なエージェントへの割り当て                            │  │
│  │  - 結果の統合・報告                                         │  │
│  └───────────────────────────────────────────────────────────┘  │
│         │              │              │              │          │
│         ▼              ▼              ▼              ▼          │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐       │
│  │ Agent 1  │  │ Agent 2  │  │ Agent 3  │  │ Agent N  │       │
│  │ useChat  │  │ useChat  │  │ useChat  │  │ useChat  │       │
│  │ instance │  │ instance │  │ instance │  │ instance │       │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘       │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                      外部サービス連携                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐  │
│  │   Chat API    │  │  MCP Proxy   │  │    TTS Service       │  │
│  │ /api/chat     │  │ (ツール実行)  │  │  (音声合成)          │  │
│  └──────────────┘  └──────────────┘  └──────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 詳細設計

### 1. 状態管理設計

#### store/multiAgent.ts

```typescript
import { atom } from "jotai";
import { atomWithStorage } from "jotai/utils";
import type { VRM } from "@pixiv/three-vrm";
import type { Vector3 } from "three";

// ========================================
// 型定義
// ========================================

/** エージェントの役割テンプレート */
type AgentRole = {
  id: string;
  name: string;
  description: string;
  systemPrompt: string;
  color: string; // UI識別用カラー
};

/** 事前定義された役割 */
const PREDEFINED_ROLES: AgentRole[] = [
  {
    id: "researcher",
    name: "リサーチャー",
    description: "情報検索・収集を担当",
    systemPrompt: "あなたは情報収集の専門家です...",
    color: "#3B82F6",
  },
  {
    id: "analyzer",
    name: "アナリスト",
    description: "データ分析・比較を担当",
    systemPrompt: "あなたはデータ分析の専門家です...",
    color: "#10B981",
  },
  {
    id: "executor",
    name: "エグゼキューター",
    description: "タスク実行・操作を担当",
    systemPrompt: "あなたはタスク実行の専門家です...",
    color: "#F59E0B",
  },
  {
    id: "reporter",
    name: "レポーター",
    description: "結果整理・報告を担当",
    systemPrompt: "あなたは報告書作成の専門家です...",
    color: "#8B5CF6",
  },
];

/** エージェント外見設定 */
type AgentAppearance = {
  hairColor: string;             // 髪の色（16進数カラーコード）
  accentColor: string;           // アクセントカラー（リボン、服の一部など）
  eyeColor: string;              // 瞳の色
  baseExpression: Record<string, number>; // ベース表情（例: { happy: 0.2 }）
  scale: number;                 // スケール（0.95 ~ 1.05）
};

/** 事前定義された外見プリセット */
const APPEARANCE_PRESETS: AgentAppearance[] = [
  {
    hairColor: "#4A3728",        // オリジナル（ダークブラウン）
    accentColor: "#6366f1",      // インディゴ
    eyeColor: "#6366f1",
    baseExpression: {},
    scale: 1.0,
  },
  {
    hairColor: "#8B4513",        // 茶髪
    accentColor: "#10B981",      // エメラルド
    eyeColor: "#10B981",
    baseExpression: { happy: 0.2 },
    scale: 0.98,
  },
  {
    hairColor: "#2C1810",        // 黒髪
    accentColor: "#F59E0B",      // アンバー
    eyeColor: "#F59E0B",
    baseExpression: { serious: 0.1 },
    scale: 1.02,
  },
  {
    hairColor: "#A0522D",        // 赤茶
    accentColor: "#EC4899",      // ピンク
    eyeColor: "#EC4899",
    baseExpression: { relaxed: 0.2 },
    scale: 0.99,
  },
  {
    hairColor: "#654321",        // ダークブラウン
    accentColor: "#3B82F6",      // ブルー
    eyeColor: "#3B82F6",
    baseExpression: { happy: 0.1, relaxed: 0.1 },
    scale: 1.01,
  },
  {
    hairColor: "#5D4037",        // チョコレート
    accentColor: "#8B5CF6",      // バイオレット
    eyeColor: "#8B5CF6",
    baseExpression: { curious: 0.15 },
    scale: 0.97,
  },
  {
    hairColor: "#3E2723",        // エスプレッソ
    accentColor: "#EF4444",      // レッド
    eyeColor: "#EF4444",
    baseExpression: { determined: 0.2 },
    scale: 1.03,
  },
  {
    hairColor: "#4E342E",        // コーヒー
    accentColor: "#14B8A6",      // ティール
    eyeColor: "#14B8A6",
    baseExpression: { calm: 0.2 },
    scale: 0.96,
  },
];

/** エージェント定義（静的設定） */
type AgentDefinition = {
  id: string;                    // "agent-1", "agent-2", ...
  displayName: string;           // "小春1", "小春2", ...
  roleId: string;                // AgentRole.id
  vrmUrl: string;                // VRMファイルパス（全エージェント共通可）
  mcpServerIds: string[];        // 使用可能なMCPサーバー
  appearance: AgentAppearance;   // 外見設定
};

/** エージェント実行時状態（動的） */
type AgentRuntimeState = {
  vrm: VRM | null;
  position: Vector3;
  status: AgentStatus;
  isSpeaking: boolean;
  currentTaskId: string | null;
  chatId: string;
  error: string | null;
};

type AgentStatus =
  | "initializing"  // VRMロード中
  | "idle"          // 待機中
  | "thinking"      // AI応答生成中
  | "speaking"      // 音声出力中
  | "working"       // ツール実行中
  | "completed"     // タスク完了
  | "error";        // エラー発生

/** タスク定義 */
type Task = {
  id: string;
  parentTaskId: string | null;   // Coordinatorからの親タスク
  description: string;
  assignedAgentId: string | null;
  status: TaskStatus;
  result: unknown;
  startedAt: Date | null;
  completedAt: Date | null;
};

type TaskStatus =
  | "pending"       // 未着手
  | "assigned"      // エージェント割り当て済み
  | "in_progress"   // 実行中
  | "completed"     // 完了
  | "failed";       // 失敗

/** Coordinator状態 */
type CoordinatorState = {
  status: "idle" | "planning" | "coordinating" | "aggregating";
  originalPrompt: string | null;
  tasks: Task[];
  aggregatedResult: string | null;
};

// ========================================
// Jotai Atoms
// ========================================

/** エージェント定義リスト */
export const agentDefinitionsAtom = atomWithStorage<AgentDefinition[]>(
  "multi-agent-definitions",
  []
);

/** エージェント実行時状態マップ */
export const agentRuntimeStatesAtom = atom<Map<string, AgentRuntimeState>>(
  new Map()
);

/** 利用可能な役割リスト */
export const availableRolesAtom = atom<AgentRole[]>(PREDEFINED_ROLES);

/** Coordinator状態 */
export const coordinatorStateAtom = atom<CoordinatorState>({
  status: "idle",
  originalPrompt: null,
  tasks: [],
  aggregatedResult: null,
});

/** 現在発話中のエージェントID（排他制御用） */
export const speakingAgentIdAtom = atom<string | null>(null);

/** マルチエージェントモード有効フラグ */
export const multiAgentModeEnabledAtom = atomWithStorage(
  "multi-agent-mode-enabled",
  false
);

// ========================================
// 派生Atoms
// ========================================

/** アクティブなエージェント数 */
export const activeAgentCountAtom = atom((get) => {
  return get(agentDefinitionsAtom).length;
});

/** 全タスクの進捗率 */
export const taskProgressAtom = atom((get) => {
  const { tasks } = get(coordinatorStateAtom);
  if (tasks.length === 0) return 0;
  const completed = tasks.filter(t => t.status === "completed").length;
  return Math.round((completed / tasks.length) * 100);
});

/** エージェントごとのVRM位置を計算 */
export const agentPositionsAtom = atom((get) => {
  const agents = get(agentDefinitionsAtom);
  return calculateAgentPositions(agents.length);
});
```

#### 位置計算ロジック

```typescript
// lib/multiAgent/positionCalculator.ts

import { Vector3 } from "three";

/**
 * エージェント数に応じた最適な配置位置を計算
 * 画面幅に収まるように動的に調整
 */
export const calculateAgentPositions = (count: number): Vector3[] => {
  if (count === 0) return [];
  if (count === 1) return [new Vector3(0, 0, 0)];

  const positions: Vector3[] = [];

  // 最大幅（Three.js単位）
  const maxWidth = 4.0;

  // エージェント間の最小間隔
  const minSpacing = 0.8;

  // 実際の間隔を計算
  const totalWidth = Math.min(maxWidth, (count - 1) * minSpacing);
  const spacing = count > 1 ? totalWidth / (count - 1) : 0;

  // 中央揃えで配置
  const startX = -totalWidth / 2;

  for (let i = 0; i < count; i++) {
    positions.push(new Vector3(startX + i * spacing, 0, 0));
  }

  return positions;
};

/**
 * エージェント数に応じたカメラ設定を計算
 */
export const calculateCameraConfig = (count: number) => {
  // 基準値
  const baseFov = 35;
  const baseZ = 1.8;

  // エージェント数に応じて調整
  const fovIncrement = 3;  // エージェントごとにFOV増加
  const zIncrement = 0.2;  // エージェントごとにカメラ後退

  const fov = Math.min(60, baseFov + (count - 1) * fovIncrement);
  const z = baseZ + (count - 1) * zIncrement;

  return {
    fov,
    position: new Vector3(0, 0.7, z),
    lookAt: new Vector3(0, 0.35, 0),
  };
};
```

---

### 2. Coordinator設計

#### Coordinatorの責務

```
ユーザー入力
     │
     ▼
┌─────────────────────────────────────────────────────────────────┐
│                     Coordinator Agent                        │
│                                                              │
│  1. タスク分析                                                │
│     - ユーザーの意図を理解                                     │
│     - 必要なサブタスクを特定                                   │
│                                                              │
│  2. リソース評価                                              │
│     - 利用可能なエージェント数を確認                           │
│     - 各エージェントの役割・能力を評価                         │
│     - 必要に応じてエージェント追加を提案                        │
│                                                              │
│  3. タスク分配                                                │
│     - サブタスクを適切なエージェントに割り当て                  │
│     - 依存関係を考慮した実行順序を決定                         │
│                                                              │
│  4. 実行監視                                                  │
│     - 各エージェントの進捗を監視                               │
│     - エラー発生時のリカバリ                                   │
│                                                              │
│  5. 結果統合                                                  │
│     - 全エージェントの結果を収集                               │
│     - 統合レポートを生成                                       │
│     - ユーザーに最終報告                                       │
└─────────────────────────────────────────────────────────────────┘
```

#### Coordinatorプロンプト設計

```typescript
// lib/multiAgent/coordinatorPrompt.ts

export const generateCoordinatorSystemPrompt = (
  availableAgents: AgentDefinition[],
  availableRoles: AgentRole[]
) => `
あなたはマルチエージェントシステムのCoordinatorです。
ユーザーからの指示を分析し、最適なタスク分配を行ってください。

## 利用可能なエージェント

${availableAgents.map(a => {
  const role = availableRoles.find(r => r.id === a.roleId);
  return `- ${a.displayName} (${role?.name}): ${role?.description}`;
}).join('\n')}

## あなたの役割

1. ユーザーの指示を分析する
2. 必要なサブタスクに分解する
3. 各サブタスクを適切なエージェントに割り当てる
4. タスク間の依存関係を特定する

## 出力形式

以下のJSON形式で出力してください：

\`\`\`json
{
  "analysis": "ユーザー指示の分析結果",
  "tasks": [
    {
      "id": "task-1",
      "description": "タスクの説明",
      "assignedAgentId": "agent-1",
      "dependencies": [],
      "estimatedDuration": "short|medium|long"
    }
  ],
  "executionOrder": ["task-1", "task-2"],
  "needsMoreAgents": false,
  "suggestedAgentCount": 3
}
\`\`\`
`;

export const generateAggregationPrompt = (
  originalPrompt: string,
  taskResults: { taskId: string; agentId: string; result: string }[]
) => `
以下のタスク結果を統合し、ユーザーへの最終報告を作成してください。

## 元のユーザー指示
${originalPrompt}

## 各エージェントの結果

${taskResults.map(r => `
### ${r.agentId}の結果（${r.taskId}）
${r.result}
`).join('\n')}

## 指示

上記の結果を統合し、簡潔で分かりやすい報告を作成してください。
重複する情報は整理し、矛盾がある場合は注記してください。
`;
```

---

### 3. Three.js / VRM設計

#### useMultiVRMLoader.ts

```typescript
// hooks/multi-agent/useMultiVRMLoader.ts

import { useState, useCallback, useRef } from "react";
import { VRM, VRMLoaderPlugin } from "@pixiv/three-vrm";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";
import type { Vector3 } from "three";

type VRMInstance = {
  vrm: VRM;
  position: Vector3;
};

type UseMultiVRMLoaderResult = {
  vrms: Map<string, VRMInstance>;
  isLoading: boolean;
  loadVRM: (agentId: string, url: string, position: Vector3) => Promise<VRM | null>;
  unloadVRM: (agentId: string) => void;
  unloadAll: () => void;
  updatePosition: (agentId: string, position: Vector3) => void;
};

export const useMultiVRMLoader = (): UseMultiVRMLoaderResult => {
  const [vrms, setVrms] = useState<Map<string, VRMInstance>>(new Map());
  const [isLoading, setIsLoading] = useState(false);
  const loaderRef = useRef<GLTFLoader | null>(null);

  // 遅延初期化
  const getLoader = useCallback(() => {
    if (!loaderRef.current) {
      const loader = new GLTFLoader();
      loader.register((parser) => new VRMLoaderPlugin(parser));
      loaderRef.current = loader;
    }
    return loaderRef.current;
  }, []);

  const loadVRM = useCallback(
    async (agentId: string, url: string, position: Vector3): Promise<VRM | null> => {
      // 既存のVRMがあれば先にアンロード
      if (vrms.has(agentId)) {
        unloadVRM(agentId);
      }

      setIsLoading(true);
      try {
        const loader = getLoader();
        const gltf = await loader.loadAsync(url);
        const vrm = gltf.userData.vrm as VRM;

        if (!vrm) {
          throw new Error("VRM data not found in loaded file");
        }

        // 位置設定
        vrm.scene.position.copy(position);

        setVrms((prev) => {
          const next = new Map(prev);
          next.set(agentId, { vrm, position });
          return next;
        });

        return vrm;
      } catch (error) {
        console.error(`Failed to load VRM for ${agentId}:`, error);
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    [vrms, getLoader]
  );

  const unloadVRM = useCallback((agentId: string) => {
    setVrms((prev) => {
      const instance = prev.get(agentId);
      if (instance) {
        // リソース解放
        instance.vrm.scene.traverse((child) => {
          if ("geometry" in child) {
            (child as THREE.Mesh).geometry?.dispose();
          }
          if ("material" in child) {
            const materials = Array.isArray((child as THREE.Mesh).material)
              ? (child as THREE.Mesh).material
              : [(child as THREE.Mesh).material];
            materials.forEach((mat) => mat?.dispose());
          }
        });
      }
      const next = new Map(prev);
      next.delete(agentId);
      return next;
    });
  }, []);

  const unloadAll = useCallback(() => {
    vrms.forEach((_, agentId) => unloadVRM(agentId));
  }, [vrms, unloadVRM]);

  const updatePosition = useCallback((agentId: string, position: Vector3) => {
    setVrms((prev) => {
      const instance = prev.get(agentId);
      if (instance) {
        instance.vrm.scene.position.copy(position);
        instance.position = position;
      }
      return new Map(prev);
    });
  }, []);

  return {
    vrms,
    isLoading,
    loadVRM,
    unloadVRM,
    unloadAll,
    updatePosition,
  };
};
```

#### useMultiAgentThreeScene.ts

```typescript
// hooks/multi-agent/useMultiAgentThreeScene.ts

import { useEffect, useRef, useCallback } from "react";
import * as THREE from "three";
import { calculateCameraConfig } from "@/lib/multiAgent/positionCalculator";

type SceneSetup = {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  renderer: THREE.WebGLRenderer;
};

export const useMultiAgentThreeScene = (
  mountRef: React.RefObject<HTMLDivElement>,
  agentCount: number
) => {
  const setupRef = useRef<SceneSetup | null>(null);

  // シーン初期化
  useEffect(() => {
    if (!mountRef.current) return;

    const container = mountRef.current;
    const width = container.clientWidth;
    const height = container.clientHeight;

    // カメラ設定（エージェント数に応じて調整）
    const cameraConfig = calculateCameraConfig(agentCount);
    const camera = new THREE.PerspectiveCamera(
      cameraConfig.fov,
      width / height,
      0.1,
      100
    );
    camera.position.copy(cameraConfig.position);
    camera.lookAt(cameraConfig.lookAt);

    // シーン
    const scene = new THREE.Scene();

    // ライティング（複数エージェント用に調整）
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);

    const mainLight = new THREE.DirectionalLight(0xffffff, 0.8);
    mainLight.position.set(0, 3, 2);
    mainLight.castShadow = true;
    mainLight.shadow.mapSize.width = 2048;
    mainLight.shadow.mapSize.height = 2048;
    scene.add(mainLight);

    // 左右からの補助光
    const fillLightLeft = new THREE.DirectionalLight(0xffffff, 0.4);
    fillLightLeft.position.set(-3, 1, 1);
    scene.add(fillLightLeft);

    const fillLightRight = new THREE.DirectionalLight(0xffffff, 0.4);
    fillLightRight.position.set(3, 1, 1);
    scene.add(fillLightRight);

    // ステージ（エージェント数に応じて拡大）
    const stageWidth = Math.max(3, agentCount * 1.2);
    const stageGeometry = new THREE.PlaneGeometry(stageWidth, stageWidth);
    const stageMaterial = new THREE.ShadowMaterial({ opacity: 0.3 });
    const stage = new THREE.Mesh(stageGeometry, stageMaterial);
    stage.rotation.x = -Math.PI / 2;
    stage.position.y = 0;
    stage.receiveShadow = true;
    scene.add(stage);

    // レンダラー
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(renderer.domElement);

    setupRef.current = { scene, camera, renderer };

    // リサイズ対応
    const handleResize = () => {
      const w = container.clientWidth;
      const h = container.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      renderer.dispose();
      container.removeChild(renderer.domElement);
    };
  }, [mountRef, agentCount]);

  // カメラ更新（エージェント数変更時）
  useEffect(() => {
    if (!setupRef.current) return;

    const cameraConfig = calculateCameraConfig(agentCount);
    const { camera } = setupRef.current;

    camera.fov = cameraConfig.fov;
    camera.position.copy(cameraConfig.position);
    camera.lookAt(cameraConfig.lookAt);
    camera.updateProjectionMatrix();
  }, [agentCount]);

  return setupRef.current;
};
```

#### useAgentAppearance.ts

```typescript
// hooks/multi-agent/useAgentAppearance.ts

import { useCallback } from "react";
import * as THREE from "three";
import type { VRM } from "@pixiv/three-vrm";
import type { AgentAppearance } from "@/store/multiAgent";

/**
 * エージェントの外見をカスタマイズするフック
 * 同一VRMモデルに対して、色や表情を動的に変更
 */
export const useAgentAppearance = () => {
  /**
   * VRMモデルに外見設定を適用
   */
  const applyAppearance = useCallback(
    (vrm: VRM, appearance: AgentAppearance) => {
      // スケール適用
      vrm.scene.scale.setScalar(appearance.scale);

      // マテリアルカラーを変更
      vrm.scene.traverse((child) => {
        if (!(child instanceof THREE.Mesh) || !child.material) return;

        const material = child.material as THREE.MeshStandardMaterial;

        // 髪のマテリアルを特定して色変更
        // VRMのマテリアル名はモデルによって異なるため、
        // 実際のモデルに合わせて条件を調整する必要がある
        if (
          child.name.toLowerCase().includes("hair") ||
          material.name?.toLowerCase().includes("hair")
        ) {
          material.color.set(appearance.hairColor);
        }

        // アクセントカラー（リボン、服の装飾など）
        if (
          child.name.toLowerCase().includes("ribbon") ||
          child.name.toLowerCase().includes("accent") ||
          material.name?.toLowerCase().includes("accent")
        ) {
          material.color.set(appearance.accentColor);
        }

        // 瞳の色
        if (
          child.name.toLowerCase().includes("eye") &&
          !child.name.toLowerCase().includes("eyebrow") &&
          !child.name.toLowerCase().includes("eyelash")
        ) {
          // 瞳のハイライトは除外
          if (!child.name.toLowerCase().includes("highlight")) {
            material.color.set(appearance.eyeColor);
          }
        }
      });

      // ベース表情を適用
      if (vrm.expressionManager) {
        // まず全表情をリセット
        vrm.expressionManager.resetValues();

        // ベース表情を設定
        Object.entries(appearance.baseExpression).forEach(([name, value]) => {
          vrm.expressionManager?.setValue(name, value);
        });
      }
    },
    []
  );

  /**
   * エージェントインデックスから自動で外見プリセットを取得
   */
  const getAppearancePreset = useCallback(
    (agentIndex: number): AgentAppearance => {
      return APPEARANCE_PRESETS[agentIndex % APPEARANCE_PRESETS.length];
    },
    []
  );

  /**
   * カスタムカラーを設定（ユーザーによる手動設定用）
   */
  const createCustomAppearance = useCallback(
    (
      base: AgentAppearance,
      overrides: Partial<AgentAppearance>
    ): AgentAppearance => {
      return {
        ...base,
        ...overrides,
        baseExpression: {
          ...base.baseExpression,
          ...(overrides.baseExpression || {}),
        },
      };
    },
    []
  );

  return {
    applyAppearance,
    getAppearancePreset,
    createCustomAppearance,
  };
};
```

#### VRMマテリアル検出ユーティリティ

```typescript
// lib/multiAgent/vrmMaterialDetector.ts

import * as THREE from "three";
import type { VRM } from "@pixiv/three-vrm";

type MaterialInfo = {
  name: string;
  meshName: string;
  type: "hair" | "eye" | "skin" | "cloth" | "accent" | "unknown";
  originalColor: string;
};

/**
 * VRMモデルのマテリアル情報を検出
 * デバッグ用：どのマテリアルがどのパーツに対応するか調査
 */
export const detectVRMMaterials = (vrm: VRM): MaterialInfo[] => {
  const materials: MaterialInfo[] = [];

  vrm.scene.traverse((child) => {
    if (!(child instanceof THREE.Mesh) || !child.material) return;

    const mat = child.material as THREE.MeshStandardMaterial;
    const meshName = child.name.toLowerCase();
    const matName = (mat.name || "").toLowerCase();

    let type: MaterialInfo["type"] = "unknown";

    if (meshName.includes("hair") || matName.includes("hair")) {
      type = "hair";
    } else if (
      (meshName.includes("eye") && !meshName.includes("eyebrow")) ||
      matName.includes("iris")
    ) {
      type = "eye";
    } else if (meshName.includes("face") || meshName.includes("skin")) {
      type = "skin";
    } else if (
      meshName.includes("cloth") ||
      meshName.includes("shirt") ||
      meshName.includes("skirt")
    ) {
      type = "cloth";
    } else if (meshName.includes("ribbon") || meshName.includes("accessory")) {
      type = "accent";
    }

    materials.push({
      name: mat.name || "unnamed",
      meshName: child.name,
      type,
      originalColor: `#${mat.color.getHexString()}`,
    });
  });

  return materials;
};

/**
 * モデル固有のマテリアルマッピングを生成
 * 一度実行して結果を保存し、以降はマッピングを使用
 */
export const generateMaterialMapping = (vrm: VRM) => {
  const materials = detectVRMMaterials(vrm);

  console.log("=== VRM Material Mapping ===");
  console.table(materials);

  return materials;
};
```

---

### 4. 並列チャット設計

#### useMultiAgentChat.ts

```typescript
// hooks/multi-agent/useMultiAgentChat.ts

import { useCallback, useRef, useEffect } from "react";
import { useChat, type UseChatHelpers } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { useAtom, useAtomValue } from "jotai";
import {
  agentDefinitionsAtom,
  agentRuntimeStatesAtom,
  coordinatorStateAtom,
} from "@/store/multiAgent";
import { generateCUID } from "@/lib/utils";

type AgentChatInstance = {
  agentId: string;
  chatHelpers: UseChatHelpers;
};

type UseMultiAgentChatResult = {
  /** Coordinatorにユーザー入力を送信 */
  sendToCoordinator: (message: string) => Promise<void>;

  /** 特定エージェントにタスクを送信 */
  sendTaskToAgent: (agentId: string, task: string) => Promise<void>;

  /** 全エージェントの現在のメッセージを取得 */
  getAllMessages: () => Map<string, ChatMessage[]>;

  /** 全エージェントの処理を停止 */
  stopAll: () => void;
};

export const useMultiAgentChat = (
  organizationId: string
): UseMultiAgentChatResult => {
  const agents = useAtomValue(agentDefinitionsAtom);
  const [runtimeStates, setRuntimeStates] = useAtom(agentRuntimeStatesAtom);
  const [coordinatorState, setCoordinatorState] = useAtom(coordinatorStateAtom);

  // 各エージェントのuseChatインスタンスをRefで管理
  const chatInstancesRef = useRef<Map<string, AgentChatInstance>>(new Map());

  // Coordinator用チャット
  const coordinatorChat = useChat({
    id: `coordinator-${organizationId}`,
    generateId: generateCUID,
    transport: new DefaultChatTransport({
      api: "/api/chat/multi-agent/coordinator",
    }),
    onFinish: (message) => {
      // Coordinatorの応答を解析してタスク分配
      handleCoordinatorResponse(message.content);
    },
  });

  // エージェント用チャットインスタンスを動的に作成
  const getOrCreateAgentChat = useCallback((agentId: string) => {
    if (chatInstancesRef.current.has(agentId)) {
      return chatInstancesRef.current.get(agentId)!;
    }

    const agent = agents.find(a => a.id === agentId);
    if (!agent) return null;

    const chatId = `${agentId}-${generateCUID()}`;

    // 注意: useChatはフック内でしか呼べないため、
    // 実際の実装ではコンポーネント側で管理する必要がある
    // ここでは設計の概念を示す

    const instance: AgentChatInstance = {
      agentId,
      chatHelpers: null as unknown as UseChatHelpers, // 実際はコンポーネントで初期化
    };

    chatInstancesRef.current.set(agentId, instance);
    return instance;
  }, [agents]);

  // Coordinatorの応答を解析
  const handleCoordinatorResponse = useCallback((content: string) => {
    try {
      // JSON部分を抽出
      const jsonMatch = content.match(/```json\n([\s\S]*?)\n```/);
      if (!jsonMatch) return;

      const plan = JSON.parse(jsonMatch[1]);

      setCoordinatorState(prev => ({
        ...prev,
        status: "coordinating",
        tasks: plan.tasks.map((t: unknown) => ({
          ...t,
          status: "pending",
        })),
      }));

      // タスクを各エージェントに分配
      plan.executionOrder.forEach((taskId: string) => {
        const task = plan.tasks.find((t: { id: string }) => t.id === taskId);
        if (task) {
          sendTaskToAgent(task.assignedAgentId, task.description);
        }
      });
    } catch (error) {
      console.error("Failed to parse coordinator response:", error);
    }
  }, []);

  const sendToCoordinator = useCallback(async (message: string) => {
    setCoordinatorState(prev => ({
      ...prev,
      status: "planning",
      originalPrompt: message,
    }));

    await coordinatorChat.sendMessage({
      role: "user",
      parts: [{ type: "text", text: message }],
    });
  }, [coordinatorChat]);

  const sendTaskToAgent = useCallback(async (agentId: string, task: string) => {
    const instance = getOrCreateAgentChat(agentId);
    if (!instance) return;

    // エージェント状態を更新
    setRuntimeStates(prev => {
      const state = prev.get(agentId);
      if (state) {
        state.status = "thinking";
      }
      return new Map(prev);
    });

    // タスクを送信（実際の実装はコンポーネント側）
    // instance.chatHelpers.sendMessage(...)
  }, [getOrCreateAgentChat, setRuntimeStates]);

  const getAllMessages = useCallback(() => {
    const messages = new Map<string, ChatMessage[]>();
    chatInstancesRef.current.forEach((instance, agentId) => {
      messages.set(agentId, instance.chatHelpers?.messages || []);
    });
    return messages;
  }, []);

  const stopAll = useCallback(() => {
    chatInstancesRef.current.forEach((instance) => {
      instance.chatHelpers?.stop?.();
    });
  }, []);

  return {
    sendToCoordinator,
    sendTaskToAgent,
    getAllMessages,
    stopAll,
  };
};
```

---

### 5. TTS排他制御設計

```typescript
// hooks/multi-agent/useMultiAgentTTS.ts

import { useCallback, useRef } from "react";
import { useAtom } from "jotai";
import { speakingAgentIdAtom } from "@/store/multiAgent";

type SpeechRequest = {
  agentId: string;
  text: string;
  priority: number;
};

/**
 * 複数エージェントの音声出力を排他制御
 * 同時に1体のみが発話可能
 */
export const useMultiAgentTTS = () => {
  const [speakingAgentId, setSpeakingAgentId] = useAtom(speakingAgentIdAtom);
  const queueRef = useRef<SpeechRequest[]>([]);
  const isProcessingRef = useRef(false);

  const enqueue = useCallback((request: SpeechRequest) => {
    queueRef.current.push(request);
    // 優先度でソート（高い順）
    queueRef.current.sort((a, b) => b.priority - a.priority);
    processQueue();
  }, []);

  const processQueue = useCallback(async () => {
    if (isProcessingRef.current || queueRef.current.length === 0) {
      return;
    }

    isProcessingRef.current = true;
    const request = queueRef.current.shift()!;

    setSpeakingAgentId(request.agentId);

    try {
      // TTS API呼び出し
      await speakText(request.agentId, request.text);
    } finally {
      setSpeakingAgentId(null);
      isProcessingRef.current = false;

      // 次のキューを処理
      if (queueRef.current.length > 0) {
        processQueue();
      }
    }
  }, [setSpeakingAgentId]);

  const speakText = async (agentId: string, text: string) => {
    // 実際のTTS処理
    // /api/coharu/tts を呼び出し
    // 音声再生完了まで待機
  };

  const speak = useCallback((agentId: string, text: string, priority = 0) => {
    enqueue({ agentId, text, priority });
  }, [enqueue]);

  const cancelAll = useCallback(() => {
    queueRef.current = [];
    // 現在の音声も停止
  }, []);

  return {
    speak,
    cancelAll,
    speakingAgentId,
  };
};
```

---

### 6. UIコンポーネント設計

#### MultiAgentViewer.tsx

```tsx
// components/multi-agent/MultiAgentViewer.tsx

"use client";

import { useRef, useEffect } from "react";
import { useAtomValue } from "jotai";
import {
  agentDefinitionsAtom,
  agentRuntimeStatesAtom,
  agentPositionsAtom,
} from "@/store/multiAgent";
import { useMultiVRMLoader } from "@/hooks/multi-agent/useMultiVRMLoader";
import { useMultiAgentThreeScene } from "@/hooks/multi-agent/useMultiAgentThreeScene";
import { AgentStatusIndicator } from "./AgentStatusIndicator";

export const MultiAgentViewer = () => {
  const mountRef = useRef<HTMLDivElement>(null);
  const agents = useAtomValue(agentDefinitionsAtom);
  const runtimeStates = useAtomValue(agentRuntimeStatesAtom);
  const positions = useAtomValue(agentPositionsAtom);

  const scene = useMultiAgentThreeScene(mountRef, agents.length);
  const { vrms, loadVRM, updatePosition } = useMultiVRMLoader();

  // エージェント追加時にVRMをロード
  useEffect(() => {
    agents.forEach((agent, index) => {
      if (!vrms.has(agent.id)) {
        loadVRM(agent.id, agent.vrmUrl, positions[index]);
      }
    });
  }, [agents, positions, vrms, loadVRM]);

  // 位置更新
  useEffect(() => {
    agents.forEach((agent, index) => {
      updatePosition(agent.id, positions[index]);
    });
  }, [positions, agents, updatePosition]);

  // レンダリングループ
  useEffect(() => {
    if (!scene) return;

    let animationId: number;
    const clock = new THREE.Clock();

    const animate = () => {
      animationId = requestAnimationFrame(animate);
      const delta = clock.getDelta();

      // 各VRMを更新
      vrms.forEach(({ vrm }) => {
        vrm.update(delta);
      });

      scene.renderer.render(scene.scene, scene.camera);
    };

    animate();
    return () => cancelAnimationFrame(animationId);
  }, [scene, vrms]);

  return (
    <div className="relative h-full w-full">
      <div ref={mountRef} className="h-full w-full" />

      {/* 各エージェントの状態インジケータ */}
      {agents.map((agent, index) => {
        const state = runtimeStates.get(agent.id);
        return (
          <AgentStatusIndicator
            key={agent.id}
            agent={agent}
            state={state}
            position={positions[index]}
          />
        );
      })}
    </div>
  );
};
```

#### AgentManagementPanel.tsx

```tsx
// components/multi-agent/AgentManagementPanel.tsx

"use client";

import { useAtom, useAtomValue } from "jotai";
import { Plus, Minus, Settings } from "lucide-react";
import {
  agentDefinitionsAtom,
  availableRolesAtom,
  activeAgentCountAtom,
} from "@/store/multiAgent";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const MAX_AGENTS = 8;

export const AgentManagementPanel = () => {
  const [agents, setAgents] = useAtom(agentDefinitionsAtom);
  const roles = useAtomValue(availableRolesAtom);
  const agentCount = useAtomValue(activeAgentCountAtom);

  const { getAppearancePreset } = useAgentAppearance();

  const addAgent = () => {
    if (agentCount >= MAX_AGENTS) return;

    const newId = `agent-${agentCount + 1}`;
    const defaultRole = roles[agentCount % roles.length];
    const appearance = getAppearancePreset(agentCount);

    setAgents([
      ...agents,
      {
        id: newId,
        displayName: `小春${agentCount + 1}`,
        roleId: defaultRole.id,
        vrmUrl: "/vrm/koharu.vrm",
        mcpServerIds: [],
        appearance,
      },
    ]);
  };

  const removeAgent = (agentId: string) => {
    if (agentCount <= 1) return;
    setAgents(agents.filter(a => a.id !== agentId));
  };

  const updateAgentRole = (agentId: string, roleId: string) => {
    setAgents(
      agents.map(a => (a.id === agentId ? { ...a, roleId } : a))
    );
  };

  return (
    <div className="rounded-xl bg-black/60 p-4 backdrop-blur-md">
      <h3 className="mb-4 font-bold text-white">エージェント管理</h3>

      <div className="mb-4 flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={addAgent}
          disabled={agentCount >= MAX_AGENTS}
        >
          <Plus className="mr-1 h-4 w-4" />
          追加
        </Button>
        <span className="text-sm text-white/70">
          {agentCount} / {MAX_AGENTS}
        </span>
      </div>

      <div className="space-y-2">
        {agents.map(agent => {
          const role = roles.find(r => r.id === agent.roleId);
          return (
            <div
              key={agent.id}
              className="flex items-center gap-2 rounded-lg bg-white/10 p-2"
            >
              <div
                className="h-3 w-3 rounded-full"
                style={{ backgroundColor: role?.color }}
              />
              <span className="flex-1 text-sm text-white">
                {agent.displayName}
              </span>
              <Select
                value={agent.roleId}
                onValueChange={(value) => updateAgentRole(agent.id, value)}
              >
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {roles.map(r => (
                    <SelectItem key={r.id} value={r.id}>
                      {r.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => removeAgent(agent.id)}
                disabled={agentCount <= 1}
              >
                <Minus className="h-4 w-4" />
              </Button>
            </div>
          );
        })}
      </div>
    </div>
  );
};
```

---

## ファイル構成まとめ

```
apps/manager/src/
├── app/[orgSlug]/avatar-multi/
│   ├── page.tsx
│   └── layout.tsx
│
├── components/multi-agent/
│   ├── MultiAgentModeChat.tsx
│   ├── MultiAgentViewer.tsx
│   ├── AgentAvatar.tsx
│   ├── AgentChatPanel.tsx
│   ├── AgentStatusIndicator.tsx
│   ├── AgentManagementPanel.tsx
│   ├── TaskCoordinator.tsx
│   ├── TaskProgressBar.tsx
│   └── index.ts
│
├── hooks/multi-agent/
│   ├── useMultiVRMLoader.ts
│   ├── useMultiAnimationManager.ts
│   ├── useMultiAgentChat.ts
│   ├── useMultiAgentThreeScene.ts
│   ├── useMultiAgentTTS.ts
│   ├── useAgentAppearance.ts      # 外見カスタマイズ
│   └── index.ts
│
├── store/
│   └── multiAgent.ts
│
├── lib/multiAgent/
│   ├── positionCalculator.ts
│   ├── coordinatorPrompt.ts
│   ├── vrmMaterialDetector.ts     # マテリアル検出ユーティリティ
│   └── index.ts
│
└── app/api/chat/multi-agent/
    ├── coordinator/
    │   └── route.ts
    └── agent/
        └── route.ts
```

---

## Critical Files（参照用）

| カテゴリ | ファイルパス |
|---------|-------------|
| 現行VRM状態管理 | `apps/manager/src/store/coharu.ts` |
| 現行VRMロード | `apps/manager/src/hooks/coharu/useVRMLoader.ts` |
| 現行アニメーション | `apps/manager/src/lib/coharu/VRMAAnimationManager.ts` |
| 現行Three.js | `apps/manager/src/hooks/avatar-mode/useAvatarModeThreeScene.ts` |
| 現行チャット | `apps/manager/src/components/avatar-mode/AvatarModeChat.tsx` |
| 現行TTS | `apps/manager/src/hooks/avatar-mode/useTTSHandler.ts` |
| Chat API | `apps/manager/src/app/api/chat/route.ts` |

---

## 技術的考慮事項

### ブラウザ制限

- **SSE同時接続数**: ブラウザあたり6-8接続が上限
- **推奨エージェント数**: 最大8体（`MAX_AGENTS = 8`）
- **対策**: HTTP/2を使用してマルチプレキシングで接続効率を向上

### パフォーマンス最適化

- **VRMモデル共有**: 同一VRMを複数インスタンスで共有可能
- **LOD (Level of Detail)**: エージェント数が多い場合は簡略化モデルを使用
- **バッチレンダリング**: 同一マテリアルのメッシュをバッチ処理

### メモリ管理

- **VRMアンロード**: エージェント削除時に適切にリソース解放
- **チャット履歴制限**: 各エージェントのメッセージ数を制限
- **タスク履歴削除**: 完了タスクを定期的にクリーンアップ

### 外見カスタマイズ

#### カスタマイズ方法と難易度

| 方法 | 難易度 | 効果 | 備考 |
|-----|-------|-----|-----|
| マテリアルカラー変更 | ★☆☆ | 高 | VRMのマテリアル名に依存 |
| 表情プリセット | ★☆☆ | 中 | VRM Expression機能を活用 |
| 目の色変更 | ★☆☆ | 中 | テクスチャ変更より簡単 |
| スケール調整 | ★☆☆ | 低 | 微妙な個性付け |
| シェーダー変更 | ★★★ | 高 | カスタムシェーダー必要 |

#### VRMモデル固有の注意点

- **マテリアル名の特定**: VRMモデルによってマテリアル名が異なるため、`vrmMaterialDetector.ts` を使用して事前にマッピングを確認
- **表情名の互換性**: VRM Expression名はモデルによって異なる可能性あり（`happy`, `joy`, `smile` など）
- **色変更の範囲**: MToon シェーダーを使用している場合、`color` プロパティに加えて `shadeColor` も変更が必要な場合あり

#### 外見プリセットの設計方針

1. **ロールとの連動**: 役割（リサーチャー、アナリスト等）に応じたカラースキーム
2. **識別性の確保**: 8体まで同時表示可能なため、十分に区別できる配色
3. **キャラクター性の維持**: コハルの基本デザインを損なわない範囲での変更

---

## 今後の拡張候補

1. **エージェント間コミュニケーション**: エージェント同士が直接会話
2. **完全カスタムVRM**: エージェントごとに異なるVRMファイルを使用（現在は同一VRMの外見カスタマイズで対応）
3. **チーム保存機能**: エージェント構成（役割・外見含む）をプリセットとして保存
4. **タスク依存グラフ可視化**: タスク間の依存関係をビジュアル表示
5. **リアルタイム進捗ダッシュボード**: 全エージェントの活動状況をモニタリング
6. **外見エディタUI**: ユーザーが髪色・目の色・表情をカスタマイズできるUI
7. **アクセサリー追加**: 眼鏡、帽子などの装飾品を動的に追加
