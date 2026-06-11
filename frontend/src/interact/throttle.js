/** Trailing-edge throttle: první volání projde hned, volání v intervalu se
 *  slijí a po jeho uplynutí odejdou poslední argumenty. */
export function throttle(fn, interval, {
  now = () => Date.now(),
  schedule = (cb, delay) => setTimeout(cb, delay),
} = {}) {
  let lastCall = -Infinity;
  let pendingArgs = null;
  let timerActive = false;

  function fire(args) {
    lastCall = now();
    fn(...args);
  }

  return (...args) => {
    const elapsed = now() - lastCall;
    if (!timerActive && elapsed >= interval) {
      fire(args);
      return;
    }
    pendingArgs = args;
    if (!timerActive) {
      timerActive = true;
      schedule(() => {
        timerActive = false;
        const toSend = pendingArgs;
        pendingArgs = null;
        fire(toSend);
      }, Math.max(0, interval - elapsed));
    }
  };
}
