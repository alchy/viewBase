export const PROTOCOL_VERSION = 1;

export function hello() {
  return { type: 'hello', protocol: PROTOCOL_VERSION };
}

export function encode(message) {
  return JSON.stringify(message);
}

export function decode(raw) {
  const message = JSON.parse(raw);
  if (!message || typeof message !== 'object' || !message.type) {
    throw new Error('Neplatná zpráva protokolu');
  }
  return message;
}
