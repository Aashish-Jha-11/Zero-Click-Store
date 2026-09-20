'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

/* The Web Speech API is not in TypeScript's DOM lib. */
interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}
interface SpeechRecognitionResult {
  isFinal: boolean;
  length: number;
  [index: number]: SpeechRecognitionAlternative;
}
interface SpeechRecognitionResultList {
  length: number;
  [index: number]: SpeechRecognitionResult;
}
interface SpeechRecognitionEvent extends Event {
  resultIndex: number;
  results: SpeechRecognitionResultList;
}
interface SpeechRecognitionErrorEvent extends Event {
  error: string;
  message: string;
}
interface SpeechRecognitionLike extends EventTarget {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((e: SpeechRecognitionEvent) => void) | null;
  onerror: ((e: SpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
  onstart: (() => void) | null;
}
type SpeechRecognitionCtor = new () => SpeechRecognitionLike;

function getCtor(): SpeechRecognitionCtor | null {
  if (typeof window === 'undefined') return null;
  const w = window as any;
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

/**
 * Hinglish dictation.
 *
 * `hi-IN` returns Devanagari, which the agent understands but which reads oddly
 * in the input box. `en-IN` keeps Latin script and copes well with the
 * Hindi-English mix a kirana customer actually speaks, so it is the default.
 */
export type SpeechLang = 'en-IN' | 'hi-IN';

export interface UseSpeechResult {
  supported: boolean;
  listening: boolean;
  interim: string;
  error: string | null;
  lang: SpeechLang;
  setLang: (l: SpeechLang) => void;
  start: () => void;
  stop: () => void;
  toggle: () => void;
}

export function useSpeech(onFinal: (text: string) => void): UseSpeechResult {
  const [supported, setSupported] = useState(false);
  const [listening, setListening] = useState(false);
  const [interim, setInterim] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [lang, setLang] = useState<SpeechLang>('en-IN');

  const recRef = useRef<SpeechRecognitionLike | null>(null);
  const finalRef = useRef('');
  // Keep the latest callback without restarting recognition on every render.
  const onFinalRef = useRef(onFinal);
  onFinalRef.current = onFinal;

  useEffect(() => {
    setSupported(getCtor() !== null);
  }, []);

  const stop = useCallback(() => {
    recRef.current?.stop();
  }, []);

  const start = useCallback(() => {
    const Ctor = getCtor();
    if (!Ctor) {
      setError('This browser cannot do speech recognition. Try Chrome.');
      return;
    }
    // Tapping while already listening should not stack recognisers.
    recRef.current?.abort();

    const rec = new Ctor();
    rec.lang = lang;
    rec.continuous = true;
    rec.interimResults = true;
    rec.maxAlternatives = 1;

    finalRef.current = '';
    setError(null);
    setInterim('');

    rec.onstart = () => setListening(true);

    rec.onresult = (e) => {
      let interimText = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const result = e.results[i];
        const text = result[0]?.transcript ?? '';
        if (result.isFinal) finalRef.current += text;
        else interimText += text;
      }
      setInterim(interimText);
    };

    rec.onerror = (e) => {
      const map: Record<string, string> = {
        'not-allowed': 'Microphone blocked. Allow it in the address bar.',
        'service-not-allowed': 'Microphone blocked by the browser.',
        'no-speech': "Didn't catch that — try again.",
        network: 'Speech service unreachable. Check your connection.',
        aborted: '',
      };
      const msg = map[e.error] ?? `Microphone error: ${e.error}`;
      if (msg) setError(msg);
      setListening(false);
    };

    rec.onend = () => {
      setListening(false);
      setInterim('');
      const text = finalRef.current.trim();
      if (text) onFinalRef.current(text);
      finalRef.current = '';
    };

    recRef.current = rec;
    try {
      rec.start();
    } catch {
      setError('Could not start the microphone.');
      setListening(false);
    }
  }, [lang]);

  const toggle = useCallback(() => {
    if (listening) stop();
    else start();
  }, [listening, start, stop]);

  // Never leave the mic hot on unmount.
  useEffect(() => () => recRef.current?.abort(), []);

  return { supported, listening, interim, error, lang, setLang, start, stop, toggle };
}
