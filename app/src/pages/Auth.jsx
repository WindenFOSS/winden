import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, Mail, AlertCircle, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';

const AuthPage = () => {
  const [formType, setFormType] = useState('signin');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const { toast } = useToast();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');

  const validatePassword = (password) => {
    return password.length >= 12 && 
           /[A-Z]/.test(password) && 
           /[a-z]/.test(password) && 
           /[0-9]/.test(password) && 
           /[^A-Za-z0-9]/.test(password);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if ((formType === 'signin' || formType === 'register') && !password) {
      setError('Password is required');
      return;
    }

    if (formType === 'register' && !validatePassword(password)) {
      setError('Password must be at least 12 characters long and contain uppercase, lowercase, number, and special character');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const endpoint = {
        signin: '/auth/login',
        register: '/auth/register',
        reset: '/auth/reset-password-request',
        magic: '/auth/magic-link'
      }[formType];

      const payload = {
        email,
        ...(formType !== 'reset' && formType !== 'magic' && { password }),
        ...(formType === 'register' && { username })
      };

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      if (response.ok) {
        if (formType === 'signin') {
          navigate('/dashboard');
        } else {
          toast({
            title: 'Success',
            description: data.message || 'Operation completed successfully'
          });
          if (formType !== 'magic') {
            setFormType('signin');
            setEmail('');
            setPassword('');
            setUsername('');
          }
        }
      } else {
        setError(data.error || 'An error occurred');
      }
    } catch (err) {
      setError('An error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen grid place-items-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          {formType !== 'signin' && (
            <Button
              variant="ghost"
              size="icon"
              className="absolute left-4 top-4"
              onClick={() => {
                setError('');
                setEmail('');
                setPassword('');
                setUsername('');
                setFormType('signin');
              }}
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
          )}
          <CardTitle className="text-2xl font-semibold tracking-tight">
            {formType === 'signin' ? 'Welcome back' :
             formType === 'register' ? 'Create account' :
             formType === 'reset' ? 'Reset password' :
             'Magic link'}
          </CardTitle>
          <CardDescription className="text-muted-foreground">
            {formType === 'signin' ? 'Sign in to your account' :
             formType === 'register' ? 'Create a new account to get started' :
             formType === 'reset' ? 'Enter your email to reset your password' :
             'Get a passwordless login link'}
          </CardDescription>
        </CardHeader>

        <CardContent>
          {error && (
            <Alert 
              variant="destructive" 
              className="mb-6 border-destructive/50 text-destructive dark:border-destructive [&>svg]:text-destructive"
            >
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="ml-2">{error}</AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {formType === 'register' && (
              <div className="space-y-2">
                <Label htmlFor="username">Username</Label>
                <Input
                  id="username"
                  placeholder="johndoe"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                />
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="name@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            {(formType === 'signin' || formType === 'register') && (
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                {formType === 'register' && (
                  <p className="text-sm text-muted-foreground">
                    Must be at least 12 characters with uppercase, lowercase, number and special character.
                  </p>
                )}
              </div>
            )}

            <Button 
              type="submit" 
              className="w-full"
              disabled={isLoading}
            >
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {formType === 'signin' ? 'Sign in' :
               formType === 'register' ? 'Create account' :
               formType === 'reset' ? 'Send reset link' :
               'Send magic link'}
            </Button>
          </form>

          {formType === 'signin' && (
            <div className="mt-4 space-y-2">
              <Button
                variant="outline"
                className="w-full hidden"
                onClick={() => setFormType('magic')}
              >
                <Mail className="mr-2 h-4 w-4" />
                Continue with magic link
              </Button>

              <div className="flex items-center justify-between text-sm">
                <Button
                  variant="link"
                  className="px-0 text-muted-foreground"
                  onClick={() => setFormType('register')}
                >
                  Create account
                </Button>
                <Button
                  variant="link"
                  className="px-0 text-muted-foreground hidden"
                  onClick={() => setFormType('reset')}
                >
                  Forgot password?
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AuthPage;