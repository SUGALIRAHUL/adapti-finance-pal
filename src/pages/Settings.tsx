import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Shield } from "lucide-react";
import { toast } from "@/hooks/use-toast";

export default function Settings() {
  const [mfaEnabled, setMfaEnabled] = useState(false);
  const [qrCode, setQrCode] = useState("");
  const [verifyToken, setVerifyToken] = useState("");

  useEffect(() => {
    checkMFA();
  }, []);

  const checkMFA = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const response = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/mfa-setup`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ action: "check" }),
      }
    );

    const data = await response.json();
    setMfaEnabled(data.enabled);
  };

  const setupMFA = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const response = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/mfa-setup`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ action: "setup" }),
      }
    );

    const data = await response.json();
    setQrCode(data.qrCodeUrl);
  };

  const verifyMFA = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const response = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/mfa-setup`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ action: "verify", token: verifyToken }),
      }
    );

    const data = await response.json();
    if (data.valid) {
      toast({ title: "MFA enabled successfully!" });
      setMfaEnabled(true);
      setQrCode("");
    } else {
      toast({ variant: "destructive", title: "Invalid token" });
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
        Settings
      </h1>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Multi-Factor Authentication
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {mfaEnabled ? (
            <p className="text-green-600 font-semibold">✓ MFA is enabled</p>
          ) : (
            <>
              <p className="text-muted-foreground">Add an extra layer of security to your account</p>
              {!qrCode ? (
                <Button onClick={setupMFA}>Setup MFA</Button>
              ) : (
                <div className="space-y-4">
                  <div>
                    <p className="text-sm mb-2">Scan this QR code with your authenticator app:</p>
                    <img src={`https://api.qrserver.com/v1/create-qr-code/?data=${encodeURIComponent(qrCode)}&size=200x200`} alt="QR Code" />
                  </div>
                  <div>
                    <Label>Enter verification code</Label>
                    <Input
                      value={verifyToken}
                      onChange={(e) => setVerifyToken(e.target.value)}
                      placeholder="000000"
                      maxLength={6}
                    />
                  </div>
                  <Button onClick={verifyMFA}>Verify & Enable</Button>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}