import React, { useState } from "react";
import { Link2, Check, Share2 } from "lucide-react";
import { FaXTwitter, FaLinkedinIn, FaFacebookF } from "react-icons/fa6";
import { toast } from "sonner";

interface BlogShareButtonsProps {
  title: string;
  url?: string;
  className?: string;
}

/**
 * BlogShareButtons for EDVANZ.
 * Matches the approved EDVANZ Figma share controls:
 * - Eyebrow: "SHARE THIS INSIGHT"
 * - Rounded circular icon buttons with hover blue accents
 * - Native share API fallback and clipboard copy with feedback
 */
export const BlogShareButtons: React.FC<BlogShareButtonsProps> = ({
  title,
  url,
  className = "",
}) => {
  const [copied, setCopied] = useState(false);
  const shareUrl = url || (typeof window !== "undefined" ? window.location.href : "");

  const handleCopy = async () => {
    try {
      if (typeof navigator !== "undefined" && navigator.clipboard) {
        await navigator.clipboard.writeText(shareUrl);
        setCopied(true);
        toast.success("Article link copied to clipboard!");
        setTimeout(() => setCopied(false), 2000);
      } else {
        const textArea = document.createElement("textarea");
        textArea.value = shareUrl;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand("copy");
        document.body.removeChild(textArea);
        setCopied(true);
        toast.success("Article link copied to clipboard!");
        setTimeout(() => setCopied(false), 2000);
      }
    } catch {
      toast.error("Failed to copy link.");
    }
  };

  const shareLinkedIn = () => {
    const shareLink = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`;
    window.open(shareLink, "_blank", "noopener,noreferrer");
  };

  const shareTwitter = () => {
    const shareLink = `https://twitter.com/intent/tweet?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(title)}`;
    window.open(shareLink, "_blank", "noopener,noreferrer");
  };

  const shareFacebook = () => {
    const shareLink = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`;
    window.open(shareLink, "_blank", "noopener,noreferrer");
  };

  const handleNativeShare = async () => {
    if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
      try {
        await navigator.share({
          title,
          text: title,
          url: shareUrl,
        });
      } catch (err: any) {
        if (err && err.name === "AbortError") return;
        await handleCopy();
      }
    } else {
      await handleCopy();
    }
  };

  return (
    <div className={`flex flex-col sm:flex-row sm:items-center gap-3 ${className}`}>
      <span className="text-[11px] sm:text-[11.5px] font-bold tracking-[1.5px] uppercase text-slate-500 whitespace-nowrap">
        SHARE THIS INSIGHT
      </span>

      <div className="flex items-center gap-2">
        {/* LinkedIn */}
        <button
          type="button"
          onClick={shareLinkedIn}
          aria-label="Share on LinkedIn"
          className="h-8 w-8 rounded-full bg-slate-100 hover:bg-blue-50 text-slate-600 hover:text-[#2563EB] flex items-center justify-center transition-all duration-200"
        >
          <FaLinkedinIn className="h-3.5 w-3.5" />
        </button>

        {/* X / Twitter */}
        <button
          type="button"
          onClick={shareTwitter}
          aria-label="Share on X"
          className="h-8 w-8 rounded-full bg-slate-100 hover:bg-blue-50 text-slate-600 hover:text-[#2563EB] flex items-center justify-center transition-all duration-200"
        >
          <FaXTwitter className="h-3.5 w-3.5" />
        </button>

        {/* Facebook */}
        <button
          type="button"
          onClick={shareFacebook}
          aria-label="Share on Facebook"
          className="h-8 w-8 rounded-full bg-slate-100 hover:bg-blue-50 text-slate-600 hover:text-[#2563EB] flex items-center justify-center transition-all duration-200"
        >
          <FaFacebookF className="h-3.5 w-3.5" />
        </button>

        {/* Native Share */}
        {typeof navigator !== "undefined" && typeof navigator.share === "function" && (
          <button
            type="button"
            onClick={handleNativeShare}
            aria-label="Share via device"
            className="h-8 w-8 rounded-full bg-slate-100 hover:bg-blue-50 text-slate-600 hover:text-[#2563EB] flex items-center justify-center transition-all duration-200"
          >
            <Share2 className="h-3.5 w-3.5" />
          </button>
        )}

        {/* Copy Link */}
        <button
          type="button"
          onClick={handleCopy}
          aria-label="Copy link"
          className={`h-8 w-8 rounded-full flex items-center justify-center transition-all duration-200 ${
            copied
              ? "bg-emerald-500 text-white"
              : "bg-slate-100 hover:bg-blue-50 text-slate-600 hover:text-[#2563EB]"
          }`}
        >
          {copied ? <Check className="h-3.5 w-3.5" /> : <Link2 className="h-3.5 w-3.5" />}
        </button>
      </div>
    </div>
  );
};

export default BlogShareButtons;
