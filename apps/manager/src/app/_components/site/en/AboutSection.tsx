"use client";

import { motion } from "framer-motion";
import { ServiceLogoGrid } from "../ServiceLogoGrid";

export function AboutSection() {
  return (
    <section id="about" className="border-t-3 border-black bg-white py-32">
      <div className="mx-auto max-w-6xl px-5">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="mb-20 text-center"
        >
          <h2 className="mb-2 text-4xl font-black tracking-tight text-black md:text-5xl lg:text-6xl">
            What is Tumiki?
          </h2>
          <p className="mb-8">
            The Foundation for Welcoming &quot;AI Employees&quot; to Your Team
          </p>
          <div className="mx-auto max-w-5xl">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="relative border-3 border-black bg-white p-12 shadow-[8px_8px_0_#000]"
            >
              {/* Block decoration for the overview card */}
              <div className="absolute top-4 left-4 h-6 w-6 border-2 border-gray-300 bg-gray-100 shadow-[2px_2px_0_rgba(0,0,0,0.1)]" />
              <div className="absolute top-4 right-4 h-4 w-4 border border-gray-200 bg-gray-50" />
              <div className="absolute bottom-4 left-6 h-5 w-5 border border-gray-300 bg-gray-100" />
              <div className="absolute right-6 bottom-4 h-6 w-6 border-2 border-gray-200 bg-gray-50 shadow-[1px_1px_0_rgba(0,0,0,0.05)]" />

              <div className="relative z-10">
                <p className="text-lg leading-relaxed font-medium text-gray-700 md:text-xl lg:text-2xl">
                  Easily integrate with business tools like Google Calendar,
                  Notion, and Slack, and based on
                  <span className="mx-1 inline-block bg-black px-3 py-1 font-bold tracking-wide text-white shadow-[3px_3px_0_#6366f1]">
                    MCP (Model Context Protocol)
                  </span>
                  , you can set roles and behavioral rules for AI. No-code
                  solution to personalize &quot;AI employees&quot; for your
                  business and deploy them to your team.
                </p>
              </div>
            </motion.div>
          </div>
        </motion.div>

        {/* Key Features Grid */}
        {/* <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, delay: 0.4 }}
          className="grid gap-6 md:grid-cols-2 lg:grid-cols-4"
        >
          {[
            {
              icon: "🚀",
              title: "Connect AI with Business Tools",
              description:
                "Launch MCP servers with one click and connect to AI instantly.",
            },
            {
              icon: "🔐",
              title: "Control Roles and Permissions",
              description:
                "Flexibly control AI's action scope and connected tools with MCP.",
            },
            {
              icon: "🛠️",
              title: "Centralized Tool Integration",
              description:
                "Intuitively manage connected tools like Slack and Notion all in one place.",
            },
            {
              icon: "📊",
              title: "Visualize Activity Logs",
              description:
                "Monitor and analyze AI's connection and communication history in real-time.",
            },
          ].map((feature, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: index * 0.1 }}
              className="group relative border-2 border-black bg-white p-6 text-center shadow-[3px_3px_0_#000] transition-all duration-300 hover:-translate-x-1 hover:-translate-y-1 hover:shadow-[6px_6px_0_#000]"
            >
              <div className="absolute top-2 left-2 text-xs text-gray-400 opacity-20 transition-opacity group-hover:opacity-40">
                ⋮⋮
              </div>

              <div className="mb-4 text-4xl">{feature.icon}</div>
              <h3 className="mb-3 text-lg font-black tracking-tight text-black">
                {feature.title}
              </h3>
              <p className="text-sm leading-relaxed text-gray-600">
                {feature.description}
              </p>
            </motion.div>
          ))}
        </motion.div> */}
        <ServiceLogoGrid />
      </div>
    </section>
  );
}
