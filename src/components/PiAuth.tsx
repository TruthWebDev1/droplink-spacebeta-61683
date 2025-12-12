import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { PiSDK } from "@/lib/pi-sdk";
import { Loader2, Coins } from "lucide-react";

export const PiAuth = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [initializing, setInitializing] = useState(true);

  useEffect(() => {
    // Check if user is already logged in with a subscription plan
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('subscription_plan')
          .eq('user_id', user.id)
          .maybeSingle();
        
        if (profile?.subscription_plan) {
          // User has a plan, go to dashboard
          navigate("/");
        } else {
          // User exists but no plan, go to subscription
          navigate("/subscription");
        }
      } else {
        setInitializing(false);
      }
    };
    
    checkAuth();
  }, [navigate]);

  const handlePiAuth = async () => {
    setLoading(true);

    try {
      // Initialize Pi SDK for mainnet
      await PiSDK.initialize(false);

      toast.info("Please authenticate with Pi Browser...");
      const authResult = await PiSDK.authenticate(['payments', 'username']);

      console.log('Pi authentication successful:', authResult.user.username);

      // Send access token to backend for verification
      const { data, error } = await supabase.functions.invoke('pi-auth', {
        body: { accessToken: authResult.accessToken },
      });

      if (error) {
        console.error('Backend authentication error:', error);
        toast.error("Failed to authenticate with server");
        return;
      }

      if (!data.success) {
        toast.error("Authentication failed");
        return;
      }

      console.log('Backend authentication successful:', data.user.username);

      // Sign in using the session token
      if (data.sessionToken) {
        const url = new URL(data.sessionToken);
        const token = url.searchParams.get('token');

        if (token) {
          const { error: verifyError } = await supabase.auth.verifyOtp({
            token_hash: token,
            type: 'magiclink',
          });

          if (verifyError) {
            console.error('Session verification error:', verifyError);
            toast.error("Failed to create session");
            return;
          }
        }
      }

      toast.success(`Welcome, ${data.user.username}!`);
      
      // Navigate to subscription page to choose plan
      navigate("/subscription");

    } catch (error: any) {
      console.error('Pi authentication error:', error);
      
      if (error.message?.includes('not loaded')) {
        toast.error("Please open this app in Pi Browser");
      } else if (error.message?.includes('cancelled')) {
        toast.info("Authentication cancelled");
      } else {
        toast.error("Authentication failed. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  if (initializing) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4">
            <img 
              src="/droplink-logo.png" 
              alt="Droplink" 
              className="h-16 w-auto mx-auto"
            />
          </div>
          <CardTitle className="text-2xl">Welcome to Droplink</CardTitle>
          <CardDescription>
            Sign in with your Pi Network account to get started
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button 
            onClick={handlePiAuth} 
            className="w-full" 
            size="lg"
            disabled={loading}
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Connecting to Pi Network...
              </>
            ) : (
              <>
                <Coins className="w-4 h-4 mr-2" />
                Sign in with Pi Network
              </>
            )}
          </Button>

          <div className="text-center text-sm text-muted-foreground space-y-2">
            <p>This app requires Pi Browser to sign in</p>
            <p className="text-xs">
              Download Pi Browser from the Pi Network app
            </p>
          </div>

          <div className="pt-4 border-t border-border">
            <div className="text-center text-xs text-muted-foreground space-y-1">
              <p>By signing in, you agree to our Terms of Service</p>
              <p>Payments processed securely via Pi Network</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
