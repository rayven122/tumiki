import { Check } from "lucide-react";

type StepIndicatorProps = {
  currentStep: number;
  totalSteps: number;
  stepLabels: string[];
};

/**
 * ステップインジケーターコンポーネント
 */
export const StepIndicator = ({
  currentStep,
  totalSteps,
  stepLabels,
}: StepIndicatorProps) => {
  return (
    <div className="mb-8 flex justify-center">
      <div className="flex w-full max-w-3xl items-center justify-between">
        {Array.from({ length: totalSteps }, (_, i) => i + 1).map((step) => (
          <div key={step} className="flex flex-1 items-center">
            {/* ステップ番号 */}
            <div className="flex flex-col items-center">
              <div
                className={`flex h-10 w-10 items-center justify-center rounded-full border-2 ${
                  step < currentStep
                    ? "border-blue-600 bg-blue-600 text-white"
                    : step === currentStep
                      ? "border-blue-600 bg-white text-blue-600"
                      : "border-gray-300 bg-white text-gray-300"
                }`}
              >
                {step < currentStep ? (
                  <Check className="h-5 w-5" />
                ) : (
                  <span className="text-sm font-semibold">{step}</span>
                )}
              </div>
              <div className="mt-2 text-xs font-medium text-gray-700">
                {stepLabels[step - 1]}
              </div>
            </div>

            {/* 区切り線 */}
            {step < totalSteps && (
              <div
                className={`mx-2 h-0.5 flex-1 ${
                  step < currentStep ? "bg-blue-600" : "bg-gray-300"
                }`}
              />
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
