import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAdminCheck } from "@/hooks/useAdminCheck";
import { 
  Users, 
  Globe, 
  DollarSign, 
  Gift, 
  Coins, 
  TrendingUp,
  Activity,
  UserCheck
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface AnalyticsSummary {
  totalUsers: number;
  premiumUsers: number;
  totalCountries: string[];
  totalRevenue: number;
  totalGiftsSent: number;
  totalTokensInCirculation: number;
  totalAnalyticsEvents: number;
  topCountries: { country: string; count: number }[];
  recentActivity: any[];
}

const Admin = () => {
  const { isAdmin, loading } = useAdminCheck();
  const navigate = useNavigate();
  const [analytics, setAnalytics] = useState<AnalyticsSummary>({
    totalUsers: 0,
    premiumUsers: 0,
    totalCountries: [],
    totalRevenue: 0,
    totalGiftsSent: 0,
    totalTokensInCirculation: 0,
    totalAnalyticsEvents: 0,
    topCountries: [],
    recentActivity: [],
  });
  const [analyticsLoading, setAnalyticsLoading] = useState(true);

  useEffect(() => {
    if (isAdmin) {
      loadAnalytics();
    }
  }, [isAdmin]);

  const loadAnalytics = async () => {
    try {
      // Get total users
      const { count: totalUsers } = await supabase
        .from("profiles")
        .select("*", { count: "exact", head: true });

      // Get premium users
      const { count: premiumUsers } = await supabase
        .from("profiles")
        .select("*", { count: "exact", head: true })
        .eq("has_premium", true);

      // Get analytics events
      const { data: analyticsData, count: totalAnalyticsEvents } = await supabase
        .from("analytics")
        .select("*", { count: "exact" });

      // Get unique countries
      const { data: countryData } = await supabase
        .from("analytics")
        .select("location_country");

      const uniqueCountries = [...new Set(countryData?.map(d => d.location_country).filter(Boolean))];
      
      // Get top countries
      const countryCounts: { [key: string]: number } = {};
      countryData?.forEach(d => {
        if (d.location_country) {
          countryCounts[d.location_country] = (countryCounts[d.location_country] || 0) + 1;
        }
      });
      const topCountries = Object.entries(countryCounts)
        .map(([country, count]) => ({ country, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);

      // Get gift transactions
      const { data: giftData, count: totalGiftsSent } = await supabase
        .from("gift_transactions")
        .select("drop_tokens_spent", { count: "exact" });

      const totalRevenue = giftData?.reduce((sum, gift) => sum + gift.drop_tokens_spent, 0) || 0;

      // Get total tokens in circulation
      const { data: walletData } = await supabase
        .from("user_wallets")
        .select("drop_tokens");

      const totalTokensInCirculation = walletData?.reduce((sum, wallet) => sum + Number(wallet.drop_tokens), 0) || 0;

      // Get recent activity
      const { data: recentActivity } = await supabase
        .from("analytics")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(10);

      setAnalytics({
        totalUsers: totalUsers || 0,
        premiumUsers: premiumUsers || 0,
        totalCountries: uniqueCountries as string[],
        totalRevenue,
        totalGiftsSent: totalGiftsSent || 0,
        totalTokensInCirculation,
        totalAnalyticsEvents: totalAnalyticsEvents || 0,
        topCountries,
        recentActivity: recentActivity || [],
      });
    } catch (error) {
      console.error("Error loading analytics:", error);
    } finally {
      setAnalyticsLoading(false);
    }
  };

  if (loading || analyticsLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <p className="text-muted-foreground">Loading admin panel...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">Admin Dashboard</h1>
        <Button variant="outline" onClick={() => navigate("/dashboard")}>
          Back to Dashboard
        </Button>
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="users">Users</TabsTrigger>
          <TabsTrigger value="revenue">Revenue</TabsTrigger>
          <TabsTrigger value="engagement">Engagement</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Users</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{analytics.totalUsers}</div>
                <p className="text-xs text-muted-foreground">
                  {analytics.premiumUsers} premium users
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Countries</CardTitle>
                <Globe className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{analytics.totalCountries.length}</div>
                <p className="text-xs text-muted-foreground">
                  Active in {analytics.totalCountries.length} countries
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Revenue (Tokens)</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{analytics.totalRevenue}</div>
                <p className="text-xs text-muted-foreground">
                  From {analytics.totalGiftsSent} gifts
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Tokens in Circulation</CardTitle>
                <Coins className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{analytics.totalTokensInCirculation}</div>
                <p className="text-xs text-muted-foreground">
                  Total DropTokens
                </p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="w-5 h-5" />
                Top Countries by Activity
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {analytics.topCountries.map((country, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <span className="font-medium">{country.country || "Unknown"}</span>
                    <span className="text-muted-foreground">{country.count} events</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="users" className="space-y-6">
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  Total Users
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{analytics.totalUsers}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <UserCheck className="w-5 h-5" />
                  Premium Users
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{analytics.premiumUsers}</div>
                <p className="text-sm text-muted-foreground mt-2">
                  {analytics.totalUsers > 0 
                    ? ((analytics.premiumUsers / analytics.totalUsers) * 100).toFixed(1)
                    : 0}% conversion rate
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Globe className="w-5 h-5" />
                  Global Reach
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{analytics.totalCountries.length}</div>
                <p className="text-sm text-muted-foreground mt-2">countries</p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="revenue" className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Gift className="w-5 h-5" />
                  Gift Transactions
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{analytics.totalGiftsSent}</div>
                <p className="text-sm text-muted-foreground mt-2">Total gifts sent</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="w-5 h-5" />
                  Total Revenue
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{analytics.totalRevenue}</div>
                <p className="text-sm text-muted-foreground mt-2">DropTokens spent</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Coins className="w-5 h-5" />
                  Tokens in Circulation
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{analytics.totalTokensInCirculation}</div>
                <p className="text-sm text-muted-foreground mt-2">Total DropTokens</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5" />
                  Avg. Gift Value
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">
                  {analytics.totalGiftsSent > 0 
                    ? (analytics.totalRevenue / analytics.totalGiftsSent).toFixed(1)
                    : 0}
                </div>
                <p className="text-sm text-muted-foreground mt-2">DropTokens per gift</p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="engagement" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="w-5 h-5" />
                Total Analytics Events
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{analytics.totalAnalyticsEvents}</div>
              <p className="text-sm text-muted-foreground mt-2">Tracked events</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {analytics.recentActivity.map((activity) => (
                  <div key={activity.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                    <div>
                      <p className="font-medium">{activity.event_type}</p>
                      <p className="text-xs text-muted-foreground">
                        {activity.location_city || "Unknown"}, {activity.location_country || "Unknown"}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-muted-foreground">
                        {new Date(activity.created_at).toLocaleString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Admin;
