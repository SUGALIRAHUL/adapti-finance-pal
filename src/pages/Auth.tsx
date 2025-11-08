import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "@/hooks/use-toast";
import { z } from "zod";
import { Mail, UserCircle } from "lucide-react";


const signupSchema = z.object({
  email: z.string().email('Invalid email address').max(255, 'Email too long'),
  password: z.string()
    .min(12, 'Password must be at least 12 characters')
    .regex(/[A-Z]/, 'Password must contain an uppercase letter')
    .regex(/[a-z]/, 'Password must contain a lowercase letter')
    .regex(/[0-9]/, 'Password must contain a number')
    .regex(/[^A-Za-z0-9]/, 'Password must contain a special character'),
  fullName: z.string()
    .trim()
    .min(1, 'Name required')
    .max(100, 'Name too long')
    .regex(/^[a-zA-Z\s\-']+$/, 'Name contains invalid characters'),
  displayName: z.string()
    .trim()
    .min(1, 'Display name required')
    .max(50, 'Display name too long'),
  mobileNumber: z.string()
    .trim()
    .regex(/^\+[1-9]\d{1,14}$/, 'Phone number must start with + followed by country code and digits (e.g., +14155552671)'),
  profession: z.string()
    .trim()
    .min(1, 'Profession required')
    .max(100, 'Profession too long'),
  city: z.string()
    .trim()
    .min(1, 'City required')
    .max(100, 'City too long'),
  country: z.string()
    .trim()
    .min(1, 'Country required')
    .max(100, 'Country too long'),
  dateOfBirth: z.string()
    .refine((date) => {
      const d = new Date(date);
      return d instanceof Date && !isNaN(d.getTime());
    }, 'Invalid date'),
  bio: z.string()
    .trim()
    .max(500, 'Bio too long')
    .optional()
});

const loginSchema = z.object({
  email: z.string().email('Invalid email address').max(255, 'Email too long'),
  password: z.string().min(1, 'Password required')
});

export default function Auth() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [mobileNumber, setMobileNumber] = useState("");
  const [profession, setProfession] = useState("");
  const [city, setCity] = useState("");
  const [country, setCountry] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [bio, setBio] = useState("");
  const [resetEmail, setResetEmail] = useState("");
  const [resetSent, setResetSent] = useState(false);
  const [isPasswordReset, setIsPasswordReset] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  useEffect(() => {
    // Check if this is a password reset link
    const hashParams = new URLSearchParams(window.location.hash.substring(1));
    const type = hashParams.get('type');
    
    if (type === 'recovery') {
      setIsPasswordReset(true);
    }
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate inputs
    const validation = loginSchema.safeParse({ email, password });
    if (!validation.success) {
      toast({
        variant: "destructive",
        title: "Validation Error",
        description: validation.error.errors[0].message,
      });
      return;
    }

    setLoading(true);

    const { error } = await supabase.auth.signInWithPassword({
      email: validation.data.email,
      password: validation.data.password,
    });

    if (error) {
      console.error('Auth error:', error.code, error.message);
      toast({
        variant: "destructive",
        title: "Authentication failed",
        description: "Invalid email or password. Please try again.",
      });
    } else {
      toast({
        title: "Welcome back!",
        description: "You have successfully logged in.",
      });
      navigate("/dashboard");
    }

    setLoading(false);
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate inputs
    const validation = signupSchema.safeParse({ 
      email, 
      password, 
      fullName,
      displayName,
      mobileNumber,
      profession,
      city,
      country,
      dateOfBirth,
      bio
    });
    if (!validation.success) {
      toast({
        variant: "destructive",
        title: "Validation Error",
        description: validation.error.errors[0].message,
      });
      return;
    }

    setLoading(true);

    const { error } = await supabase.auth.signUp({
      email: validation.data.email,
      password: validation.data.password,
      options: {
        emailRedirectTo: `${window.location.origin}/dashboard`,
        data: {
          full_name: validation.data.fullName,
          display_name: validation.data.displayName,
          mobile_number: validation.data.mobileNumber,
          profession: validation.data.profession,
          city: validation.data.city,
          country: validation.data.country,
          date_of_birth: validation.data.dateOfBirth,
          bio: validation.data.bio,
        },
      },
    });

    if (error) {
      console.error('Signup error:', error.code, error.message);
      toast({
        variant: "destructive",
        title: "Account creation failed",
        description: "Unable to create account. Please try again or contact support.",
      });
    } else {
      toast({
        title: "Account created!",
        description: "Welcome to AI Finance Tutor. You can now log in.",
      });
    }

    setLoading(false);
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!resetEmail) {
      toast({
        variant: "destructive",
        title: "Email required",
        description: "Please enter your email address",
      });
      return;
    }

    setLoading(true);

    const { error } = await supabase.auth.resetPasswordForEmail(resetEmail, {
      redirectTo: `${window.location.origin}/auth`,
    });

    if (error) {
      console.error('Password reset error:', error.code, error.message);
    }
    
    setResetSent(true);
    toast({
      title: "Check your email",
      description: "If an account exists with this email, you will receive a password reset link.",
    });

    setLoading(false);
  };


  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (newPassword !== confirmPassword) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Passwords do not match",
      });
      return;
    }

    // Apply same strong password validation as signup
    const passwordValidation = signupSchema.shape.password.safeParse(newPassword);
    if (!passwordValidation.success) {
      toast({
        variant: "destructive",
        title: "Weak Password",
        description: passwordValidation.error.errors[0].message,
      });
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) {
        console.error('Password update error:', error.code, error.message);
        throw error;
      }

      toast({
        title: "Success",
        description: "Your password has been updated successfully!",
      });

      // Clear the hash and redirect to dashboard
      window.location.hash = '';
      setIsPasswordReset(false);
      setNewPassword("");
      setConfirmPassword("");
      navigate("/dashboard");
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Password Update Failed",
        description: "Unable to update your password. Please try again or request a new reset link.",
      });
    } finally {
      setLoading(false);
    }
  };

  // Show password reset form if coming from reset link
  if (isPasswordReset) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/20 via-accent/10 to-secondary/20 p-4">
        <Card className="w-full max-w-md shadow-2xl border-0">
          <CardHeader className="space-y-4">
            <div className="flex justify-center mb-2">
              <UserCircle className="h-24 w-24 text-primary" />
            </div>
            <CardTitle className="text-3xl text-center bg-gradient-to-r from-primary via-accent to-secondary bg-clip-text text-transparent font-bold">
              Reset Password
            </CardTitle>
            <CardDescription className="text-center">
              Enter your new password below
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handlePasswordReset} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="new-password">New Password</Label>
                <Input
                  id="new-password"
                  type="password"
                  placeholder="Min. 12 characters, uppercase, lowercase, number, special char"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  minLength={12}
                />
                <p className="text-xs text-muted-foreground">
                  Password must be at least 12 characters and contain uppercase, lowercase, number, and special character
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm-password">Confirm Password</Label>
                <Input
                  id="confirm-password"
                  type="password"
                  placeholder="Confirm new password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  minLength={12}
                />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Updating..." : "Update Password"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/20 via-accent/10 to-secondary/20 p-4">
      <Card className="w-full max-w-2xl shadow-2xl border-0">
        <CardHeader className="space-y-4">
          <div className="flex justify-center mb-2">
            <UserCircle className="h-24 w-24 text-primary" />
          </div>
          <CardTitle className="text-4xl text-center bg-gradient-to-r from-primary via-accent to-secondary bg-clip-text text-transparent font-bold">
            PERSFIN
          </CardTitle>
          <CardDescription className="text-center text-base">
            Your personal finance planning companion powered by AI
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="login" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="login">Login</TabsTrigger>
              <TabsTrigger value="signup">Sign Up</TabsTrigger>
              <TabsTrigger value="forgot">Forgot Password</TabsTrigger>
            </TabsList>
            <TabsContent value="login">
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="login-email">Email</Label>
                  <Input
                    id="login-email"
                    type="email"
                    placeholder="your@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="login-password">Password</Label>
                  <Input
                    id="login-password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? "Logging in..." : "Login"}
                </Button>
              </form>
            </TabsContent>
            <TabsContent value="signup">
              <form onSubmit={handleSignup} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="signup-name">Full Name</Label>
                    <Input
                      id="signup-name"
                      type="text"
                      placeholder="John Doe"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-display-name">Display Name</Label>
                    <Input
                      id="signup-display-name"
                      type="text"
                      placeholder="Johnny"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      required
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-email">Email</Label>
                  <Input
                    id="signup-email"
                    type="email"
                    placeholder="your@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-password">Password</Label>
                  <Input
                    id="signup-password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={12}
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="signup-mobile">Mobile Number</Label>
                    <Input
                      id="signup-mobile"
                      type="tel"
                      placeholder="+14155552671"
                      value={mobileNumber}
                      onChange={(e) => setMobileNumber(e.target.value)}
                      required
                    />
                    <p className="text-xs text-muted-foreground">
                      Format: +[country code][number] (e.g., +14155552671 for US, +442071234567 for UK)
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-dob">Date of Birth</Label>
                    <Input
                      id="signup-dob"
                      type="date"
                      value={dateOfBirth}
                      onChange={(e) => setDateOfBirth(e.target.value)}
                      required
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-profession">Profession</Label>
                  <Input
                    id="signup-profession"
                    type="text"
                    placeholder="Software Engineer"
                    value={profession}
                    onChange={(e) => setProfession(e.target.value)}
                    required
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="signup-city">City</Label>
                    <Input
                      id="signup-city"
                      type="text"
                      placeholder="New York"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-country">Country</Label>
                    <Input
                      id="signup-country"
                      type="text"
                      placeholder="USA"
                      value={country}
                      onChange={(e) => setCountry(e.target.value)}
                      required
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-bio">Bio (Optional)</Label>
                  <Input
                    id="signup-bio"
                    type="text"
                    placeholder="Tell us about yourself..."
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                  />
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? "Creating account..." : "Sign Up"}
                </Button>
              </form>
            </TabsContent>
            <TabsContent value="forgot">
              {resetSent ? (
                <div className="text-center py-6 space-y-4">
                  <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
                    <Mail className="h-8 w-8 text-primary" />
                  </div>
                  <h3 className="text-xl font-semibold">Check Your Email</h3>
                  <p className="text-muted-foreground">
                    We've sent a password reset link to <strong>{resetEmail}</strong>
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Click the link in the email to reset your password. The link will expire in 1 hour.
                  </p>
                  <Button 
                    variant="outline" 
                    onClick={() => {
                      setResetSent(false);
                      setResetEmail("");
                    }}
                    className="mt-4"
                  >
                    Send Another Link
                  </Button>
                </div>
              ) : (
                <form onSubmit={handleForgotPassword} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="reset-email">Email Address</Label>
                    <Input
                      id="reset-email"
                      type="email"
                      placeholder="your@email.com"
                      value={resetEmail}
                      onChange={(e) => setResetEmail(e.target.value)}
                      required
                    />
                    <p className="text-sm text-muted-foreground">
                      Enter your registered email address and we'll send you a link to reset your password.
                    </p>
                  </div>
                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? "Sending..." : "Send Reset Link"}
                  </Button>
                </form>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}