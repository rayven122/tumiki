"use client";

import { motion } from "framer-motion";
import { CheckCircle2 } from "lucide-react";
import Image from "next/image";

interface SolutionFeature {
  title: string;
  description: string;
  points: string[];
  imageAlt: string;
  imagePath: string;
}

const solutions: SolutionFeature[] = [
  {
    title: "Unified Management of Specialized MCP Servers",
    description:
      "Centrally manage multiple MCP servers and give AI agents specialization",
    points: [
      "Centrally manage MCP servers for GitHub, Jira, Slack, AWS, etc.",
      "Launch MCP servers in the cloud with one click",
      "Each AI agent securely accesses specialized tools",
      "No need for Python/Node.js environment setup & maintenance",
    ],
    imageAlt: "MCP Management Dashboard",
    imagePath: "/demo/mcp-overview.png",
  },
  {
    title: "Role Separation & Specialization of AI Agents",
    description: "Set clear roles and permissions for each AI agent",
    points: [
      "PM Agent: Connected to project management MCP",
      "FE Agent: Figma, React, Storybook MCP",
      "BE Agent: GitHub, Database, API MCP",
      "Infra Agent: AWS, Terraform, Monitoring MCP",
      "Fine control of connection destinations & permissions for each agent",
    ],
    imageAlt: "Role Configuration & Permission Management Screen",
    imagePath: "/demo/role.png",
  },
  {
    title: "Providing a Secure Team Environment",
    description: "Manage your AI team with enterprise-grade security",
    points: [
      "Enterprise-grade security management",
      "Secure data sharing between AI agents",
      "Record & audit all access and execution logs",
      "Real-time monitoring & emergency stop function",
      "Automatic application of internal security policies",
    ],
    imageAlt: "Security & Monitoring Screen",
    imagePath: "/demo/security.png",
  },
  {
    title: "Optimization Support for Team Utilization",
    description: "Continuously improve AI team performance",
    points: [
      "Visualize AI agent activity status",
      "Measure role division & collaboration effectiveness",
      "Identify bottlenecks & improvement points",
      "Propose & automatically adjust optimal MCP configuration",
      "Continuous support for team productivity improvement",
    ],
    imageAlt: "Analysis & Optimization Dashboard",
    imagePath: "/demo/analytics.png",
  },
];

export const SolutionSection = () => {
  return (
    <section id="solution" className="bg-white py-24">
      <div className="mx-auto max-w-6xl px-5">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="mb-16 text-center"
        >
          <h2 className="mb-6 text-4xl font-black tracking-tight text-black md:text-5xl lg:text-6xl">
            Build an AI Agent Team Environment
            <br />
            with Tumiki MCP Manager
          </h2>
          <p className="mx-auto max-w-3xl text-lg text-gray-600 md:text-xl">
            Give AI specialization and collaboration capabilities through
            unified MCP server management
          </p>
        </motion.div>

        <div className="space-y-24">
          {solutions.map((solution, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8 }}
              className={`flex flex-col gap-12 ${
                index % 2 === 0 ? "lg:flex-row" : "lg:flex-row-reverse"
              } items-center`}
            >
              {/* Demo Image */}
              <div className="w-full lg:flex-1">
                <div className="relative border-3 border-black bg-white p-3 shadow-[6px_6px_0_#000] md:p-4">
                  <div className="absolute -top-3 -left-3 h-6 w-6 border-2 border-black bg-indigo-500 shadow-[2px_2px_0_#000]" />
                  <div className="absolute -top-3 -right-3 h-6 w-6 border-2 border-black bg-indigo-500 shadow-[2px_2px_0_#000]" />
                  <div className="relative aspect-[4/3] overflow-hidden rounded border-2 border-gray-200 md:aspect-video">
                    <Image
                      src={solution.imagePath}
                      alt={solution.imageAlt}
                      fill
                      className="object-cover"
                      sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                    />
                  </div>
                  <p className="mt-2 text-center text-xs text-gray-600">
                    {solution.imageAlt}
                  </p>
                </div>
              </div>

              {/* Content */}
              <div className="flex-1">
                <span className="mb-2 inline-block bg-black px-3 py-1 text-sm font-bold text-white">
                  Feature {index + 1}
                </span>
                <h3 className="mb-4 text-2xl font-black text-black md:text-3xl">
                  {solution.title}
                </h3>
                <p className="mb-6 text-lg text-gray-700">
                  {solution.description}
                </p>
                <ul className="space-y-3">
                  {solution.points.map((point, pointIndex) => (
                    <li key={pointIndex} className="flex items-start gap-3">
                      <CheckCircle2 className="mt-0.5 h-5 w-5 flex-shrink-0 text-green-600" />
                      <span className="text-gray-700">{point}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Central concept illustration */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="mt-24 border-3 border-black bg-indigo-50 p-12 shadow-[8px_8px_0_#000]"
        >
          <div className="text-center">
            <h3 className="mb-8 text-3xl font-black text-black">
              AI Team Environment Realized by Tumiki
            </h3>
            <div className="mx-auto max-w-4xl">
              <div className="grid gap-4 md:grid-cols-3">
                <div className="border-2 border-black bg-white p-6 shadow-[3px_3px_0_#000]">
                  <div className="mb-2 text-3xl">🎯</div>
                  <p className="font-bold">Specialization</p>
                  <p className="mt-2 text-sm text-gray-600">
                    Each AI specializes in specific roles
                  </p>
                </div>
                <div className="border-2 border-black bg-white p-6 shadow-[3px_3px_0_#000]">
                  <div className="mb-2 text-3xl">🔗</div>
                  <p className="font-bold">Collaboration</p>
                  <p className="mt-2 text-sm text-gray-600">
                    Automatic integration between tools
                  </p>
                </div>
                <div className="border-2 border-black bg-white p-6 shadow-[3px_3px_0_#000]">
                  <div className="mb-2 text-3xl">🛡️</div>
                  <p className="font-bold">Security</p>
                  <p className="mt-2 text-sm text-gray-600">
                    Enterprise-level security
                  </p>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
};
