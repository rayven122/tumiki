import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { KUBECTL_BIN } from "@/features/tenants/api/constants";

const execFileAsync = promisify(execFile);

export type PodPhase =
  | "Running"
  | "Pending"
  | "Failed"
  | "Succeeded"
  | "Unknown";
export type ContainerState = "running" | "waiting" | "terminated";

export type ContainerStatus = {
  name: string;
  ready: boolean;
  restartCount: number;
  state: ContainerState;
  waitingReason: string | null;
};

export type PodStatus = {
  name: string;
  phase: PodPhase;
  ready: boolean;
  restartCount: number;
  containers: ContainerStatus[];
  startedAt: Date | null;
};

type KubectlPodList = {
  items: Array<{
    metadata: { name: string; creationTimestamp: string };
    status: {
      phase?: string;
      containerStatuses?: Array<{
        name: string;
        ready: boolean;
        restartCount: number;
        state: {
          running?: { startedAt: string };
          waiting?: { reason?: string };
          terminated?: { reason?: string };
        };
      }>;
    };
  }>;
};

export const getPodStatuses = async (
  namespace: string,
): Promise<PodStatus[]> => {
  const { stdout } = await execFileAsync(KUBECTL_BIN, [
    "get",
    "pods",
    "-n",
    namespace,
    "-o",
    "json",
  ]);

  const podList = JSON.parse(stdout) as KubectlPodList;

  return podList.items.map((pod) => {
    const containerStatuses = pod.status.containerStatuses ?? [];
    const totalRestarts = containerStatuses.reduce(
      (sum, c) => sum + c.restartCount,
      0,
    );
    const allReady =
      containerStatuses.length > 0 && containerStatuses.every((c) => c.ready);

    const containers: ContainerStatus[] = containerStatuses.map((c) => {
      let state: ContainerState = "running";
      let waitingReason: string | null = null;
      if (c.state.waiting) {
        state = "waiting";
        waitingReason = c.state.waiting.reason ?? null;
      } else if (c.state.terminated) {
        state = "terminated";
      }
      return {
        name: c.name,
        ready: c.ready,
        restartCount: c.restartCount,
        state,
        waitingReason,
      };
    });

    return {
      name: pod.metadata.name,
      phase: (pod.status.phase ?? "Unknown") as PodPhase,
      ready: allReady,
      restartCount: totalRestarts,
      containers,
      startedAt: pod.metadata.creationTimestamp
        ? new Date(pod.metadata.creationTimestamp)
        : null,
    };
  });
};
