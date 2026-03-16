'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { registerSchema, type RegisterInput } from '@splitwise/shared';
import { Mail, Lock, User, Chrome, Loader2, Eye, EyeOff, Check, X } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { useRegisterMutation } from '@/store/api/authApi';
import { useAppDispatch } from '@/store/hooks';
import { setCredentials } from '@/store/slices/authSlice';

interface PasswordCheck {
  label: string;
  test: (pw: string) => boolean;
}

const PASSWORD_CHECKS: PasswordCheck[] = [
  { label: 'At least 8 characters', test: (pw) => pw.length >= 8 },
  { label: 'One uppercase letter', test: (pw) => /[A-Z]/.test(pw) },
  { label: 'One lowercase letter', test: (pw) => /[a-z]/.test(pw) },
  { label: 'One number', test: (pw) => /[0-9]/.test(pw) },
];

function getStrengthColor(score: number) {
  if (score <= 1) return 'bg-red-500';
  if (score === 2) return 'bg-orange-500';
  if (score === 3) return 'bg-yellow-500';
  return 'bg-emerald-500';
}

function getStrengthLabel(score: number) {
  if (score <= 1) return 'Weak';
  if (score === 2) return 'Fair';
  if (score === 3) return 'Good';
  return 'Strong';
}

export default function RegisterPage() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const [registerUser, { isLoading }] = useRegisterMutation();
  const [showPassword, setShowPassword] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
    defaultValues: { name: '', email: '', password: '' },
  });

  const passwordValue = watch('password', '');

  const strengthScore = useMemo(
    () => PASSWORD_CHECKS.filter((c) => c.test(passwordValue)).length,
    [passwordValue],
  );

  const onSubmit = async (data: RegisterInput) => {
    setApiError(null);
    try {
      const response = await registerUser(data).unwrap();
      dispatch(
        setCredentials({
          user: response.user,
          accessToken: response.tokens.accessToken,
          refreshToken: response.tokens.refreshToken,
        }),
      );
      router.push('/dashboard');
    } catch (err: unknown) {
      const error = err as { data?: { message?: string }; status?: number };
      setApiError(error.data?.message || 'Something went wrong. Please try again.');
    }
  };

  return (
    <Card className="border-0 shadow-xl shadow-gray-200/50">
      <CardHeader className="space-y-1 pb-4">
        <CardTitle className="text-2xl font-bold">Create an account</CardTitle>
        <CardDescription>Get started with free expense tracking</CardDescription>
      </CardHeader>

      <CardContent className="space-y-5">
        {apiError && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {apiError}
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Full Name</Label>
            <div className="relative">
              <User className="text-muted-foreground absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" />
              <Input
                id="name"
                type="text"
                placeholder="John Doe"
                className="pl-10"
                {...register('name')}
              />
            </div>
            {errors.name && <p className="text-xs text-red-500">{errors.name.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <div className="relative">
              <Mail className="text-muted-foreground absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" />
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                className="pl-10"
                {...register('email')}
              />
            </div>
            {errors.email && <p className="text-xs text-red-500">{errors.email.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <div className="relative">
              <Lock className="text-muted-foreground absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" />
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                placeholder="Create a strong password"
                className="pl-10 pr-10"
                {...register('password')}
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                className="text-muted-foreground hover:text-foreground absolute right-3 top-1/2 -translate-y-1/2 transition-colors"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {errors.password && <p className="text-xs text-red-500">{errors.password.message}</p>}

            {/* Password strength indicator */}
            {passwordValue.length > 0 && (
              <div className="space-y-3 pt-1">
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Password strength</span>
                    <span
                      className={`font-medium ${
                        strengthScore <= 1
                          ? 'text-red-600'
                          : strengthScore === 2
                            ? 'text-orange-600'
                            : strengthScore === 3
                              ? 'text-yellow-600'
                              : 'text-emerald-600'
                      }`}
                    >
                      {getStrengthLabel(strengthScore)}
                    </span>
                  </div>
                  <div className="flex gap-1">
                    {Array.from({ length: 4 }).map((_, i) => (
                      <div
                        key={i}
                        className={`h-1.5 flex-1 rounded-full transition-colors ${
                          i < strengthScore ? getStrengthColor(strengthScore) : 'bg-gray-200'
                        }`}
                      />
                    ))}
                  </div>
                </div>

                <ul className="grid grid-cols-2 gap-x-4 gap-y-1">
                  {PASSWORD_CHECKS.map((check) => {
                    const passed = check.test(passwordValue);
                    return (
                      <li
                        key={check.label}
                        className={`flex items-center gap-1.5 text-xs transition-colors ${
                          passed ? 'text-emerald-600' : 'text-muted-foreground'
                        }`}
                      >
                        {passed ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
                        {check.label}
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}
          </div>

          <Button
            type="submit"
            className="w-full bg-emerald-600 transition-colors hover:bg-emerald-700"
            size="lg"
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating account...
              </>
            ) : (
              'Create Account'
            )}
          </Button>
        </form>

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-card text-muted-foreground px-2">or continue with</span>
          </div>
        </div>

        <Button variant="outline" className="w-full" size="lg" type="button">
          <Chrome className="mr-2 h-4 w-4" />
          Google
        </Button>
      </CardContent>

      <CardFooter className="justify-center pb-6">
        <p className="text-muted-foreground text-sm">
          Already have an account?{' '}
          <Link
            href="/login"
            className="font-medium text-emerald-600 hover:text-emerald-700 hover:underline"
          >
            Sign in
          </Link>
        </p>
      </CardFooter>
    </Card>
  );
}
