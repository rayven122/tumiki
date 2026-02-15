"use client";

import { motion } from "framer-motion";
import { useState } from "react";
import { api } from "@/trpc/react";
import { SuccessAnimation } from "@/app/_components/ui/SuccessAnimation";

type TeamInquiryFormData = {
  company: string;
  message: string;
};

type TeamInquiryModalProps = {
  isOpen: boolean;
  onClose: () => void;
};

const INITIAL_FORM_DATA: TeamInquiryFormData = {
  company: "",
  message: "",
};

const MODAL_CLASSES = {
  OVERLAY:
    "fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-2 backdrop-blur-sm sm:p-4",
  CONTAINER:
    "relative w-full max-w-sm border-3 border-black bg-white p-4 shadow-[6px_6px_0_#6366f1] sm:max-w-lg sm:p-8",
  CLOSE_BUTTON:
    "absolute top-2 right-2 text-xl font-black text-black transition-transform duration-300 hover:rotate-90 sm:top-4 sm:right-4 sm:text-2xl",
  HEADER: "mb-4 text-center sm:mb-6",
  TITLE: "mb-2 text-xl font-black text-black sm:text-2xl",
  SUBTITLE: "text-xs text-gray-600 sm:text-sm",
  FORM_CONTAINER: "space-y-3 sm:space-y-4",
} as const;

const FORM_FIELD_CLASSES = {
  LABEL:
    "mb-1 block text-xs font-bold tracking-wide text-black uppercase sm:mb-2 sm:text-sm",
  INPUT:
    "w-full border-2 border-black p-2 text-sm text-black bg-white transition-all focus:shadow-[3px_3px_0_#6366f1] focus:outline-none placeholder:text-gray-500 sm:p-3 sm:text-base",
  TEXTAREA:
    "w-full border-2 border-black p-2 text-sm text-black bg-white transition-all focus:shadow-[3px_3px_0_#6366f1] focus:outline-none placeholder:text-gray-500 sm:p-3 sm:text-base resize-none",
  BUTTON:
    "mt-4 w-full border-2 border-black bg-black p-3 text-sm font-bold tracking-wider text-white uppercase shadow-[3px_3px_0_#6366f1] transition-all duration-300 hover:-translate-x-1 hover:-translate-y-1 hover:shadow-[5px_5px_0_#6366f1] disabled:cursor-not-allowed disabled:opacity-50 sm:mt-6 sm:p-4 sm:text-base",
  ERROR:
    "mt-2 rounded border border-red-400 bg-red-100 px-2 py-1 text-xs text-red-700 sm:mt-4 sm:px-4 sm:py-2 sm:text-sm",
} as const;

const SUCCESS_MESSAGES = {
  TITLE: "送信完了！",
  DESCRIPTION:
    "お問い合わせありがとうございます。<br />担当者より折り返しご連絡いたします。",
} as const;

type FormFieldProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
};

const FormField = ({
  label,
  value,
  onChange,
  placeholder,
  required = false,
}: FormFieldProps) => (
  <div>
    <label className={FORM_FIELD_CLASSES.LABEL}>
      {label} {required && "*"}
    </label>
    <input
      type="text"
      required={required}
      className={FORM_FIELD_CLASSES.INPUT}
      placeholder={placeholder}
      value={value}
      onChange={(e) => onChange(e.target.value)}
    />
  </div>
);

type TextAreaFieldProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  rows?: number;
  required?: boolean;
};

const TextAreaField = ({
  label,
  value,
  onChange,
  placeholder,
  rows = 4,
  required = false,
}: TextAreaFieldProps) => (
  <div>
    <label className={FORM_FIELD_CLASSES.LABEL}>
      {label} {required && "*"}
    </label>
    <textarea
      className={FORM_FIELD_CLASSES.TEXTAREA}
      placeholder={placeholder}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      rows={rows}
      required={required}
    />
  </div>
);

export const TeamInquiryModal = ({
  isOpen,
  onClose,
}: TeamInquiryModalProps) => {
  const [formData, setFormData] =
    useState<TeamInquiryFormData>(INITIAL_FORM_DATA);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  // フィードバックAPIを使用
  const createMutation = api.feedback.create.useMutation({
    onSuccess: () => {
      setIsSubmitted(true);
      setErrorMessage("");
      setTimeout(() => {
        setIsSubmitted(false);
        onClose();
        setFormData(INITIAL_FORM_DATA);
      }, 2500);
    },
    onError: (error) => {
      setErrorMessage(error.message);
    },
  });

  const updateFormField =
    (field: keyof TeamInquiryFormData) => (value: string) => {
      setFormData((prev) => ({ ...prev, [field]: value }));
    };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage("");

    // 会社名を含むメッセージを作成
    const contentParts = [];
    if (formData.company) {
      contentParts.push(`【会社名・組織名】${formData.company}`);
    }
    if (formData.message) {
      contentParts.push(`【ご質問・ご要望】${formData.message}`);
    }
    const content =
      contentParts.length > 0
        ? contentParts.join("\n\n")
        : "チーム利用について興味があります。";

    createMutation.mutate({
      type: "INQUIRY",
      subject: "チーム利用のお問い合わせ",
      content,
      userAgent: window.navigator.userAgent,
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
          <h2 className={MODAL_CLASSES.TITLE}>チーム利用のお問い合わせ</h2>
          <p className={MODAL_CLASSES.SUBTITLE}>
            チーム機能にご興味をお持ちいただきありがとうございます
          </p>
        </div>

        {!isSubmitted ? (
          <form onSubmit={handleSubmit}>
            <div className={MODAL_CLASSES.FORM_CONTAINER}>
              <FormField
                label="会社名・組織名"
                value={formData.company}
                onChange={updateFormField("company")}
                placeholder="株式会社〇〇"
              />

              <TextAreaField
                label="ご質問・ご要望"
                value={formData.message}
                onChange={updateFormField("message")}
                placeholder="チーム利用についてのご質問やご要望をお聞かせください"
                required
              />
            </div>

            {errorMessage && (
              <div className={FORM_FIELD_CLASSES.ERROR}>{errorMessage}</div>
            )}

            <motion.button
              type="submit"
              disabled={createMutation.isPending || !formData.message.trim()}
              className={FORM_FIELD_CLASSES.BUTTON}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              {createMutation.isPending ? (
                <div className="flex items-center justify-center">
                  <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  <span>送信中...</span>
                </div>
              ) : (
                "送信する"
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
};
