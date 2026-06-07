import { promises as dns } from 'node:dns';

export const dnsService = {
  async resolveCname(domain: string): Promise<string[]> {
    try {
      return await dns.resolveCname(domain);
    } catch {
      return [];
    }
  },

  async resolveTxt(domain: string): Promise<string[][]> {
    try {
      return await dns.resolveTxt(domain);
    } catch {
      return [];
    }
  },

  async verifyCnameRecord(domain: string, expectedTarget: string): Promise<boolean> {
    const records = await this.resolveCname(domain);
    return records.some(
      (r) => r.replace(/\.$/, '').toLowerCase() === expectedTarget.toLowerCase()
    );
  },

  async verifyTxtRecord(fullTxtName: string, expectedValue: string): Promise<boolean> {
    const records = await this.resolveTxt(fullTxtName);
    return records.some((arr) =>
      arr.some((r) => r === expectedValue)
    );
  },
};
