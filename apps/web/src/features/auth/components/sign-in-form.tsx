import { zodResolver } from '@hookform/resolvers/zod';
import { loginRequestSchema, type LoginRequest } from '@huitong/shared';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';

import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';
import { StarBorder } from '@/components/reactbits/star-border';
import { useSignIn } from '@/app/session/session-mutations';

/** Email and password sign-in, validated with the same zod schema the API uses. */
export function SignInForm({ onSignedIn }: { onSignedIn: () => void }) {
  const { t } = useTranslation('auth');
  const { t: tCommon } = useTranslation();
  const signIn = useSignIn();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginRequest>({
    resolver: zodResolver(loginRequestSchema),
    defaultValues: { email: '', password: '' },
  });

  const submit = handleSubmit((values) => {
    signIn.mutate(values, { onSuccess: onSignedIn });
  });

  return (
    <form onSubmit={(event) => void submit(event)} noValidate className="space-y-5">
      <FieldGroup>
        <Field data-invalid={errors.email !== undefined}>
          <FieldLabel htmlFor="sign-in-email">{t('form.email')}</FieldLabel>
          <Input
            id="sign-in-email"
            type="email"
            autoComplete="username"
            inputMode="email"
            aria-invalid={errors.email !== undefined}
            aria-describedby={errors.email ? 'sign-in-email-error' : undefined}
            {...register('email')}
          />
          {errors.email ? (
            <FieldError id="sign-in-email-error">{t('form.invalidEmail')}</FieldError>
          ) : null}
        </Field>
        <Field data-invalid={errors.password !== undefined}>
          <FieldLabel htmlFor="sign-in-password">{t('form.password')}</FieldLabel>
          <Input
            id="sign-in-password"
            type="password"
            autoComplete="current-password"
            aria-invalid={errors.password !== undefined}
            aria-describedby={errors.password ? 'sign-in-password-error' : undefined}
            {...register('password')}
          />
          {errors.password ? (
            <FieldError id="sign-in-password-error">{t('form.passwordRequired')}</FieldError>
          ) : null}
        </Field>
      </FieldGroup>
      {signIn.error ? (
        <p role="alert" className="rounded-md bg-danger-subtle px-3 py-2 text-sm text-danger">
          {tCommon(`errors.${signIn.error.code}`)}
        </p>
      ) : null}
      {/* The page's one primary action: a star of light travels its border (still under reduced motion). */}
      <StarBorder
        type="submit"
        className="w-full"
        disabled={signIn.isPending}
        backgroundColor="var(--primary)"
        textColor="var(--primary-foreground)"
        color="var(--primary-foreground)"
        borderColor="transparent"
      >
        {signIn.isPending ? <Spinner /> : null}
        {signIn.isPending ? t('form.submitting') : t('form.submit')}
      </StarBorder>
    </form>
  );
}
