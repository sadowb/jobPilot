// @vitest-environment jsdom
import { StrictMode, createRef, useState } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { cleanup, fireEvent, render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Dialog, Field, FieldGrid, Input, Select, Segmented, Textarea } from '../src/renderer/src/components/ui';

const nativeDialogMethods = Object.getOwnPropertyDescriptors(HTMLDialogElement.prototype);
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  for (const name of ['showModal', 'close']) {
    const descriptor = nativeDialogMethods[name];
    if (descriptor) Object.defineProperty(HTMLDialogElement.prototype, name, descriptor);
    else Reflect.deleteProperty(HTMLDialogElement.prototype, name);
  }
});

function markup(element: Parameters<typeof renderToStaticMarkup>[0]) {
  const container = document.createElement('div');
  container.innerHTML = renderToStaticMarkup(element);
  return container;
}

describe('form primitive markup', () => {
  it('associates generated labels and descriptions, preserving caller ARIA references', () => {
    const root = markup(
      <FieldGrid>
        <Field label="Name" hint="Use your full name" error="Name is required" wide>
          <Input aria-describedby="external-help" />
        </Field>
        <Field label="Biography">
          <Textarea />
        </Field>
      </FieldGrid>,
    );
    const input = root.querySelector('input')!;
    const label = root.querySelector('label')!;
    expect(label.htmlFor).toBe(input.id);
    expect(input.getAttribute('aria-labelledby')).toBe(label.id);
    expect(input.getAttribute('aria-invalid')).toBe('true');
    const descriptions = input.getAttribute('aria-describedby')!.split(' ');
    expect(descriptions[0]).toBe('external-help');
    expect(root.querySelector(`[id="${descriptions[1]}"]`)?.textContent).toBe('Use your full name');
    expect(root.querySelector(`[id="${descriptions[2]}"]`)?.textContent).toBe('Name is required');
    expect(label.parentElement?.classList.contains('col-span-full')).toBe(true);
    const textarea = root.querySelector('textarea')!;
    expect(textarea.id).not.toBe(input.id);
    expect(root.querySelectorAll('label')[1]?.htmlFor).toBe(textarea.id);
    expect(textarea.hasAttribute('aria-invalid')).toBe(false);
    expect(textarea.hasAttribute('aria-describedby')).toBe(false);
  });

  it('preserves explicit control IDs and invalid state without adding empty descriptions', () => {
    const root = markup(
      <Field label="Email" hint="" error="">
        <Input id="email" aria-invalid="grammar" />
      </Field>,
    );
    expect(root.querySelector('label')?.htmlFor).toBe('email');
    expect(root.querySelector('input')?.getAttribute('aria-invalid')).toBe('grammar');
    expect(root.querySelector('input')?.hasAttribute('aria-describedby')).toBe(false);
  });

  it.each(['md', 'sm'] as const)('renders a native %s select with an accessible inline chevron', (size) => {
    const root = markup(
      <Field label="Period" hint="Salary period">
        <Select size={size} className="w-auto min-w-28" name="period">
          <option>per year</option>
        </Select>
      </Field>,
    );
    const select = root.querySelector('select')!;
    expect(root.querySelector('label')?.htmlFor).toBe(select.id);
    expect(select.classList.contains('appearance-none')).toBe(true);
    expect(select.hasAttribute('size')).toBe(false);
    expect(select.name).toBe('period');
    expect(select.parentElement?.classList.contains('w-auto')).toBe(true);
    expect(select.classList.contains(size === 'sm' ? 'min-h-[38px]' : 'min-h-11')).toBe(true);
    const svg = root.querySelector('svg')!;
    expect(svg.getAttribute('stroke')).toBe('currentColor');
    expect(svg.getAttribute('aria-hidden')).toBe('true');
    expect(svg.classList.contains('pointer-events-none')).toBe(true);
    expect(svg.classList.contains('size-3')).toBe(true);
    expect(svg.classList.contains('right-3.5')).toBe(true);
    expect(root.querySelector('[style], style')).toBeNull();
  });

  it('renders named radio semantics with one tab stop and field errors', () => {
    const root = markup(
      <Field label="Photo on CV" error="Choose an answer">
        <Segmented
          options={[
            { value: 'yes', label: 'Yes' },
            { value: 'no', label: 'No' },
          ]}
          value="no"
          onChange={() => {}}
        />
      </Field>,
    );
    const group = root.querySelector('[role="radiogroup"]')!;
    expect(group.getAttribute('aria-labelledby')).toBe(root.querySelector('label')?.id);
    expect(group.getAttribute('aria-invalid')).toBe('true');
    expect(group.getAttribute('aria-describedby')).toBe(root.querySelector('[role="alert"]')?.id);
    const radios = root.querySelectorAll('button[role="radio"]');
    expect(radios).toHaveLength(2);
    expect(radios[0]?.getAttribute('aria-checked')).toBe('false');
    expect(radios[0]?.getAttribute('tabindex')).toBe('-1');
    expect(radios[1]?.getAttribute('aria-checked')).toBe('true');
    expect(radios[1]?.getAttribute('tabindex')).toBe('0');
    expect(root.querySelector('[style], style')).toBeNull();
  });
});

describe('form primitive interaction', () => {
  it('forwards refs to native controls', () => {
    const input = createRef<HTMLInputElement>();
    const textarea = createRef<HTMLTextAreaElement>();
    const select = createRef<HTMLSelectElement>();
    render(
      <>
        <Input ref={input} />
        <Textarea ref={textarea} />
        <Select ref={select}>
          <option>One</option>
        </Select>
      </>,
    );
    expect(input.current?.tagName).toBe('INPUT');
    expect(textarea.current?.tagName).toBe('TEXTAREA');
    expect(select.current?.tagName).toBe('SELECT');
  });

  it('moves selection AND focus, wraps, and skips disabled radio options', () => {
    function Choice() {
      const [value, setValue] = useState('yes');
      return (
        <Segmented
          label="Choice"
          value={value}
          onChange={setValue}
          options={[
            { value: 'yes', label: 'Yes' },
            { value: 'maybe', label: 'Maybe', disabled: true },
            { value: 'no', label: 'No' },
          ]}
        />
      );
    }
    const view = render(<Choice />);
    const yes = view.getByRole('radio', { name: 'Yes' });
    const no = view.getByRole('radio', { name: 'No' });
    yes.focus();
    fireEvent.keyDown(yes, { key: 'ArrowRight' });
    expect(document.activeElement).toBe(no);
    expect(no.getAttribute('aria-checked')).toBe('true');
    fireEvent.keyDown(no, { key: 'ArrowDown' });
    expect(document.activeElement).toBe(yes);
    fireEvent.keyDown(yes, { key: 'ArrowLeft' });
    expect(document.activeElement).toBe(no);
    fireEvent.keyDown(no, { key: 'Home' });
    expect(document.activeElement).toBe(yes);
    fireEvent.keyDown(yes, { key: 'End' });
    expect(document.activeElement).toBe(no);
    fireEvent.click(yes);
    expect(yes.getAttribute('aria-checked')).toBe('true');
  });
});

describe('Dialog lifecycle', () => {
  // jsdom does not implement the browser's top layer or native focus trap.
  function mockNativeDialog() {
    Object.defineProperty(HTMLDialogElement.prototype, 'showModal', {
      configurable: true,
      value: vi.fn(function (this: HTMLDialogElement) {
        this.open = true;
        this.querySelector('button')?.focus();
      }),
    });
    Object.defineProperty(HTMLDialogElement.prototype, 'close', {
      configurable: true,
      value: vi.fn(function (this: HTMLDialogElement) {
        this.open = false;
      }),
    });
  }

  it('opens modally, labels its header, locks scrolling, and restores the opener in StrictMode', () => {
    mockNativeDialog();
    function Example() {
      const [open, setOpen] = useState(false);
      return (
        <>
          <button onClick={() => setOpen(true)}>Edit</button>
          <Dialog open={open} onClose={() => setOpen(false)} title="Edit profile" description="Your details">
            <Input />
          </Dialog>
        </>
      );
    }
    const view = render(
      <StrictMode>
        <Example />
      </StrictMode>,
    );
    const opener = view.getByText('Edit');
    opener.focus();
    fireEvent.click(opener);
    const dialog = view.getByRole('dialog', { name: 'Edit profile' });
    expect(HTMLDialogElement.prototype.showModal).toHaveBeenCalled();
    expect(document.getElementById(dialog.getAttribute('aria-describedby')!)?.textContent).toBe('Your details');
    expect(document.body.classList.contains('overflow-hidden!')).toBe(true);
    expect(dialog.querySelector('[style], style')).toBeNull();
    fireEvent(dialog, new Event('cancel', { cancelable: true }));
    expect(dialog.hasAttribute('open')).toBe(false);
    expect(document.body.classList.contains('overflow-hidden!')).toBe(false);
    expect(document.activeElement).toBe(opener);
    fireEvent.click(opener);
    fireEvent.click(view.getByRole('button', { name: 'Close editor' }));
    expect(dialog.hasAttribute('open')).toBe(false);
    fireEvent.click(opener);
    fireEvent.click(view.getByRole('button', { name: 'Done' }));
    expect(dialog.hasAttribute('open')).toBe(false);
  });

  it('closes only for a click that starts on the backdrop, and cleans up on unmount', () => {
    mockNativeDialog();
    const onClose = vi.fn();
    const view = render(
      <Dialog open onClose={onClose} title="Title">
        <Input aria-label="Name" />
      </Dialog>,
    );
    const dialog = view.getByRole('dialog');
    vi.spyOn(dialog, 'getBoundingClientRect').mockReturnValue({
      left: 100,
      right: 740,
      top: 100,
      bottom: 500,
    } as DOMRect);
    fireEvent.pointerDown(view.getByLabelText('Name'));
    fireEvent.click(dialog, { clientX: 10, clientY: 10 });
    expect(onClose).not.toHaveBeenCalled();
    fireEvent.pointerDown(dialog);
    fireEvent.click(dialog, { clientX: 101, clientY: 101 });
    expect(onClose).not.toHaveBeenCalled();
    fireEvent.pointerDown(dialog);
    fireEvent.click(dialog, { clientX: 10, clientY: 10 });
    expect(onClose).toHaveBeenCalledTimes(1);
    view.unmount();
    expect(document.body.classList.contains('overflow-hidden!')).toBe(false);
  });

  it('keeps scrolling locked until all open dialogs close and preserves an existing lock', () => {
    mockNativeDialog();
    const first = render(
      <Dialog open onClose={() => {}} title="First">
        One
      </Dialog>,
    );
    const second = render(
      <Dialog open onClose={() => {}} title="Second">
        Two
      </Dialog>,
    );
    first.unmount();
    expect(document.body.classList.contains('overflow-hidden!')).toBe(true);
    second.unmount();
    expect(document.body.classList.contains('overflow-hidden!')).toBe(false);
    document.body.classList.add('overflow-hidden!');
    const third = render(
      <Dialog open onClose={() => {}} title="Third">
        Three
      </Dialog>,
    );
    third.unmount();
    expect(document.body.classList.contains('overflow-hidden!')).toBe(true);
    document.body.classList.remove('overflow-hidden!');
  });
});
