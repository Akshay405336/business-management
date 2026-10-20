'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { loginWithPassword } from '../api/login-with-password';
import { loginSchema, type LoginFormInput, type LoginFormValues } from '../schemas/login.schema';
import { describeAuthError } from '../utils/auth-errors';

export function useAdminLogin() {
  const router = useRouter();
  const [formError, setFormError] = useState<string | null>(null);
  const form = useForm<LoginFormInput, unknown, LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
    mode: 'onSubmit',
    reValidateMode: 'onChange',
  });

  const onSubmit = form.handleSubmit(async (values) => {
    setFormError(null);
    try {
      const result = await loginWithPassword(values);
      router.push(result.enrollmentPending ? '/admin/verify-totp?setup=1' : '/admin/verify-totp');
    } catch (error) {
      form.resetField('password', { keepError: false });
      setFormError(describeAuthError(error));
      form.setFocus('password');
    }
  });

  return { form, formError, onSubmit, isSubmitting: form.formState.isSubmitting };
}
