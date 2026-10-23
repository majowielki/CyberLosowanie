import { ComponentProps, forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { Input } from '@/shared/ui/input';
import { cn } from '@/shared/lib/utils';
import { useTranslation } from '@/shared/i18n';

type PasswordInputProps = Omit<ComponentProps<typeof Input>, 'type'>;

/**
 * Password field with an eye button on the right that shows the typed
 * characters, so a user can check what they entered. The field goes back to
 * hidden when its form is submitted — browsers only offer to save a password
 * from a field that is still type="password".
 */
const PasswordInput = forwardRef<HTMLInputElement, PasswordInputProps>(({ className, ...props }, ref) => {
  const { t } = useTranslation();
  const [visible, setVisible] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  useImperativeHandle(ref, () => inputRef.current as HTMLInputElement);

  useEffect(() => {
    const form = inputRef.current?.form;
    if (!form) {
      return;
    }
    const hide = () => setVisible(false);
    form.addEventListener('submit', hide);
    return () => form.removeEventListener('submit', hide);
  }, []);

  return (
    <div className="relative">
      <Input ref={inputRef} type={visible ? 'text' : 'password'} className={cn('pr-11', className)} {...props} />
      <button
        type="button"
        aria-label={t(visible ? 'auth.field.hidePassword' : 'auth.field.showPassword')}
        aria-pressed={visible}
        aria-controls={props.id}
        onClick={() => setVisible((value) => !value)}
        className="absolute inset-y-0 right-0 flex w-11 items-center justify-center rounded-r-xl text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        {visible ? <EyeOff className="h-4 w-4" aria-hidden /> : <Eye className="h-4 w-4" aria-hidden />}
      </button>
    </div>
  );
});
PasswordInput.displayName = 'PasswordInput';

export default PasswordInput;
