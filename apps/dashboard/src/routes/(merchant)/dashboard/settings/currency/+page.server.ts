import type { PageServerLoad } from './$types';
import { apiFetch } from '$lib/server/api';

export const load: PageServerLoad = async ({ cookies }) => {
	const cookie = `access_token=${cookies.get('access_token')}`;
	try {
		const [ratesRes, storeRes] = await Promise.all([
			apiFetch(`/api/v1/public/currency/rates`, { headers: { Cookie: cookie } }),
			apiFetch(`/api/v1/merchant/store`, { headers: { Cookie: cookie } }),
		]);
		const rates = ratesRes.ok ? await ratesRes.json() : { rates: [] };
		const store = storeRes.ok ? await storeRes.json() : { currency: 'USD' };
		return { rates: rates.rates || [], storeCurrency: store.currency || 'USD' };
	} catch {
		return { rates: [], storeCurrency: 'USD' };
	}
};
