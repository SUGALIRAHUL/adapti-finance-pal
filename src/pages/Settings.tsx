import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { User } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface Profile {
  full_name: string | null;
  display_name: string | null;
  email: string | null;
  mobile_number: string | null;
  profession: string | null;
  city: string | null;
  country: string | null;
  date_of_birth: string | null;
  bio: string | null;
}

export default function Settings() {
  const [loading, setLoading] = useState(false);
  const [profile, setProfile] = useState<Profile>({
    full_name: "",
    display_name: "",
    email: "",
    mobile_number: "",
    profession: "",
    city: "",
    country: "",
    date_of_birth: "",
    bio: "",
  });

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

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
      setProfile({
        full_name: data.full_name || "",
        display_name: data.display_name || "",
        email: data.email || "",
        mobile_number: data.mobile_number || "",
        profession: data.profession || "",
        city: data.city || "",
        country: data.country || "",
        date_of_birth: data.date_of_birth || "",
        bio: data.bio || "",
      });
    }
  };

  const updateProfile = async () => {
    setLoading(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const { error } = await supabase
      .from('profiles')
      .update({
        full_name: profile.full_name,
        display_name: profile.display_name,
        mobile_number: profile.mobile_number,
        profession: profile.profession,
        city: profile.city,
        country: profile.country,
        date_of_birth: profile.date_of_birth,
        bio: profile.bio,
      })
      .eq('id', session.user.id);

    if (error) {
      console.error('Profile update error:', error);
      toast({ variant: "destructive", title: "Failed to update profile" });
    } else {
      toast({ title: "Profile updated successfully!" });
    }

    setLoading(false);
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
            Your Profile
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Full Name</Label>
              <Input
                value={profile.full_name || ""}
                onChange={(e) => setProfile({ ...profile, full_name: e.target.value })}
                placeholder="John Doe"
              />
            </div>
            <div className="space-y-2">
              <Label>Display Name</Label>
              <Input
                value={profile.display_name || ""}
                onChange={(e) => setProfile({ ...profile, display_name: e.target.value })}
                placeholder="Johnny"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Email</Label>
            <Input
              value={profile.email || ""}
              disabled
              className="bg-muted"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Mobile Number</Label>
              <Input
                value={profile.mobile_number || ""}
                onChange={(e) => setProfile({ ...profile, mobile_number: e.target.value })}
                placeholder="+1234567890"
              />
            </div>
            <div className="space-y-2">
              <Label>Date of Birth</Label>
              <Input
                type="date"
                value={profile.date_of_birth || ""}
                onChange={(e) => setProfile({ ...profile, date_of_birth: e.target.value })}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Profession</Label>
            <Input
              value={profile.profession || ""}
              onChange={(e) => setProfile({ ...profile, profession: e.target.value })}
              placeholder="Software Engineer"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>City</Label>
              <Input
                value={profile.city || ""}
                onChange={(e) => setProfile({ ...profile, city: e.target.value })}
                placeholder="New York"
              />
            </div>
            <div className="space-y-2">
              <Label>Country</Label>
              <Input
                value={profile.country || ""}
                onChange={(e) => setProfile({ ...profile, country: e.target.value })}
                placeholder="USA"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Bio</Label>
            <Textarea
              value={profile.bio || ""}
              onChange={(e) => setProfile({ ...profile, bio: e.target.value })}
              placeholder="Tell us about yourself..."
              rows={4}
            />
          </div>

          <Button onClick={updateProfile} disabled={loading} className="w-full">
            {loading ? "Updating..." : "Update Profile"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
