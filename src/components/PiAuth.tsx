import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { PiSDK } from "@/lib/pi-sdk";
import { Loader2 } from "lucide-react";
import { PiAdWatcher } from "./PiAdWatcher";

export const PiAuth = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [initializing, setInitializing] = useState(true);
  const [showAdWatcher, setShowAdWatcher] = useState(false);
  const [authCompleted, setAuthCompleted] = useState(false);

  useEffect(() => {
    // Check if user is already logged in
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        navigate("/");
      } else {
        setInitializing(false);
      }
    });

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user) {
        navigate("/");
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const handlePiAuth = async () => {
    setLoading(true);

    try {
      // Initialize Pi SDK
      await PiSDK.initialize(false); // Set to true for sandbox testing

      // Authenticate with Pi Network
      toast.info("Please authenticate with Pi Browser...");
      const authResult = await PiSDK.authenticate(['payments', 'username']);

      console.log('Pi authentication successful:', authResult.user.username);

      // Send access token to our backend for verification
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
      // Parse the magic link to get the token
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

      toast.success(`Welcome, ${data.user.username}!`);
      
      // Set auth as completed, show ad watcher
      setAuthCompleted(true);
      setShowAdWatcher(true);

    } catch (error: any) {
      console.error('Pi authentication error:', error);
      
      if (error.message.includes('not loaded')) {
        toast.error("Please open this app in Pi Browser");
      } else if (error.message.includes('User cancelled')) {
        toast.info("Authentication cancelled");
      } else {
        toast.error("Authentication failed. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleAdWatched = () => {
    toast.success("Thank you for supporting Droplink!");
    navigate("/dashboard");
  };

  const handleSkipAd = () => {
    toast.info("Proceeding without ad...");
    navigate("/dashboard");
  };

  if (initializing) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  // Show ad watcher after authentication
  if (showAdWatcher && authCompleted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <PiAdWatcher 
          onAdWatched={handleAdWatched}
          onSkip={handleSkipAd}
          allowSkip={true}
        />
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
            Sign in with your Pi Network account to continue
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
              "Sign in with Pi Network"
            )}
          </Button>

          <div className="text-center text-sm text-muted-foreground space-y-2">
            <p>This app requires Pi Browser to sign in</p>
            <p className="text-xs">Download Pi Browser from the Pi Network app</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
