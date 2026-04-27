import { exchangeService } from '../modules/exchange/exchange.service.js';

import type { Logger } from 'pino';

export async function runExchangeRateCron(logger: Logger) {
  logger.info('Running exchange rate update cron...');
  const result = await exchangeService.updateRates('USD');
  logger.info(`Exchange rates updated: ${result.updated} rates`);
}
