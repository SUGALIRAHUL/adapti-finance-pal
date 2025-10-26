import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Shield } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { QRCodeCanvas } from "qrcode.react";

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

    const { data, error } = await supabase.functions.invoke('mfa-setup', {
      body: { action: 'check' }
    });
    if (error) {
      console.error('MFA check error:', error);
      return;
    }
    setMfaEnabled(Boolean((data as any)?.enabled));
  };

  const setupMFA = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const { data, error } = await supabase.functions.invoke('mfa-setup', {
      body: { action: 'setup' }
    });
    if (error) {
      console.error('MFA setup error:', error);
      toast({ variant: "destructive", title: "Failed to setup MFA" });
      return;
    }
    setQrCode(((data as any)?.qrCodeUrl || (data as any)?.qr_code_url || '') as string);
  };

  const verifyMFA = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const { data, error } = await supabase.functions.invoke('mfa-setup', {
      body: { action: 'verify', token: verifyToken }
    });
    if (error) {
      console.error('MFA verify error:', error);
      toast({ variant: "destructive", title: "Verification failed" });
      return;
    }

    if ((data as any)?.valid) {
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
                    <QRCodeCanvas value={qrCode} size={200} level="H" />
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