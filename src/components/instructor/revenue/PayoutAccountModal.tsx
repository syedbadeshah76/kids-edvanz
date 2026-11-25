import { useState, useEffect } from "react";
import { X, ChevronRight, Loader2 } from "lucide-react";
import { toast } from "sonner";
import revenueService from "@/services/instructor/revenueService";
import type { PayoutAccount, PayoutAccountPayload } from "@/types/revenue.types";

interface PayoutAccountModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentAccount?: PayoutAccount | null;
  onSuccess: (savedAccount: PayoutAccount) => void;
}

const COUNTRY_OPTIONS = [
  { label: "India", value: "INDIA" },
  { label: "United States", value: "UNITED_STATES" },
  { label: "United Kingdom", value: "UNITED_KINGDOM" },
  { label: "Canada", value: "CANADA" },
  { label: "Australia", value: "AUSTRALIA" },
  { label: "Germany", value: "GERMANY" },
  { label: "Singapore", value: "SINGAPORE" },
  { label: "United Arab Emirates", value: "UAE" },
];

const ACCOUNT_TYPE_OPTIONS = [
  { label: "Savings Account", value: "SAVINGS" },
  { label: "Checking Account", value: "CHECKING" },
  { label: "Current Account", value: "CURRENT" },
];

const PAYOUT_METHOD_OPTIONS = [
  { label: "Bank Transfer (NEFT / RTGS / IMPS)", value: "BANK_TRANSFER" },
  { label: "UPI Transfer", value: "UPI" },
];

export function PayoutAccountModal({
  open,
  onOpenChange,
  currentAccount,
  onSuccess,
}: PayoutAccountModalProps) {
  const [accountHolderName, setAccountHolderName] = useState("");
  const [bankCountry, setBankCountry] = useState("INDIA");
  const [bankName, setBankName] = useState("");
  const [accountType, setAccountType] = useState("SAVINGS");
  const [ifscCode, setIfscCode] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [confirmAccountNumber, setConfirmAccountNumber] = useState("");
  const [upiId, setUpiId] = useState("");
  const [payoutMethod, setPayoutMethod] = useState("BANK_TRANSFER");
  const [confirmed, setConfirmed] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      if (currentAccount) {
        setAccountHolderName(currentAccount.accountHolderName || "");
        setBankCountry(currentAccount.bankCountry || "INDIA");
        setBankName(currentAccount.bankName || "");
        setAccountType(currentAccount.accountType || "SAVINGS");
        setIfscCode(currentAccount.ifscCode || "");
        setAccountNumber(currentAccount.accountNumber || "");
        setConfirmAccountNumber(currentAccount.accountNumber || "");
        setUpiId(currentAccount.upiId || "");
        setPayoutMethod(currentAccount.payoutMethod || "BANK_TRANSFER");
        setConfirmed(true);
      } else {
        setAccountHolderName("");
        setBankCountry("INDIA");
        setBankName("");
        setAccountType("SAVINGS");
        setIfscCode("");
        setAccountNumber("");
        setConfirmAccountNumber("");
        setUpiId("");
        setPayoutMethod("BANK_TRANSFER");
        setConfirmed(false);
      }
    }
  }, [open, currentAccount]);

  if (!open) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!accountHolderName.trim()) {
      toast.error("Please enter account holder name");
      return;
    }
    if (!bankName.trim()) {
      toast.error("Please enter bank name");
      return;
    }
    if (!accountNumber.trim()) {
      toast.error("Please enter account number");
      return;
    }
    if (accountNumber !== confirmAccountNumber) {
      toast.error("Account numbers do not match");
      return;
    }
    if (!ifscCode.trim()) {
      toast.error("Please enter IFSC code");
      return;
    }
    if (!confirmed) {
      toast.error("Please confirm authorization before submitting");
      return;
    }

    try {
      setSaving(true);
      const payload: PayoutAccountPayload = {
        accountHolderName: accountHolderName.trim(),
        bankName: bankName.trim(),
        accountNumber: accountNumber.trim(),
        ifscCode: ifscCode.trim().toUpperCase(),
        bankCountry: bankCountry,
        accountType: accountType,
        upiId: upiId.trim() || undefined,
        payoutMethod: payoutMethod || "BANK_TRANSFER",
      };

      const result = await revenueService.savePayoutAccount(payload);
      toast.success("Payout account saved successfully");
      onSuccess(result);
      onOpenChange(false);
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || "Failed to save payout account";
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-xs transition-opacity"
        onClick={() => !saving && onOpenChange(false)}
      />

      {/* Modal Dialog */}
      <div className="relative w-full max-w-xl rounded-2xl bg-white dark:bg-slate-900 p-6 shadow-2xl z-10 my-8">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">Payout account</h2>
          <button
            type="button"
            disabled={saving}
            onClick={() => onOpenChange(false)}
            className="rounded-lg p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          {/* Row 1: Account holder name & Bank country */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5">
                Account holder name
              </label>
              <input
                type="text"
                required
                value={accountHolderName}
                onChange={(e) => setAccountHolderName(e.target.value)}
                placeholder="e.g. Dummy"
                className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5">
                Bank country
              </label>
              <div className="relative">
                <select
                  value={bankCountry}
                  onChange={(e) => setBankCountry(e.target.value)}
                  className="w-full appearance-none rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-900 dark:text-white focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  {COUNTRY_OPTIONS.map((c) => (
                    <option key={c.value} value={c.value}>
                      {c.label}
                    </option>
                  ))}
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 text-xs">
                  ▼
                </div>
              </div>
            </div>
          </div>

          {/* Row 2: Bank name & Account type */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5">
                Bank name
              </label>
              <input
                type="text"
                required
                value={bankName}
                onChange={(e) => setBankName(e.target.value)}
                placeholder="e.g. HDFC Bank"
                className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5">
                Account type
              </label>
              <div className="relative">
                <select
                  value={accountType}
                  onChange={(e) => setAccountType(e.target.value)}
                  className="w-full appearance-none rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-900 dark:text-white focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  {ACCOUNT_TYPE_OPTIONS.map((a) => (
                    <option key={a.value} value={a.value}>
                      {a.label}
                    </option>
                  ))}
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 text-xs">
                  ▼
                </div>
              </div>
            </div>
          </div>

          {/* Row 3: IFSC code & Payout method */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5">
                Routing number / IFSC code
              </label>
              <input
                type="text"
                required
                value={ifscCode}
                onChange={(e) => setIfscCode(e.target.value.toUpperCase())}
                placeholder="e.g. HDFC0001234"
                className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm uppercase text-slate-900 dark:text-white placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5">
                Payout method
              </label>
              <div className="relative">
                <select
                  value={payoutMethod}
                  onChange={(e) => setPayoutMethod(e.target.value)}
                  className="w-full appearance-none rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-900 dark:text-white focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  {PAYOUT_METHOD_OPTIONS.map((p) => (
                    <option key={p.value} value={p.value}>
                      {p.label}
                    </option>
                  ))}
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 text-xs">
                  ▼
                </div>
              </div>
            </div>
          </div>

          {/* Row 4: Account number & Confirm account number */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5">
                Account number
              </label>
              <input
                type="text"
                required
                value={accountNumber}
                onChange={(e) => setAccountNumber(e.target.value)}
                placeholder="e.g. 1234567890"
                className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5">
                Confirm account number
              </label>
              <input
                type="text"
                required
                value={confirmAccountNumber}
                onChange={(e) => setConfirmAccountNumber(e.target.value)}
                placeholder="Re-enter account number"
                className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Row 5: UPI ID */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5">
              UPI ID <span className="text-slate-400 font-normal">(e.g. dummy@paytm or for instant payouts)</span>
            </label>
            <input
              type="text"
              value={upiId}
              onChange={(e) => setUpiId(e.target.value)}
              placeholder="e.g. dummy@paytm or username@okhdfcbank"
              className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          {/* Authorization Checkbox */}
          <div className="pt-2">
            <label className="flex items-start gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={confirmed}
                onChange={(e) => setConfirmed(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                I confirm these payout details are accurate and authorize Edvanz to use them for instructor payments.
              </span>
            </label>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              disabled={saving}
              onClick={() => onOpenChange(false)}
              className="rounded-lg border border-slate-200 dark:border-slate-700 px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving || !confirmed}
              className="inline-flex items-center gap-1.5 rounded-lg bg-[#10B981] hover:bg-emerald-600 px-5 py-2 text-sm font-semibold text-white shadow-sm transition disabled:opacity-50"
            >
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Saving…
                </>
              ) : (
                <>
                  Save & Activate
                  <ChevronRight className="h-4 w-4" />
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default PayoutAccountModal;
