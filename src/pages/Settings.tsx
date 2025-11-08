import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { User, Key, Mail, Camera, Shield, QrCode } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { QRCodeSVG } from "qrcode.react";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { CountryCodeSelector } from "@/components/CountryCodeSelector";

const profileSchema = z.object({
  full_name: z.string().trim().min(1, "Full name is required").max(100, "Full name must be less than 100 characters").regex(/^[a-zA-Z\s'-]+$/, "Full name can only contain letters, spaces, hyphens, and apostrophes"),
  display_name: z.string().trim().min(1, "Display name is required").max(50, "Display name must be less than 50 characters"),
  email: z.string().email(),
  recovery_email: z.string().email("Please enter a valid email address").optional().or(z.literal("")),
  mobile_number: z.string().trim().regex(/^\+[1-9]\d{1,14}$/, "Phone number must start with + followed by country code and 1-14 digits (e.g., +14155552671)").optional().or(z.literal("")),
  profession: z.string().trim().max(100, "Profession must be less than 100 characters").optional().or(z.literal("")),
  city: z.string().trim().max(100, "City must be less than 100 characters").optional().or(z.literal("")),
  country: z.string().trim().max(100, "Country must be less than 100 characters").optional().or(z.literal("")),
  date_of_birth: z.string().refine((date) => {
    if (!date) return true;
    const birthDate = new Date(date);
    const today = new Date();
    const age = today.getFullYear() - birthDate.getFullYear();
    return birthDate < today && age >= 13 && age <= 120;
  }, "Please enter a valid date of birth (age must be between 13 and 120)").optional().or(z.literal("")),
  bio: z.string().trim().max(500, "Bio must be less than 500 characters").optional().or(z.literal("")),
});

type ProfileFormData = z.infer<typeof profileSchema>;

export default function Settings() {
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [mfaSecret, setMfaSecret] = useState<string | null>(null);
  const [mfaQrUrl, setMfaQrUrl] = useState<string | null>(null);
  const [mfaToken, setMfaToken] = useState("");
  const [mfaEnabled, setMfaEnabled] = useState(false);
  const [mfaLoading, setMfaLoading] = useState(false);
  
  const form = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      full_name: "",
      display_name: "",
      email: "",
      recovery_email: "",
      mobile_number: "",
      profession: "",
      city: "",
      country: "",
      date_of_birth: "",
      bio: "",
    },
  });

  useEffect(() => {
    fetchProfile();
    checkMfaStatus();
  }, []);

  const fetchProfile = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    setUserId(session.user.id);

    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', session.user.id)
      .single();

    if (error) {
      console.error('Profile fetch error:', error);
      return;
    }

    if (data) {
      setAvatarUrl(data.avatar_url);
      form.reset({
        full_name: data.full_name || "",
        display_name: data.display_name || "",
        email: data.email || "",
        recovery_email: data.recovery_email || "",
        mobile_number: data.mobile_number || "",
        profession: data.profession || "",
        city: data.city || "",
        country: data.country || "",
        date_of_birth: data.date_of_birth || "",
        bio: data.bio || "",
      });
    }
  };

  const onSubmit = async (values: ProfileFormData) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const { error } = await supabase
      .from('profiles')
      .update({
        full_name: values.full_name,
        display_name: values.display_name,
        recovery_email: values.recovery_email || null,
        mobile_number: values.mobile_number || null,
        profession: values.profession || null,
        city: values.city || null,
        country: values.country || null,
        date_of_birth: values.date_of_birth || null,
        bio: values.bio || null,
      })
      .eq('id', session.user.id);

    if (error) {
      console.error('Profile update error:', error);
      toast({ variant: "destructive", title: "Failed to update profile" });
    } else {
      toast({ title: "Profile updated successfully!" });
    }
  };

  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      setUploading(true);

      if (!event.target.files || event.target.files.length === 0) {
        return;
      }

      const file = event.target.files[0];
      const fileExt = file.name.split('.').pop();
      const filePath = `${userId}/${Math.random()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, { upsert: true });

      if (uploadError) {
        throw uploadError;
      }

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl })
        .eq('id', userId);

      if (updateError) {
        throw updateError;
      }

      setAvatarUrl(publicUrl);
      toast({ title: "Profile picture updated successfully!" });
    } catch (error) {
      console.error('Error uploading avatar:', error);
      toast({ variant: "destructive", title: "Failed to upload profile picture" });
    } finally {
      setUploading(false);
    }
  };

  const handlePasswordReset = async () => {
    const email = form.getValues('email');
    if (!email) {
      toast({
        variant: "destructive",
        title: "Email not found",
        description: "Please refresh the page and try again",
      });
      return;
    }

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth`,
    });

    // Log error for debugging but don't expose details to user
    if (error) {
      console.error('Password reset error:', error.code, error.message);
    }

    // Always show generic success message to prevent account enumeration
    toast({
      title: "Password reset requested",
      description: "If an account exists with this email, you'll receive a password reset link.",
    });
  };

  const checkMfaStatus = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { data, error } = await supabase.functions.invoke('mfa-setup', {
        body: { action: 'check' }
      });

      if (error) throw error;
      setMfaEnabled(data.enabled || false);
    } catch (error) {
      console.error('Error checking MFA status:', error);
    }
  };

  const handleSetupMfa = async () => {
    setMfaLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('mfa-setup', {
        body: { action: 'setup' }
      });

      if (error) throw error;

      setMfaSecret(data.secret);
      setMfaQrUrl(data.qrCodeUrl);
      toast({
        title: "MFA Setup Started",
        description: "Scan the QR code with your authenticator app.",
      });
    } catch (error: any) {
      console.error('MFA setup error:', error);
      toast({
        variant: "destructive",
        title: "Setup Failed",
        description: error.message || "Failed to setup MFA. Please try again.",
      });
    } finally {
      setMfaLoading(false);
    }
  };

  const handleVerifyMfa = async () => {
    if (!mfaToken || mfaToken.length !== 6) {
      toast({
        variant: "destructive",
        title: "Invalid Code",
        description: "Please enter a 6-digit code from your authenticator app.",
      });
      return;
    }

    setMfaLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('mfa-setup', {
        body: { action: 'verify', token: mfaToken }
      });

      if (error) throw error;

      if (data.valid) {
        setMfaEnabled(true);
        setMfaSecret(null);
        setMfaQrUrl(null);
        setMfaToken("");
        toast({
          title: "MFA Enabled!",
          description: "Two-factor authentication is now active on your account.",
        });
      } else {
        toast({
          variant: "destructive",
          title: "Invalid Code",
          description: "The code you entered is incorrect. Please try again.",
        });
      }
    } catch (error: any) {
      console.error('MFA verification error:', error);
      toast({
        variant: "destructive",
        title: "Verification Failed",
        description: error.message || "Failed to verify code. Please try again.",
      });
    } finally {
      setMfaLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold bg-gradient-to-r from-primary via-accent to-secondary bg-clip-text text-transparent">
        Profile Settings
      </h1>

      <Card className="border-2 border-primary/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5 text-primary" />
            Profile Picture
          </CardTitle>
          <CardDescription>Upload or update your profile picture</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-6">
            <Avatar className="h-24 w-24">
              <AvatarImage src={avatarUrl || undefined} />
              <AvatarFallback className="bg-primary/10 text-primary text-2xl">
                {form.getValues('display_name')?.charAt(0)?.toUpperCase() || <User className="h-10 w-10" />}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <Label htmlFor="avatar-upload" className="cursor-pointer">
                <div className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors w-fit">
                  <Camera className="h-4 w-4" />
                  {uploading ? "Uploading..." : "Change Picture"}
                </div>
                <Input
                  id="avatar-upload"
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarUpload}
                  disabled={uploading}
                  className="hidden"
                />
              </Label>
              <p className="text-sm text-muted-foreground mt-2">
                JPG, PNG or GIF. Max size 5MB.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-2 border-primary/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5 text-primary" />
            Your Profile
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="full_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Full Name</FormLabel>
                      <FormControl>
                        <Input placeholder="John Doe" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="display_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Display Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Johnny" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input disabled className="bg-muted" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="recovery_email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Recovery Email (Optional)</FormLabel>
                    <FormControl>
                      <Input placeholder="recovery@email.com" {...field} />
                    </FormControl>
                    <FormMessage />
                    <p className="text-sm text-muted-foreground">
                      Used for account recovery if you lose access to your primary email
                    </p>
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="mobile_number"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Mobile Number</FormLabel>
                      <div className="flex gap-2">
                        <CountryCodeSelector
                          value={field.value || ""}
                          onSelect={(code) => {
                            // Extract the number part (remove old country code if present)
                            const currentValue = field.value || "";
                            let numberPart = currentValue;
                            
                            // Remove existing country code if present
                            if (currentValue.startsWith("+")) {
                              // Find where the country code ends (first non-digit after +)
                              const match = currentValue.match(/^\+\d+/);
                              if (match) {
                                numberPart = currentValue.substring(match[0].length);
                              }
                            }
                            
                            // Set new value with selected country code
                            field.onChange(code + numberPart);
                          }}
                          disabled={form.formState.isSubmitting}
                        />
                        <FormControl>
                          <Input 
                            placeholder="4155552671" 
                            {...field}
                            value={field.value?.replace(/^\+\d+/, '') || ''}
                            onChange={(e) => {
                              // Get current country code
                              const currentValue = field.value || "+1";
                              const match = currentValue.match(/^\+\d+/);
                              const countryCode = match ? match[0] : "+1";
                              
                              // Remove non-digits from input
                              const digits = e.target.value.replace(/\D/g, '');
                              field.onChange(countryCode + digits);
                            }}
                          />
                        </FormControl>
                      </div>
                      <FormMessage />
                      <p className="text-sm text-muted-foreground">
                        Required for phone-based password reset. Select country code and enter number.
                      </p>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="date_of_birth"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Date of Birth</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="profession"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Profession</FormLabel>
                    <FormControl>
                      <Input placeholder="Software Engineer" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="city"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>City</FormLabel>
                      <FormControl>
                        <Input placeholder="New York" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="country"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Country</FormLabel>
                      <FormControl>
                        <Input placeholder="USA" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="bio"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Bio</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Tell us about yourself..." rows={4} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button type="submit" disabled={form.formState.isSubmitting} className="w-full">
                {form.formState.isSubmitting ? "Updating..." : "Update Profile"}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>

      <Card className="border-2 border-destructive/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-destructive">
            <Key className="h-5 w-5" />
            Security
          </CardTitle>
          <CardDescription>Manage your password and account security</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-4 bg-muted rounded-lg space-y-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-destructive/10 flex items-center justify-center">
                <Key className="h-5 w-5 text-destructive" />
              </div>
              <div>
                <p className="font-medium">Password Reset</p>
                <p className="text-sm text-muted-foreground">
                  Reset your password via email
                </p>
              </div>
            </div>
            <Button onClick={handlePasswordReset} variant="destructive" className="w-full">
              <Mail className="h-4 w-4 mr-2" />
              Send Email Reset Link
            </Button>
          </div>

          <div className="p-4 bg-muted rounded-lg space-y-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                <Shield className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="font-medium">Two-Factor Authentication</p>
                <p className="text-sm text-muted-foreground">
                  {mfaEnabled ? "MFA is enabled on your account" : "Add extra security with an authenticator app"}
                </p>
              </div>
            </div>

            {!mfaEnabled && !mfaQrUrl && (
              <Button onClick={handleSetupMfa} disabled={mfaLoading} className="w-full">
                <Shield className="h-4 w-4 mr-2" />
                {mfaLoading ? "Setting up..." : "Setup Authenticator App"}
              </Button>
            )}

            {mfaQrUrl && (
              <div className="space-y-4">
                <div className="flex flex-col items-center gap-4 p-4 bg-background rounded-lg border">
                  <QRCodeSVG value={mfaQrUrl} size={200} />
                  <p className="text-sm text-center text-muted-foreground">
                    Scan this QR code with Google Authenticator, Authy, or any TOTP app
                  </p>
                  {mfaSecret && (
                    <div className="text-xs text-center">
                      <p className="text-muted-foreground mb-1">Or enter this key manually:</p>
                      <code className="bg-muted px-2 py-1 rounded">{mfaSecret}</code>
                    </div>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="mfa-token">Enter 6-digit code from your app</Label>
                  <Input
                    id="mfa-token"
                    type="text"
                    placeholder="123456"
                    maxLength={6}
                    value={mfaToken}
                    onChange={(e) => setMfaToken(e.target.value.replace(/\D/g, ''))}
                  />
                </div>
                <Button onClick={handleVerifyMfa} disabled={mfaLoading || mfaToken.length !== 6} className="w-full">
                  {mfaLoading ? "Verifying..." : "Verify & Enable MFA"}
                </Button>
              </div>
            )}

            {mfaEnabled && (
              <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
                <Shield className="h-4 w-4" />
                <span>MFA is active and protecting your account</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
