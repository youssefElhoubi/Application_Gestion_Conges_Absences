'use client';

import * as React from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/src/contexts/AuthContext';
import {
  ShieldCheck,
  Lock,
  Mail,
  AlertCircle,
  Eye,
  EyeOff,
  Building2,
  CheckCircle2,
  ArrowRight,
  Loader2,
} from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login, isAuthenticated, user, isLoading: authLoading } = useAuth();

  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [showPassword, setShowPassword] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);

  const redirectUrl = searchParams.get('redirect');

  // If already authenticated, redirect immediately to intended destination
  React.useEffect(() => {
    if (isAuthenticated && user && !authLoading) {
      if (redirectUrl) {
        router.push(redirectUrl);
      } else if (user.role === 'EMPLOYEE') {
        router.push('/portal');
      } else {
        router.push('/');
      }
    }
  }, [isAuthenticated, user, authLoading, redirectUrl, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setErrorMessage('Veuillez saisir votre adresse email professionnelle.');
      return;
    }

    if (!password) {
      setErrorMessage('Veuillez saisir votre mot de passe.');
      return;
    }

    setIsSubmitting(true);

    try {
      const result = await login(trimmedEmail, password);
      if (!result.success) {
        setErrorMessage(result.error || 'Identifiants invalides.');
        setIsSubmitting(false);
        return;
      }

      // Successful login will trigger redirection via useEffect
    } catch {
      setErrorMessage('Une erreur est survenue lors de la connexion.');
      setIsSubmitting(false);
    }
  };

  const fillQuickCredentials = (demoEmail: string, demoPass: string) => {
    setEmail(demoEmail);
    setPassword(demoPass);
    setErrorMessage(null);
  };

  return (
    <div className="min-h-screen flex flex-col justify-center py-12 sm:px-6 lg:px-8 bg-slate-50 dark:bg-slate-950 transition-colors">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        {/* Brand Icon */}
        <div className="mx-auto h-14 w-14 rounded-2xl bg-primary/10 text-primary border border-primary/20 flex items-center justify-center shadow-sm">
          <ShieldCheck className="h-8 w-8" />
        </div>

        <h1 className="mt-4 text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
          AbsenceHR Maroc
        </h1>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
          Portail Entreprise de Gestion des Congés & Absences
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4">
        <div className="bg-white dark:bg-slate-900 py-8 px-6 shadow-sm border border-slate-200 dark:border-slate-800 rounded-2xl sm:px-10">
          {/* Error Alert */}
          {errorMessage && (
            <div
              role="alert"
              className="mb-6 rounded-lg bg-red-50 dark:bg-red-950/50 p-4 border border-red-200 dark:border-red-900/50 flex items-start gap-3 animate-fadeIn"
            >
              <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
              <div className="text-sm text-red-700 dark:text-red-300 font-medium">
                {errorMessage}
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5" noValidate>
            {/* Email Field */}
            <div>
              <label
                htmlFor="email-input"
                className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300"
              >
                Adresse email professionnelle
              </label>
              <div className="mt-1.5 relative rounded-lg shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Mail className="h-4 w-4" />
                </div>
                <input
                  id="email-input"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="nom.prenom@entreprise.ma"
                  className="block w-full pl-10 pr-3 py-2.5 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition"
                />
              </div>
            </div>

            {/* Password Field */}
            <div>
              <label
                htmlFor="password-input"
                className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300"
              >
                Mot de passe
              </label>
              <div className="mt-1.5 relative rounded-lg shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Lock className="h-4 w-4" />
                </div>
                <input
                  id="password-input"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="block w-full pl-10 pr-10 py-2.5 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition"
                  aria-label={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <button
              id="login-submit-button"
              type="submit"
              disabled={isSubmitting}
              className="w-full flex justify-center items-center gap-2 py-2.5 px-4 rounded-lg text-sm font-semibold text-white bg-primary hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary shadow-sm disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Connexion en cours...</span>
                </>
              ) : (
                <>
                  <span>Se connecter</span>
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </form>

          {/* Quick Demo Credentials for Local Verification */}
          <div className="mt-6 pt-6 border-t border-slate-200 dark:border-slate-800">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2.5">
              Comptes de test (Données initialisées)
            </p>
            <div className="space-y-2">
              <button
                type="button"
                onClick={() =>
                  fillQuickCredentials('admin@entreprise.ma', 'AdminPassword123!')
                }
                className="w-full flex items-center justify-between p-2 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 text-left transition text-xs"
              >
                <div>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">
                    Directeur RH (ADMIN)
                  </span>
                  <span className="block text-[11px] text-slate-500">
                    admin@entreprise.ma
                  </span>
                </div>
                <span className="px-2 py-0.5 text-[10px] rounded font-medium bg-primary/10 text-primary">
                  Remplir
                </span>
              </button>

              <button
                type="button"
                onClick={() =>
                  fillQuickCredentials('fz.alami@entreprise.ma', 'EmployeePassword123!')
                }
                className="w-full flex items-center justify-between p-2 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 text-left transition text-xs"
              >
                <div>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">
                    Collaboratrice (EMPLOYEE)
                  </span>
                  <span className="block text-[11px] text-slate-500">
                    fz.alami@entreprise.ma
                  </span>
                </div>
                <span className="px-2 py-0.5 text-[10px] rounded font-medium bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                  Remplir
                </span>
              </button>
            </div>
          </div>
        </div>

        {/* Footer Legal Notice */}
        <p className="mt-6 text-center text-xs text-slate-500 dark:text-slate-500">
          Système conforme à la loi n° 65-99 relative au Code du travail marocain.
        </p>
      </div>
    </div>
  );
}
