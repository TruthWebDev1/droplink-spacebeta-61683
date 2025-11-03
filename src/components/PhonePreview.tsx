import { 
  Twitter, 
  Instagram, 
  Youtube, 
  Music, 
  Facebook, 
  Linkedin, 
  Twitch, 
  Globe,
  User,
  ShoppingBag,
  Mail,
  Phone,
  Calendar,
  Download,
  ExternalLink,
  Heart,
  Star,
  Zap,
  Link as LinkIcon
} from "lucide-react";

interface ProfileData {
  logo: string;
  businessName: string;
  storeUrl: string;
  description: string;
  youtubeVideoUrl?: string;
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
  hasPremium?: boolean;
}

interface PhonePreviewProps {
  profile: ProfileData;
}

export const PhonePreview = ({ profile }: PhonePreviewProps) => {
  const iconRadius = profile.theme?.iconStyle === 'circle' ? 'rounded-full' : 
                     profile.theme?.iconStyle === 'square' ? 'rounded-lg' : 'rounded-2xl';
  
  const buttonStyle = profile.theme?.buttonStyle || 'filled';

  const socialLinkData = [
    { key: 'twitter', icon: Twitter, url: profile.socialLinks.twitter },
    { key: 'instagram', icon: Instagram, url: profile.socialLinks.instagram },
    { key: 'youtube', icon: Youtube, url: profile.socialLinks.youtube },
    { key: 'tiktok', icon: Music, url: profile.socialLinks.tiktok },
    { key: 'facebook', icon: Facebook, url: profile.socialLinks.facebook },
    { key: 'linkedin', icon: Linkedin, url: profile.socialLinks.linkedin },
    { key: 'twitch', icon: Twitch, url: profile.socialLinks.twitch },
    { key: 'website', icon: Globe, url: profile.socialLinks.website },
  ].filter(link => link.url);

  const getButtonStyles = () => {
    const baseStyles = "w-full py-3 px-4 rounded-xl font-medium text-sm transition-all";
    const primaryColor = profile.theme?.primaryColor || '#3b82f6';
    
    if (buttonStyle === 'outlined') {
      return {
        className: `${baseStyles} bg-transparent text-white`,
        style: { border: `2px solid ${primaryColor}` }
      };
    } else if (buttonStyle === 'minimal') {
      return {
        className: `${baseStyles} bg-white/10 text-white backdrop-blur-sm`,
        style: {}
      };
    } else {
      return {
        className: `${baseStyles} text-white`,
        style: { backgroundColor: primaryColor }
      };
    }
  };

  const getCustomLinkIcon = (iconValue?: string) => {
    const iconProps = { className: "w-4 h-4" };
    switch (iconValue) {
      case "shop": return <ShoppingBag {...iconProps} />;
      case "mail": return <Mail {...iconProps} />;
      case "phone": return <Phone {...iconProps} />;
      case "calendar": return <Calendar {...iconProps} />;
      case "download": return <Download {...iconProps} />;
      case "external": return <ExternalLink {...iconProps} />;
      case "heart": return <Heart {...iconProps} />;
      case "star": return <Star {...iconProps} />;
      case "zap": return <Zap {...iconProps} />;
      default: return <LinkIcon {...iconProps} />;
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

  return (
    <div className="relative w-[280px] h-[570px] rounded-[3rem] border-[10px] border-foreground/20 shadow-2xl overflow-hidden"
         style={{ backgroundColor: profile.theme?.backgroundColor || '#000000' }}>
      {/* Phone Notch */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-6 bg-foreground/20 rounded-b-3xl z-10" />
      
      {/* Phone Screen Content */}
      <div className="h-full overflow-y-auto pt-8 px-6 pb-6">
        <div className="flex flex-col items-center text-center space-y-6">
          {/* Logo */}
          <div className="w-20 h-20 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center overflow-hidden">
            {profile.logo ? (
              <img src={profile.logo} alt="Logo" className="w-full h-full object-cover" />
            ) : (
              <User className="w-8 h-8 text-white/70" />
            )}
          </div>

          {/* Business Name */}
          <h1 className="text-lg font-bold px-4 text-white">
            {profile.businessName || "YOUR BUSINESS NAME"}
          </h1>

          {/* Description */}
          {profile.description && (
            <p className="text-sm text-white/80 px-4 leading-relaxed">
              {profile.description}
            </p>
          )}

          {/* YouTube Video */}
          {profile.youtubeVideoUrl && extractYouTubeVideoId(profile.youtubeVideoUrl) && (
            <div className="w-full">
              <div className="relative pb-[56.25%] h-0 overflow-hidden rounded-lg bg-white/10">
                <div className="absolute inset-0 flex items-center justify-center">
                  <Youtube className="w-8 h-8 text-white/50" />
                </div>
              </div>
            </div>
          )}

          {/* Social Links */}
          {socialLinkData.length > 0 && (
            <div className="flex flex-wrap justify-center gap-3 pt-2">
              {socialLinkData.map(({ key, icon: Icon }) => (
                <div
                  key={key}
                  className={`w-10 h-10 ${iconRadius} flex items-center justify-center transition-smooth cursor-pointer`}
                  style={{ 
                    backgroundColor: profile.theme?.primaryColor || '#3b82f6',
                    border: '1px solid rgba(255,255,255,0.1)'
                  }}
                >
                  <Icon className="w-5 h-5 text-white" />
                </div>
              ))}
            </div>
          )}

          {/* Custom Links */}
          {profile.customLinks && profile.customLinks.length > 0 && (
            <div className="w-full space-y-2 pt-2">
              {profile.customLinks.map((link) => (
                <button
                  key={link.id}
                  {...getButtonStyles()}
                  className={`${getButtonStyles().className} flex items-center justify-center gap-2`}
                >
                  {getCustomLinkIcon(link.icon)}
                  <span>{link.title || "Untitled Link"}</span>
                </button>
              ))}
            </div>
          )}

          {/* Products Preview */}
          {profile.products && profile.products.length > 0 && (
            <div className="w-full space-y-3 pt-4">
              <div className="flex items-center gap-2 text-white text-sm font-medium">
                <ShoppingBag className="w-4 h-4" />
                <span>Products ({profile.products.length})</span>
              </div>
              {profile.products.slice(0, 2).map((product) => (
                <div 
                  key={product.id}
                  className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl p-3 text-left"
                >
                  <div className="flex justify-between items-start mb-1">
                    <h4 className="text-xs font-semibold text-white truncate">{product.title || "Untitled"}</h4>
                    <span className="text-xs font-bold text-white/90">{product.price || "$0"}</span>
                  </div>
                  <p className="text-[10px] text-white/70 line-clamp-2">{product.description || "No description"}</p>
                </div>
              ))}
              {profile.products.length > 2 && (
                <p className="text-[10px] text-white/60">+{profile.products.length - 2} more</p>
              )}
            </div>
          )}

          {/* Droplink Branding */}
          {!profile.hasPremium && profile.storeUrl && (
            <div className="w-full pt-6 pb-2 text-center">
              <p className="text-xs text-white/50">
                Join {profile.storeUrl} on <span className="text-sky-400">Droplink</span>
              </p>
            </div>
          )}

          {/* Placeholder when empty */}
          {!profile.businessName && !profile.description && socialLinkData.length === 0 && profile.products?.length === 0 && (
            <div className="text-center py-8">
              <p className="text-sm text-white/70">
                Start customizing your profile to see changes here
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
