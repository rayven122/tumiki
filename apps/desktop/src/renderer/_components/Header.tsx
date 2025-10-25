import React from "react";

export const Header = (): React.ReactElement => {
  return (
    <header className="border-b border-gray-200 bg-white px-6 py-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-gray-800">tumiki Desktop</h1>
        <div className="flex items-center space-x-4">
          <span className="text-sm text-gray-600">v0.1.0</span>
        </div>
      </div>
    </header>
  );
};
