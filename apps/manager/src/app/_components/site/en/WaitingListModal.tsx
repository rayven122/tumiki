"use client";

import { motion } from "framer-motion";
import { useState } from "react";
import { api } from "@/trpc/react";
import { SuccessAnimation } from "../../ui/SuccessAnimation";
import { USE_CASE_OPTIONS, FORM_FIELD_CLASSES } from "../types";
import type { WaitingListFormData, WaitingListModalProps } from "../types";

const INITIAL_FORM_DATA: WaitingListFormData = {
  email: "",
  name: "",
  company: "",
  useCase: "",
};

const MODAL_CLASSES = {
  OVERLAY:
    "bg-opacity-80 fixed inset-0 z-50 flex items-center justify-center bg-black p-4 backdrop-blur-sm",
  CONTAINER:
    "relative w-full max-w-lg border-4 border-black bg-white p-10 shadow-[8px_8px_0_#6366f1]",
  CLOSE_BUTTON:
    "absolute top-5 right-5 text-3xl font-black text-black transition-transform duration-300 hover:rotate-90",
  HEADER: "mb-8 text-center",
  TITLE: "mb-3 text-3xl font-black text-black",
  SUBTITLE: "text-gray-600",
  FORM_CONTAINER: "space-y-5",
} as const;

const SUCCESS_MESSAGES = {
  TITLE: "Registration Complete!",
  DESCRIPTION:
    "We've sent you a confirmation email.<br />We'll contact you when the service launches.",
} as const;

interface FormFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: "text" | "email";
  placeholder?: string;
  required?: boolean;
}

function FormField({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
  required = false,
}: FormFieldProps) {
  return (
    <div>
      <label className={FORM_FIELD_CLASSES.LABEL}>
        {label} {required && "*"}
      </label>
      <input
        type={type}
        required={required}
        className={FORM_FIELD_CLASSES.INPUT}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}

interface UseCaseSelectProps {
  value: string;
  onChange: (value: string) => void;
}

function UseCaseSelect({ value, onChange }: UseCaseSelectProps) {
  return (
    <div>
      <label className={FORM_FIELD_CLASSES.LABEL}>Expected Use Case</label>
      <select
        className={FORM_FIELD_CLASSES.INPUT}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        <option value="">Select a use case</option>
        <option value={USE_CASE_OPTIONS.AUTOMATION}>Business Automation</option>
        <option value={USE_CASE_OPTIONS.CUSTOMER_SUPPORT}>
          Customer Support
        </option>
        <option value={USE_CASE_OPTIONS.DATA_ANALYSIS}>Data Analysis</option>
        <option value={USE_CASE_OPTIONS.DEVELOPMENT}>
          Development Support
        </option>
        <option value={USE_CASE_OPTIONS.OTHER}>Other</option>
      </select>
    </div>
  );
}

export function WaitingListModal({ isOpen, onClose }: WaitingListModalProps) {
  const [formData, setFormData] =
    useState<WaitingListFormData>(INITIAL_FORM_DATA);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const registerMutation = api.waitingList.register.useMutation({
    onSuccess: () => {
      setIsSubmitted(true);
      setErrorMessage("");
      setTimeout(() => {
        setIsSubmitted(false);
        onClose();
        setFormData(INITIAL_FORM_DATA);
      }, 2000);
    },
    onError: (error) => {
      setErrorMessage(error.message);
    },
  });

  const updateFormField =
    (field: keyof WaitingListFormData) => (value: string) => {
      setFormData((prev) => ({ ...prev, [field]: value }));
    };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage("");

    registerMutation.mutate({
      email: formData.email,
      name: formData.name || undefined,
      company: formData.company || undefined,
      useCase: formData.useCase || undefined,
      language: "en",
    });
  };

  if (!isOpen) return null;

  return (
    <div className={MODAL_CLASSES.OVERLAY}>
      <motion.div
        className={MODAL_CLASSES.CONTAINER}
        initial={{ y: -50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.3 }}
      >
        <button
          onClick={onClose}
          className={MODAL_CLASSES.CLOSE_BUTTON}
          aria-label="Close modal"
        >
          ×
        </button>

        <div className={MODAL_CLASSES.HEADER}>
          <h2 className={MODAL_CLASSES.TITLE}>Join the Early Access</h2>
          <p className={MODAL_CLASSES.SUBTITLE}>Join the AI block revolution</p>
        </div>

        {!isSubmitted ? (
          <form onSubmit={handleSubmit}>
            <div className={MODAL_CLASSES.FORM_CONTAINER}>
              <FormField
                label="Email Address"
                type="email"
                value={formData.email}
                onChange={updateFormField("email")}
                placeholder="you@company.com"
                required
              />

              <FormField
                label="Name"
                value={formData.name}
                onChange={updateFormField("name")}
                placeholder="John Doe"
                required
              />

              <FormField
                label="Company"
                value={formData.company}
                onChange={updateFormField("company")}
                placeholder="Acme Corp"
              />

              <UseCaseSelect
                value={formData.useCase}
                onChange={updateFormField("useCase")}
              />
            </div>

            {errorMessage && (
              <div className={FORM_FIELD_CLASSES.ERROR}>{errorMessage}</div>
            )}

            <motion.button
              type="submit"
              disabled={registerMutation.isPending}
              className={FORM_FIELD_CLASSES.BUTTON}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              {registerMutation.isPending ? (
                <div className="flex items-center justify-center">
                  <div className="mr-2 h-5 w-5 animate-spin rounded-full border-3 border-white border-t-transparent" />
                  Registering...
                </div>
              ) : (
                "Register"
              )}
            </motion.button>
          </form>
        ) : (
          <SuccessAnimation
            title={SUCCESS_MESSAGES.TITLE}
            description={SUCCESS_MESSAGES.DESCRIPTION}
          />
        )}
      </motion.div>
    </div>
  );
}
