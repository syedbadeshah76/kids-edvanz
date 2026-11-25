import { useEffect } from "react";
import { CheckCircle2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface PendingApprovalModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onBackToHome: () => void;
}

export const PendingApprovalModal = ({
  open,
  onOpenChange,
  onBackToHome,
}: PendingApprovalModalProps) => {
  const resetBodyLocks = () => {
    document.body.style.pointerEvents = "";
    document.body.style.overflow = "";
    const root = document.getElementById("root");
    if (root?.getAttribute("aria-hidden") === "true") {
      root.removeAttribute("aria-hidden");
    }
  };

  useEffect(() => {
    if (!open) {
      resetBodyLocks();
    }
  }, [open]);

  useEffect(() => {
    return () => {
      resetBodyLocks();
    };
  }, []);

  const handleClose = () => {
    resetBodyLocks();
    onOpenChange(false);
    onBackToHome();
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) {
          handleClose();
        } else {
          onOpenChange(nextOpen);
        }
      }}
    >
      <DialogContent
        className="z-[9999] sm:max-w-[460px] rounded-2xl p-8 text-center"
        onInteractOutside={(event) => event.preventDefault()}
        onCloseAutoFocus={() => {
          resetBodyLocks();
        }}
      >
        <DialogHeader className="items-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-emerald-500/10 flex items-center justify-center">
            <CheckCircle2 className="w-9 h-9 text-emerald-500" aria-hidden />
          </div>
          <DialogTitle className="text-xl font-bold text-center">
            Application Submitted Successfully
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground text-center leading-relaxed">
            Thank you for registering as an Instructor. Your profile has been
            submitted successfully. Our team is currently reviewing your
            application. You will receive access as soon as your profile has
            been approved. Please check your email for future updates.
          </DialogDescription>
        </DialogHeader>

        <DialogFooter className="mt-6 sm:justify-center">
          <Button
            type="button"
            autoFocus
            onClick={handleClose}
            className="w-full sm:w-auto px-10 h-11 rounded-full bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-semibold"
          >
            Back To Home
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default PendingApprovalModal;
