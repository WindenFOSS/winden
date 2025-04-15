import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useNavigate } from 'react-router-dom';
import { Home, AlertCircle } from 'lucide-react';

const NotFound = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardContent className="pt-6">
          <div className="text-center space-y-16">
            {/* Animated Text */}
            <div className="space-y-4">
              <h1 className="text-4xl mt-8 font-bold animate-fade-in">
                404
              </h1>
              <div className="h-px w-16 bg-border mx-auto animate-scale-x" />
              <p className="text-xl text-muted-foreground animate-fade-in-up">
                Oops! This page seems to be missing.
              </p>
              <p className="text-sm text-muted-foreground/80 animate-fade-in-up delay-100">
                Winden couldn't find the page you were looking for.
              </p>
            </div>

            {/* Action Buttons */}
            <div className="space-y-3 animate-fade-in-up delay-200">
              <Button 
                className="w-full"
                onClick={() => navigate('/dashboard')}
              >
                <Home className="mr-2 h-4 w-4" />
                Return to Dashboard
              </Button>
              <Button 
                variant="outline" 
                className="w-full"
                onClick={() => navigate(-1)}
              >
                Go Back
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <style jsx global>{`
        @keyframes scale-x {
          from { transform: scaleX(0); }
          to { transform: scaleX(1); }
        }
        
        @keyframes fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        
        @keyframes fade-in-up {
          from { 
            opacity: 0;
            transform: translateY(10px);
          }
          to { 
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        .animate-scale-x {
          animation: scale-x 0.5s ease-out forwards;
        }
        
        .animate-fade-in {
          animation: fade-in 0.5s ease-out forwards;
        }
        
        .animate-fade-in-up {
          animation: fade-in-up 0.5s ease-out forwards;
        }
        
        .delay-100 {
          animation-delay: 100ms;
        }
        
        .delay-200 {
          animation-delay: 200ms;
        }
      `}</style>
    </div>
  );
};

export default NotFound;