type SortModeNoticeProps = {
  isSortMode: boolean;
};

export const SortModeNotice = ({ isSortMode }: SortModeNoticeProps) => {
  if (!isSortMode) return null;

  return (
    <div className="mb-4 rounded-lg bg-blue-50 p-3">
      <p className="text-sm text-blue-700">
        🔄 並び替えモード:
        カードをドラッグして順序を変更できます。他の操作は無効です。
      </p>
    </div>
  );
};
