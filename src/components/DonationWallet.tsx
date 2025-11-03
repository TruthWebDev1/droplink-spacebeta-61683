import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Wallet, QrCode, Copy, Check } from "lucide-react";
import { toast } from "sonner";
import { QRCodeSVG } from "qrcode.react";

interface WalletData {
  piWallet?: { address: string; customMessage: string };
}

interface DonationWalletProps {
  wallets: WalletData;
  onChange: (wallets: WalletData) => void;
}

export const DonationWallet = ({ wallets, onChange }: DonationWalletProps) => {
  const [piAddress, setPiAddress] = useState(wallets.piWallet?.address || "");
  const [customMessage, setCustomMessage] = useState(wallets.piWallet?.customMessage || "Send me a coffee ☕");
  const [showQRDialog, setShowQRDialog] = useState(false);
  const [copied, setCopied] = useState(false);

  const savePiWallet = () => {
    if (!piAddress.trim()) {
      toast.error("Please enter your Pi wallet address");
      return;
    }

    onChange({
      ...wallets,
      piWallet: {
        address: piAddress.trim(),
        customMessage: customMessage.trim() || "Send me a coffee ☕"
      }
    });
    toast.success("Pi wallet saved");
  };

  const removePiWallet = () => {
    onChange({
      ...wallets,
      piWallet: undefined
    });
    setPiAddress("");
    setCustomMessage("Send me a coffee ☕");
    toast.success("Pi wallet removed");
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(piAddress);
    setCopied(true);
    toast.success("Address copied!");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Wallet className="w-5 h-5" />
          Pi Network Wallet
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {wallets.piWallet ? (
          <div className="space-y-4">
            <div className="p-4 bg-muted rounded-lg">
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <p className="font-medium mb-1">Pi Wallet Address</p>
                  <p className="text-sm text-muted-foreground break-all">
                    {wallets.piWallet.address}
                  </p>
                </div>
              </div>
              
              <div className="mb-3">
                <p className="font-medium mb-1">Custom Message</p>
                <p className="text-sm text-muted-foreground italic">
                  "{wallets.piWallet.customMessage}"
                </p>
              </div>
              
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowQRDialog(true)}
                  className="flex-1"
                >
                  <QrCode className="w-4 h-4 mr-2" />
                  View QR Code
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCopy}
                  className="flex-1"
                >
                  {copied ? (
                    <Check className="w-4 h-4 mr-2" />
                  ) : (
                    <Copy className="w-4 h-4 mr-2" />
                  )}
                  {copied ? "Copied!" : "Copy"}
                </Button>
              </div>
            </div>
            
            <Button
              variant="destructive"
              size="sm"
              onClick={removePiWallet}
              className="w-full"
            >
              Remove Pi Wallet
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <Label htmlFor="piAddress">Pi Wallet Address</Label>
              <Input
                id="piAddress"
                placeholder="Enter your Pi wallet address"
                value={piAddress}
                onChange={(e) => setPiAddress(e.target.value)}
                className="mt-1.5"
              />
            </div>
            
            <div>
              <Label htmlFor="customMessage">Custom Donation Message</Label>
              <Textarea
                id="customMessage"
                placeholder="Send me a coffee ☕"
                value={customMessage}
                onChange={(e) => setCustomMessage(e.target.value)}
                className="mt-1.5 min-h-[80px]"
              />
              <p className="text-xs text-muted-foreground mt-1">
                This message will be displayed to visitors on your public profile
              </p>
            </div>
            
            <Button onClick={savePiWallet} className="w-full">
              Save Pi Wallet
            </Button>
          </div>
        )}
      </CardContent>

      <Dialog open={showQRDialog} onOpenChange={setShowQRDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Pi Wallet QR Code</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col items-center gap-4 p-4">
            {wallets.piWallet && (
              <>
                <div className="bg-white p-4 rounded-lg">
                  <QRCodeSVG value={wallets.piWallet.address} size={200} />
                </div>
                <div className="text-center space-y-2">
                  <p className="text-sm font-medium">
                    {wallets.piWallet.customMessage}
                  </p>
                  <p className="text-xs text-muted-foreground break-all">
                    {wallets.piWallet.address}
                  </p>
                </div>
                <Button onClick={handleCopy} variant="outline" className="w-full">
                  {copied ? <Check className="w-4 h-4 mr-2" /> : <Copy className="w-4 h-4 mr-2" />}
                  {copied ? "Copied!" : "Copy Address"}
                </Button>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
};
