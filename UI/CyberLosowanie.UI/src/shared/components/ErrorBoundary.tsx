import React, { Component, ReactNode } from 'react';
import { Button } from '@/shared/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card';
import { debugLog, isDevelopment } from '@/shared/config';
import { useTranslation } from '@/shared/i18n';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

// Class components cannot use hooks, so the translated default fallback lives
// in a small functional component (the Redux Provider wraps ErrorBoundary).
function DefaultErrorFallback({ error, onReset }: { error?: Error; onReset: () => void }) {
  const { t } = useTranslation();

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-t from-green-900 via-green-700 to-green-500">
      <Card className="w-96 bg-muted">
        <CardHeader>
          <CardTitle className="text-center text-destructive">
            {t('common.error.title')}
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          <p className="text-muted-foreground">
            {t('common.error.unexpected')}
          </p>
          {isDevelopment && error && (
            <details className="text-left">
              <summary className="cursor-pointer text-sm">
                {t('common.error.devDetails')}
              </summary>
              <pre className="mt-2 text-xs overflow-auto">
                {error.stack}
              </pre>
            </details>
          )}
          <div className="flex gap-2 justify-center">
            <Button onClick={onReset}>
              {t('common.action.retry')}
            </Button>
            <Button
              variant="outline"
              onClick={() => window.location.href = '/'}
            >
              {t('common.action.goHome')}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    debugLog('ErrorBoundary caught an error:', error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: undefined });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return <DefaultErrorFallback error={this.state.error} onReset={this.handleReset} />;
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
