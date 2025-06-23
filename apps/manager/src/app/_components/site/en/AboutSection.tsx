import { motion } from "framer-motion";
import { ServiceLogoGrid } from "../ServiceLogoGrid";

export const AboutSection = () => {
  const features = [
    {
      icon: "🚀",
      title: "Connect AI with Business Tools",
      description:
        "Seamlessly integrate your AI with various business tools to enhance productivity",
    },
    {
      icon: "🔐",
      title: "Control Roles and Permissions",
      description:
        "Manage access control with fine-grained role and permission settings",
    },
    {
      icon: "🛠️",
      title: "Centralized Tool Integration",
      description:
        "Manage all your tool integrations from a single, unified dashboard",
    },
    {
      icon: "📊",
      title: "Visualize Activity Logs",
      description:
        "Track and analyze all activities with comprehensive logging and visualization",
    },
  ];

  return (
    <section id="how-it-works" className="bg-gray-50 px-6 py-24 lg:px-12">
      <div className="mx-auto max-w-6xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
          className="mb-16 text-center"
        >
          <h2 className="mb-6 text-4xl font-bold text-gray-900 lg:text-5xl">
            What is Tumiki?
          </h2>
          <p className="mx-auto max-w-3xl text-xl text-gray-600">
            Tumiki is an AI integration platform that uses MCP (Model Context
            Protocol) to connect AI with your business tools, transforming it
            into a digital employee that understands your company's unique
            context and workflows.
          </p>
        </motion.div>

        <div className="mb-16 grid gap-8 md:grid-cols-2">
          {features.map((feature, index) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: index * 0.1 }}
              viewport={{ once: true }}
              className="rounded-2xl bg-white p-8 shadow-sm transition-shadow hover:shadow-md"
            >
              <div className="mb-4 text-4xl">{feature.icon}</div>
              <h3 className="mb-3 text-2xl font-semibold text-gray-900">
                {feature.title}
              </h3>
              <p className="text-gray-600">{feature.description}</p>
            </motion.div>
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          viewport={{ once: true }}
          className="text-center"
        >
          <p className="mb-8 text-lg text-gray-600">
            Integrate with your favorite tools and services
          </p>
          <ServiceLogoGrid />
        </motion.div>
      </div>
    </section>
  );
};
