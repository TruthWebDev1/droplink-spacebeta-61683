# Pi Network Integration Setup Guide

This guide explains how the complete Pi Network integration works in Droplink.

## Overview

Droplink is now fully integrated with Pi Network, featuring:

✅ **Pi Authentication** - Users sign in with their Pi Network account  
✅ **Pi Payments** - Subscription plans priced in Pi (π) cryptocurrency  
✅ **Pi Ad Network** - Display Pi ads on public profile pages  
✅ **Backend API** - Edge functions for payment processing  

## Prerequisites

1. **Pi Network Account**: Download Pi Network app and create an account
2. **Pi Browser**: Install Pi Browser from the Pi Network app
3. **Pi Developer Portal**: Register your app at `pi://develop.pinet.com`
4. **Pi API Key**: Get your API key from the Developer Portal (already configured)

## Architecture

### Frontend Components

1. **PiAuth** (`src/components/PiAuth.tsx`)
   - Replaces email/password authentication
   - Uses Pi SDK to authenticate users
   - Creates/links Supabase profiles with Pi accounts

2. **PiSubscription** (`src/pages/PiSubscription.tsx`)
   - Displays subscription plans in Pi (π)
   - Handles Pi payment flow
   - Updates premium status after successful payment

3. **PiAdNetwork** (`src/components/PiAdNetwork.tsx`)
   - Displays Pi Network ads
   - Integrated into public profile pages
   - Auto-loads when Pi Ad SDK is available

4. **PiSDK Utils** (`src/lib/pi-sdk.ts`)
   - TypeScript definitions for Pi SDK
   - Helper functions for Pi operations
   - Payment and authentication wrappers

### Backend Edge Functions

1. **pi-auth** (`supabase/functions/pi-auth/index.ts`)
   - Verifies Pi access tokens
   - Creates Supabase auth users
   - Links Pi accounts to profiles
   - Generates session tokens

2. **pi-payment-approve** (`supabase/functions/pi-payment-approve/index.ts`)
   - Approves Pi payments with Pi servers
   - Called when payment is ready for approval
   - Returns approval status

3. **pi-payment-complete** (`supabase/functions/pi-payment-complete/index.ts`)
   - Completes Pi payments
   - Updates user premium status
   - Verifies blockchain transaction

## How It Works

### Authentication Flow

1. User opens app in Pi Browser
2. User clicks "Sign in with Pi Network"
3. Pi Browser shows authentication dialog
4. User approves access to username and payments
5. Frontend receives Pi access token
6. Backend verifies token with Pi servers
7. Backend creates/finds Supabase user
8. User is logged in with session token

### Payment Flow

1. User selects subscription plan (e.g., 10π for Premium)
2. Frontend calls `Pi.createPayment()` with amount and metadata
3. Pi Browser shows payment confirmation dialog
4. User approves payment
5. **Server Approval Phase**:
   - Frontend calls `pi-payment-approve` edge function
   - Backend approves payment with Pi API
6. **Blockchain Transaction**:
   - User signs blockchain transaction in Pi Browser
   - Transaction is submitted to Pi blockchain
7. **Server Completion Phase**:
   - Frontend calls `pi-payment-complete` edge function
   - Backend completes payment with Pi API
   - Premium status is updated in database
8. User's subscription is activated

### Ad Network Integration

1. Pi Ad SDK loads automatically from `index.html`
2. `PiAdNetwork` component renders on public pages
3. Component calls `window.PiAd.loadAd()` when SDK is ready
4. Pi Network serves targeted ads
5. Profile owners earn Pi from ad impressions

## Configuration

### Pi SDK Initialization

The Pi SDK is initialized in two places:

1. **index.html** - Script tags for Pi SDK and Pi Ad Network:
```html
<script src="https://sdk.minepi.com/pi-sdk.js"></script>
<script>
  window.Pi.init({ version: "2.0", sandbox: false });
</script>
<script async src="https://sdk.pi-ad.network/sdk.js"></script>
```

2. **Frontend Code** - Programmatic initialization:
```typescript
await PiSDK.initialize(false); // false = production, true = sandbox
```

### Environment Variables

The following secrets are configured:
- `PI_API_KEY`: Your Pi Network API key from Developer Portal
- Standard Supabase keys (auto-configured)

### Sandbox vs Production

- **Sandbox Mode**: Use for testing with fake Pi
  - Set `sandbox: true` in Pi SDK init
  - Test payments won't use real Pi
  - Use testnet API endpoints

- **Production Mode**: Real Pi transactions
  - Set `sandbox: false` in Pi SDK init
  - Real blockchain transactions
  - Use mainnet API endpoints

## Subscription Plans

| Plan | Pi Price | Features |
|------|----------|----------|
| Free | 0π | Basic features |
| Premium | 10π | Unlimited products, advanced analytics |
| Pro | 30π | API access, white-label, custom integrations |

## Testing Checklist

### Pi Authentication
- [ ] Open app in Pi Browser
- [ ] Click "Sign in with Pi Network"
- [ ] Approve authentication
- [ ] Verify redirect to dashboard
- [ ] Check profile created in database

### Pi Payments
- [ ] Navigate to subscription page
- [ ] Select Premium plan (10π)
- [ ] Approve payment in Pi Browser
- [ ] Wait for blockchain transaction
- [ ] Verify premium status updated
- [ ] Check payment recorded in Pi Console

### Pi Ads
- [ ] Visit a public profile page
- [ ] Verify ad container renders
- [ ] Check Pi Ad SDK loads
- [ ] Confirm ad displays
- [ ] Verify no console errors

## Troubleshooting

### "Please open this app in Pi Browser"
- App must be accessed through Pi Browser
- Pi SDK only works in Pi Browser environment
- Download Pi Browser from Pi Network app

### Authentication Fails
- Check Pi API key is correct
- Verify app is registered in Developer Portal
- Check edge function logs for errors
- Ensure user approved authentication scopes

### Payment Fails
- Verify user has sufficient Pi balance
- Check payment amount is correct
- Review edge function logs
- Confirm Pi API key has payment permissions

### Ads Not Loading
- Verify Pi Ad SDK script in index.html
- Check console for SDK loading errors
- Ensure app is registered for Pi Ads
- Wait for SDK to load (may take a few seconds)

## Production Deployment

1. **Developer Portal Setup**:
   - Register app at `pi://develop.pinet.com`
   - Get production API key
   - Configure app network (Mainnet)
   - Set app URLs

2. **Enable Pi Ads**:
   - Apply for Pi Ad Network in Developer Portal
   - Get ad unit IDs
   - Update `PiAdNetwork` component with unit IDs

3. **Deploy App**:
   - Update Pi SDK to production mode
   - Deploy edge functions
   - Set production domain in Developer Portal
   - Test all flows end-to-end

4. **Go Live**:
   - Submit app for review in Developer Portal
   - Wait for approval
   - App will be listed in Pi App Directory
   - Users can access via Pi Browser

## Resources

- [Pi Developer Documentation](https://pi-apps.github.io/community-developer-guide/)
- [Pi SDK Reference](https://pi-apps.github.io/community-developer-guide/docs/gettingStarted/piAppPlatform/piAppPlatformSDK/)
- [Pi Payment Flow](https://pi-apps.github.io/community-developer-guide/docs/gettingStarted/quickStart/)
- [Pi Ad Network Guide](https://pi-ad.network/docs)
- [Pi Network Whitepaper](https://minepi.com/white-paper)

## Support

For Pi Network integration issues:
- Check Pi Developer Portal documentation
- Join Pi Developer Community on Discord
- Review edge function logs in Lovable Cloud
- Contact Pi Network support

For Droplink app issues:
- support@droplink.com
- Check console logs in browser
- Review network requests in DevTools
