import { useEffect, useRef } from 'react';
import { Card } from '@/components/ui/card';

interface PiAdNetworkProps {
  adUnitId?: string;
  className?: string;
}

declare global {
  interface Window {
    PiAd?: {
      loadAd: (adUnitId: string, container: HTMLElement) => void;
    };
  }
}

export const PiAdNetwork = ({ adUnitId = 'default-ad-unit', className = '' }: PiAdNetworkProps) => {
  const adContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Wait for Pi Ad SDK to load
    const loadAd = () => {
      if (window.PiAd && adContainerRef.current) {
        try {
          window.PiAd.loadAd(adUnitId, adContainerRef.current);
          console.log('Pi Ad loaded successfully');
        } catch (error) {
          console.error('Failed to load Pi Ad:', error);
        }
      }
    };

    // Check if SDK is already loaded
    if (window.PiAd) {
      loadAd();
    } else {
      // Wait for SDK to load
      const checkSDK = setInterval(() => {
        if (window.PiAd) {
          loadAd();
          clearInterval(checkSDK);
        }
      }, 100);

      // Cleanup interval after 10 seconds
      setTimeout(() => clearInterval(checkSDK), 10000);

      return () => clearInterval(checkSDK);
    }
  }, [adUnitId]);

  return (
    <Card className={`overflow-hidden ${className}`}>
      <div className="p-4 bg-muted/30">
        <p className="text-xs text-muted-foreground text-center mb-2">Advertisement</p>
        <div 
          ref={adContainerRef} 
          className="min-h-[250px] flex items-center justify-center bg-background rounded-lg"
        >
          <div className="text-sm text-muted-foreground">
            Loading Pi Ad...
          </div>
        </div>
        <p className="text-xs text-muted-foreground text-center mt-2">
          Powered by Pi Network
        </p>
      </div>
    </Card>
  );
};
