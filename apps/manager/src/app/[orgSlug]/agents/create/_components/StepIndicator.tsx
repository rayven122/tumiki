"use client";

import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

type Step = {
  number: number;
  label: string;
};

type StepIndicatorProps = {
  steps: Step[];
  currentStep: number;
};

/**
 * ステップインジケーターコンポーネント
 * 目標勾配効果: プログレス表示でユーザーの達成感を促進
 */
export const StepIndicator = ({ steps, currentStep }: StepIndicatorProps) => {
  return (
    <div className="flex items-center justify-center">
      {steps.map((step, index) => {
        const isCompleted = step.number < currentStep;
        const isCurrent = step.number === currentStep;
        const isLast = index === steps.length - 1;

        return (
          <div key={step.number} className="flex items-center">
            {/* ステップ円 */}
            <div className="flex flex-col items-center">
              <div
                className={cn(
                  "flex h-10 w-10 items-center justify-center rounded-full text-sm font-semibold transition-colors",
                  isCompleted && "bg-purple-600 text-white",
                  isCurrent &&
                    "bg-purple-600 text-white ring-4 ring-purple-100",
                  !isCompleted && !isCurrent && "bg-gray-200 text-gray-500",
                )}
              >
                {isCompleted ? <Check className="h-5 w-5" /> : step.number}
              </div>
              <span
                className={cn(
                  "mt-2 text-xs font-medium",
                  isCurrent ? "text-purple-600" : "text-gray-500",
                )}
              >
                {step.label}
              </span>
            </div>

            {/* 接続線 */}
            {!isLast && (
              <div
                className={cn(
                  "mx-2 h-1 w-16 rounded transition-colors",
                  isCompleted ? "bg-purple-600" : "bg-gray-200",
                )}
              />
            )}
          </div>
        );
      })}
    </div>
  );
};
