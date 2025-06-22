"use client";

import { motion } from "framer-motion";
import { useState, useRef } from "react";
import Image from "next/image";

export function BlockVisual() {
  const [connectedBlocks, setConnectedBlocks] = useState<string[]>([
    "google-drive",
    "slack",
    "gmail",
    "github",
  ]);
  const [blocks, setBlocks] = useState([
    {
      id: "google-drive",
      service: "Google Drive",
      logo: "/logos/google-drive.svg",
    },
    { id: "ai-agent", service: "AI Agent", logo: null },
    { id: "notion", service: "Notion", logo: "/logos/notion.svg" },
    { id: "slack", service: "Slack", logo: "/logos/slack.svg" },
    { id: "gmail", service: "Gmail", logo: "/logos/gmail.svg" },
    { id: "excel", service: "Excel", logo: "/logos/excel.svg" },
    { id: "github", service: "GitHub", logo: "/logos/github.svg" },
    { id: "google", service: "Google", logo: "/logos/google.svg" },
  ]);

  const [draggedBlock, setDraggedBlock] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const toggleBlock = (blockId: string) => {
    if (!isDragging) {
      setConnectedBlocks((prev) =>
        prev.includes(blockId)
          ? prev.filter((id) => id !== blockId)
          : [...prev, blockId],
      );
    }
  };

  const handleDragStart = (e: React.DragEvent, blockId: string) => {
    setDraggedBlock(blockId);
    setIsDragging(true);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", blockId);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const handleDrop = (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    const draggedBlockId = e.dataTransfer.getData("text/plain");

    if (draggedBlockId) {
      const draggedIndex = blocks.findIndex(
        (block) => block.id === draggedBlockId,
      );
      if (draggedIndex !== -1 && draggedIndex !== targetIndex) {
        const newBlocks = [...blocks];
        const [draggedItem] = newBlocks.splice(draggedIndex, 1);
        newBlocks.splice(targetIndex, 0, draggedItem!);
        setBlocks(newBlocks);
      }
    }

    setDraggedBlock(null);
    setIsDragging(false);
  };

  const handleDragEnd = () => {
    setDraggedBlock(null);
    setIsDragging(false);
  };

  return (
    <div className="mx-auto mt-16 max-w-4xl p-10" ref={containerRef}>
      <div className="grid grid-cols-4 gap-10">
        {blocks.map((block, index) => (
          <div
            key={block.id}
            draggable
            onDragStart={(e) => handleDragStart(e, block.id)}
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, index)}
            onDragEnd={handleDragEnd}
            className="relative"
          >
            <motion.div
              className={`relative flex aspect-square cursor-grab items-center justify-center border-3 border-black transition-all duration-200 active:cursor-grabbing ${
                connectedBlocks.includes(block.id)
                  ? "bg-black text-white shadow-[8px_8px_0_#000]"
                  : "bg-white text-black shadow-[4px_4px_0_#000] hover:-translate-x-1 hover:-translate-y-1 hover:shadow-[8px_8px_0_#000]"
              } ${
                draggedBlock === block.id ? "scale-105 rotate-3 opacity-50" : ""
              }`}
              onClick={() => toggleBlock(block.id)}
              whileHover={
                !isDragging
                  ? {
                      scale: 1.05,
                      transition: { duration: 0.2 },
                    }
                  : {}
              }
              whileTap={!isDragging ? { scale: 0.95 } : {}}
              animate={{
                scale: draggedBlock === block.id ? 1.05 : 1,
                rotate: draggedBlock === block.id ? 3 : 0,
                opacity: draggedBlock === block.id ? 0.5 : 1,
              }}
              transition={{ duration: 0.2 }}
            >
              {block.logo ? (
                <div
                  className={`flex h-12 w-12 items-center justify-center transition-all duration-200 ${
                    connectedBlocks.includes(block.id) ? "invert" : ""
                  }`}
                >
                  <Image
                    src={block.logo}
                    alt={block.service}
                    width={32}
                    height={32}
                    className="pointer-events-none object-contain"
                    draggable={false}
                  />
                </div>
              ) : (
                <div
                  className={`pointer-events-none text-3xl ${
                    connectedBlocks.includes(block.id)
                      ? "text-white"
                      : "text-black"
                  }`}
                >
                  🤖
                </div>
              )}

              <div className="pointer-events-none absolute -bottom-8 left-1/2 -translate-x-1/2 transform text-xs font-medium whitespace-nowrap text-gray-600">
                {block.service}
              </div>

              {/* Drag indicator */}
              <div className="pointer-events-none absolute top-2 right-2 text-xs text-gray-500 opacity-30">
                ⋮⋮
              </div>

              {/* Drop zone indicator */}
              {draggedBlock && draggedBlock !== block.id && (
                <div className="bg-opacity-20 pointer-events-none absolute inset-0 rounded-sm border-2 border-dashed border-blue-400 bg-blue-50" />
              )}
            </motion.div>
          </div>
        ))}
      </div>

      {/* Instructions */}
      <div className="mt-12 text-center">
        <p className="text-sm font-medium text-gray-600">
          ドラッグして並び替え • クリックして接続/切断
        </p>
        {isDragging && (
          <p className="mt-2 text-xs text-blue-600">ブロックを移動中...</p>
        )}
      </div>
    </div>
  );
}