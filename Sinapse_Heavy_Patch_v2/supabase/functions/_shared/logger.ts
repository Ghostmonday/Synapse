export const logger = {
  info: (msg: string, data?: any) => console.log(`[Sinapse INFO] ${msg}`, data || ''),
  warn: (msg: string, data?: any) => console.warn(`[Sinapse WARN] ${msg}`, data || ''),
  error: (msg: string, data?: any) => console.error(`[Sinapse ERROR] ${msg}`, data || ''),
};
