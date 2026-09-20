import { ReactNode } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/shared/ui/card';
import { Logo } from '@/shared/components';
import { LanguageSwitcher } from '@/shared/i18n';

interface AuthLayoutProps {
  title: ReactNode;
  subtitle: ReactNode;
  /** Cross-link row under the form ("No account yet? Register"). */
  footer: ReactNode;
  children: ReactNode;
}

/**
 * Shared frame for the public auth pages (login / register): slim top bar with
 * the brand and language switch, and one centred card holding the form.
 */
function AuthLayout({ title, subtitle, footer, children }: AuthLayoutProps) {
  return (
    <main className="flex min-h-screen flex-col px-5 py-4 sm:px-8">
      <div className="flex items-center justify-between">
        <Logo />
        <LanguageSwitcher />
      </div>

      <div className="flex flex-1 items-center justify-center py-10">
        <Card className="w-full max-w-md animate-fade-up">
          <CardHeader className="items-center gap-1 pb-4 text-center">
            <CardTitle className="font-display text-3xl font-medium tracking-tight">{title}</CardTitle>
            <CardDescription className="text-base">{subtitle}</CardDescription>
          </CardHeader>
          <CardContent>{children}</CardContent>
          <CardFooter className="justify-center gap-1 text-sm text-muted-foreground">
            {footer}
          </CardFooter>
        </Card>
      </div>
    </main>
  );
}

export default AuthLayout;
