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
    "bg-opacity-80 fixed inset-0 z-50 flex items-center justify-center bg-black p-2 backdrop-blur-sm sm:p-4",
  CONTAINER:
    "relative w-full max-w-sm border-3 border-black bg-white p-4 shadow-[6px_6px_0_#6366f1] sm:max-w-lg sm:border-4 sm:p-10 sm:shadow-[8px_8px_0_#6366f1]",
  CLOSE_BUTTON:
    "absolute top-2 right-2 text-xl font-black text-black transition-transform duration-300 hover:rotate-90 sm:top-5 sm:right-5 sm:text-3xl",
  HEADER: "mb-4 text-center sm:mb-8",
  TITLE: "mb-2 text-xl font-black text-black sm:mb-3 sm:text-3xl",
  SUBTITLE: "text-xs text-gray-600 sm:text-base",
  FORM_CONTAINER: "space-y-3 sm:space-y-5",
} as const;

const SUCCESS_MESSAGES = {
  TITLE: "登録完了！",
  DESCRIPTION:
    "確認メールをお送りしました。<br />サービス開始時にご連絡いたします。",
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
      <label className={FORM_FIELD_CLASSES.LABEL}>利用予定の用途</label>
      <select
        className={FORM_FIELD_CLASSES.INPUT}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        <option value="">選択してください</option>
        <option value={USE_CASE_OPTIONS.AUTOMATION}>業務自動化</option>
        <option value={USE_CASE_OPTIONS.CUSTOMER_SUPPORT}>
          カスタマーサポート
        </option>
        <option value={USE_CASE_OPTIONS.DATA_ANALYSIS}>データ分析</option>
        <option value={USE_CASE_OPTIONS.DEVELOPMENT}>開発支援</option>
        <option value={USE_CASE_OPTIONS.OTHER}>その他</option>
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
      language: "ja",
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
          aria-label="モーダルを閉じる"
        >
          ×
        </button>

        <div className={MODAL_CLASSES.HEADER}>
          <h2 className={MODAL_CLASSES.TITLE}>早期アクセスに登録</h2>
          <p className={MODAL_CLASSES.SUBTITLE}>AIブロックの革命に参加しよう</p>
        </div>

        {!isSubmitted ? (
          <form onSubmit={handleSubmit}>
            <div className={MODAL_CLASSES.FORM_CONTAINER}>
              <FormField
                label="メールアドレス"
                type="email"
                value={formData.email}
                onChange={updateFormField("email")}
                placeholder="you@company.com"
                required
              />

              <FormField
                label="お名前"
                value={formData.name}
                onChange={updateFormField("name")}
                placeholder="山田 太郎"
                required
              />

              <FormField
                label="会社名"
                value={formData.company}
                onChange={updateFormField("company")}
                placeholder="株式会社〇〇"
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
                  <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent sm:h-5 sm:w-5 sm:border-3" />
                  <span className="text-xs sm:text-base">登録中...</span>
                </div>
              ) : (
                "登録する"
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
