import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Eye, MousePointerClick, ShoppingBag, Users, Gift } from "lucide-react";

interface AnalyticsData {
  totalViews: number;
  socialClicks: number;
  productClicks: number;
  followerCount: number;
  giftsReceived: number;
  giftsSent: number;
  totalGiftValue: number;
  recentViews: Array<{ date: string; count: number }>;
  topSocial: Array<{ platform: string; count: number }>;
  topProducts: Array<{ title: string; count: number }>;
  topLocations: Array<{ country: string; city: string; count: number }>;
  linkClicks: Array<{ url: string; clicks: number }>;
  topGifters: Array<{ businessName: string; giftCount: number; totalValue: number }>;
}

export const Analytics = ({ profileId }: { profileId: string }) => {
  const [analytics, setAnalytics] = useState<AnalyticsData>({
    totalViews: 0,
    socialClicks: 0,
    productClicks: 0,
    followerCount: 0,
    giftsReceived: 0,
    giftsSent: 0,
    totalGiftValue: 0,
    recentViews: [],
    topSocial: [],
    topProducts: [],
    topLocations: [],
    linkClicks: [],
    topGifters: [],
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAnalytics();
  }, [profileId]);

  const loadAnalytics = async () => {
    try {
      if (!profileId) return;

      // Get all analytics for this profile
      const { data, error } = await supabase
        .from("analytics")
        .select("*")
        .eq("profile_id", profileId);

      if (error) {
        console.error("Error loading analytics:", error);
        return;
      }

      if (!data) return;

      // Calculate metrics
      const totalViews = data.filter((a) => a.event_type === "view").length;
      const socialClicks = data.filter((a) => a.event_type === "social_click").length;
      const productClicks = data.filter((a) => a.event_type === "product_click").length;

      // Get recent views (last 7 days)
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      
      const recentViewsData = data
        .filter((a) => a.event_type === "view" && new Date(a.created_at) >= sevenDaysAgo)
        .reduce((acc: Record<string, number>, curr) => {
          const date = new Date(curr.created_at).toLocaleDateString();
          acc[date] = (acc[date] || 0) + 1;
          return acc;
        }, {});

      const recentViews = Object.entries(recentViewsData).map(([date, count]) => ({
        date,
        count: count as number,
      }));

      // Get top social platforms
      const socialData = data
        .filter((a) => a.event_type === "social_click")
        .reduce((acc: Record<string, number>, curr) => {
          const platform = (curr.event_data as any)?.platform || "unknown";
          acc[platform] = (acc[platform] || 0) + 1;
          return acc;
        }, {});

      const topSocial = Object.entries(socialData)
        .map(([platform, count]) => ({ platform, count: count as number }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

      // Get top products
      const productData = data
        .filter((a) => a.event_type === "product_click")
        .reduce((acc: Record<string, number>, curr) => {
          const title = (curr.event_data as any)?.product_title || "Unknown";
          acc[title] = (acc[title] || 0) + 1;
          return acc;
        }, {});

      const topProducts = Object.entries(productData)
        .map(([title, count]) => ({ title, count: count as number }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

      // Get top locations
      const locationData = data
        .filter((a) => a.location_country)
        .reduce((acc: Record<string, { country: string; city: string; count: number }>, curr) => {
          const key = `${curr.location_country}-${curr.location_city || 'Unknown'}`;
          if (acc[key]) {
            acc[key].count += 1;
          } else {
            acc[key] = {
              country: curr.location_country || "Unknown",
              city: curr.location_city || "Unknown",
              count: 1,
            };
          }
          return acc;
        }, {});

      const topLocations = Object.values(locationData)
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

      // Get custom link clicks
      const linkClickData = data
        .filter((a) => a.event_type === "custom_link_click")
        .reduce((acc: Record<string, number>, curr) => {
          const url = (curr.event_data as any)?.url || "unknown";
          acc[url] = (acc[url] || 0) + 1;
          return acc;
        }, {});

      const linkClicks = Object.entries(linkClickData)
        .map(([url, clicks]) => ({ url, clicks: clicks as number }))
        .sort((a, b) => b.clicks - a.clicks)
        .slice(0, 5);

      // Get follower count
      const { count: followerCount } = await supabase
        .from("followers")
        .select("*", { count: "exact", head: true })
        .eq("following_profile_id", profileId);

      // Get gift transactions
      const { data: giftsReceivedData } = await supabase
        .from("gift_transactions")
        .select("drop_tokens_spent, sender_profile_id, profiles!gift_transactions_sender_profile_id_fkey(business_name)")
        .eq("receiver_profile_id", profileId);

      const { data: giftsSentData } = await supabase
        .from("gift_transactions")
        .select("drop_tokens_spent")
        .eq("sender_profile_id", profileId);

      const giftsReceived = giftsReceivedData?.length || 0;
      const giftsSent = giftsSentData?.length || 0;
      const totalGiftValue = giftsReceivedData?.reduce((sum, gift) => sum + gift.drop_tokens_spent, 0) || 0;

      // Calculate top gifters
      const gifterData = giftsReceivedData?.reduce((acc: Record<string, { count: number; value: number; businessName: string }>, curr) => {
        const senderId = curr.sender_profile_id;
        const businessName = (curr.profiles as any)?.business_name || "Anonymous";
        if (acc[senderId]) {
          acc[senderId].count += 1;
          acc[senderId].value += curr.drop_tokens_spent;
        } else {
          acc[senderId] = {
            count: 1,
            value: curr.drop_tokens_spent,
            businessName,
          };
        }
        return acc;
      }, {}) || {};

      const topGifters = Object.values(gifterData)
        .map(({ businessName, count, value }) => ({ businessName, giftCount: count, totalValue: value }))
        .sort((a, b) => b.totalValue - a.totalValue)
        .slice(0, 5);

      setAnalytics({
        totalViews,
        socialClicks,
        productClicks,
        followerCount: followerCount || 0,
        giftsReceived,
        giftsSent,
        totalGiftValue,
        recentViews,
        topSocial,
        topProducts,
        topLocations,
        linkClicks,
        topGifters,
      });
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <h2 className="text-lg font-semibold">Analytics</h2>
        <p className="text-muted-foreground">Loading analytics...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold">Analytics</h2>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Views</CardTitle>
            <Eye className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.totalViews}</div>
            <p className="text-xs text-muted-foreground">
              Profile page visits
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Social Clicks</CardTitle>
            <MousePointerClick className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.socialClicks}</div>
            <p className="text-xs text-muted-foreground">
              Social media link clicks
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Product Clicks</CardTitle>
            <ShoppingBag className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.productClicks}</div>
            <p className="text-xs text-muted-foreground">
              Product purchase clicks
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Followers</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.followerCount}</div>
            <p className="text-xs text-muted-foreground">
              Total followers
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Gifts Received</CardTitle>
            <Gift className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.giftsReceived}</div>
            <p className="text-xs text-muted-foreground">
              {analytics.totalGiftValue} tokens
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Top Social Platforms */}
      {analytics.topSocial.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Top Social Platforms</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {analytics.topSocial.map((item) => (
                <div key={item.platform} className="flex items-center justify-between">
                  <span className="text-sm capitalize">{item.platform}</span>
                  <span className="text-sm font-semibold">{item.count} clicks</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Top Products */}
      {analytics.topProducts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Top Products</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {analytics.topProducts.map((item, idx) => (
                <div key={idx} className="flex items-center justify-between">
                  <span className="text-sm truncate max-w-[200px]">{item.title}</span>
                  <span className="text-sm font-semibold">{item.count} clicks</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Top Locations */}
      {analytics.topLocations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Top Locations</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {analytics.topLocations.map((item, idx) => (
                <div key={idx} className="flex items-center justify-between">
                  <span className="text-sm">
                    {item.city}, {item.country}
                  </span>
                  <span className="text-sm font-semibold">{item.count} visits</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Custom Link Clicks */}
      {analytics.linkClicks.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Custom Link Clicks</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {analytics.linkClicks.map((item, idx) => (
                <div key={idx} className="flex items-center justify-between">
                  <span className="text-sm truncate max-w-[200px]">{item.url}</span>
                  <span className="text-sm font-semibold">{item.clicks} clicks</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Top Gifters */}
      {analytics.topGifters.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Top Gifters</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {analytics.topGifters.map((item, idx) => (
                <div key={idx} className="flex items-center justify-between">
                  <div className="flex flex-col">
                    <span className="text-sm font-medium">{item.businessName}</span>
                    <span className="text-xs text-muted-foreground">{item.giftCount} gifts</span>
                  </div>
                  <span className="text-sm font-semibold">{item.totalValue} tokens</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {analytics.totalViews === 0 && analytics.socialClicks === 0 && analytics.productClicks === 0 && (
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground text-center">
              No analytics data yet. Share your profile link to start tracking!
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
