import React, { useState } from 'react';
import { Gift, HelpCircle, Copy } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";

const ReferralsPage = () => {
  const [newCode, setNewCode] = useState('');
  const [message, setMessage] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleGenerateCode = async () => {
    if (!newCode) {
      setMessage({ type: 'error', text: 'Please enter a code' });
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch(`/generate?code=${encodeURIComponent(newCode)}`);
      const data = await response.json();
      
      if (data.error) {
        setMessage({ type: 'error', text: data.error });
      } else {
        setMessage({ type: 'success', text: 'Successfully created referral code!' });
        setNewCode('');
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to generate code. Please try again.' });
    }
    setIsSubmitting(false);
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    setMessage({ type: 'success', text: 'Copied to clipboard!' });
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* How Referrals Work */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <HelpCircle className="h-5 w-5" />
            Information
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="bg-neutral-800/20 rounded-lg p-4">
              <h3 className="font-medium flex items-center gap-2 mb-2">
                Rewards
              </h3>
              <ul className="space-y-2 text-sm text-neutral-300">
                <li>• When someone uses your code, you get <span className="text-yellow-500">80 coins</span></li>
                <li>• They receive <span className="text-yellow-500">250 coins</span> for using a referral code</li>
                <li>• Each user can only claim one referral code</li>
                <li>• You cannot claim your own referral code</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Generate Code Section */}
      <Card>
        <CardHeader>
          <CardTitle>Generate Referral Code</CardTitle>
          <CardDescription>Create a unique code for others to use</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-3">
            <Input
              placeholder="Enter desired code (max 15 chars)"
              value={newCode}
              onChange={(e) => setNewCode(e.target.value)}
              maxLength={15}
              className="bg-neutral-800/50"
            />
            <Button 
              onClick={handleGenerateCode}
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Creating...' : 'Generate'}
            </Button>
          </div>
          
          {message && (
            <Alert className={`mt-3 ${message.type === 'error' ? 'bg-red-900/20 text-red-400' : 'bg-green-900/20 text-green-400'}`}>
              <AlertDescription>{message.text}</AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ReferralsPage;