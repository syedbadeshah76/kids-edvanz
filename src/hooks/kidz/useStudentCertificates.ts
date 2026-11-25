import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

import { certificatesService } from "@/services/kidz/certificates.service";
import type { CertificateDTO } from "@/types/kidz/api.types";
import { extractErrorMessage } from "@/lib/kidz/kidz-api-error";

export function useStudentCertificates() {
  const [certificates, setCertificates] = useState<CertificateDTO[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isClaiming, setIsClaiming] = useState(false);

  const loadCertificates = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await certificatesService.getMyCertificates();
      setCertificates(data);
    } catch {
      setCertificates([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const claimCertificate = useCallback(async (courseId: string) => {
    setIsClaiming(true);
    try {
      const cert = await certificatesService.claimCertificate(courseId);
      setCertificates((prev) => [cert, ...prev.filter((c) => c.id !== cert.id)]);
      toast.success("Certificate issued successfully!");
      return cert;
    } catch (err) {
      toast.error(extractErrorMessage(err, "Failed to claim certificate"));
      return null;
    } finally {
      setIsClaiming(false);
    }
  }, []);

  useEffect(() => {
    void loadCertificates();
  }, [loadCertificates]);

  return {
    certificates,
    isLoading,
    isClaiming,
    claimCertificate,
    refresh: loadCertificates,
  };
}
