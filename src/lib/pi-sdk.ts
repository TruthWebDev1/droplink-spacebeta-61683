// Pi Network SDK TypeScript definitions and utilities

export interface PiUser {
  uid: string;
  username: string;
}

export interface PiAuthResult {
  accessToken: string;
  user: PiUser;
}

export interface PiPayment {
  identifier: string;
  user_uid: string;
  amount: number;
  memo: string;
  metadata: Record<string, any>;
  from_address: string;
  to_address: string;
  direction: string;
  network: string;
  status: {
    developer_approved: boolean;
    transaction_verified: boolean;
    developer_completed: boolean;
    cancelled: boolean;
    user_cancelled: boolean;
  };
  transaction: {
    txid: string;
    verified: boolean;
    _link: string;
  } | null;
}

export interface PiPaymentData {
  amount: number;
  memo: string;
  metadata: Record<string, any>;
}

export interface PiPaymentCallbacks {
  onReadyForServerApproval: (paymentId: string) => void;
  onReadyForServerCompletion: (paymentId: string, txid: string) => void;
  onCancel: (paymentId: string) => void;
  onError: (error: Error, payment?: PiPayment) => void;
}

export type AdType = 'interstitial' | 'rewarded';

export type AdRequestResult = 'AD_LOADED' | 'AD_FAILED_TO_LOAD' | 'AD_NOT_AVAILABLE';

export interface RequestAdResponse {
  type: AdType;
  result: AdRequestResult;
}

export type AdDisplayResult = 'AD_DISPLAYED' | 'AD_CLOSED' | 'AD_FAILED';

export interface ShowAdResponse {
  result: AdDisplayResult;
}

declare global {
  interface Window {
    Pi: {
      init: (config: { version: string; sandbox: boolean }) => void;
      authenticate: (
        scopes: string[],
        onIncompletePaymentFound: (payment: PiPayment) => void
      ) => Promise<PiAuthResult>;
      createPayment: (
        paymentData: PiPaymentData,
        callbacks: PiPaymentCallbacks
      ) => Promise<PiPayment>;
      openShareDialog: (title: string, message: string) => Promise<void>;
      nativeFeaturesList: () => Promise<string[]>;
      Ads: {
        requestAd: (adType: AdType) => Promise<RequestAdResponse>;
        showAd: () => Promise<ShowAdResponse>;
      };
    };
  }
}

export class PiSDK {
  private static isInitialized = false;

  static async initialize(sandbox = false): Promise<void> {
    if (this.isInitialized) return;

    if (!window.Pi) {
      throw new Error('Pi SDK not loaded. Make sure pi-sdk.js is included in your HTML.');
    }

    window.Pi.init({ version: "2.0", sandbox });
    this.isInitialized = true;
  }

  static async authenticate(
    scopes: string[] = ['payments', 'username'],
    onIncompletePaymentFound?: (payment: PiPayment) => void
  ): Promise<PiAuthResult> {
    if (!window.Pi) {
      throw new Error('Pi SDK not loaded');
    }

    const defaultPaymentHandler = (payment: PiPayment) => {
      console.log('Incomplete payment found:', payment);
      // Auto-complete or cancel incomplete payments
      if (payment.status.developer_approved && payment.transaction?.txid) {
        // Payment was approved but not completed - complete it
        console.log('Completing incomplete payment:', payment.identifier);
      }
    };

    return window.Pi.authenticate(
      scopes,
      onIncompletePaymentFound || defaultPaymentHandler
    );
  }

  static async createPayment(
    paymentData: PiPaymentData,
    callbacks: PiPaymentCallbacks
  ): Promise<PiPayment> {
    if (!window.Pi) {
      throw new Error('Pi SDK not loaded');
    }

    return window.Pi.createPayment(paymentData, callbacks);
  }

  static async shareApp(title: string, message: string): Promise<void> {
    if (!window.Pi) {
      throw new Error('Pi SDK not loaded');
    }

    return window.Pi.openShareDialog(title, message);
  }

  static async checkAdNetworkSupport(): Promise<boolean> {
    if (!window.Pi) {
      throw new Error('Pi SDK not loaded');
    }

    try {
      const nativeFeaturesList = await window.Pi.nativeFeaturesList();
      return nativeFeaturesList.includes('ad_network');
    } catch (error) {
      console.error('Failed to check ad network support:', error);
      return false;
    }
  }

  static async requestAd(adType: AdType = 'rewarded'): Promise<RequestAdResponse> {
    if (!window.Pi?.Ads) {
      throw new Error('Pi Ads API not loaded');
    }

    return window.Pi.Ads.requestAd(adType);
  }

  static async showAd(): Promise<ShowAdResponse> {
    if (!window.Pi?.Ads) {
      throw new Error('Pi Ads API not loaded');
    }

    return window.Pi.Ads.showAd();
  }
}
