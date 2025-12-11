import React from 'react';
import { FileText, Image, Download } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function MessageAttachments({ attachments, isOwn }) {
  if (!attachments || attachments.length === 0) return null;

  const getFileIcon = (type) => {
    if (type?.startsWith('image/')) return Image;
    return FileText;
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return '';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  return (
    <div className="mt-2 space-y-2">
      {attachments.map((file, index) => {
        const Icon = getFileIcon(file.type);
        const isImage = file.type?.startsWith('image/');

        return (
          <div key={index}>
            {isImage ? (
              <a 
                href={file.url} 
                target="_blank" 
                rel="noopener noreferrer"
                className="block max-w-xs rounded-lg overflow-hidden border border-slate-200 hover:opacity-90 transition"
              >
                <img 
                  src={file.url} 
                  alt={file.name}
                  className="w-full h-auto"
                />
              </a>
            ) : (
              <a
                href={file.url}
                target="_blank"
                rel="noopener noreferrer"
                className={cn(
                  "flex items-center gap-2 p-2 rounded-lg transition",
                  isOwn 
                    ? "bg-teal-700 hover:bg-teal-800" 
                    : "bg-slate-200 hover:bg-slate-300"
                )}
              >
                <Icon className={cn("w-4 h-4", isOwn ? "text-teal-200" : "text-slate-600")} />
                <div className="flex-1 min-w-0">
                  <p className={cn("text-xs font-medium truncate", isOwn ? "text-white" : "text-slate-900")}>
                    {file.name}
                  </p>
                  {file.size && (
                    <p className={cn("text-xs", isOwn ? "text-teal-200" : "text-slate-500")}>
                      {formatFileSize(file.size)}
                    </p>
                  )}
                </div>
                <Download className={cn("w-4 h-4", isOwn ? "text-teal-200" : "text-slate-600")} />
              </a>
            )}
          </div>
        );
      })}
    </div>
  );
}