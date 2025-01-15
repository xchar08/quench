// src/hooks/useScript.js
import { useState, useEffect } from 'react';

const cachedScripts = [];

export default function useScript(src) {
  const [status, setStatus] = useState(src ? 'loading' : 'idle');

  useEffect(() => {
    if (!src) {
      setStatus('idle');
      return;
    }

    // Check if the script is already cached
    if (cachedScripts.includes(src)) {
      setStatus('ready');
      return;
    }

    // Create script
    const script = document.createElement('script');
    script.src = src;
    script.async = true;
    script.defer = true;

    // Handle script events
    const onScriptLoad = () => {
      setStatus('ready');
      cachedScripts.push(src);
    };
    const onScriptError = () => {
      setStatus('error');
    };

    script.addEventListener('load', onScriptLoad);
    script.addEventListener('error', onScriptError);

    document.head.appendChild(script);

    // Remove event listeners on cleanup
    return () => {
      script.removeEventListener('load', onScriptLoad);
      script.removeEventListener('error', onScriptError);
    };
  }, [src]);

  return status;
}
