/* Tiny, dependency-free logger with colour + level prefixes. */
const colors = {
  reset: '\x1b[0m',
  gray: '\x1b[90m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
};

const stamp = () => new Date().toISOString();

function log(color, label, message) {
  // eslint-disable-next-line no-console
  console.log(`${colors.gray}${stamp()}${colors.reset} ${color}${label}${colors.reset} ${message}`);
}

export const logger = {
  info: (msg) => log(colors.blue, 'INFO ', msg),
  success: (msg) => log(colors.green, 'OK   ', msg),
  warn: (msg) => log(colors.yellow, 'WARN ', msg),
  error: (msg) => log(colors.red, 'ERROR', msg),
};

export default logger;
