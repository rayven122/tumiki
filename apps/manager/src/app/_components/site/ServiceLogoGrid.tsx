import Image from "next/image";

// Available service logos
const serviceLogos = [
  { name: "Google", path: "/logos/google.svg" },
  { name: "Slack", path: "/logos/slack.svg" },
  { name: "Notion", path: "/logos/notion.svg" },
  { name: "Gmail", path: "/logos/gmail.svg" },
  { name: "Google Drive", path: "/logos/google-drive.svg" },
  { name: "Google Analytics", path: "/logos/google-analytics.svg" },
  { name: "Microsoft Teams", path: "/logos/microsoft-teams.svg" },
  { name: "Excel", path: "/logos/excel.svg" },
  { name: "Word", path: "/logos/word.svg" },
  { name: "OneDrive", path: "/logos/one-drive.svg" },
  { name: "Asana", path: "/logos/asana.svg" },
  { name: "GitHub", path: "/logos/github.svg" },
];

export function ServiceLogoGrid() {
  return (
    <div className="mt-16 text-center">
      <p className="mb-8 font-semibold text-gray-600">
        Tumikiが連携可能なサービスの一部をご紹介
      </p>
      <div className="mx-auto grid max-w-6xl grid-cols-6 gap-4 md:grid-cols-12">
        {serviceLogos.map((service, index) => (
          <div key={index} className="group text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-lg border border-gray-200 bg-gray-50 transition-colors group-hover:bg-gray-100">
              <Image
                src={service.path}
                alt={service.name}
                width={32}
                height={32}
                className="object-contain"
              />
            </div>
            <p className="mt-1 text-center text-xs font-medium text-gray-500">
              {service.name}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
