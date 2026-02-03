"use client";

import { motion } from "framer-motion";
import { ArrowRight, Users, Settings, TrendingUp } from "lucide-react";

interface TeamPattern {
  title: string;
  description: string;
  mcpServers: { name: string; purpose: string }[];
  agents: { role: string; access: string[] }[];
  benefits: string[];
}

const teamPatterns: TeamPattern[] = [
  {
    title: "Web Development Team",
    description:
      "Development team with frontend, backend, and operations working together",
    mcpServers: [
      { name: "GitHub MCP", purpose: "Code management" },
      { name: "Figma MCP", purpose: "Design collaboration" },
      { name: "Vercel MCP", purpose: "Deployment & operations" },
      { name: "Notion MCP", purpose: "Documentation management" },
      { name: "Slack MCP", purpose: "Communication" },
    ],
    agents: [
      { role: "PM Agent", access: ["GitHub", "Notion", "Slack"] },
      { role: "Design Agent", access: ["Figma", "Notion"] },
      {
        role: "Frontend Agent",
        access: ["GitHub", "Vercel", "Slack"],
      },
      { role: "Backend Agent", access: ["GitHub", "DB"] },
      { role: "Operations Agent", access: ["Vercel", "Monitoring Tools"] },
    ],
    benefits: [
      "PM breaks down tasks → Auto-distributes to each agent",
      "Design changes → Frontend agent auto-reflects updates",
      "Backend API updates → Frontend auto-integrates",
      "All processes auto-report & share progress via Slack",
    ],
  },
  {
    title: "Mobile App Development Team",
    description: "iOS, Android, and cross-platform development",
    mcpServers: [
      { name: "GitHub MCP", purpose: "Source code management" },
      { name: "App Store Connect MCP", purpose: "iOS distribution" },
      { name: "Google Play Console MCP", purpose: "Android distribution" },
      { name: "Firebase MCP", purpose: "Backend & analytics" },
      { name: "TestFlight MCP", purpose: "Beta testing" },
    ],
    agents: [
      {
        role: "iOS Agent",
        access: ["Swift/SwiftUI", "App Store Connect"],
      },
      {
        role: "Android Agent",
        access: ["Kotlin/Jetpack Compose", "Google Play"],
      },
      {
        role: "Cross-platform Agent",
        access: ["React Native/Flutter", "Both OS support"],
      },
      { role: "Backend Agent", access: ["Firebase", "Push notifications"] },
      { role: "QA & Release Agent", access: ["TestFlight", "Review handling"] },
    ],
    benefits: [
      "Parallel platform development → Unified backend integration",
      "Auto-build → TestFlight/internal test distribution",
      "Store review → Auto-response & rejection fixes",
      "App analytics → Firebase Analytics auto-reports",
    ],
  },
  {
    title: "AI/ML Development Team",
    description: "Machine learning model development & operations",
    mcpServers: [
      { name: "GitHub MCP", purpose: "Model & code management" },
      { name: "MLflow MCP", purpose: "Experiment & model management" },
      { name: "AWS SageMaker MCP", purpose: "Model training & deployment" },
      { name: "Apache Airflow MCP", purpose: "Data pipeline" },
      { name: "Jupyter MCP", purpose: "Experiment & analysis environment" },
    ],
    agents: [
      {
        role: "Data Engineer Agent",
        access: ["Airflow", "Data pipeline construction"],
      },
      {
        role: "Machine Learning Engineer Agent",
        access: ["MLflow", "SageMaker", "Model development"],
      },
      {
        role: "MLOps Agent",
        access: ["SageMaker", "Production deployment & monitoring"],
      },
      {
        role: "Feature Engineer Agent",
        access: ["Jupyter", "Feature design & validation"],
      },
      {
        role: "Monitoring Agent",
        access: ["CloudWatch", "Model performance monitoring"],
      },
    ],
    benefits: [
      "Data pipeline → Auto-preprocessing & feature generation",
      "Experiment management → Hyperparameter optimization",
      "Model productionization → A/B testing & gradual deployment",
      "Continuous monitoring → Performance degradation detection & retraining",
    ],
  },
  {
    title: "SaaS & B2B Product Development Team",
    description: "Enterprise SaaS development",
    mcpServers: [
      { name: "GitHub MCP", purpose: "Source code management" },
      { name: "Stripe MCP", purpose: "Payment & subscription" },
      { name: "Auth0 MCP", purpose: "Authentication & SSO" },
      { name: "Mixpanel MCP", purpose: "User analytics" },
      { name: "Intercom MCP", purpose: "Customer support" },
    ],
    agents: [
      {
        role: "Frontend Agent",
        access: ["React/Vue", "Dashboard development"],
      },
      {
        role: "Backend Agent",
        access: ["API", "Multi-tenant design"],
      },
      {
        role: "Auth & Security Agent",
        access: ["Auth0", "SSO", "Permission management"],
      },
      {
        role: "Payment & Billing Agent",
        access: ["Stripe", "Subscription"],
      },
      { role: "Analytics & CS Agent", access: ["Mixpanel", "Intercom"] },
    ],
    benefits: [
      "Multi-tenant foundation → Secure customer isolation",
      "SSO integration → Enterprise authentication support",
      "Subscription → Auto-billing & upgrades",
      "User analytics → Churn prediction & improvement suggestions",
    ],
  },
  {
    title: "DevOps & CI/CD Specialized Team",
    description: "Infrastructure automation & continuous delivery",
    mcpServers: [
      { name: "GitHub Actions MCP", purpose: "CI/CD pipeline" },
      { name: "Docker Hub MCP", purpose: "Container registry" },
      { name: "Kubernetes MCP", purpose: "Orchestration" },
      { name: "Terraform MCP", purpose: "Infrastructure as Code" },
      { name: "Prometheus MCP", purpose: "Monitoring & metrics" },
    ],
    agents: [
      {
        role: "CI/CD Agent",
        access: ["GitHub Actions", "Pipeline management"],
      },
      {
        role: "Infrastructure Agent",
        access: ["Terraform", "K8s", "Infrastructure construction"],
      },
      { role: "Container Agent", access: ["Docker", "Container optimization"] },
      {
        role: "Monitoring Agent",
        access: ["Prometheus", "Grafana", "Alerts"],
      },
      {
        role: "Security Agent",
        access: ["Container scanning", "Vulnerability response"],
      },
    ],
    benefits: [
      "Infrastructure as Code → Auto-infrastructure construction",
      "CI/CD pipeline → Auto-testing & deployment",
      "Container optimization → Lightweight & secure images",
      "24/7 monitoring → Auto-alerts & self-healing",
    ],
  },
  {
    title: "Security-Focused Development Team",
    description: "Secure coding & vulnerability countermeasures",
    mcpServers: [
      { name: "GitHub MCP", purpose: "Secure code management" },
      {
        name: "SonarQube MCP",
        purpose: "Code quality & vulnerability analysis",
      },
      { name: "OWASP ZAP MCP", purpose: "Security testing" },
      { name: "Snyk MCP", purpose: "Dependency vulnerability check" },
      { name: "HashiCorp Vault MCP", purpose: "Secret management" },
    ],
    agents: [
      {
        role: "Secure Coding Agent",
        access: ["GitHub", "SonarQube"],
      },
      { role: "Vulnerability Analysis Agent", access: ["OWASP ZAP", "Snyk"] },
      {
        role: "Penetration Testing Agent",
        access: ["Intrusion testing", "Vulnerability verification"],
      },
      {
        role: "Encryption & Auth Agent",
        access: ["Vault", "Encryption implementation"],
      },
      {
        role: "Compliance Agent",
        access: ["Security standard compliance", "Audit response"],
      },
    ],
    benefits: [
      "Secure development → Code quality check & vulnerability detection",
      "Auto-penetration testing → Real-time threat verification",
      "Secret management → Safe key & credential management",
      "Compliance → SOC2 & ISO27001 compliance",
    ],
  },
];

export const TeamExamplesSection = () => {
  return (
    <section className="border-t-3 border-black bg-gray-50 py-24">
      <div className="mx-auto max-w-7xl px-5">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="mb-16 text-center"
        >
          <h2 className="mb-6 text-4xl font-black tracking-tight text-black md:text-5xl lg:text-6xl">
            Real AI Agent Team Implementation Examples
          </h2>
          <p className="mx-auto max-w-3xl text-lg text-gray-600 md:text-xl">
            Concrete AI team composition patterns covering all development
            domains
          </p>

          {/* Pattern Overview */}
          <div className="mt-12 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <div className="border-2 border-black bg-blue-50 p-4 shadow-[2px_2px_0_#000]">
              <div className="text-2xl">🌐</div>
              <p className="text-sm font-bold">Web & Mobile Development</p>
            </div>
            <div className="border-2 border-black bg-green-50 p-4 shadow-[2px_2px_0_#000]">
              <div className="text-2xl">🤖</div>
              <p className="text-sm font-bold">AI, ML & Data</p>
            </div>
            <div className="border-2 border-black bg-purple-50 p-4 shadow-[2px_2px_0_#000]">
              <div className="text-2xl">☁️</div>
              <p className="text-sm font-bold">Infrastructure & DevOps</p>
            </div>
            <div className="border-2 border-black bg-red-50 p-4 shadow-[2px_2px_0_#000]">
              <div className="text-2xl">🔒</div>
              <p className="text-sm font-bold">Security & Audit</p>
            </div>
            <div className="border-2 border-black bg-yellow-50 p-4 shadow-[2px_2px_0_#000]">
              <div className="text-2xl">💼</div>
              <p className="text-sm font-bold">Enterprise</p>
            </div>
            <div className="border-2 border-black bg-indigo-50 p-4 shadow-[2px_2px_0_#000]">
              <div className="text-2xl">🎮</div>
              <p className="text-sm font-bold">Game & API</p>
            </div>
          </div>
        </motion.div>

        <div className="space-y-16">
          {teamPatterns.map((pattern, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8, delay: index * 0.2 }}
              className="border-3 border-black bg-white p-8 shadow-[6px_6px_0_#000] md:p-12"
            >
              {/* Header */}
              <div className="mb-8 flex items-center gap-4">
                <span className="bg-black px-4 py-2 text-sm font-bold text-white">
                  Pattern {index + 1}
                </span>
                <h3 className="text-2xl font-black text-black md:text-3xl">
                  {pattern.title}
                </h3>
              </div>

              <p className="mb-8 text-lg text-gray-700">
                {pattern.description}
              </p>

              <div className="grid gap-8 lg:grid-cols-3">
                {/* MCP Servers */}
                <div className="border-2 border-black bg-blue-50 p-6 shadow-[3px_3px_0_#000]">
                  <div className="mb-4 flex items-center gap-2">
                    <Settings className="h-5 w-5" />
                    <h4 className="font-black text-black">
                      Tumiki MCP Manager Setup
                    </h4>
                  </div>
                  <ul className="space-y-2">
                    {pattern.mcpServers.map((server, serverIndex) => (
                      <li key={serverIndex} className="text-sm">
                        <span className="font-bold">{server.name}</span>
                        <span className="text-gray-600">
                          ({server.purpose})
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* AI Agents */}
                <div className="border-2 border-black bg-green-50 p-6 shadow-[3px_3px_0_#000]">
                  <div className="mb-4 flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    <h4 className="font-black text-black">
                      AI Agent Specialization
                    </h4>
                  </div>
                  <ul className="space-y-3">
                    {pattern.agents.map((agent, agentIndex) => (
                      <li key={agentIndex} className="text-sm">
                        <div className="font-bold">{agent.role}</div>
                        <div className="text-xs text-gray-600">
                          → {agent.access.join(" + ")} access
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Benefits */}
                <div className="border-2 border-black bg-yellow-50 p-6 shadow-[3px_3px_0_#000]">
                  <div className="mb-4 flex items-center gap-2">
                    <TrendingUp className="h-5 w-5" />
                    <h4 className="font-black text-black">
                      Realized Collaboration
                    </h4>
                  </div>
                  <ul className="space-y-2">
                    {pattern.benefits.map((benefit, benefitIndex) => (
                      <li
                        key={benefitIndex}
                        className="flex items-start gap-2 text-sm"
                      >
                        <span className="mt-1 block h-1.5 w-1.5 flex-shrink-0 bg-green-600" />
                        <span>{benefit}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Flow illustration */}
              <div className="mt-8 border-2 border-gray-300 bg-gray-50 p-6">
                <h5 className="mb-4 font-bold text-gray-800">
                  Collaboration Flow Example:
                </h5>
                <div className="flex flex-wrap items-center gap-2 text-sm">
                  <span className="rounded bg-indigo-100 px-2 py-1 font-medium">
                    Requirements
                  </span>
                  <ArrowRight className="h-4 w-4 text-gray-400" />
                  <span className="rounded bg-blue-100 px-2 py-1 font-medium">
                    Design & Development
                  </span>
                  <ArrowRight className="h-4 w-4 text-gray-400" />
                  <span className="rounded bg-green-100 px-2 py-1 font-medium">
                    Testing & Deployment
                  </span>
                  <ArrowRight className="h-4 w-4 text-gray-400" />
                  <span className="rounded bg-yellow-100 px-2 py-1 font-medium">
                    Operations & Monitoring
                  </span>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Call to action */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="mt-16 text-center"
        >
          <div className="border-3 border-black bg-white p-8 shadow-[6px_6px_0_#000]">
            <h3 className="mb-4 text-2xl font-black text-black">
              We Propose AI Team Configurations Tailored to Your Industry &amp;
              Use Case
            </h3>
            <p className="mb-6 text-gray-700">
              Beyond the above patterns, we support all domains including
              <br />
              frontend-focused, game development, API development, and more.
              Expert engineers support optimal MCP configuration and agent
              design
            </p>
            <div className="mb-6 grid gap-2 text-xs md:grid-cols-3">
              <span className="rounded bg-gray-100 px-2 py-1">
                Frontend-Focused
              </span>
              <span className="rounded bg-gray-100 px-2 py-1">
                Game Development
              </span>
              <span className="rounded bg-gray-100 px-2 py-1">
                API & Microservices
              </span>
              <span className="rounded bg-gray-100 px-2 py-1">
                Data Science
              </span>
              <span className="rounded bg-gray-100 px-2 py-1">
                QA & Test Automation
              </span>
              <span className="rounded bg-gray-100 px-2 py-1">
                Custom Configuration
              </span>
            </div>

            {/* <button className="border-2 border-black bg-indigo-500 px-8 py-3 font-bold text-white shadow-[3px_3px_0_#000] transition-all duration-200 hover:-translate-x-1 hover:-translate-y-1 hover:shadow-[6px_6px_0_#000]">
              Request Consultation
            </button> */}
          </div>
        </motion.div>
      </div>
    </section>
  );
};
