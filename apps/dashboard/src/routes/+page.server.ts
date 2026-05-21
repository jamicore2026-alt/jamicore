import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ url }) => {
	const host = url.hostname;

	// Domain-aware landing: admin domain → super admin login
	if (host === 'admin.al-ektefa.com') {
		redirect(307, '/admin-login');
	}

	// Merchant domain → merchant login
	if (host === 'merchant.al-ektefa.com') {
		redirect(307, '/login');
	}

	// Fallback: redirect to merchant dashboard
	redirect(307, '/dashboard');
};
