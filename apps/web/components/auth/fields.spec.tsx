import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PasswordField, TextField } from './fields';

describe('TextField', () => {
  it('links the label and the error message to the input', () => {
    render(<TextField name="email" label="E-mel" error="Masukkan alamat e-mel yang sah." />);
    const input = screen.getByLabelText('E-mel');
    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(input).toHaveAccessibleDescription('Masukkan alamat e-mel yang sah.');
  });

  it('shows a hint when there is no error', () => {
    render(<TextField name="password" label="Kata laluan" hint="Sekurang-kurangnya 8 aksara." />);
    expect(screen.getByLabelText('Kata laluan')).toHaveAccessibleDescription('Sekurang-kurangnya 8 aksara.');
  });
});

describe('PasswordField', () => {
  it('hides the password until "Show" is pressed', async () => {
    render(<PasswordField name="password" label="Kata laluan" showLabel="Tunjuk" hideLabel="Sembunyi" />);
    const input = screen.getByLabelText('Kata laluan');
    expect(input).toHaveAttribute('type', 'password');

    await userEvent.click(screen.getByRole('button', { name: 'Tunjuk' }));
    expect(input).toHaveAttribute('type', 'text');

    await userEvent.click(screen.getByRole('button', { name: 'Sembunyi' }));
    expect(input).toHaveAttribute('type', 'password');
  });
});
