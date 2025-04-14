import React from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Separator } from '@/components/ui/separator'
import windenLogo from '@/assets/winden.webp'

const Login = () => {
  return (
    <div className="flex flex-col items-center justify-between min-h-screen bg-[#0a0a0a] text-zinc-200 font-inter py-8">
      <div className="flex-1 flex flex-col items-center justify-center w-full">
        <div className="flex items-center justify-center mb-8">
          <img src={windenLogo} alt="Winden Logo" className="h-14 w-auto mr-3" />
          <h1 className="text-3xl text-zinc-100 font-semibold tracking-tight">Winden</h1>
        </div>
      
        <Card className="w-[400px] border-zinc-800 bg-zinc-900">
          <CardHeader className="space-y-1 text-center">
            <CardTitle className="text-2xl font-normal text-zinc-100">Sign in</CardTitle>
            <CardDescription className="text-zinc-400 font-normal">Enter your credentials to access your account</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-5">
            <div className="grid gap-3">
              <Label htmlFor="email" className="text-zinc-300 font-medium">Email</Label>
              <Input 
                id="email" 
                placeholder="name@example.com" 
                type="email"
                className="bg-zinc-800 border-zinc-700 text-zinc-100 placeholder:text-zinc-500 focus-visible:ring-zinc-600 font-normal" 
              />
            </div>
            <div className="grid gap-3">
              <div className="flex items-center justify-between">
                <Label htmlFor="password" className="text-zinc-300 font-medium">Password</Label>
                <a href="#" className="text-sm font-medium text-zinc-400 hover:text-zinc-100 cursor-pointer">Forgot password?</a>
              </div>
              <Input 
                id="password" 
                type="password" 
                placeholder="••••••••"
                className="bg-zinc-800 border-zinc-700 text-zinc-100 placeholder:text-zinc-500 focus-visible:ring-zinc-600 font-normal" 
              />
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox id="remember" className="border-zinc-700 data-[state=checked]:bg-zinc-700 data-[state=checked]:border-zinc-700 cursor-pointer" />
              <Label htmlFor="remember" className="text-sm text-zinc-400 cursor-pointer font-normal">Remember me</Label>
            </div>
            
            <Button className="w-full bg-zinc-100 text-zinc-950 hover:bg-zinc-200 cursor-pointer font-medium">Sign in</Button>
            
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <Separator className="bg-zinc-800" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-zinc-900 px-2 text-zinc-500 font-medium">Or continue with</span>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              <Button variant="outline" className="bg-zinc-800 text-zinc-200 border-zinc-700 hover:bg-zinc-700 hover:text-zinc-100 cursor-pointer font-medium">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="h-5 w-5 mr-2">
                  <path fill="#EA4335" d="M5.266 9.765A7.077 7.077 0 0 1 12 4.909c1.69 0 3.218.6 4.418 1.582L19.91 3C17.782 1.145 15.055 0 12 0 7.27 0 3.198 2.698 1.24 6.65l4.026 3.115Z"/>
                  <path fill="#34A853" d="M16.04 18.013c-1.09.703-2.474 1.078-4.04 1.078a7.077 7.077 0 0 1-6.723-4.823l-4.04 3.067A11.965 11.965 0 0 0 12 24c2.933 0 5.735-1.043 7.834-3l-3.793-2.987Z"/>
                  <path fill="#4A90E2" d="M19.834 21c2.195-2.048 3.62-5.096 3.62-9 0-.71-.109-1.473-.272-2.182H12v4.637h6.436c-.317 1.559-1.17 2.766-2.395 3.558L19.834 21Z"/>
                  <path fill="#FBBC05" d="M5.277 14.268A7.12 7.12 0 0 1 4.909 12c0-.782.125-1.533.357-2.235L1.24 6.65A11.934 11.934 0 0 0 0 12c0 1.92.445 3.73 1.237 5.335l4.04-3.067Z"/>
                </svg>
                Google
              </Button>
              <Button variant="outline" className="bg-zinc-800 text-zinc-200 border-zinc-700 hover:bg-zinc-700 hover:text-zinc-100 cursor-pointer font-medium">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 127.14 96.36" className="h-5 w-5 mr-2">
                  <path fill="#5865F2" d="M107.7,8.07A105.15,105.15,0,0,0,81.47,0a72.06,72.06,0,0,0-3.36,6.83A97.68,97.68,0,0,0,49,6.83,72.37,72.37,0,0,0,45.64,0,105.89,105.89,0,0,0,19.39,8.09C2.79,32.65-1.71,56.6.54,80.21h0A105.73,105.73,0,0,0,32.71,96.36,77.7,77.7,0,0,0,39.6,85.25a68.42,68.42,0,0,1-10.85-5.18c.91-.66,1.8-1.34,2.66-2a75.57,75.57,0,0,0,64.32,0c.87.71,1.76,1.39,2.66,2a68.68,68.68,0,0,1-10.87,5.19,77,77,0,0,0,6.89,11.1A105.25,105.25,0,0,0,126.6,80.22h0C129.24,52.84,122.09,29.11,107.7,8.07ZM42.45,65.69C36.18,65.69,31,60,31,53s5-12.74,11.43-12.74S54,46,53.89,53,48.84,65.69,42.45,65.69Zm42.24,0C78.41,65.69,73.25,60,73.25,53s5-12.74,11.44-12.74S96.23,46,96.12,53,91.08,65.69,84.69,65.69Z"/>
                </svg>
                Discord
              </Button>
            </div>
          </CardContent>
          <CardFooter className="flex flex-col">
            <div className="text-center text-sm text-zinc-400 font-normal">
              Don't have an account? <a href="#" className="font-medium text-zinc-400 hover:text-zinc-100 cursor-pointer">Sign up</a>
            </div>
          </CardFooter>
        </Card>
      </div>
      
      <footer className="w-full text-center text-zinc-500 text-sm mt-2">
        <div className="mb-1">Developed by the <span className="text-zinc-100 font-medium">Winden</span> Team</div>
        <div>© {new Date().getFullYear()} Winden. All rights reserved.</div>
      </footer>
    </div>
  )
}

export default Login
