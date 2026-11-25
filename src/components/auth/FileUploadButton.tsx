import { useId, useRef } from "react";
import { Loader2, RefreshCw, Upload, X, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { PresignedUploadState } from "@/hooks/usePresignedUpload";

export interface FileUploadButtonProps {
  label: string;
  accept: string;
  upload?: PresignedUploadState;
  variant?: "outline" | "solid";
  disabled?: boolean;
  describedById?: string;
  className?: string;
  icon?: React.ReactNode;
  // Alternate / fallback props
  isUploading?: boolean;
  progress?: number;
  isComplete?: boolean;
  fileKey?: string;
  onFileSelected?: (file: File | null) => void;
  file?: File | null;
  errorMessage?: string;
}

export const FileUploadButton = ({
  label,
  accept,
  upload,
  variant = "outline",
  disabled = false,
  describedById,
  className,
  icon,
  isUploading,
  progress,
  isComplete: isCompleteProp,
  onFileSelected,
  file,
  errorMessage,
}: FileUploadButtonProps) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const generatedId = useId();
  const inputId = `file-upload-${generatedId}`;

  const isBusy = Boolean(upload?.isBusy ?? isUploading ?? false);
  const isComplete = Boolean(upload?.isComplete ?? isCompleteProp ?? false);
  const currentProgress = upload?.progress ?? progress ?? 0;
  const currentFile = upload?.file ?? file ?? null;
  const currentStatus = upload?.status ?? (isBusy ? "uploading" : isComplete ? "success" : "idle");
  const currentError = upload?.error ?? errorMessage ?? "";

  const handleSelectFile = (f: File | null) => {
    if (upload?.selectFile) {
      upload.selectFile(f);
    }
    if (onFileSelected) {
      onFileSelected(f);
    }
  };

  const handleRetry = () => {
    if (upload?.retry) {
      upload.retry();
    }
  };

  const handleReset = () => {
    if (upload?.reset) {
      upload.reset();
    }
  };

  const openPicker = () => {
    if (disabled || isBusy) return;
    inputRef.current?.click();
  };

  return (
    <div className="w-full">
      <input
        id={inputId}
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={(event) => {
          const selected = event.target.files?.[0] ?? null;
          handleSelectFile(selected);
          event.target.value = "";
        }}
      />

      <Button
        type="button"
        onClick={openPicker}
        disabled={disabled || isBusy}
        aria-label={label}
        aria-describedby={describedById}
        aria-busy={isBusy}
        className={cn(
          "w-full h-11 rounded-lg text-xs sm:text-sm font-semibold gap-2 transition-all",
          variant === "solid"
            ? "bg-[#2563EB] hover:bg-[#1D4ED8] text-white shadow-sm"
            : "bg-white border border-[#2563EB] text-[#2563EB] hover:bg-blue-50/60",
          className,
        )}
      >
        {isBusy ? (
          <Loader2 className="w-4 h-4 animate-spin shrink-0" />
        ) : isComplete ? (
          <CheckCircle2 className="w-4 h-4 shrink-0" />
        ) : icon ? (
          icon
        ) : (
          <Upload className="w-4 h-4 shrink-0" />
        )}
        <span className="truncate">
          {isBusy
            ? `Uploading ${currentProgress}%`
            : isComplete
              ? "Replace File"
              : label}
        </span>
      </Button>

      {currentFile && (
        <div className="mt-1.5 flex items-center gap-2">
          <p
            className="text-xs text-muted-foreground truncate flex-1"
            title={currentFile.name}
          >
            {currentFile.name}
          </p>

          {currentStatus === "error" && (
            <button
              type="button"
              onClick={handleRetry}
              className="text-xs font-medium text-[#2563EB] hover:underline inline-flex items-center gap-1"
            >
              <RefreshCw className="w-3 h-3" />
              Retry
            </button>
          )}

          {!isBusy && (
            <button
              type="button"
              onClick={handleReset}
              aria-label={`Remove ${currentFile.name}`}
              className="text-muted-foreground hover:text-destructive transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      )}

      {isBusy && (
        <div
          className="mt-1.5 h-1.5 w-full rounded-full bg-muted overflow-hidden"
          role="progressbar"
          aria-valuenow={currentProgress}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          <div
            className="h-full bg-[#2563EB] transition-all"
            style={{ width: `${currentProgress}%` }}
          />
        </div>
      )}

      {currentError && (
        <p className="text-[11px] text-destructive mt-1">{currentError}</p>
      )}
    </div>
  );
};

export default FileUploadButton;
