import os from "os";
import { performance } from "perf_hooks";

type SystemMetrics = {
  memory: {
    used: number;
    total: number;
    percentage: number;
  };
  cpu: {
    percentage: number;
  };
  uptime: number;
  activeConnections: number;
};

const startTime = performance.now();

export function getSystemMetrics(activeConnections: number): SystemMetrics {
  const totalMemory = os.totalmem();
  const freeMemory = os.freemem();
  const usedMemory = totalMemory - freeMemory;

  const cpus = os.cpus();
  const cpuUsage =
    cpus.reduce((acc, cpu) => {
      const total = Object.values(cpu.times).reduce((a, b) => a + b, 0);
      const idle = cpu.times.idle;
      return acc + ((total - idle) / total) * 100;
    }, 0) / cpus.length;

  return {
    memory: {
      used: usedMemory,
      total: totalMemory,
      percentage: (usedMemory / totalMemory) * 100,
    },
    cpu: {
      percentage: cpuUsage,
    },
    uptime: performance.now() - startTime,
    activeConnections,
  };
}

export function logSystemHealth(activeConnections: number) {
  const metrics = getSystemMetrics(activeConnections);
  console.log(
    `[HEALTH] Memory: ${metrics.memory.percentage.toFixed(1)}% | ` +
      `CPU: ${metrics.cpu.percentage.toFixed(1)}% | ` +
      `Uptime: ${(metrics.uptime / 1000 / 60).toFixed(1)}min | ` +
      `Connections: ${metrics.activeConnections}`,
    `Connection Count: ${activeConnections}`,
  );
}
