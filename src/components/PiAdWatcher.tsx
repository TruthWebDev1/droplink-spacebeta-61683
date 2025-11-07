import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { PiSDK } from "@/lib/pi-sdk";
import { Loader2, Play, CheckCircle2, XCircle, AlertCircle } from "lucide-react";
import { toast } from "sonner";

interface PiAdWatcherProps {
  onAdWatched: () => void;
  onSkip?: () => void;
  allowSkip?: boolean;
}

export const PiAdWatcher = ({ onAdWatched, onSkip, allowSkip = false }: PiAdWatcherProps) => {
  const [loading, setLoading] = useState(true);
  const [adSupported, setAdSupported] = useState(false);
  const [adReady, setAdReady] = useState(false);
  const [showingAd, setShowingAd] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [adWatched, setAdWatched] = useState(false);

  useEffect(() => {
    checkAdSupport();
  }, []);

  const checkAdSupport = async () => {
    setLoading(true);
    try {
      await PiSDK.initialize(false);
      const supported = await PiSDK.checkAdNetworkSupport();
      setAdSupported(supported);
      
      if (!supported) {
        setError('Ad Network is not supported in this environment');
        if (allowSkip) {
          toast.info('Ad Network not available, you can proceed');
        }
        setLoading(false);
        return;
      }

      // Check if ad is ready
      const readyResponse = await PiSDK.isAdReady('rewarded');
      setAdReady(readyResponse.ready);
      
      // If not ready, request one
      if (!readyResponse.ready) {
        await handleRequestAd();
      }
    } catch (error: any) {
      console.error('Failed to check ad support:', error);
      setError(error.message || 'Failed to check ad network support');
      setAdSupported(false);
      if (allowSkip) {
        toast.info('Could not verify ad support, you can proceed');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleRequestAd = async () => {
    setLoading(true);
    setError(null);

    try {
      console.log('Requesting rewarded ad...');
      const response = await PiSDK.requestAd('rewarded');
      
      console.log('Ad request response:', response);

      if (response.result === 'AD_LOADED') {
        setAdReady(true);
        toast.success('Ad loaded! Click "Watch Ad" to continue');
      } else if (response.result === 'AD_NOT_AVAILABLE') {
        setError('No ads available at this time');
        setAdReady(false);
        if (allowSkip) {
          toast.info('No ads available, you can proceed');
        }
      } else {
        setError('Failed to load ad');
        setAdReady(false);
        if (allowSkip) {
          toast.info('Ad loading failed, you can proceed');
        }
      }
    } catch (error: any) {
      console.error('Failed to request ad:', error);
      setError(error.message || 'Failed to request ad');
      setAdReady(false);
      if (allowSkip) {
        toast.info('Ad request failed, you can proceed');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleShowAd = async () => {
    setShowingAd(true);
    setError(null);

    try {
      console.log('Showing rewarded ad...');
      const response = await PiSDK.showAd('rewarded');
      
      console.log('Ad show response:', response);

      if (response.result === 'AD_REWARDED') {
        setAdWatched(true);
        toast.success('Thank you for watching the ad!');
        
        // Automatically proceed after successful ad watch
        setTimeout(() => {
          onAdWatched();
        }, 1500);
      } else if (response.result === 'AD_CLOSED') {
        setError('Ad was closed before completion');
        setAdReady(false);
        toast.error('Please watch the complete ad to continue');
        // Try to load another ad
        await handleRequestAd();
      } else if (response.result === 'ADS_NOT_SUPPORTED') {
        setError('Ads are not supported in this version');
        setAdSupported(false);
        if (allowSkip) {
          toast.info('Ads not supported, you can proceed');
        }
      } else if (response.result === 'USER_UNAUTHENTICATED') {
        setError('Please authenticate with Pi Network first');
      } else {
        setError(`Ad error: ${response.result}`);
        setAdReady(false);
        if (allowSkip) {
          toast.info('Ad display failed, you can proceed');
        }
      }
    } catch (error: any) {
      console.error('Failed to show ad:', error);
      setError(error.message || 'Failed to show ad');
      setAdReady(false);
      if (allowSkip) {
        toast.info('Ad display failed, you can proceed');
      }
    } finally {
      setShowingAd(false);
    }
  };

  if (loading && !adReady) {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardContent className="flex items-center justify-center py-12">
          <div className="text-center space-y-4">
            <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto" />
            <p className="text-muted-foreground">Checking ad availability...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (adWatched) {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardContent className="flex items-center justify-center py-12">
          <div className="text-center space-y-4">
            <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto" />
            <div>
              <h3 className="text-lg font-semibold">Thank you!</h3>
              <p className="text-muted-foreground">Redirecting to dashboard...</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader className="text-center">
        <div className="mx-auto mb-4 w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
          <Play className="w-8 h-8 text-primary" />
        </div>
        <CardTitle>Watch Ad to Continue</CardTitle>
        <CardDescription>
          Please watch a short ad to access your dashboard
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {!adSupported && !allowSkip && (
          <Alert>
            <XCircle className="h-4 w-4" />
            <AlertDescription>
              Pi Ad Network is not available. Please open this app in Pi Browser.
            </AlertDescription>
          </Alert>
        )}

        {adSupported && !adReady && !error && (
          <div className="space-y-4">
            <div className="bg-muted p-4 rounded-lg text-center">
              <p className="text-sm text-muted-foreground">
                You'll watch a rewarded ad to support Droplink and access your dashboard
              </p>
            </div>
            <Button 
              onClick={handleRequestAd}
              className="w-full"
              size="lg"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Loading Ad...
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 mr-2" />
                  Load Ad
                </>
              )}
            </Button>
          </div>
        )}

        {adReady && !error && (
          <div className="space-y-4">
            <div className="bg-green-500/10 border border-green-500/20 p-4 rounded-lg text-center">
              <CheckCircle2 className="w-8 h-8 text-green-500 mx-auto mb-2" />
              <p className="text-sm font-medium">Ad loaded successfully!</p>
            </div>
            <Button 
              onClick={handleShowAd}
              className="w-full"
              size="lg"
              disabled={showingAd}
            >
              {showingAd ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Showing Ad...
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 mr-2" />
                  Watch Ad
                </>
              )}
            </Button>
          </div>
        )}

        {allowSkip && (error || !adSupported) && (
          <div className="pt-4 border-t">
            <Button 
              onClick={onSkip}
              variant="outline"
              className="w-full"
            >
              Continue Without Watching Ad
            </Button>
          </div>
        )}

        <div className="text-center text-xs text-muted-foreground">
          <p>Powered by Pi Network Ad Network</p>
        </div>
      </CardContent>
    </Card>
  );
};
