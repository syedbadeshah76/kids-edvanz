import type { CertificateDTO } from "@/types/kidz/api.types";

export const certificatesService = {
  /**
   * Certificate API is not available on the Kidz platform.
   * Return empty array immediately without triggering unnecessary network requests or console errors.
   */
  async getMyCertificates(): Promise<CertificateDTO[]> {
    return [];
  },

  /**
   * Not available for Kidz platform.
   */
  async claimCertificate(_courseId: string): Promise<CertificateDTO> {
    throw new Error("Certificate service is not available for Kidz platform.");
  },

  /**
   * Not available for Kidz platform.
   */
  async verifyCertificate(_certificateNumber: string): Promise<CertificateDTO> {
    throw new Error("Certificate service is not available for Kidz platform.");
  },
};

