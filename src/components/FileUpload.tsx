import { useRef, useState, type ChangeEvent, type DragEvent } from 'react'
import { Trans, useTranslation } from 'react-i18next'
import { useBookmarkStore } from '../store/useBookmarkStore.ts'
import { NetscapeAdapter } from '../core/adapters/NetscapeAdapter.ts'
import { cx } from '../lib/cx.ts'

interface Props {
  variant?: 'dropzone' | 'button'
}

type Status = 'idle' | 'parsing' | 'error'

export function FileUpload({ variant = 'dropzone' }: Props) {
  const { t } = useTranslation()
  const load = useBookmarkStore(s => s.load)
  const inputRef = useRef<HTMLInputElement>(null)
  const [status, setStatus] = useState<Status>('idle')
  const [error, setError] = useState<string | null>(null)
  const [dragging, setDragging] = useState(false)

  async function handleFile(file: File) {
    setStatus('parsing')
    setError(null)
    try {
      const adapter = new NetscapeAdapter(file)
      await load(adapter)
      setStatus('idle')
    } catch (e) {
      setError(e instanceof Error ? e.message : t('fileUpload.errorGeneric'))
      setStatus('error')
    }
  }

  function onSelect(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) void handleFile(file)
    e.target.value = ''
  }

  function onDrop(e: DragEvent<HTMLLabelElement>) {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files?.[0]
    if (file) void handleFile(file)
  }

  function onDragOver(e: DragEvent<HTMLLabelElement>) {
    e.preventDefault()
    setDragging(true)
  }

  if (variant === 'button') {
    return (
      <>
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={status === 'parsing'}
          className={cx(
            'font-sans text-sm text-ink border-b border-ink pb-[2px]',
            'transition-colors duration-150',
            'hover:text-accent hover:border-accent',
            'disabled:text-ink-mute disabled:border-ink-mute disabled:cursor-wait',
          )}
        >
          {status === 'parsing' ? t('fileUpload.parsing') : t('fileUpload.loadAnother')}
        </button>
        <input
          ref={inputRef}
          type="file"
          accept=".html,text/html"
          onChange={onSelect}
          className="sr-input"
        />
      </>
    )
  }

  return (
    <label
      onDragOver={onDragOver}
      onDragLeave={() => setDragging(false)}
      onDrop={onDrop}
      className={cx(
        'mx-auto flex w-full max-w-[560px] min-h-[420px] items-center justify-center',
        'cursor-pointer rounded-md border border-dashed p-10 sm:p-12',
        'transition-colors duration-200 text-ink-soft',
        dragging || status === 'idle' ? '' : '',
        !dragging && status === 'idle' && 'border-ink-mute hover:border-accent hover:bg-paper-soft hover:text-ink',
        dragging && 'border-accent bg-paper-soft text-ink',
        status === 'parsing' && 'border-solid border-ink-soft',
        status === 'error' && 'border-accent',
      )}
    >
      <input
        ref={inputRef}
        type="file"
        accept=".html,text/html"
        onChange={onSelect}
        className="sr-input"
      />
      <div className="flex max-w-[420px] flex-col items-center gap-3 text-center">
        <svg
          viewBox="0 0 48 48"
          aria-hidden="true"
          className={cx(
            'mb-2 h-11 w-11 transition-colors duration-200',
            dragging ? 'text-accent' : 'text-ink-mute',
          )}
        >
          <path
            d="M12 6 h20 l8 8 v28 h-28 z"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinejoin="round"
          />
          <path
            d="M32 6 v8 h8"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinejoin="round"
          />
        </svg>
        <h2 className="font-display text-3xl leading-tight text-ink m-0">
          {t('fileUpload.title')}
        </h2>
        <span className="my-1 h-px w-8 bg-ink-mute" aria-hidden="true" />
        <p className="text-[15px] text-ink-soft m-0">
          <Trans
            i18nKey="fileUpload.hint"
            components={{
              code: (
                <code className="font-mono text-[0.875em] bg-paper-soft rounded-sm px-1.5 py-[1px]" />
              ),
            }}
          />
        </p>
        <ul className="mt-4 flex flex-col gap-1.5 font-mono text-xs text-ink-mute text-left leading-relaxed list-none p-0">
          <li>
            <span className="inline-block w-4 text-ink-mute">→</span>{' '}
            <strong className="font-medium text-ink-soft">{t('fileUpload.browserChrome')}</strong>:{' '}
            {t('fileUpload.instructionsChrome')}
          </li>
          <li>
            <span className="inline-block w-4 text-ink-mute">→</span>{' '}
            <strong className="font-medium text-ink-soft">{t('fileUpload.browserFirefox')}</strong>:{' '}
            {t('fileUpload.instructionsFirefox')}
          </li>
          <li>
            <span className="inline-block w-4 text-ink-mute">→</span>{' '}
            <strong className="font-medium text-ink-soft">{t('fileUpload.browserSafari')}</strong>:{' '}
            {t('fileUpload.instructionsSafari')}
          </li>
        </ul>
        {status === 'parsing' && (
          <div className="progress-bar mt-4 h-px w-full bg-edge" aria-hidden="true" />
        )}
        {error && (
          <p className="mt-4 font-mono text-xs text-accent m-0">{error}</p>
        )}
      </div>
    </label>
  )
}
