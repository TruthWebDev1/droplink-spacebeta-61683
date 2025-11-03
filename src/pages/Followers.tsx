import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Users, UserCheck, UserPlus, ExternalLink, Gift } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { GiftDialog } from "@/components/GiftDialog";

interface FollowerProfile {
  id: string;
  username: string;
  business_name: string;
  logo: string | null;
  description: string | null;
}

interface FollowerData {
  id: string;
  created_at: string;
  follower_profile: FollowerProfile;
  following_profile: FollowerProfile;
}

const Followers = () => {
  const navigate = useNavigate();
  const [followers, setFollowers] = useState<FollowerData[]>([]);
  const [following, setFollowing] = useState<FollowerData[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentProfileId, setCurrentProfileId] = useState<string | null>(null);
  const [showGiftDialog, setShowGiftDialog] = useState(false);
  const [selectedRecipient, setSelectedRecipient] = useState<{ id: string; name: string } | null>(null);

  useEffect(() => {
    loadFollowData();
  }, []);

  const loadFollowData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/");
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("id")
        .eq("user_id", user.id)
        .single();

      if (!profile) {
        toast.error("Profile not found");
        navigate("/");
        return;
      }

      setCurrentProfileId(profile.id);

      // Load followers
      const { data: followersData, error: followersError } = await supabase
        .from("followers")
        .select(`
          id,
          created_at,
          follower_profile:profiles!followers_follower_profile_id_fkey (
            id,
            username,
            business_name,
            logo,
            description
          )
        `)
        .eq("following_profile_id", profile.id);

      if (followersError) throw followersError;
      setFollowers(followersData as any || []);

      // Load following
      const { data: followingData, error: followingError } = await supabase
        .from("followers")
        .select(`
          id,
          created_at,
          following_profile:profiles!followers_following_profile_id_fkey (
            id,
            username,
            business_name,
            logo,
            description
          )
        `)
        .eq("follower_profile_id", profile.id);

      if (followingError) throw followingError;
      setFollowing(followingData as any || []);
    } catch (error) {
      console.error("Error loading follow data:", error);
      toast.error("Failed to load followers data");
    } finally {
      setLoading(false);
    }
  };

  const handleUnfollow = async (followId: string) => {
    try {
      const { error } = await supabase
        .from("followers")
        .delete()
        .eq("id", followId);

      if (error) throw error;

      setFollowing((prev) => prev.filter((f) => f.id !== followId));
      toast.success("Unfollowed successfully");
    } catch (error) {
      console.error("Error unfollowing:", error);
      toast.error("Failed to unfollow");
    }
  };

  const handleSendGift = (profile: FollowerProfile) => {
    setSelectedRecipient({ id: profile.id, name: profile.business_name });
    setShowGiftDialog(true);
  };

  const renderProfileCard = (profile: FollowerProfile, showUnfollow?: string, showGiftButton: boolean = false) => (
    <Card key={profile.id} className="hover:shadow-lg transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full overflow-hidden bg-muted flex-shrink-0">
            {profile.logo ? (
              <img
                src={profile.logo}
                alt={profile.business_name}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-2xl font-bold text-muted-foreground">
                {profile.business_name.charAt(0).toUpperCase()}
              </div>
            )}
          </div>

          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-lg truncate">
              {profile.business_name}
            </h3>
            <p className="text-sm text-muted-foreground">@{profile.username}</p>
            {profile.description && (
              <p className="text-sm text-muted-foreground truncate mt-1">
                {profile.description}
              </p>
            )}
          </div>

          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.open(`/${profile.username}`, "_blank")}
            >
              <ExternalLink className="w-4 h-4" />
            </Button>
            {showGiftButton && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleSendGift(profile)}
              >
                <Gift className="w-4 h-4" />
              </Button>
            )}
            {showUnfollow && (
              <Button
                variant="destructive"
                size="sm"
                onClick={() => handleUnfollow(showUnfollow)}
              >
                Unfollow
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-6 h-6" />
            Community
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="followers" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="followers">
                <UserCheck className="w-4 h-4 mr-2" />
                Followers ({followers.length})
              </TabsTrigger>
              <TabsTrigger value="following">
                <UserPlus className="w-4 h-4 mr-2" />
                Following ({following.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="followers" className="space-y-4 mt-4">
              {followers.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No followers yet</p>
                </div>
              ) : (
                followers.map((follower) =>
                  renderProfileCard(follower.follower_profile as FollowerProfile, undefined, true)
                )
              )}
            </TabsContent>

            <TabsContent value="following" className="space-y-4 mt-4">
              {following.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <UserPlus className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>Not following anyone yet</p>
                </div>
              ) : (
                following.map((follow) =>
                  renderProfileCard(follow.following_profile as FollowerProfile, follow.id, true)
                )
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <div className="mt-6 text-center">
        <Button variant="outline" onClick={() => navigate("/dashboard")}>
          Back to Dashboard
        </Button>
      </div>

      {currentProfileId && selectedRecipient && (
        <GiftDialog
          open={showGiftDialog}
          onOpenChange={setShowGiftDialog}
          senderProfileId={currentProfileId}
          receiverProfileId={selectedRecipient.id}
          receiverName={selectedRecipient.name}
        />
      )}
    </div>
  );
};

export default Followers;
