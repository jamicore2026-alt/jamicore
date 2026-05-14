import type { FastifyInstance } from 'fastify';
import { db } from '../../db/index.js';
import { products, categories, stores } from '../../db/schema.js';
import { eq } from 'drizzle-orm';
import { seoService } from './seo.service.js';

export default async function (fastify: FastifyInstance) {
  fastify.get('/robots.txt', async (_request, reply) => {
    reply.header('Content-Type', 'text/plain');
    return `User-agent: *\nAllow: /\nDisallow: /api/\nDisallow: /dashboard/\nDisallow: /admin/\nSitemap: /sitemap.xml\n`;
  });

  fastify.get('/sitemap.xml', async (request, reply) => {
    const storeId = request.storeId as string;
    const store = await db.select({ domain: stores.domain }).from(stores).where(eq(stores.id, storeId)).limit(1);
    const domain = store[0]?.domain ?? 'localhost';
    const baseUrl = `https://${domain}`;

    const productRows = await db.select({ id: products.id, updatedAt: products.updatedAt })
      .from(products)
      .where(eq(products.storeId, storeId));
    const categoryRows = await db.select({ id: categories.id, updatedAt: categories.updatedAt })
      .from(categories)
      .where(eq(categories.storeId, storeId));

    const urls = [
      { loc: `${baseUrl}/`, priority: '1.0', changefreq: 'daily', lastmod: undefined },
      { loc: `${baseUrl}/products`, priority: '0.8', changefreq: 'daily', lastmod: undefined },
      ...productRows.map((p) => ({
        loc: `${baseUrl}/products/${p.id}`,
        priority: '0.6',
        changefreq: 'weekly',
        lastmod: p.updatedAt ? new Date(p.updatedAt).toISOString() : undefined,
      })),
      ...categoryRows.map((c) => ({
        loc: `${baseUrl}/categories/${c.id}`,
        priority: '0.5',
        changefreq: 'weekly',
        lastmod: c.updatedAt ? new Date(c.updatedAt).toISOString() : undefined,
      })),
    ];

    const xml = `<?xml version="1.0" encoding="UTF-8"?>\n` +
      `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
      urls.map((u) =>
        `  <url>\n` +
        `    <loc>${u.loc}</loc>\n` +
        (u.lastmod ? `    <lastmod>${u.lastmod}</lastmod>\n` : '') +
        `    <changefreq>${u.changefreq}</changefreq>\n` +
        `    <priority>${u.priority}</priority>\n` +
        `  </url>`
      ).join('\n') +
      `\n</urlset>`;

    reply.header('Content-Type', 'application/xml');
    return xml;
  });

  fastify.get('/products/:id/jsonld', async (request, reply) => {
    const storeId = request.storeId as string;
    const { id } = request.params as { id: string };
    const jsonLd = await seoService.getProductJsonLd(storeId, id);
    if (!jsonLd) {
      reply.status(404);
      return { error: 'Product not found' };
    }
    return jsonLd;
  });
}
