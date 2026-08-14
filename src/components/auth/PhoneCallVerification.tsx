import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { CopyIcon, CheckIcon } from '@/components/icons';
import { copyToClipboard } from '../../utils/clipboard';
import { extractPhoneDigits, formatPhoneDigits, formatPhoneNumber } from '../../utils/phone';
import type { PhoneCallStart } from '../../api/auth';

/**
 * Подтверждение номера входящим звонком: ввод номера → номер для звонка →
 * ожидание. Общий для входа и для привязки номера к аккаунту — сценарии
 * отличаются только тем, что делает бэкенд после подтверждения, а не тем,
 * что видит и делает пользователь.
 */
interface Props {
  /** Начать проверку: отдаёт номер, на который звонить. */
  start: (phone: string) => Promise<PhoneCallStart>;
  /** Опрос. true = всё готово, компонент останавливается. */
  poll: (sessionId: string) => Promise<boolean>;
  submitLabel?: string;
  hint?: string;
  /** Сохранённая сессия переживает перезагрузку страницы — см. ниже. */
  storageKey?: string;
}

interface StoredSession {
  sessionId: string;
  dialNumber: string;
  /** Unix-время, после которого сессию восстанавливать бессмысленно. */
  until: number;
}

const POLL_INTERVAL_MS = 1000;
/** Через сколько повторить попытку открыть звонилку, если пользователь всё ещё на странице. */
const AUTO_DIAL_RETRY_MS = 5000;
/** После этого запрос считаем зависшим и отправляем следующий, не дожидаясь его. */
const STALE_REQUEST_MS = 6000;
/** Предохранитель для забытой вкладки; совпадает с окном повторной выдачи на бэкенде. */
const HARD_STOP_MS = 10 * 60 * 1000;

/** Телефон, а не планшет и не десктоп: только там tel: ведёт в звонилку. */
const isPhone = () =>
  typeof window !== 'undefined' && window.matchMedia('(hover: none) and (pointer: coarse)').matches;

export default function PhoneCallVerification({
  start,
  poll,
  submitLabel,
  hint,
  storageKey,
}: Props) {
  const { t } = useTranslation();

  const [digits, setDigits] = useState('');
  const [step, setStep] = useState<'input' | 'waiting'>('input');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dialNumber, setDialNumber] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [focused, setFocused] = useState(false);
  const [copied, setCopied] = useState(false);
  const dialTriedAt = useRef(0);

  // Пока идёт звонок, мобильный браузер нередко выгружает вкладку и при
  // возврате перезагружает страницу — сессия в памяти теряется вместе с
  // оплаченным звонком. Поэтому храним её и восстанавливаем опрос.
  useEffect(() => {
    if (!storageKey) return;
    const raw = sessionStorage.getItem(storageKey);
    if (!raw) return;
    try {
      const saved = JSON.parse(raw) as StoredSession;
      if (!saved.sessionId || saved.until < Date.now()) {
        sessionStorage.removeItem(storageKey);
        return;
      }
      setSessionId(saved.sessionId);
      setDialNumber(saved.dialNumber);
      setStep('waiting');
    } catch {
      sessionStorage.removeItem(storageKey);
    }
  }, [storageKey]);

  const forgetSession = useCallback(() => {
    if (storageKey) sessionStorage.removeItem(storageKey);
  }, [storageKey]);

  // Разбор и форматирование — общие с формой покупки (utils/phone), чтобы поле
  // вело себя одинаково и чинилось в одном месте: своя копия логики здесь уже
  // приводила к разъехавшемуся поведению.
  const handleInput = (value: string) => {
    setDigits(extractPhoneDigits(value));
  };

  // Пока в поле нет ни одной цифры и оно не в фокусе — показываем плейсхолдер,
  // иначе «+7 » стоит в значении всегда.
  const inputValue = digits ? formatPhoneDigits(digits) : focused ? '+7 ' : '';
  const countdown = `${Math.floor(secondsLeft / 60)}:${String(secondsLeft % 60).padStart(2, '0')}`;

  const handleStart = async () => {
    setError(null);
    if (digits.length !== 10) {
      setError(t('auth.phoneTenDigits', 'Введите 10 цифр номера'));
      return;
    }
    setBusy(true);
    try {
      const data = await start(`+7${digits}`);
      setSessionId(data.session_id);
      setDialNumber(data.dial_number);
      setSecondsLeft(data.expires_in);
      setStep('waiting');
      // Люди ждут входящего звонка вместо того, чтобы позвонить самим, — самая
      // частая причина брошенного входа. Позвонить за пользователя браузер не
      // может (это запрет платформы), но открыть звонилку с уже набранным
      // номером — может: остаётся нажать вызов. Только на телефоне: на десктопе
      // tel: в лучшем случае откроет чужое приложение.
      //
      // Эта попытка идёт прямо в обработчике нажатия, пока «жест пользователя»
      // ещё не потрачен, — она самая надёжная. Повтор через несколько секунд
      // делает эффект в useEffect ниже, на случай если её заблокировали.
      dialTriedAt.current = Date.now();
      if (isPhone()) {
        window.location.href = `tel:${data.dial_number}`;
      }
      if (storageKey) {
        const saved: StoredSession = {
          sessionId: data.session_id,
          dialNumber: data.dial_number,
          until: Date.now() + HARD_STOP_MS,
        };
        sessionStorage.setItem(storageKey, JSON.stringify(saved));
      }
    } catch (err: unknown) {
      const detail = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      setError(detail || t('auth.phoneStartFailed', 'Не удалось начать проверку'));
    } finally {
      setBusy(false);
    }
  };

  const handleCopy = async () => {
    if (!dialNumber) return;
    await copyToClipboard(dialNumber);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const reset = () => {
    forgetSession();
    setStep('input');
    setSessionId(null);
    setDialNumber(null);
    setError(null);
  };

  // Повторная попытка открыть звонилку. Первая идёт в обработчике нажатия и
  // обычно срабатывает; но если браузер её заблокировал или пользователь просто
  // смотрит на экран, не понимая, чего от него хотят, — через пять секунд
  // пробуем снова. Условие `visibilityState === 'visible'` отсекает случай,
  // когда звонилка уже открылась: тогда вкладка в фоне и дёргать её незачем.
  useEffect(() => {
    if (step !== 'waiting' || !dialNumber || !isPhone()) return;

    const timer = setTimeout(() => {
      if (document.visibilityState !== 'visible') return;
      if (Date.now() - dialTriedAt.current < 4000) return;
      dialTriedAt.current = Date.now();
      window.location.href = `tel:${dialNumber}`;
    }, AUTO_DIAL_RETRY_MS);

    return () => clearTimeout(timer);
  }, [step, dialNumber]);

  // Опрос раз в секунду и ещё раз при возврате на страницу: пока пользователь
  // в звонилке, браузер замораживает таймеры фоновой вкладки, и без этого
  // подтверждённый (уже оплаченный) звонок остаётся незамеченным.
  useEffect(() => {
    if (step !== 'waiting' || !sessionId) return;

    let cancelled = false;
    // Не «идёт ли запрос», а «когда он начался»: Safari, уводя вкладку в фон на
    // время звонка, замораживает запрос — тот не завершается ни успехом, ни
    // ошибкой. С обычным булевым флагом это навсегда блокировало опрос: человек
    // возвращался, видел крутилку и через минуту — «время истекло», хотя звонок
    // прошёл. Поэтому зависший дольше STALE_REQUEST_MS запрос перестаём ждать и
    // отправляем следующий; опрос идемпотентен, лишний запрос безвреден.
    let inFlightSince = 0;
    const deadline = Date.now() + HARD_STOP_MS;

    const tick = async () => {
      if (cancelled) return;
      if (inFlightSince && Date.now() - inFlightSince < STALE_REQUEST_MS) return;
      inFlightSince = Date.now();
      try {
        const done = await poll(sessionId);
        if (done && !cancelled) {
          cancelled = true;
          forgetSession();
        }
      } catch (err: unknown) {
        const status = (err as { response?: { status?: number } })?.response?.status;
        const detail = (err as { response?: { data?: { detail?: string } } })?.response?.data
          ?.detail;
        if (status === 410 || status === 400) {
          cancelled = true;
          forgetSession();
          // На 410 сервер отвечает технически («время ожидания звонка истекло»),
          // а человеку нужно знать, что делать дальше. Текст 400 оставляем: там
          // причина конкретная — например, звонок пришёл с другого номера.
          setError(
            status === 410
              ? t(
                  'auth.phoneExpired',
                  'Звонок не дошёл. Нажмите «Продолжить» ещё раз и позвоните с того же номера.',
                )
              : detail || t('auth.phoneStartFailed', 'Не удалось начать проверку'),
          );
          setStep('input');
        }
      } finally {
        inFlightSince = 0;
      }
    };

    const timer = setInterval(() => {
      if (Date.now() > deadline) {
        cancelled = true;
        clearInterval(timer);
        forgetSession();
        setStep('input');
        setError(t('auth.phoneExpired', 'Время ожидания истекло'));
        return;
      }
      setSecondsLeft((left) => Math.max(0, left - 1));
      void tick();
    }, POLL_INTERVAL_MS);

    const onVisible = () => {
      if (document.hidden) return;
      // Вернулись из звонилки: запрос, начатый до ухода, мог зависнуть вместе с
      // вкладкой — снимаем блокировку и опрашиваем немедленно, не дожидаясь,
      // пока он протухнет по времени.
      inFlightSince = 0;
      void tick();
    };
    document.addEventListener('visibilitychange', onVisible);
    void tick();

    return () => {
      cancelled = true;
      clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [step, sessionId, poll, t, forgetSession]);

  if (step === 'input') {
    return (
      <form
        className="space-y-3"
        onSubmit={(e) => {
          e.preventDefault();
          void handleStart();
        }}
      >
        <div>
          <label htmlFor="phone" className="label">
            {t('auth.phoneLabel', 'Номер телефона')}
          </label>
          <input
            id="phone"
            name="phone"
            type="tel"
            inputMode="numeric"
            autoComplete="tel"
            className="input"
            placeholder="+7 ___ ___-__-__"
            value={inputValue}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            onChange={(e) => handleInput(e.target.value)}
          />
        </div>

        {error && (
          <p className="text-sm text-error-400" role="alert">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={busy || digits.length !== 10}
          className="btn-primary w-full py-2.5 disabled:opacity-50"
        >
          {busy ? (
            <span className="flex items-center justify-center gap-2">
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
              {t('common.loading')}
            </span>
          ) : (
            (submitLabel ?? t('auth.continueWithPhone', 'Продолжить'))
          )}
        </button>

        <p className="text-center text-xs text-dark-500">
          {hint ??
            t(
              'auth.phoneHint',
              'Мы покажем номер — позвоните на него, и вход произойдёт автоматически. Звонок бесплатный.',
            )}
        </p>
      </form>
    );
  }

  return (
    <div className="space-y-4 text-center">
      {/* Главное — что звонить должен пользователь. Прежний текст начинался с
          «Позвоните на этот номер», и половина читала это как «вам позвонят». */}
      <p className="text-base font-medium text-dark-100">
        {t('auth.phoneCallTitle', 'Позвоните нам — вход завершится сам')}
      </p>
      <p className="text-sm text-dark-400">
        {t(
          'auth.phoneCallInstruction',
          'Звонок бесплатный. Отвечать никто не будет — просто сбросьте вызов через пару секунд.',
        )}
      </p>

      {/* Действие раньше номера: номер нужен, только если звонилка не открылась
          сама или человек звонит с другого устройства. */}
      <a
        href={`tel:${dialNumber ?? ''}`}
        onClick={() => {
          dialTriedAt.current = Date.now();
        }}
        className="btn-primary flex w-full items-center justify-center gap-2 py-3 text-base"
      >
        {t('auth.phoneCallAction', 'Позвонить')}
      </a>

      <div className="rounded-xl border border-dark-700 bg-dark-800/60 px-4 py-3">
        <p className="text-xl font-semibold tracking-wide text-dark-50">
          {formatPhoneNumber(dialNumber)}
        </p>
        <button
          type="button"
          onClick={() => void handleCopy()}
          className="mx-auto mt-2 flex items-center gap-1.5 text-xs text-dark-400 transition-colors hover:text-dark-200"
        >
          {copied ? (
            <>
              <CheckIcon className="h-3.5 w-3.5 text-success-400" />
              {t('common.copied')}
            </>
          ) : (
            <>
              <CopyIcon className="h-3.5 w-3.5" />
              {t('common.copy')}
            </>
          )}
        </button>
      </div>

      {digits.length === 10 && (
        <p className="text-xs text-dark-500">
          {t('auth.phoneCallFromNumber', {
            phone: formatPhoneDigits(digits),
            defaultValue: 'Звоните с номера {{phone}}',
          })}
        </p>
      )}

      <div className="flex items-center justify-center gap-2 text-xs text-dark-500">
        <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-dark-600 border-t-accent-400" />
        {secondsLeft > 0
          ? `${t('auth.phoneWaitingCall', 'Ждём звонок')} · ${countdown}`
          : t('auth.phoneChecking', 'Проверяем звонок…')}
      </div>

      {error && (
        <p className="text-sm text-error-400" role="alert">
          {error}
        </p>
      )}

      <button
        type="button"
        onClick={reset}
        className="text-sm text-dark-400 transition-colors hover:text-dark-200"
      >
        {t('auth.phoneChangeNumber', 'Изменить номер')}
      </button>
    </div>
  );
}
