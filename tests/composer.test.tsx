// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Composer } from '../src/renderer/src/features/inbox/Composer';

afterEach(cleanup);

const setup = (props: Partial<Parameters<typeof Composer>[0]> = {}) => {
  const onSend = vi.fn();
  const onStop = vi.fn();
  render(<Composer placeholder="Message Cap" onSend={onSend} onStop={onStop} {...props} />);
  return { onSend, onStop, field: screen.getByLabelText('Message Cap') as HTMLTextAreaElement };
};

describe('Composer (#255)', () => {
  it('sends on Enter, clears at once, and trims', () => {
    const { onSend, field } = setup();
    fireEvent.change(field, { target: { value: '  hello  ' } });
    fireEvent.keyDown(field, { key: 'Enter' });
    expect(onSend).toHaveBeenCalledWith('hello');
    expect(field.value).toBe('');
  });

  it('keeps Shift+Enter for a new line', () => {
    const { onSend, field } = setup();
    fireEvent.change(field, { target: { value: 'line one' } });
    fireEvent.keyDown(field, { key: 'Enter', shiftKey: true });
    expect(onSend).not.toHaveBeenCalled();
    expect(field.value).toBe('line one');
  });

  it('does not send empty text', () => {
    const { onSend, field } = setup();
    fireEvent.change(field, { target: { value: '   ' } });
    fireEvent.keyDown(field, { key: 'Enter' });
    expect(onSend).not.toHaveBeenCalled();
  });

  it('stays editable while a reply streams, cancels on Esc, and does not send until it ends', () => {
    const { onSend, onStop, field } = setup({ replying: true });
    expect(field.disabled).toBe(false);
    fireEvent.change(field, { target: { value: 'next thought' } });
    fireEvent.keyDown(field, { key: 'Enter' });
    expect(onSend).not.toHaveBeenCalled();
    expect(field.value).toBe('next thought');
    fireEvent.keyDown(field, { key: 'Escape' });
    expect(onStop).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole('button', { name: 'Stop reply' }));
    expect(onStop).toHaveBeenCalledTimes(2);
  });

  it('ignores Esc when nothing is being written', () => {
    const { onStop, field } = setup();
    fireEvent.keyDown(field, { key: 'Escape' });
    expect(onStop).not.toHaveBeenCalled();
  });

  it('sends a quick-reply chip, and hides chips while typing or replying', () => {
    const { onSend, field } = setup({ chips: ['What is running?'] });
    fireEvent.click(screen.getByRole('button', { name: 'What is running?' }));
    expect(onSend).toHaveBeenCalledWith('What is running?');
    fireEvent.change(field, { target: { value: 'x' } });
    expect(screen.queryByRole('button', { name: 'What is running?' })).toBeNull();
    cleanup();
    setup({ chips: ['What is running?'], replying: true });
    expect(screen.queryByRole('button', { name: 'What is running?' })).toBeNull();
  });

  it('does not send on Enter while an IME composition is open', () => {
    const { onSend, field } = setup();
    fireEvent.change(field, { target: { value: 'こん' } });
    fireEvent.keyDown(field, { key: 'Enter', isComposing: true });
    expect(onSend).not.toHaveBeenCalled();
  });
});
