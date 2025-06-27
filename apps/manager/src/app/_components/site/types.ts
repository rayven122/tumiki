export interface WaitingListFormData {
  email: string;
  name: string;
  company: string;
  useCase: string;
}

export interface WaitingListModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const USE_CASE_OPTIONS = {
  AUTOMATION: "automation",
  CUSTOMER_SUPPORT: "customer-support",
  DATA_ANALYSIS: "data-analysis",
  DEVELOPMENT: "development",
  OTHER: "other",
} as const;

export type UseCaseValue =
  (typeof USE_CASE_OPTIONS)[keyof typeof USE_CASE_OPTIONS];

export const FORM_FIELD_CLASSES = {
  LABEL: "mb-2 block text-sm font-bold tracking-wide text-black uppercase",
  INPUT:
    "w-full border-2 border-black p-3 text-black bg-white transition-all focus:shadow-[4px_4px_0_#6366f1] focus:outline-none placeholder:text-gray-500",
  BUTTON:
    "mt-8 w-full border-3 border-black bg-black p-4 text-lg font-bold tracking-wider text-white uppercase shadow-[4px_4px_0_#6366f1] transition-all duration-300 hover:-translate-x-1 hover:-translate-y-1 hover:shadow-[7px_7px_0_#6366f1] disabled:cursor-not-allowed disabled:opacity-50",
  ERROR: "mt-4 rounded border border-red-400 bg-red-100 px-4 py-3 text-red-700",
} as const;
