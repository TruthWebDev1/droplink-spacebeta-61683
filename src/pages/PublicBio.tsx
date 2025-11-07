import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { QRCodeSVG } from "qrcode.react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { FollowersSection } from "@/components/FollowersSection";
import { GiftDialog } from "@/components/GiftDialog";
import { AIChatWidget } from "@/components/AIChatWidget";
import { PiAdNetwork } from "@/components/PiAdNetwork";
import { useSubscription } from "@/hooks/useSubscription";
import {
  Twitter,
  Instagram,
  Youtube,
  Music,
  Facebook,
  Linkedin,
  Twitch,
  Globe,
  ShoppingBag,
  Mail,
  Phone,
  Calendar,
  Download,
  ExternalLink,
  Heart,
  Star,
  Zap,
  Link as LinkIcon,
  Wallet,
  Copy,
  Check,
  Share2,
  UserPlus,
  UserMinus,
  Gift,
} from "lucide-react";

interface ProfileData {
  logo: string;
  businessName: string;
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
  username: string;
  hasPremium: boolean;
  showShareButton: boolean;
}

const PublicBio = () => {
  const { username } = useParams();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [profileId, setProfileId] = useState<string | null>(null);
  const [currentUserProfileId, setCurrentUserProfileId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [showWalletDialog, setShowWalletDialog] = useState(false);
  const [selectedWallet, setSelectedWallet] = useState<{ type: 'crypto' | 'bank', name: string, value: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const [showShareDialog, setShowShareDialog] = useState(false);
  const [isFollowing, setIsFollowing] = useState(false);
  const [showGiftDialog, setShowGiftDialog] = useState(false);
  const { features } = useSubscription();

  useEffect(() => {
    loadProfile();
    loadCurrentUserProfile();
  }, [username]);

  useEffect(() => {
    if (profileId && currentUserProfileId) {
      checkFollowStatus();
    }
  }, [profileId, currentUserProfileId]);

  const loadCurrentUserProfile = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();
      
      if (profile) {
        setCurrentUserProfileId(profile.id);
      }
    }
  };

  const checkFollowStatus = async () => {
    if (!currentUserProfileId || !profileId) return;
    
    const { data } = await supabase
      .from("followers")
      .select("id")
      .eq("follower_profile_id", currentUserProfileId)
      .eq("following_profile_id", profileId)
      .maybeSingle();
    
    setIsFollowing(!!data);
  };

  const handleFollow = async () => {
    if (!currentUserProfileId || !profileId) {
      toast.error("Please sign in to follow");
      return;
    }

    if (currentUserProfileId === profileId) {
      toast.error("You cannot follow yourself");
      return;
    }

    try {
      if (isFollowing) {
        await supabase
          .from("followers")
          .delete()
          .eq("follower_profile_id", currentUserProfileId)
          .eq("following_profile_id", profileId);
        
        setIsFollowing(false);
        toast.success("Unfollowed");
      } else {
        await supabase
          .from("followers")
          .insert({
            follower_profile_id: currentUserProfileId,
            following_profile_id: profileId,
          });
        
        setIsFollowing(true);
        toast.success("Following!");
      }
    } catch (error) {
      console.error("Follow error:", error);
      toast.error("Failed to update follow status");
    }
  };

  const loadProfile = async () => {
    if (!username) {
      setNotFound(true);
      setLoading(false);
      return;
    }

    try {
      // Fetch profile from database
      const { data: profileData, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("username", username)
        .single();

      if (error || !profileData) {
        setNotFound(true);
        setLoading(false);
        return;
      }

      setProfileId(profileData.id);

      // Track page view
      trackAnalytics(profileData.id, "view", {});

      // Fetch products for this profile
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
        username: profileData.username || "",
        hasPremium: profileData.has_premium || false,
        showShareButton: (profileData as any).show_share_button !== false,
      });
    } catch (error) {
      console.error("Error loading profile:", error);
      setNotFound(true);
    } finally {
      setLoading(false);
    }
  };

  const trackAnalytics = async (profileId: string, eventType: string, eventData: any) => {
    try {
      await supabase.from("analytics").insert({
        profile_id: profileId,
        event_type: eventType,
        event_data: eventData,
        user_agent: navigator.userAgent,
      });
    } catch (error) {
      // Silent fail - don't break the user experience
    }
  };

  const handleSocialClick = (platform: string, profileId: string) => {
    trackAnalytics(profileId, "social_click", { platform });
  };

  const handleProductClick = (productId: string, productTitle: string, profileId: string) => {
    trackAnalytics(profileId, "product_click", { product_id: productId, product_title: productTitle });
  };

  const handleWalletClick = (type: 'crypto' | 'bank', name: string, value: string) => {
    setSelectedWallet({ type, name, value });
    setShowWalletDialog(true);
    setCopied(false);
  };

  const handleCopyWallet = () => {
    if (selectedWallet) {
      navigator.clipboard.writeText(selectedWallet.value);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const getSocialIcon = (platform: string) => {
    switch (platform) {
      case "twitter":
        return <Twitter className="w-5 h-5" />;
      case "instagram":
        return <Instagram className="w-5 h-5" />;
      case "youtube":
        return <Youtube className="w-5 h-5" />;
      case "tiktok":
        return <Music className="w-5 h-5" />;
      case "facebook":
        return <Facebook className="w-5 h-5" />;
      case "linkedin":
        return <Linkedin className="w-5 h-5" />;
      case "twitch":
        return <Twitch className="w-5 h-5" />;
      case "website":
        return <Globe className="w-5 h-5" />;
      default:
        return null;
    }
  };

  const getIconStyle = (style: string) => {
    switch (style) {
      case "rounded":
        return "rounded-2xl";
      case "square":
        return "rounded-none";
      case "circle":
        return "rounded-full";
      default:
        return "rounded-2xl";
    }
  };

  const getButtonStyles = (primaryColor: string, buttonStyle: string) => {
    if (buttonStyle === 'outlined') {
      return {
        backgroundColor: 'transparent',
        border: `2px solid ${primaryColor}`,
      };
    } else if (buttonStyle === 'minimal') {
      return {
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
      };
    } else {
      return {
        backgroundColor: primaryColor,
      };
    }
  };

  const getCustomLinkIcon = (iconValue?: string) => {
    switch (iconValue) {
      case "shop": return <ShoppingBag className="w-5 h-5" />;
      case "mail": return <Mail className="w-5 h-5" />;
      case "phone": return <Phone className="w-5 h-5" />;
      case "calendar": return <Calendar className="w-5 h-5" />;
      case "download": return <Download className="w-5 h-5" />;
      case "external": return <ExternalLink className="w-5 h-5" />;
      case "heart": return <Heart className="w-5 h-5" />;
      case "star": return <Star className="w-5 h-5" />;
      case "zap": return <Zap className="w-5 h-5" />;
      default: return <LinkIcon className="w-5 h-5" />;
    }
  };

  const extractYouTubeVideoId = (url: string): string | null => {
    if (!url) return null;
    const patterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\s]+)/,
      /youtube\.com\/embed\/([^&\s]+)/,
    ];
    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match) return match[1];
    }
    return null;
  };

  if (loading) {
    return (
      <div 
        className="min-h-screen flex items-center justify-center"
        style={{ backgroundColor: "#000000" }}
      >
        <p className="text-white">Loading...</p>
      </div>
    );
  }

  if (notFound || !profile) {
    return (
      <div 
        className="min-h-screen flex items-center justify-center"
        style={{ backgroundColor: "#000000" }}
      >
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white mb-2">Profile Not Found</h1>
          <p className="text-gray-400">This store doesn't exist or has been removed.</p>
        </div>
      </div>
    );
  }

  const socialLinksArray = Object.entries(profile.socialLinks)
    .filter(([_, url]) => url)
    .map(([platform, url]) => ({ platform, url }));

  return (
    <div 
      className="min-h-screen p-6 flex flex-col items-center"
      style={{ backgroundColor: profile.theme.backgroundColor }}
    >
      <div className="w-full max-w-2xl space-y-8 py-12">
        {/* Logo and Business Info */}
        <div className="text-center space-y-4">
          {profile.logo && (
            <div className="flex justify-center mb-6">
              <div 
                className={`w-24 h-24 ${getIconStyle(profile.theme.iconStyle)} overflow-hidden`}
                style={{ backgroundColor: profile.theme.primaryColor }}
              >
                <img 
                  src={profile.logo} 
                  alt={profile.businessName}
                  className="w-full h-full object-cover"
                />
              </div>
            </div>
          )}
          
          <h1 className="text-3xl font-bold text-white">
            {profile.businessName}
          </h1>
          
          {profile.description && (
            <p className="text-gray-300 max-w-md mx-auto">
              {profile.description}
            </p>
          )}

          {/* Follow and Gift Buttons */}
          {currentUserProfileId && currentUserProfileId !== profileId && (
            <div className="flex gap-3 justify-center pt-4">
              <Button
                onClick={handleFollow}
                className={`${getIconStyle(profile.theme.iconStyle)} gap-2`}
                style={isFollowing ? { backgroundColor: 'rgba(255, 255, 255, 0.1)' } : { backgroundColor: profile.theme.primaryColor }}
                variant={isFollowing ? "outline" : "default"}
              >
                {isFollowing ? (
                  <>
                    <UserMinus className="w-4 h-4" />
                    Unfollow
                  </>
                ) : (
                  <>
                    <UserPlus className="w-4 h-4" />
                    Follow
                  </>
                )}
              </Button>
              <Button
                onClick={() => setShowGiftDialog(true)}
                className={`${getIconStyle(profile.theme.iconStyle)} gap-2`}
                style={{ backgroundColor: profile.theme.primaryColor }}
              >
                <Gift className="w-4 h-4" />
                Send Gift
              </Button>
            </div>
          )}
        </div>

        {/* YouTube Video */}
        {profile.youtubeVideoUrl && extractYouTubeVideoId(profile.youtubeVideoUrl) && (
          <div className="w-full max-w-2xl">
            <div className="relative pb-[56.25%] h-0 overflow-hidden rounded-xl">
              <iframe
                src={`https://www.youtube.com/embed/${extractYouTubeVideoId(profile.youtubeVideoUrl)}`}
                className="absolute top-0 left-0 w-full h-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                title="YouTube video"
              />
            </div>
          </div>
        )}

        {/* Social Links */}
        {socialLinksArray.length > 0 && (
          <div className="flex flex-wrap justify-center gap-3">
            {socialLinksArray.map(({ platform, url }) => (
              <a
                key={platform}
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => profileId && handleSocialClick(platform, profileId)}
                className={`w-12 h-12 ${getIconStyle(profile.theme.iconStyle)} flex items-center justify-center transition-opacity hover:opacity-80`}
                style={{ backgroundColor: profile.theme.primaryColor }}
              >
                <span className="text-white">
                  {getSocialIcon(platform)}
                </span>
              </a>
            ))}
          </div>
        )}

        {/* Custom Links */}
        {profile.customLinks.length > 0 && (
          <div className="space-y-3">
            {profile.customLinks.map((link) => {
              const buttonStyles = getButtonStyles(profile.theme.primaryColor, profile.theme.buttonStyle);
              return (
                <a
                  key={link.id}
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`flex items-center justify-center gap-3 w-full py-4 px-6 ${getIconStyle(profile.theme.iconStyle)} font-medium text-white transition-all hover:opacity-90`}
                  style={buttonStyles}
                >
                  {getCustomLinkIcon(link.icon)}
                  <span>{link.title}</span>
                </a>
              );
            })}
          </div>
        )}

        {/* Products */}
        {profile.products.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-white text-center mb-6">
              Digital Products
            </h2>
            {profile.products.map((product) => (
              <div
                key={product.id}
                className="p-6 rounded-lg border"
                style={{ 
                  backgroundColor: "rgba(255, 255, 255, 0.05)",
                  borderColor: "rgba(255, 255, 255, 0.1)"
                }}
              >
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-white mb-2">
                      {product.title}
                    </h3>
                    {product.description && (
                      <p className="text-gray-400 text-sm mb-3">
                        {product.description}
                      </p>
                    )}
                    <p 
                      className="text-xl font-bold"
                      style={{ color: profile.theme.primaryColor }}
                    >
                      {product.price}
                    </p>
                  </div>
                  {product.fileUrl && (
                    <a
                      href={product.fileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() => profileId && handleProductClick(product.id, product.title, profileId)}
                      className={`px-6 py-3 ${getIconStyle(profile.theme.iconStyle)} font-medium text-white transition-opacity hover:opacity-90`}
                      style={{ backgroundColor: profile.theme.primaryColor }}
                    >
                      Purchase
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Pi Wallet Donation */}
        {profile.wallets.piWallet && (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-white text-center mb-6 flex items-center justify-center gap-2">
              <Wallet className="w-5 h-5" />
              {profile.wallets.piWallet.customMessage}
            </h2>
            
            <button
              onClick={() => handleWalletClick('crypto', 'Pi Wallet', profile.wallets.piWallet!.address)}
              className={`w-full p-6 ${getIconStyle(profile.theme.iconStyle)} border glass transition-all hover:opacity-90`}
              style={{ 
                borderColor: profile.theme.primaryColor
              }}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                    <span className="text-2xl">π</span>
                  </div>
                  <div className="text-left">
                    <span className="text-white font-medium block">Pi Network Wallet</span>
                    <span className="text-gray-400 text-xs">Tap to view QR code</span>
                  </div>
                </div>
                <Copy className="w-5 h-5 text-gray-400" />
              </div>
            </button>
          </div>
        )}

        {/* Share Button */}
        {profile.showShareButton && (
          <div className="flex justify-center py-6">
            <Button
              onClick={() => setShowShareDialog(true)}
              className="gap-2"
              style={{ backgroundColor: profile.theme.primaryColor }}
            >
              <Share2 className="w-4 h-4" />
              Share Profile
            </Button>
          </div>
        )}

        {/* Pi Ad Network - Display ad for visitors */}
        <div className="py-6">
          <PiAdNetwork className="max-w-xl mx-auto" />
        </div>

        {/* Followers Section */}
        {profileId && (
          <FollowersSection 
            profileId={profileId} 
            currentUserProfileId={currentUserProfileId || undefined}
          />
        )}

        {/* Droplink Branding Footer */}
        {!profile.hasPremium && (
          <div className="text-center py-8 border-t border-white/10">
            <p className="text-white/60 text-sm font-medium">
              JOIN <span className="text-sky-400">DROPLINK</span> BY MRWAIN ORGANIZATION
            </p>
          </div>
        )}
      </div>

      {/* Wallet Details Dialog */}
      <Dialog open={showWalletDialog} onOpenChange={setShowWalletDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Wallet className="w-5 h-5" />
              {selectedWallet?.name}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {selectedWallet?.type === 'crypto' && (
              <div className="flex justify-center p-4 bg-white rounded-lg">
                <QRCodeSVG value={selectedWallet.value} size={200} />
              </div>
            )}
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">
                {selectedWallet?.type === 'crypto' ? 'Wallet Address' : 'Account Details'}
              </p>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={selectedWallet?.value || ''}
                  readOnly
                  className="flex-1 px-3 py-2 bg-muted rounded-md text-sm"
                />
                <Button size="sm" onClick={handleCopyWallet}>
                  {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Share Profile Dialog */}
      <Dialog open={showShareDialog} onOpenChange={setShowShareDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Share2 className="w-5 h-5" />
              Share Profile
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex justify-center p-4 bg-white rounded-lg">
              <QRCodeSVG 
                value={`${window.location.origin}/${profile.username}`} 
                size={200} 
              />
            </div>
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Profile URL</p>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={`${window.location.origin}/${profile.username}`}
                  readOnly
                  className="flex-1 px-3 py-2 bg-muted rounded-md text-sm"
                />
                <Button 
                  size="sm" 
                  onClick={() => {
                    navigator.clipboard.writeText(`${window.location.origin}/${profile.username}`);
                    toast.success("Link copied!");
                  }}
                >
                  <Copy className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Gift Dialog */}
      {profileId && currentUserProfileId && (
        <GiftDialog
          open={showGiftDialog}
          onOpenChange={setShowGiftDialog}
          receiverProfileId={profileId}
          senderProfileId={currentUserProfileId}
          receiverName={profile.businessName}
        />
      )}

      {/* AI Chat Widget */}
      {profileId && <AIChatWidget profileId={profileId} />}

      {/* Pi Ad Network for free users */}
      {profile && features.hasPiAdNetwork && (
        <div className="mt-8">
          <PiAdNetwork className="max-w-2xl" />
        </div>
      )}

      {/* Watermark for free users */}
      {profile && features.hasWatermark && (
        <div className="mt-8 text-center">
          <p className="text-xs text-muted-foreground">
            Powered by <a href="/" className="underline hover:text-foreground">Droplink</a>
          </p>
        </div>
      )}
    </div>
  );
};

export default PublicBio;
