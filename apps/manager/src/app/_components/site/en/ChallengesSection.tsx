"use client";

import { motion } from "framer-motion";

interface ChallengeCard {
  icon: string;
  title: string;
  items: string[];
}

const challenges: ChallengeCard[] = [
  {
    icon: "🤖",
    title: "AI Utilization Limits",
    items: [
      "Generic with lack of specialization",
      "Accuracy drops on complex tasks",
      "Difficult to use continuously at work",
      "Tool integration & security barriers",
    ],
  },
  {
    icon: "🔌",
    title: "Tool Integration & Security Barriers",
    items: [
      "Difficult to connect safely to GitHub, AWS, Slack",
      "Complex authentication & permission management",
      "Non-compliant with internal security requirements",
      "Lack of execution logs & audit trails",
      "Technical hurdles of building MCP servers individually",
    ],
  },
  {
    icon: "📊",
    title: "Team Utilization & Operational Challenges",
    items: [
      "No collaboration between AI agents",
      "Cannot divide work & separate roles",
      "No progress & quality management system",
      "Lack of organizational AI adoption strategy",
    ],
  },
];

export const ChallengesSection = () => {
  return (
    <section className="border-t-3 border-black bg-gray-50 py-24">
      <div className="mx-auto max-w-6xl px-5">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="mb-16 text-center"
        >
          <h2 className="mb-6 text-4xl font-black tracking-tight text-black md:text-5xl lg:text-6xl">
            Are You Using AI Agents in Real Work?
          </h2>
          <p className="mx-auto max-w-3xl text-lg text-gray-600 md:text-xl">
            Practical challenges many companies face with AI adoption
          </p>
        </motion.div>

        <div className="grid gap-8 md:grid-cols-3">
          {challenges.map((challenge, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: index * 0.1 }}
              className="group relative border-2 border-black bg-white p-8 shadow-[4px_4px_0_#000] transition-all duration-300 hover:-translate-x-1 hover:-translate-y-1 hover:shadow-[8px_8px_0_#000]"
            >
              {/* Decorative corner blocks */}
              <div className="absolute -top-2 -left-2 h-4 w-4 border-2 border-black bg-red-500" />
              <div className="absolute -top-2 -right-2 h-4 w-4 border-2 border-black bg-yellow-500" />
              <div className="absolute -bottom-2 -left-2 h-4 w-4 border-2 border-black bg-blue-500" />
              <div className="absolute -right-2 -bottom-2 h-4 w-4 border-2 border-black bg-green-500" />

              <div className="mb-4 text-5xl">{challenge.icon}</div>
              <h3 className="mb-6 text-xl font-black text-black">
                {challenge.title}
              </h3>
              <ul className="space-y-3">
                {challenge.items.map((item, itemIndex) => (
                  <li
                    key={itemIndex}
                    className="flex items-start gap-2 text-sm text-gray-700"
                  >
                    <span className="mt-1 block h-1.5 w-1.5 flex-shrink-0 bg-black" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </motion.div>
          ))}
        </div>

        {/* Problem illustration */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, delay: 0.4 }}
          className="mt-16 border-3 border-black bg-gradient-to-r from-red-50 to-orange-50 p-6 shadow-[6px_6px_0_#000] md:p-8"
        >
          <div className="mb-6 text-center">
            <h3 className="text-2xl font-black text-red-800 md:text-3xl">
              Common Failure Pattern
            </h3>
            <p className="mt-2 text-sm text-red-600 md:text-base">
              A vicious cycle starting from individual adoption
            </p>
          </div>

          <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-around md:gap-4">
            {/* Step 1 */}
            <motion.div
              className="relative flex-1"
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.6 }}
            >
              <div className="group relative border-2 border-red-300 bg-white p-4 text-center shadow-[3px_3px_0_rgba(239,68,68,0.3)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[4px_4px_0_rgba(239,68,68,0.4)] md:p-6">
                <div className="mb-3 text-4xl md:text-5xl">🤖</div>
                <h4 className="mb-2 text-lg font-bold text-red-800 md:text-xl">
                  Individual Tool Adoption
                </h4>
                <p className="text-xs text-red-600 md:text-sm">
                  ChatGPT, Claude, Copilot, etc.
                  <br />
                  adopted separately
                </p>
              </div>
            </motion.div>

            {/* Arrow 1 */}
            <div className="flex justify-center md:flex-shrink-0">
              <div className="text-2xl text-red-500 md:hidden">↓</div>
              <div className="hidden text-2xl text-red-500 md:block">→</div>
            </div>

            {/* Step 2 */}
            <motion.div
              className="relative flex-1"
              initial={{ opacity: 0, x: 0 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.8 }}
            >
              <div className="group relative border-2 border-orange-300 bg-white p-4 text-center shadow-[3px_3px_0_rgba(251,146,60,0.3)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[4px_4px_0_rgba(251,146,60,0.4)] md:p-6">
                <div className="mb-3 text-4xl md:text-5xl">🚫</div>
                <h4 className="mb-2 text-lg font-bold text-orange-800 md:text-xl">
                  Difficult to Measure Effectiveness
                </h4>
                <p className="text-xs text-orange-600 md:text-sm">
                  No integration, no specialization
                  <br />
                  Cannot measure ROI
                </p>
              </div>
            </motion.div>

            {/* Arrow 2 */}
            <div className="flex justify-center md:flex-shrink-0">
              <div className="text-2xl text-red-500 md:hidden">↓</div>
              <div className="hidden text-2xl text-red-500 md:block">→</div>
            </div>

            {/* Step 3 */}
            <motion.div
              className="relative flex-1"
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 1.0 }}
            >
              <div className="group relative border-2 border-red-400 bg-white p-4 text-center shadow-[3px_3px_0_rgba(239,68,68,0.4)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[4px_4px_0_rgba(239,68,68,0.5)] md:p-6">
                <div className="mb-3 text-4xl md:text-5xl">💸</div>
                <h4 className="mb-2 text-lg font-bold text-red-800 md:text-xl">
                  Budget Waste
                </h4>
                <p className="text-xs text-red-600 md:text-sm">
                  Not used continuously
                  <br />
                  Extremely low return on investment
                </p>
              </div>
            </motion.div>
          </div>

          {/* Call to action */}
          <motion.div
            className="mt-8 text-center"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 1.2 }}
          >
            <div className="mx-auto max-w-md rounded border-2 border-red-300 bg-red-100 p-4">
              <p className="text-sm font-bold text-red-800 md:text-base">
                💡 How to Break This Vicious Cycle?
              </p>
              <p className="mt-2 text-xs text-red-700 md:text-sm">
                An integrated AI team environment is needed
              </p>
            </div>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
};
