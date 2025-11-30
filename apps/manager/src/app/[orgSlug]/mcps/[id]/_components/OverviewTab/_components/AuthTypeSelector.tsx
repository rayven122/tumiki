"use client";

import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Badge } from "@/components/ui/badge";
import { AuthType } from "@tumiki/db/prisma";

type AuthTypeSelectorProps = {
  selectedAuthType: AuthType;
  onAuthTypeChange: (value: string) => void;
  isUpdating: boolean;
};

export const AuthTypeSelector = ({
  selectedAuthType,
  onAuthTypeChange,
  isUpdating,
}: AuthTypeSelectorProps) => {
  return (
    <div className="space-y-3">
      <Label className="text-base font-medium">認証タイプ</Label>
      <RadioGroup
        value={selectedAuthType}
        onValueChange={onAuthTypeChange}
        disabled={isUpdating}
        className="space-y-3"
      >
        {/* NONE */}
        <div className="flex items-start space-x-3">
          <RadioGroupItem value={AuthType.NONE} id="auth-none" />
          <div className="flex-1">
            <Label
              htmlFor="auth-none"
              className="flex cursor-pointer items-center space-x-2"
            >
              <span>なし</span>
              <Badge variant="outline" className="text-xs">
                動作検証用
              </Badge>
            </Label>
            <p className="mt-1 text-xs text-gray-500">認証なしでアクセス可能</p>
          </div>
        </div>

        {/* API_KEY */}
        <div className="flex items-start space-x-3">
          <RadioGroupItem value={AuthType.API_KEY} id="auth-api-key" />
          <div className="flex-1">
            <Label
              htmlFor="auth-api-key"
              className="flex cursor-pointer items-center space-x-2"
            >
              <span>APIキー</span>
              <Badge variant="default" className="text-xs">
                推奨
              </Badge>
            </Label>
            <p className="mt-1 text-xs text-gray-500">
              APIキーによる認証を使用
            </p>
          </div>
        </div>

        {/* OAUTH */}
        <div className="flex items-start space-x-3">
          <RadioGroupItem value={AuthType.OAUTH} id="auth-oauth" disabled />
          <div className="flex-1">
            <Label
              htmlFor="auth-oauth"
              className="flex cursor-not-allowed items-center space-x-2 opacity-50"
            >
              <span>OAuth認証</span>
              <Badge variant="secondary" className="text-xs">
                近日リリース予定
              </Badge>
            </Label>
            <p className="mt-1 text-xs text-gray-500">
              OAuth 2.0による認証を使用
            </p>
          </div>
        </div>
      </RadioGroup>
    </div>
  );
};
