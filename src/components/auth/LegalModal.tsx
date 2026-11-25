import { motion, AnimatePresence } from "framer-motion";
import { X, ScrollText, Shield, Check } from "lucide-react";
import { Button } from "@/components/ui/button";

export type LegalModalType = "terms" | "privacy" | null;

interface LegalModalProps {
  type: LegalModalType;
  onClose: () => void;
  onAccept: () => void;
}

const termsSections = [
  {
    title: "Welcome to Edvanz",
    text: "Edvanz is an online e-learning platform dedicated to helping learners build skills, gain knowledge, and achieve their career goals. By accessing our website, enrolling in courses, or using any of our services, you agree to these Terms and Conditions. Please read them carefully before using the Edvanz platform.",
  },
  {
    title: "1. Account Eligibility",
    text: "Edvanz is designed for learners of all ages, including those under and above 18 years of age. Users aged 18 and above may create and manage their accounts independently. Users under 18 must use the platform with the involvement and supervision of a parent or legal guardian. Where required by applicable law, verifiable consent from a parent or legal guardian must be obtained before account creation or use of the platform.\n\nUsers must provide accurate information when registering and keep their account details up to date.",
  },
  {
    title: "2. Course Access",
    text: "Course access is for personal learning only. Sharing accounts, course materials, or login details is strictly prohibited.",
  },
  {
    title: "3. Payments & Refunds",
    text: "All course fees must be paid before enrollment. Refunds are subject to our Refund Policy. Please review the policy for complete details before making a purchase.",
  },
  {
    title: "4. Platform Guidelines",
    text: "When using Edvanz, you agree not to share course content without permission, use false information or impersonate others, or post harmful, unlawful, or misleading content. Violation of these rules may result in account suspension or permanent removal.",
  },
  {
    title: "5. Content Ownership",
    text: "All courses, videos, designs, text, software, graphics, and learning materials available on Edvanz are the intellectual property of Edvanz or its instructors. Unauthorized copying, distribution, or commercial use is strictly prohibited.",
  },
  {
    title: "6. Certificates",
    text: "Certificates are awarded upon successful completion of eligible courses. Receiving a certificate does not guarantee employment, promotions, or specific career outcomes.",
  },
  {
    title: "7. Liability",
    text: "Edvanz is not responsible for any indirect, incidental, or consequential losses or damages resulting from the use of our platform, courses, or services.",
  },
  {
    title: "8. Platform Updates",
    text: "We may update, modify, improve, or discontinue courses, features, services, or platform functionality at any time without prior notice to enhance the learning experience.",
  },
  {
    title: "9. Applicable Law",
    text: "These Terms and Conditions are governed by all applicable laws and regulations. Any disputes arising from the use of the platform shall be resolved in accordance with the relevant legal jurisdiction.",
  },
  {
    title: "10. Changes to Terms",
    text: "We may revise these Terms and Conditions from time to time. Continued use of the Edvanz platform after updates have been published constitutes your acceptance of the revised Terms.",
  },
  {
    title: "11. Contact Us",
    text: "Need help or have questions regarding these Terms and Conditions? Our support team is here to assist you. Please contact us anytime at hello@edvanz.com for assistance.",
  },
];

const privacySections = [
  {
    title: "1. Information We Collect",
    text: "To provide a better learning experience, Edvanz may collect personal information such as your full name, email address, phone number, billing information, and optional professional details. We also collect learning and usage data including login activity, course progress, assessment results, device and browser information, and IP address.",
  },
  {
    title: "2. How We Use Your Information",
    text: "Your information is used to create and manage your account, deliver courses and certifications, improve platform performance, provide customer support, send important updates and learning notifications, and comply with applicable legal and regulatory requirements.",
  },
  {
    title: "3. Information Sharing",
    text: "Edvanz does not sell or rent your personal information. We may share your data only with trusted service providers, payment processing partners, analytics and platform tools, or legal authorities when required by applicable law.",
  },
  {
    title: "4. Data Security",
    text: "Your information is protected using industry-standard security measures, encrypted storage, and secure systems. Access to personal information is restricted to authorised personnel who require it to provide our services.",
  },
  {
    title: "5. Data Retention",
    text: "We retain your information only for as long as necessary to provide our services, maintain records, comply with legal obligations, resolve disputes, and improve your learning experience.",
  },
  {
    title: "6. Your Privacy Rights",
    text: "Depending on your location and applicable laws, you may have the right to access your personal information, update or correct inaccurate data, request deletion of your data, withdraw consent where applicable, and request a copy of the information we hold about you.",
  },
  {
    title: "7. External Links",
    text: "Our platform may contain links to third-party websites for your convenience. Edvanz is not responsible for the privacy practices, security, or content of external websites, and we encourage you to review their privacy policies before sharing personal information.",
  },
  {
    title: "8. Children's Privacy and Parental Consent",
    text: "Edvanz is intended for users both under and above 18 years of age. Users under 18 must use the platform with the involvement and supervision of a parent or legal guardian. Where required by applicable law, verifiable parental or guardian consent must be obtained before collecting or processing a minor's personal information.\n\nWe take appropriate steps to protect minors' personal information and use it only for the purposes explained in this Privacy Policy and as permitted by applicable law. Parents or legal guardians may contact us to ask questions or exercise applicable privacy rights on behalf of a minor.",
  },
  {
    title: "9. Policy Updates",
    text: "We may update this Privacy Policy from time to time to reflect changes in our services, technology, business practices, or legal requirements. Any updates will be published on this page.",
  },
  {
    title: "10. Contact Us",
    text: "If you have any questions regarding this Privacy Policy, your personal information, or your privacy rights, please contact the Edvanz Support Team at hello@edvanz.com.",
  },
];

export const LegalModal = ({ type, onClose, onAccept }: LegalModalProps) => {
  if (!type) return null;

  const isTerms = type === "terms";
  const title = isTerms ? "Terms and Conditions" : "Privacy Policy";
  const sections = isTerms ? termsSections : privacySections;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[150] flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/60 backdrop-blur-xs"
          onClick={onClose}
        />

        {/* Modal Window */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
          className="relative bg-background rounded-2xl shadow-2xl border border-border w-full max-w-2xl max-h-[85vh] flex flex-col z-10 overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-muted/30 shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                {isTerms ? <ScrollText className="w-5 h-5" /> : <Shield className="w-5 h-5" />}
              </div>
              <div>
                <h3 className="text-base sm:text-lg font-bold text-foreground">
                  {title}
                </h3>
                <p className="text-xs text-muted-foreground">
                  Edvanz Learning Platform
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              aria-label="Close modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Scrollable Content */}
          <div className="p-6 overflow-y-auto flex-1 space-y-4 text-xs sm:text-sm leading-relaxed text-muted-foreground">
            {sections.map((sec, index) => (
              <div
                key={index}
                className="p-3.5 rounded-xl bg-card border border-border/70 space-y-1.5"
              >
                <h4 className="font-semibold text-foreground text-xs sm:text-sm">
                  {sec.title}
                </h4>
                <p className="text-muted-foreground leading-relaxed text-xs whitespace-pre-line">
                  {sec.text}
                </p>
              </div>
            ))}
          </div>

          {/* Footer Actions */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-6 py-3.5 border-t border-border bg-muted/20 shrink-0">
            <span className="text-xs text-muted-foreground">
              Please review and accept to continue registration.
            </span>

            <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onClose}
                className="rounded-lg h-9 text-xs font-semibold px-4"
              >
                Close
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={onAccept}
                className="rounded-lg h-9 text-xs font-semibold px-5 bg-[#2563EB] hover:bg-[#1D4ED8] text-white gap-1.5"
              >
                <Check className="w-4 h-4" />
                I Agree & Accept
              </Button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
