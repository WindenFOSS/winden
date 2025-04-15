import React, { useState, useEffect } from 'react';
import { User, Coins, Eye, EyeOff, Key } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

const AccountPage = () => {
  const [claimCode, setClaimCode] = useState('');
  const [message, setMessage] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [userData, setUserData] = useState(null);
  const [coinsBalance, setCoinsBalance] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [sftpPassword, setSftpPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordMessage, setPasswordMessage] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch user data
        const userResponse = await fetch('/api/user');
        const userData = await userResponse.json();
        setUserData(userData);

        // Fetch coins balance
        const coinsResponse = await fetch('/api/coins');
        const coinsData = await coinsResponse.json();
        setCoinsBalance(coinsData.coins);

        // Fetch SFTP password
        const passwordResponse = await fetch('/api/password');
        const passwordData = await passwordResponse.json();
        setSftpPassword(passwordData.password);
      } catch (error) {
        console.error('Failed to fetch data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();

    // Set up coins balance polling
    const coinsInterval = setInterval(async () => {
      try {
        const coinsResponse = await fetch('/api/coins');
        const coinsData = await coinsResponse.json();
        setCoinsBalance(coinsData.coins);
      } catch (error) {
        console.error('Failed to fetch coins balance:', error);
      }
    }, 3000);

    return () => clearInterval(coinsInterval);
  }, []);

  const handleClaimCode = async () => {
    if (!claimCode) {
      setMessage({ type: 'error', text: 'Please enter a referral code' });
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch(`/claim?code=${encodeURIComponent(claimCode)}`);
      const data = await response.json();
      
      if (data.error) {
        setMessage({ type: 'error', text: data.error });
      } else {
        setMessage({ type: 'success', text: 'Successfully claimed referral code! You received 250 coins.' });
        setClaimCode('');
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to claim code. Please try again.' });
    }
    setIsSubmitting(false);
  };

  const handlePasswordChange = async () => {
    if (newPassword !== confirmPassword) {
      setPasswordMessage({ type: 'error', text: 'Passwords do not match' });
      return;
    }

    try {
      const response = await fetch('/api/password/change', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          password: newPassword,
          confirmPassword: confirmPassword
        })
      });

      const data = await response.json();
      
      if (data.error) {
        setPasswordMessage({ type: 'error', text: data.error });
      } else {
        setPasswordMessage({ type: 'success', text: 'Password updated successfully' });
        setNewPassword('');
        setConfirmPassword('');
        // Refresh SFTP password
        const passwordResponse = await fetch('/api/password');
        const passwordData = await passwordResponse.json();
        setSftpPassword(passwordData.password);
      }
    } catch (error) {
      setPasswordMessage({ type: 'error', text: 'Failed to update password' });
    }
  };

  const handlePasswordRegen = async () => {
    try {
      await fetch('/regen');
      await window.reload()
      // Refresh SFTP password
      const passwordResponse = await fetch('/api/password');
      const passwordData = await passwordResponse.json();
      setSftpPassword(passwordData.password);
      setPasswordMessage({ type: 'success', text: 'Password regenerated successfully' });
    } catch (error) {
      setPasswordMessage({ type: 'error', text: 'Failed to regenerate password' });
    }
  };

  if (isLoading || !userData) {
    return <div className="flex items-center justify-center min-h-[200px]">Loading...</div>;
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 p-6">
      {/* User Info Section */}
      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-4">
              <Avatar className="h-16 w-16">
                <AvatarImage src="https://i.postimg.cc/c1mdC5Rm/image.png" />
                <AvatarFallback>
                  <User className="h-8 w-8" />
                </AvatarFallback>
              </Avatar>
              <div>
                <CardTitle className="text-2xl font-bold">{userData.username}</CardTitle>
                <CardDescription>
                  <div className="space-y-1">
                    <p>User ID: {userData.id}</p>
                    <p>Email: {userData.email}</p>
                    {userData.global_name && <p>Display Name: {userData.global_name}</p>}
                  </div>
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <div className="p-2 bg-neutral-800 rounded-lg">
                <Coins className="h-5 w-5 text-yellow-500" />
              </div>
              <div>
                <p className="text-sm text-neutral-400">Coins Balance</p>
                <p className="text-lg font-medium">{coinsBalance.toFixed(2)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* SFTP Credentials */}
        <Card>
          <CardHeader>
            <CardTitle>SFTP Credentials</CardTitle>
            <CardDescription>Your SFTP login details for server access</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <p className="text-sm text-neutral-400 mb-1">Username</p>
                <p className="font-medium">{userData.username}</p>
              </div>
              <div>
                <p className="text-sm text-neutral-400 mb-1">Password</p>
                <div className="flex items-center gap-2">
                  <Input
                    type={showPassword ? "text" : "password"}
                    value={sftpPassword}
                    readOnly
                    className="bg-neutral-800/50"
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Custom Password */}
        <Card>
          <CardHeader>
            <CardTitle>Change SFTP Password</CardTitle>
            <CardDescription>Set a custom password for SFTP</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <Input
                  type="password"
                  placeholder="New password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="bg-neutral-800/50"
                />
              </div>
              <div>
                <Input
                  type="password"
                  placeholder="Confirm new password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="bg-neutral-800/50"
                />
              </div>
              <Button onClick={handlePasswordChange}>
                Update Password
              </Button>
              {passwordMessage && (
                <Alert className={`mt-3 ${passwordMessage.type === 'error' ? 'bg-red-900/20 text-red-400' : 'bg-green-900/20 text-green-400'}`}>
                  <AlertDescription>{passwordMessage.text}</AlertDescription>
                </Alert>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Claim Referral Section */}
        <Card>
          <CardHeader>
            <CardTitle>Claim Referral Code</CardTitle>
            <CardDescription>
              Enter a referral code to claim 250 coins. The code owner will receive 80 coins.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-3">
              <Input
                placeholder="Enter referral code"
                value={claimCode}
                onChange={(e) => setClaimCode(e.target.value)}
                className="bg-neutral-800/50"
                maxLength={15}
              />
              <Button 
                onClick={handleClaimCode} 
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Claiming...' : 'Claim Code'}
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
    </div>
  );
};

export default AccountPage;