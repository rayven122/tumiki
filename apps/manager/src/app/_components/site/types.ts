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
  LABEL: "mb-1 block text-xs font-bold tracking-wide text-black uppercase sm:mb-2 sm:text-sm",
  INPUT:
    "w-full border-2 border-black p-2 text-sm text-black bg-white transition-all focus:shadow-[3px_3px_0_#6366f1] focus:outline-none placeholder:text-gray-500 sm:p-3 sm:text-base sm:focus:shadow-[4px_4px_0_#6366f1]",
  BUTTON:
    "mt-4 w-full border-2 border-black bg-black p-3 text-sm font-bold tracking-wider text-white uppercase shadow-[3px_3px_0_#6366f1] transition-all duration-300 hover:-translate-x-1 hover:-translate-y-1 hover:shadow-[5px_5px_0_#6366f1] disabled:cursor-not-allowed disabled:opacity-50 sm:mt-8 sm:border-3 sm:p-4 sm:text-lg sm:shadow-[4px_4px_0_#6366f1] sm:hover:shadow-[7px_7px_0_#6366f1]",
  ERROR: "mt-2 rounded border border-red-400 bg-red-100 px-2 py-1 text-xs text-red-700 sm:mt-4 sm:px-4 sm:py-3 sm:text-sm",
} as const;
