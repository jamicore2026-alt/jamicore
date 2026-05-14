import type { PageServerLoad } from './$types';
import { apiFetch } from '$lib/server/api';

export const load: PageServerLoad = async ({ cookies, url }) => {
	const cookie = `access_token=${cookies.get('access_token')}`;

	const startDate = url.searchParams.get('startDate');
	const endDate = url.searchParams.get('endDate');

	let revenueUrl = '/api/v1/merchant/analytics/revenue?period=daily';
	if (startDate) revenueUrl += `&startDate=${encodeURIComponent(startDate)}`;
	if (endDate) revenueUrl += `&endDate=${encodeURIComponent(endDate)}`;

	try {
		const [statsRes, revenueRes, topProductsRes, orderStatusRes, customerInsightsRes] = await Promise.all([
			apiFetch('/api/v1/merchant/analytics/dashboard', { headers: { Cookie: cookie } }),
			apiFetch(revenueUrl, { headers: { Cookie: cookie } }),
			apiFetch('/api/v1/merchant/analytics/top-products', { headers: { Cookie: cookie } }),
			apiFetch('/api/v1/merchant/analytics/orders-by-status', { headers: { Cookie: cookie } }),
			apiFetch('/api/v1/merchant/analytics/customer-insights', { headers: { Cookie: cookie } }),
		]);

		const stats = statsRes.ok ? await statsRes.json() : null;
		const revenue = revenueRes.ok ? await revenueRes.json() : { data: [] };
		const topProducts = topProductsRes.ok ? await topProductsRes.json() : { data: [] };
		const orderStatus = orderStatusRes.ok ? await orderStatusRes.json() : { data: [] };
		const customerInsights = customerInsightsRes.ok ? await customerInsightsRes.json() : null;

		return {
			stats: stats?.stats ?? null,
			revenue: revenue?.data ?? [],
			topProducts: topProducts?.data ?? [],
			orderStatus: orderStatus?.data ?? [],
			customerInsights: customerInsights?.data ?? null,
		};
	} catch {
		return { stats: null, revenue: [], topProducts: [], orderStatus: [], customerInsights: null };
	}
};
