import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useSubscription } from "@/hooks/useSubscription";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PhonePreview } from "@/components/PhonePreview";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Analytics } from "@/components/Analytics";
import { DesignCustomizer } from "@/components/DesignCustomizer";
import { CustomLinksManager } from "@/components/CustomLinksManager";
import { DonationWallet } from "@/components/DonationWallet";
import { supabase } from "@/integrations/supabase/client";
import { Switch } from "@/components/ui/switch";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { 
  Upload, 
  Twitter, 
  Instagram, 
  Youtube, 
  Music, 
  Facebook, 
  Linkedin, 
  Twitch, 
  Globe,
  LogOut,
  Eye,
  EyeOff,
  Settings,
  Palette,
  BarChart3,
  QrCode,
  Share2,
  Menu,
  Wallet,
  Users,
  User,
  Bot,
} from "lucide-react";
import { toast } from "sonner";
import { QRCodeDialog } from "@/components/QRCodeDialog";
import { useState as useQRState } from "react";

interface ProfileData {
  logo: string;
  businessName: string;
  storeUrl: string;
  description: string;
  youtubeVideoUrl: string;
  socialLinks: {
    twitter: string;
    instagram: string;
    youtube: string;
    tiktok: string;
    facebook: string;
    linkedin: string;
    twitch: string;
    website: string;
  };
  customLinks: Array<{
    id: string;
    title: string;
    url: string;
    icon?: string;
  }>;
  theme: {
    primaryColor: string;
    backgroundColor: string;
    iconStyle: string;
    buttonStyle: string;
  };
  products: Array<{
    id: string;
    title: string;
    price: string;
    description: string;
    fileUrl: string;
  }>;
  wallets: {
    piWallet?: { address: string; customMessage: string };
  };
  hasPremium?: boolean;
  showShareButton?: boolean;
}

const Dashboard = () => {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const { plan, features, loading: subscriptionLoading } = useSubscription();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profileId, setProfileId] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(true);
  const [showQRCode, setShowQRCode] = useState(false);
  const [profile, setProfile] = useState<ProfileData>({
    logo: "",
    businessName: "",
    storeUrl: "",
    description: "",
    youtubeVideoUrl: "",
    socialLinks: {
      twitter: "",
      instagram: "",
      youtube: "",
      tiktok: "",
      facebook: "",
      linkedin: "",
      twitch: "",
      website: "",
    },
    customLinks: [],
    theme: {
      primaryColor: "#3b82f6",
      backgroundColor: "#000000",
      iconStyle: "rounded",
      buttonStyle: "filled",
    },
    products: [],
    wallets: {
      piWallet: undefined,
    },
    hasPremium: false,
    showShareButton: true,
  });

  useEffect(() => {
    checkAuthAndLoadProfile();
  }, []);

  const checkAuthAndLoadProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        navigate("/auth");
        return;
      }

      // Load profile from database
      const { data: profileData, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", user.id)
        .single();

      if (error && error.code !== "PGRST116") { // PGRST116 = not found
        console.error("Error loading profile:", error);
      }

      if (profileData) {
        setProfileId(profileData.id);
        
        // Load products
        const { data: productsData } = await supabase
          .from("products")
          .select("*")
          .eq("profile_id", profileData.id);

        const socialLinks = profileData.social_links as any;
        const themeSettings = profileData.theme_settings as any;
        const cryptoWallets = (profileData as any).crypto_wallets as any;
        const bankDetails = (profileData as any).bank_details as any;
        
        setProfile({
          logo: profileData.logo || "",
          businessName: profileData.business_name || "",
          storeUrl: profileData.username || "",
          description: profileData.description || "",
          youtubeVideoUrl: (profileData as any).youtube_video_url || "",
          socialLinks: socialLinks || {
            twitter: "",
            instagram: "",
            youtube: "",
            tiktok: "",
            facebook: "",
            linkedin: "",
            twitch: "",
            website: "",
          },
          customLinks: (themeSettings?.customLinks as any) || [],
          theme: {
            primaryColor: themeSettings?.primaryColor || "#3b82f6",
            backgroundColor: themeSettings?.backgroundColor || "#000000",
            iconStyle: themeSettings?.iconStyle || "rounded",
            buttonStyle: themeSettings?.buttonStyle || "filled",
          },
          products: productsData?.map((p: any) => ({
            id: p.id,
            title: p.title,
            price: p.price,
            description: p.description || "",
            fileUrl: p.file_url || "",
          })) || [],
      wallets: {
        piWallet: cryptoWallets?.piWallet || undefined,
      },
          hasPremium: profileData.has_premium || false,
          showShareButton: (profileData as any).show_share_button !== false,
        });
      }
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setProfile({ ...profile, logo: reader.result as string });
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
        return;
      }

      if (!profile.storeUrl) {
        toast.error("Store URL is required");
        return;
      }

      // Validate and sanitize store URL
      const sanitizedUrl = profile.storeUrl
        .toLowerCase()
        .replace(/[^a-z0-9-]/g, "-")
        .replace(/-+/g, "-")
        .replace(/^-|-$/g, "");

      if (sanitizedUrl !== profile.storeUrl) {
        setProfile({ ...profile, storeUrl: sanitizedUrl });
      }

      // Save or update profile
      const profilePayload = {
        user_id: user.id,
        username: sanitizedUrl,
        business_name: profile.businessName,
        description: profile.description,
        logo: profile.logo,
        youtube_video_url: profile.youtubeVideoUrl,
        social_links: profile.socialLinks,
        show_share_button: profile.showShareButton,
        theme_settings: {
          ...profile.theme,
          customLinks: profile.customLinks,
        },
        crypto_wallets: profile.wallets.piWallet ? { piWallet: profile.wallets.piWallet } : {},
        bank_details: {},
      };

      let currentProfileId = profileId;

      if (profileId) {
        // Update existing profile
        const { error } = await supabase
          .from("profiles")
          .update(profilePayload)
          .eq("id", profileId);

        if (error) throw error;
      } else {
        // Insert new profile
        const { data, error } = await supabase
          .from("profiles")
          .insert([profilePayload])
          .select()
          .single();

        if (error) throw error;
        currentProfileId = data.id;
        setProfileId(data.id);
      }

      // Save products
      if (currentProfileId) {
        // Delete existing products
        await supabase
          .from("products")
          .delete()
          .eq("profile_id", currentProfileId);

        // Insert new products
        if (profile.products.length > 0) {
          const productsPayload = profile.products.map((p) => ({
            profile_id: currentProfileId,
            title: p.title,
            price: p.price,
            description: p.description,
            file_url: p.fileUrl,
          }));

          const { error } = await supabase
            .from("products")
            .insert(productsPayload);

          if (error) throw error;
        }
      }

      toast.success("Profile saved successfully!");
    } catch (error: any) {
      console.error("Save error:", error);
      if (error.code === "23505") {
        toast.error("This store URL is already taken. Please choose another one.");
      } else {
        toast.error(error.message || "Failed to save profile");
      }
    } finally {
      setSaving(false);
    }
  };

  const handleCopyLink = () => {
    if (!profile.storeUrl) {
      toast.error("Please set your store URL first");
      return;
    }
    const link = `${window.location.origin}/${profile.storeUrl}`;
    navigator.clipboard.writeText(link);
    toast.success("Public link copied! Ready to share.");
  };

  const handleShowQRCode = () => {
    if (!profile.storeUrl) {
      toast.error("Please set your store URL first");
      return;
    }
    setShowQRCode(true);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/auth");
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
      <header className="border-b border-border px-4 lg:px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h1 className="text-xl font-semibold text-sky-500">Droplink</h1>
        </div>
        <div className="flex items-center gap-2 lg:gap-4">
          {isMobile ? (
            <Drawer>
              <DrawerTrigger asChild>
                <Button variant="outline" size="sm">
                  <Menu className="w-4 h-4" />
                </Button>
              </DrawerTrigger>
              <DrawerContent>
                <DrawerHeader>
                  <DrawerTitle>Menu</DrawerTitle>
                  <DrawerDescription>Quick actions and settings</DrawerDescription>
                </DrawerHeader>
                <div className="p-4 space-y-2">
                  <Button onClick={handleShowQRCode} variant="outline" size="sm" className="w-full justify-start gap-2">
                    <QrCode className="w-4 h-4" />
                    QR Code
                  </Button>
                  <Button onClick={handleCopyLink} variant="outline" size="sm" className="w-full justify-start gap-2">
                    <Share2 className="w-4 h-4" />
                    Share
                  </Button>
                  <Button onClick={() => navigate("/followers")} variant="outline" size="sm" className="w-full justify-start gap-2">
                    <Users className="w-4 h-4" />
                    Followers
                  </Button>
                  <Button onClick={() => navigate("/wallet")} variant="outline" size="sm" className="w-full justify-start gap-2">
                    <Wallet className="w-4 h-4" />
                    Wallet
                  </Button>
                  {features.hasAI && (
                    <Button onClick={() => navigate("/ai-support")} variant="outline" size="sm" className="w-full justify-start gap-2">
                      <Bot className="w-4 h-4" />
                      AI Support
                    </Button>
                  )}
                  <Button onClick={() => navigate("/pi-subscription")} variant="outline" size="sm" className="w-full justify-start gap-2">
                    <Wallet className="w-4 h-4" />
                    Upgrade Plan
                  </Button>
                  <DrawerClose asChild>
                    <Button variant="ghost" size="sm" className="w-full">Close</Button>
                  </DrawerClose>
                </div>
              </DrawerContent>
            </Drawer>
          ) : (
            <>
              <Button onClick={handleShowQRCode} variant="outline" size="sm" className="hidden sm:flex gap-2">
                <QrCode className="w-4 h-4" />
                QR Code
              </Button>
              <Button onClick={handleCopyLink} variant="outline" size="sm" className="hidden sm:flex gap-2">
                <Share2 className="w-4 h-4" />
                Share
              </Button>
              <Button 
                onClick={() => navigate("/followers")} 
                variant="outline" 
                size="sm" 
                className="hidden md:flex gap-2"
              >
                <Users className="w-4 h-4" />
                Followers
              </Button>
              <Button 
                onClick={() => navigate("/wallet")} 
                variant="outline" 
                size="sm" 
                className="hidden md:flex gap-2"
              >
                <Wallet className="w-4 h-4" />
                Wallet
              </Button>
              {features.hasAI && (
                <Button 
                  onClick={() => navigate("/ai-support")} 
                  variant="outline" 
                  size="sm" 
                  className="hidden lg:flex gap-2"
                >
                  <Bot className="w-4 h-4" />
                  AI Support
                </Button>
              )}
              <Button 
                onClick={() => navigate("/pi-subscription")} 
                variant="outline" 
                size="sm" 
                className="hidden md:flex gap-2"
              >
                <span className="text-xs px-2 py-0.5 bg-primary/20 rounded mr-1">{plan.toUpperCase()}</span>
                Upgrade
              </Button>
            </>
          )}
          <Button 
            onClick={() => setShowPreview(!showPreview)} 
            variant="outline" 
            size="sm"
            className="lg:hidden"
          >
            {showPreview ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </Button>
          <ThemeToggle />
          <Button onClick={handleLogout} variant="ghost" size="sm">
            <LogOut className="w-4 h-4" />
          </Button>
        </div>
      </header>

      <div className="flex flex-col lg:flex-row h-[calc(100vh-73px)]">
        {/* Editor Panel */}
        <div className={`flex-1 overflow-y-auto p-4 lg:p-8 ${showPreview ? 'hidden lg:block' : 'block'}`}>
          <div className="max-w-2xl mx-auto">
            <Tabs defaultValue="profile" className="w-full">
              <TabsList className="grid w-full grid-cols-3 mb-6">
                <TabsTrigger value="profile" className="text-xs sm:text-sm">
                  <Settings className="w-4 h-4 mr-2" />
                  Profile
                </TabsTrigger>
                <TabsTrigger value="design" className="text-xs sm:text-sm">
                  <Palette className="w-4 h-4 mr-2" />
                  Design
                </TabsTrigger>
                <TabsTrigger value="analytics" className="text-xs sm:text-sm">
                  <BarChart3 className="w-4 h-4 mr-2" />
                  Analytics
                </TabsTrigger>
              </TabsList>

              {/* Profile Tab */}
              <TabsContent value="profile" className="space-y-8">
                <div>
                  <h2 className="text-lg font-semibold mb-6">Business details</h2>
              
              {/* Logo Upload */}
              <div className="mb-6">
                <Label className="mb-3 block">Business logo</Label>
                <div className="flex items-center gap-4">
                  <div className="w-20 h-20 rounded-2xl bg-card border border-border flex items-center justify-center overflow-hidden">
                    {profile.logo ? (
                      <img src={profile.logo} alt="Logo" className="w-full h-full object-cover" />
                    ) : (
                      <Upload className="w-6 h-6 text-muted-foreground" />
                    )}
                  </div>
                  <div className="flex gap-2">
                    <label htmlFor="logo-upload">
                      <Button variant="secondary" size="sm" asChild>
                        <span>{profile.logo ? "Change" : "Upload"}</span>
                      </Button>
                      <input
                        id="logo-upload"
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleLogoUpload}
                      />
                    </label>
                    {profile.logo && (
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => setProfile({ ...profile, logo: "" })}
                      >
                        Remove
                      </Button>
                    )}
                  </div>
                </div>
              </div>

              {/* Business Name */}
              <div className="mb-6">
                <Label htmlFor="business-name" className="mb-3 block">Business name</Label>
                <Input
                  id="business-name"
                  value={profile.businessName}
                  onChange={(e) => setProfile({ ...profile, businessName: e.target.value })}
                  placeholder="Enter business name"
                  className="bg-input-bg"
                />
              </div>

              {/* Store URL */}
              <div className="mb-6">
                <Label htmlFor="store-url" className="mb-3 block">Store URL (Username)</Label>
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground text-sm">{window.location.origin}/</span>
                  <Input
                    id="store-url"
                    value={profile.storeUrl}
                    onChange={(e) => setProfile({ ...profile, storeUrl: e.target.value })}
                    placeholder="your-store-name"
                    className="bg-input-bg flex-1"
                  />
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  This will be your public store URL that you can share
                </p>
              </div>

              {/* Description */}
              <div className="mb-6">
                <Label htmlFor="description" className="mb-3 block">Business description</Label>
                <Textarea
                  id="description"
                  value={profile.description}
                  onChange={(e) => setProfile({ ...profile, description: e.target.value })}
                  placeholder="Tell people about your business..."
                  className="bg-input-bg min-h-[120px] resize-none"
                  maxLength={400}
                />
                <div className="text-xs text-muted-foreground text-right mt-2">
                  {profile.description.length} / 400
                </div>
              </div>

              {/* YouTube Video URL */}
              <div className="mb-6">
                <Label htmlFor="youtube-video" className="mb-3 block">
                  YouTube Video
                  {!features.hasYoutube && <span className="text-xs text-muted-foreground ml-2">(Premium+)</span>}
                </Label>
                <Input
                  id="youtube-video"
                  value={profile.youtubeVideoUrl}
                  onChange={(e) => setProfile({ ...profile, youtubeVideoUrl: e.target.value })}
                  placeholder={features.hasYoutube ? "https://www.youtube.com/watch?v=..." : "Upgrade to Premium to add YouTube video"}
                  className="bg-input-bg"
                  disabled={!features.hasYoutube}
                />
                {!features.hasYoutube && (
                  <Button onClick={() => navigate("/pi-subscription")} variant="link" size="sm" className="mt-1 p-0 h-auto">
                    Upgrade to add YouTube video
                  </Button>
                )}
              </div>
            </div>

            {/* Social Links */}
            <div>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-semibold">Social links</h2>
                {features.maxSocial !== -1 && (
                  <span className="text-xs text-muted-foreground">
                    {Object.values(profile.socialLinks).filter(Boolean).length} / {features.maxSocial} used
                  </span>
                )}
              </div>
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-card border border-border flex items-center justify-center">
                    <Twitter className="w-5 h-5" />
                  </div>
                  <Input
                    value={profile.socialLinks.twitter}
                    onChange={(e) => setProfile({
                      ...profile,
                      socialLinks: { ...profile.socialLinks, twitter: e.target.value }
                    })}
                    placeholder="https://x.com/"
                    className="bg-input-bg flex-1"
                  />
                </div>

                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-card border border-border flex items-center justify-center">
                    <Instagram className="w-5 h-5" />
                  </div>
                  <Input
                    value={profile.socialLinks.instagram}
                    onChange={(e) => setProfile({
                      ...profile,
                      socialLinks: { ...profile.socialLinks, instagram: e.target.value }
                    })}
                    placeholder="https://instagram.com/"
                    className="bg-input-bg flex-1"
                  />
                </div>

                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-card border border-border flex items-center justify-center">
                    <Youtube className="w-5 h-5" />
                  </div>
                  <Input
                    value={profile.socialLinks.youtube}
                    onChange={(e) => setProfile({
                      ...profile,
                      socialLinks: { ...profile.socialLinks, youtube: e.target.value }
                    })}
                    placeholder="https://youtube.com/@"
                    className="bg-input-bg flex-1"
                  />
                </div>

                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-card border border-border flex items-center justify-center">
                    <Music className="w-5 h-5" />
                  </div>
                  <Input
                    value={profile.socialLinks.tiktok}
                    onChange={(e) => setProfile({
                      ...profile,
                      socialLinks: { ...profile.socialLinks, tiktok: e.target.value }
                    })}
                    placeholder="https://tiktok.com/@"
                    className="bg-input-bg flex-1"
                  />
                </div>

                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-card border border-border flex items-center justify-center">
                    <Facebook className="w-5 h-5" />
                  </div>
                  <Input
                    value={profile.socialLinks.facebook}
                    onChange={(e) => setProfile({
                      ...profile,
                      socialLinks: { ...profile.socialLinks, facebook: e.target.value }
                    })}
                    placeholder="https://facebook.com/"
                    className="bg-input-bg flex-1"
                  />
                </div>

                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-card border border-border flex items-center justify-center">
                    <Linkedin className="w-5 h-5" />
                  </div>
                  <Input
                    value={profile.socialLinks.linkedin}
                    onChange={(e) => setProfile({
                      ...profile,
                      socialLinks: { ...profile.socialLinks, linkedin: e.target.value }
                    })}
                    placeholder="https://linkedin.com/in/"
                    className="bg-input-bg flex-1"
                  />
                </div>

                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-card border border-border flex items-center justify-center">
                    <Twitch className="w-5 h-5" />
                  </div>
                  <Input
                    value={profile.socialLinks.twitch}
                    onChange={(e) => setProfile({
                      ...profile,
                      socialLinks: { ...profile.socialLinks, twitch: e.target.value }
                    })}
                    placeholder="https://twitch.tv/"
                    className="bg-input-bg flex-1"
                  />
                </div>

                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-card border border-border flex items-center justify-center">
                    <Globe className="w-5 h-5" />
                  </div>
                  <Input
                    value={profile.socialLinks.website}
                    onChange={(e) => setProfile({
                      ...profile,
                      socialLinks: { ...profile.socialLinks, website: e.target.value }
                    })}
                    placeholder="Enter website URL"
                    className="bg-input-bg flex-1"
                  />
                </div>
              </div>
            </div>

            {/* Custom Links */}
            <div className="border-t pt-6">
              <CustomLinksManager
                links={profile.customLinks}
                onChange={(links) => setProfile({ ...profile, customLinks: links })}
              />
            </div>

            {/* Donation Wallets */}
            <div className="border-t pt-6">
              <DonationWallet
                wallets={profile.wallets}
                onChange={(wallets) => setProfile({ ...profile, wallets })}
              />
            </div>

            {/* Share Button Settings */}
            <div className="border-t pt-6">
              <h2 className="text-lg font-semibold mb-6">Public Profile Settings</h2>
              <div className="flex items-center justify-between p-4 bg-card border border-border rounded-lg">
                <div className="space-y-0.5">
                  <Label htmlFor="share-button" className="text-base">
                    Show Share Button
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Allow visitors to share your profile with a button
                  </p>
                </div>
                <Switch
                  id="share-button"
                  checked={profile.showShareButton}
                  onCheckedChange={(checked) => setProfile({ ...profile, showShareButton: checked })}
                />
              </div>
            </div>

            {/* Theme Customization */}
            <div className="border-t pt-6">
              <h2 className="text-lg font-semibold mb-6">Theme Customization</h2>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="primary-color" className="mb-3 block">Primary Color</Label>
                  <Input
                    id="primary-color"
                    type="color"
                    value={profile.theme.primaryColor}
                    onChange={(e) => setProfile({
                      ...profile,
                      theme: { ...profile.theme, primaryColor: e.target.value }
                    })}
                    className="h-12 w-full"
                  />
                </div>
                <div>
                  <Label htmlFor="background-color" className="mb-3 block">Background Color</Label>
                  <Input
                    id="background-color"
                    type="color"
                    value={profile.theme.backgroundColor}
                    onChange={(e) => setProfile({
                      ...profile,
                      theme: { ...profile.theme, backgroundColor: e.target.value }
                    })}
                    className="h-12 w-full"
                  />
                </div>
                <div>
                  <Label htmlFor="icon-style" className="mb-3 block">Icon Style</Label>
                  <select
                    id="icon-style"
                    value={profile.theme.iconStyle}
                    onChange={(e) => setProfile({
                      ...profile,
                      theme: { ...profile.theme, iconStyle: e.target.value }
                    })}
                    className="w-full h-10 px-3 rounded-md bg-input-bg border border-border"
                  >
                    <option value="rounded">Rounded</option>
                    <option value="square">Square</option>
                    <option value="circle">Circle</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Digital Products */}
            <div>
              <h2 className="text-lg font-semibold mb-6">Digital Products</h2>
              <div className="space-y-4">
                {profile.products.map((product, index) => (
                  <div key={product.id} className="p-4 bg-card border border-border rounded-lg space-y-3">
                    <div className="flex justify-between items-center">
                      <h3 className="font-medium">Product {index + 1}</h3>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          const newProducts = profile.products.filter(p => p.id !== product.id);
                          setProfile({ ...profile, products: newProducts });
                        }}
                      >
                        Remove
                      </Button>
                    </div>
                    <Input
                      placeholder="Product Title"
                      value={product.title}
                      onChange={(e) => {
                        const newProducts = [...profile.products];
                        newProducts[index].title = e.target.value;
                        setProfile({ ...profile, products: newProducts });
                      }}
                      className="bg-input-bg"
                    />
                    <Input
                      placeholder="Price (e.g., $9.99)"
                      value={product.price}
                      onChange={(e) => {
                        const newProducts = [...profile.products];
                        newProducts[index].price = e.target.value;
                        setProfile({ ...profile, products: newProducts });
                      }}
                      className="bg-input-bg"
                    />
                    <Textarea
                      placeholder="Product Description"
                      value={product.description}
                      onChange={(e) => {
                        const newProducts = [...profile.products];
                        newProducts[index].description = e.target.value;
                        setProfile({ ...profile, products: newProducts });
                      }}
                      className="bg-input-bg min-h-[80px] resize-none"
                    />
                    <Input
                      placeholder="File/Download URL"
                      value={product.fileUrl}
                      onChange={(e) => {
                        const newProducts = [...profile.products];
                        newProducts[index].fileUrl = e.target.value;
                        setProfile({ ...profile, products: newProducts });
                      }}
                      className="bg-input-bg"
                    />
                  </div>
                ))}
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => {
                    const newProduct = {
                      id: Date.now().toString(),
                      title: "",
                      price: "",
                      description: "",
                      fileUrl: "",
                    };
                    setProfile({ ...profile, products: [...profile.products, newProduct] });
                  }}
                >
                  Add Product
                </Button>
              </div>
            </div>

                {/* Action Buttons */}
                <div className="flex gap-4 pt-4 pb-8">
                  <Button variant="outline" className="flex-1">Cancel</Button>
                  <Button onClick={handleSave} className="flex-1" disabled={saving}>
                    {saving ? "Saving..." : "Save changes"}
                  </Button>
                </div>
              </TabsContent>

              {/* Design Tab */}
              <TabsContent value="design" className="space-y-6">
                <DesignCustomizer 
                  theme={profile.theme}
                  onThemeChange={(newTheme) => setProfile({ ...profile, theme: newTheme })}
                />
                
                {/* Save Button */}
                <div className="flex gap-4 pt-4 pb-8 border-t">
                  <Button variant="outline" className="flex-1">Cancel</Button>
                  <Button onClick={handleSave} className="flex-1" disabled={saving}>
                    {saving ? "Saving..." : "Save changes"}
                  </Button>
                </div>
              </TabsContent>

              {/* Analytics Tab */}
              <TabsContent value="analytics" className="pb-8">
                {!features.hasAnalytics ? (
                  <div className="text-center py-12">
                    <BarChart3 className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                    <h3 className="text-lg font-semibold mb-2">Analytics Available in Pro Plan</h3>
                    <p className="text-muted-foreground mb-4">Track visitor data, clicks, and more</p>
                    <Button onClick={() => navigate("/pi-subscription")}>Upgrade to Pro</Button>
                  </div>
                ) : profileId ? (
                  <Analytics profileId={profileId} />
                ) : (
                  <div className="text-center py-12 text-muted-foreground">
                    <BarChart3 className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>Save your profile first to see analytics</p>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </div>
        </div>

        {/* Preview Panel */}
        <div className={`lg:w-[400px] xl:w-[500px] bg-card border-l border-border p-6 lg:p-8 flex flex-col items-center ${
          showPreview ? 'flex' : 'hidden lg:flex'
        }`}>
          <div className="mb-4 flex items-center justify-between w-full">
            <h3 className="text-sm font-medium text-muted-foreground">Preview</h3>
            <Button variant="ghost" size="sm" onClick={handleCopyLink}>
              Copy link
            </Button>
          </div>
          <PhonePreview profile={profile} />
        </div>
      </div>
      
      {/* QR Code Dialog */}
      <QRCodeDialog
        open={showQRCode}
        onOpenChange={setShowQRCode}
        url={`${window.location.origin}/${profile.storeUrl}`}
        username={profile.storeUrl}
      />
    </div>
  );
};

export default Dashboard;