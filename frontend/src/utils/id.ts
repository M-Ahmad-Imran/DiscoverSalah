export const uid = (prefix = 'DS') =>
  `${prefix}-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
