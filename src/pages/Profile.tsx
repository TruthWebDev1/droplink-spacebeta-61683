import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { ArrowLeft, Upload, User } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

const Profile = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profileData, setProfileData] = useState({
    businessName: "",
    username: "",
    description: "",
    logo: "",
  });

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        navigate("/auth");
        return;
      }

      const { data: profile, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (error && error.code !== "PGRST116") {
        console.error("Error loading profile:", error);
        toast.error("Failed to load profile");
        return;
      }

      if (profile) {
        setProfileData({
          businessName: profile.business_name || "",
          username: profile.username || "",
          description: profile.description || "",
          logo: profile.logo || "",
        });
      }
    } catch (error) {
      console.error("Error:", error);
      toast.error("Failed to load profile");
    } finally {
      setLoading(false);
    }
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setProfileData({ ...profileData, logo: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        toast.error("You must be logged in");
        navigate("/auth");
        return;
      }

      if (!profileData.businessName || !profileData.username) {
        toast.error("Business name and username are required");
        setSaving(false);
        return;
      }

      // Sanitize username
      const sanitizedUsername = profileData.username
        .toLowerCase()
        .replace(/[^a-z0-9-]/g, "-")
        .replace(/-+/g, "-")
        .replace(/^-|-$/g, "");

      const { error } = await supabase
        .from("profiles")
        .update({
          business_name: profileData.businessName,
          username: sanitizedUsername,
          description: profileData.description,
          logo: profileData.logo,
        })
        .eq("user_id", user.id);

      if (error) {
        if (error.code === "23505") {
          toast.error("This username is already taken");
        } else {
          throw error;
        }
        return;
      }

      toast.success("Profile updated successfully!");
      setProfileData({ ...profileData, username: sanitizedUsername });
    } catch (error) {
      console.error("Save error:", error);
      toast.error("Failed to update profile");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border px-4 lg:px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => navigate("/")}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <h1 className="text-xl font-semibold">Profile Settings</h1>
        </div>
      </header>

      <div className="max-w-4xl mx-auto p-4 lg:p-8">
        <Card>
          <CardHeader>
            <CardTitle>Edit Profile</CardTitle>
            <CardDescription>
              Update your public profile information
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Profile Picture */}
            <div className="space-y-2">
              <Label>Profile Picture</Label>
              <div className="flex items-center gap-4">
                <Avatar className="w-20 h-20">
                  <AvatarImage src={profileData.logo} alt={profileData.businessName} />
                  <AvatarFallback>
                    <User className="w-8 h-8" />
                  </AvatarFallback>
                </Avatar>
                <div className="flex gap-2">
                  <label htmlFor="logo-upload">
                    <Button variant="secondary" size="sm" asChild>
                      <span className="gap-2">
                        <Upload className="w-4 h-4" />
                        {profileData.logo ? "Change" : "Upload"}
                      </span>
                    </Button>
                    <input
                      id="logo-upload"
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleLogoUpload}
                    />
                  </label>
                  {profileData.logo && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setProfileData({ ...profileData, logo: "" })}
                    >
                      Remove
                    </Button>
                  )}
                </div>
              </div>
            </div>

            {/* Business Name */}
            <div className="space-y-2">
              <Label htmlFor="businessName">Business Name *</Label>
              <Input
                id="businessName"
                placeholder="Your Business Name"
                value={profileData.businessName}
                onChange={(e) => setProfileData({ ...profileData, businessName: e.target.value })}
              />
            </div>

            {/* Username */}
            <div className="space-y-2">
              <Label htmlFor="username">Username *</Label>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">{window.location.origin}/</span>
                <Input
                  id="username"
                  placeholder="your-username"
                  value={profileData.username}
                  onChange={(e) => setProfileData({ ...profileData, username: e.target.value })}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                This is your unique profile URL
              </p>
            </div>

            {/* Bio/Description */}
            <div className="space-y-2">
              <Label htmlFor="description">Bio</Label>
              <Textarea
                id="description"
                placeholder="Tell people about yourself..."
                value={profileData.description}
                onChange={(e) => setProfileData({ ...profileData, description: e.target.value })}
                rows={4}
              />
              <p className="text-xs text-muted-foreground">
                This will be displayed on your public profile
              </p>
            </div>

            {/* Save Button */}
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => navigate("/")}>
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={saving}>
                {saving ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Profile;
