import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export function useAdultVerification() {
  const { user } = useAuth();
  const [isVerified, setIsVerified] = useState(false);
  const [verifiedAt, setVerifiedAt] = useState<Date | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchVerificationStatus = async () => {
    if (!user) {
      setIsVerified(false);
      setVerifiedAt(null);
      setIsLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("adult_content_verified, adult_verified_at")
        .eq("user_id", user.id)
        .maybeSingle();

      if (error) {
        console.error("Error fetching verification status:", error);
        return;
      }

      if (data) {
        setIsVerified(data.adult_content_verified);
        setVerifiedAt(data.adult_verified_at ? new Date(data.adult_verified_at) : null);
      }
    } catch (err) {
      console.error("Error fetching verification status:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const verifyAdultContent = async (): Promise<boolean> => {
    if (!user) return false;

    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          adult_content_verified: true,
          adult_verified_at: new Date().toISOString(),
        })
        .eq("user_id", user.id);

      if (error) {
        console.error("Error verifying adult content:", error);
        return false;
      }

      setIsVerified(true);
      setVerifiedAt(new Date());
      return true;
    } catch (err) {
      console.error("Error verifying adult content:", err);
      return false;
    }
  };

  const revokeAdultContent = async (): Promise<boolean> => {
    if (!user) return false;

    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          adult_content_verified: false,
          adult_verified_at: null,
        })
        .eq("user_id", user.id);

      if (error) {
        console.error("Error revoking adult content:", error);
        return false;
      }

      setIsVerified(false);
      setVerifiedAt(null);
      return true;
    } catch (err) {
      console.error("Error revoking adult content:", err);
      return false;
    }
  };

  useEffect(() => {
    fetchVerificationStatus();
  }, [user]);

  return {
    isVerified,
    verifiedAt,
    isLoading,
    verifyAdultContent,
    revokeAdultContent,
    refetch: fetchVerificationStatus,
  };
}
