'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { arrowsFor } from '@/components/arrows';
import { digits } from '@/lib/digits';
import type { Dictionary } from '@/lib/i18n';
import { prefixPath, type Locale } from '@/lib/i18n/dictionary';
import { leadSchema, type LeadInput } from '@/lib/lead-validation';

type Props = { locale: Locale; copy: Dictionary['contact']; stepsLabel: string };

type ApiError = { code?: 'invalid' | 'rate_limited' | 'server' };

export function ContactForm({ locale, copy, stepsLabel }: Props) {
  const [step, setStep] = useState(0);
  const [message, setMessage] = useState('');
  const [success, setSuccess] = useState(false);
  const { Forward, Back } = arrowsFor(locale);
  const {
    register,
    handleSubmit,
    trigger,
    formState: { errors, isSubmitting },
  } = useForm<LeadInput>({
    resolver: zodResolver(leadSchema),
    mode: 'onTouched',
    defaultValues: { locale },
  });

  const next = async () => {
    const fields: (keyof LeadInput)[] = step === 0 ? ['projectType'] : ['budget', 'timeline'];
    if (await trigger(fields)) setStep(step + 1);
  };

  const submit = handleSubmit(async (data) => {
    setMessage('');
    try {
      const response = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...data, locale }),
      });
      if (!response.ok) {
        const result = (await response.json().catch(() => ({}))) as ApiError;
        // Server messages are Persian; show the visitor's language based on the error code instead.
        setMessage(result.code === 'rate_limited' ? copy.labels.rateLimited : result.code === 'invalid' ? copy.labels.invalid : copy.labels.error);
        return;
      }
      setSuccess(true);
      setMessage(copy.labels.success);
    } catch {
      setMessage(copy.labels.error);
    }
  });

  const fieldError = (name: keyof LeadInput, text: string) =>
    errors[name] ? <p className="field-error" id={`${name}-error`} role="alert">{text}</p> : null;
  const invalid = (name: keyof LeadInput) => (errors[name] ? { 'aria-invalid': true, 'aria-describedby': `${name}-error` } : {});

  return (
    <div className="card form-card">
      <div className="steps" role="list" aria-label={stepsLabel}>
        {copy.steps.map((label, index) => (
          <div className={`step ${index <= step ? 'active' : ''}`} key={label} role="listitem" aria-current={index === step ? 'step' : undefined}>
            {digits(locale, index + 1)}. {label}
          </div>
        ))}
      </div>
      <div aria-live="polite">{message && <div role="status" className={`notice ${success ? '' : 'error'}`}>{message}</div>}</div>
      {!success && (
        <form onSubmit={submit} noValidate>
          <div hidden aria-hidden="true">
            <label htmlFor="website">Website</label>
            <input id="website" tabIndex={-1} autoComplete="off" {...register('website')} />
          </div>
          <input type="hidden" {...register('locale')} />

          {step === 0 && (
            <fieldset className="field" style={{ border: 0, padding: 0, margin: 0 }}>
              <legend className="field-label">{copy.labels.type}</legend>
              <div className="choice-grid">
                {copy.projectTypes.map((option) => (
                  <label className="choice" key={option}>
                    <input type="radio" value={option} {...register('projectType')} />
                    <span>{option}</span>
                  </label>
                ))}
              </div>
              {fieldError('projectType', copy.errors.type)}
            </fieldset>
          )}

          {step === 1 && (
            <>
              <fieldset className="field" style={{ border: 0, padding: 0 }}>
                <legend className="field-label">{copy.labels.budget}</legend>
                <div className="choice-grid">
                  {copy.budgets.map((option) => (
                    <label className="choice" key={option}>
                      <input type="radio" value={option} {...register('budget')} />
                      <span>{option}</span>
                    </label>
                  ))}
                </div>
                {fieldError('budget', copy.errors.budget)}
              </fieldset>
              <div className="field">
                <label htmlFor="timeline">{copy.labels.timeline}</label>
                <select id="timeline" defaultValue="" {...invalid('timeline')} {...register('timeline')}>
                  <option value="" disabled>{copy.labels.choose}</option>
                  {copy.timelines.map((option) => <option key={option}>{option}</option>)}
                </select>
                {fieldError('timeline', copy.errors.timeline)}
              </div>
            </>
          )}

          {step === 2 && (
            <>
              <div className="field">
                <label htmlFor="lead-name">{copy.labels.name}</label>
                <input id="lead-name" autoComplete="name" {...invalid('name')} {...register('name')} />
                {fieldError('name', copy.errors.name)}
              </div>
              <div className="field">
                <label htmlFor="lead-email">{copy.labels.email}</label>
                <input id="lead-email" type="email" dir="ltr" autoComplete="email" {...invalid('email')} {...register('email')} />
                {fieldError('email', copy.errors.email)}
              </div>
              <div className="field">
                <label htmlFor="lead-phone">{copy.labels.phone}</label>
                <input id="lead-phone" type="tel" dir="ltr" autoComplete="tel" {...invalid('phone')} {...register('phone')} />
                {fieldError('phone', copy.errors.phone)}
              </div>
              <div className="field">
                <label htmlFor="lead-details">{copy.labels.details}</label>
                <textarea id="lead-details" {...invalid('details')} {...register('details')} />
                {fieldError('details', copy.errors.details)}
              </div>
              <div className="field">
                <label className="consent-label">
                  <input type="checkbox" {...invalid('consent')} {...register('consent')} />
                  <span>
                    {copy.labels.consent}{' '}
                    <Link href={prefixPath(locale, '/privacy')} className="inline-link">{copy.labels.privacyLink}</Link>
                  </span>
                </label>
                {fieldError('consent', copy.errors.consent)}
              </div>
            </>
          )}

          <div className="form-actions">
            {step > 0 ? (
              <button type="button" className="btn btn-outline" onClick={() => setStep(step - 1)}>
                <Back size={17} aria-hidden="true" />
                {copy.labels.back}
              </button>
            ) : (
              <span />
            )}
            {step < 2 ? (
              <button type="button" className="btn btn-primary" onClick={next}>
                {copy.labels.next}
                <Forward size={17} aria-hidden="true" />
              </button>
            ) : (
              <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
                {isSubmitting ? copy.labels.sending : copy.labels.submit}
                <Forward size={17} aria-hidden="true" />
              </button>
            )}
          </div>
        </form>
      )}
    </div>
  );
}
