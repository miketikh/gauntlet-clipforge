/**
 * Video event waiter utilities
 * Promise-based helpers for waiting on video element events with timeouts
 */

/**
 * Generic helper to wait for a video element event with timeout
 * @param element - Video element to wait on
 * @param eventName - Name of the event to wait for
 * @param timeout - Timeout in milliseconds
 * @returns Promise that resolves when event fires or timeout expires
 */
async function waitForEvent(
  element: HTMLVideoElement,
  eventName: string,
  timeout: number
): Promise<void> {
  return new Promise<void>((resolve) => {
    const onEvent = () => {
      element.removeEventListener(eventName, onEvent);
      resolve();
    };

    element.addEventListener(eventName, onEvent);

    setTimeout(() => {
      element.removeEventListener(eventName, onEvent);
      resolve();
    }, timeout);
  });
}

/**
 * Wait for video element to be ready to play
 * @param element - Video element to wait on
 * @param timeout - Timeout in milliseconds (default: 10000)
 * @returns Promise that resolves when canplay fires or timeout expires
 */
export async function waitForCanPlay(element: HTMLVideoElement, timeout = 10000): Promise<void> {
  return waitForEvent(element, 'canplay', timeout);
}

/**
 * Wait for video seek operation to complete
 * @param element - Video element to wait on
 * @param timeout - Timeout in milliseconds (default: 100)
 * @returns Promise that resolves when seeked fires or timeout expires
 */
export async function waitForSeeked(element: HTMLVideoElement, timeout = 100): Promise<void> {
  return waitForEvent(element, 'seeked', timeout);
}

/**
 * Wait for video to start playing
 * @param element - Video element to wait on
 * @param timeout - Timeout in milliseconds (default: 200)
 * @returns Promise that resolves when playing fires or timeout expires
 */
export async function waitForPlaying(element: HTMLVideoElement, timeout = 200): Promise<void> {
  return waitForEvent(element, 'playing', timeout);
}
