import { API_BASE_URL } from './constants';
import type { BrandPageData } from './types';

async function tryFetch(url: string, appToken: string): Promise<any | null> {
    try {
        const res = await fetch(url, {
            next: { revalidate: 60 },
            headers: {
                'Accept': 'application/json',
                'App-Token': appToken,
            },
        });
        if (!res.ok) return null;
        return await res.json();
    } catch {
        return null;
    }
}

function extractBrandPage(raw: any, slug: string): BrandPageData | null {
    const data = raw?.data || raw;

    if (data?.brand && data?.collections) {
        return data as BrandPageData;
    }

    if (Array.isArray(data)) {
        return {
            brand: { _id: '', brandId: '', slug, name: slug, logo: '', squareLogo: '', description: '', followers: 0, status: 'ACTIVE' },
            collections: data,
        };
    }

    // Search nested arrays
    if (data && typeof data === 'object') {
        for (const key of Object.keys(data)) {
            const val = data[key];
            if (Array.isArray(val) && val.length > 0 && (val[0].collectionId || val[0].name || val[0].slug)) {
                return {
                    brand: data.brand || { _id: '', brandId: '', slug, name: slug, logo: '', squareLogo: '', description: '', followers: 0, status: 'ACTIVE' },
                    collections: val,
                };
            }
        }
    }

    return null;
}

export async function fetchBrandPage(slug: string): Promise<BrandPageData | null> {
    const appToken = process.env.TOKEN || '';

    // Try the stories-collection endpoint first (includes stories inside collections)
    const storiesUrl = `${API_BASE_URL}/api/public/stories-collection/?slug=${encodeURIComponent(slug)}`;
    const storiesData = await tryFetch(storiesUrl, appToken);
    if (storiesData) {
        const result = extractBrandPage(storiesData, slug);
        if (result) {
            const hasStories = result.collections.some(c => (c.stories?.length ?? 0) > 0);
            if (hasStories) {
                return result;
            }
        }
    }

    // Fallback: brand-collections endpoint
    const brandUrl = `${API_BASE_URL}/api/public/brand-collections/${encodeURIComponent(slug)}`;
    const brandData = await tryFetch(brandUrl, appToken);
    if (brandData) {
        const result = extractBrandPage(brandData, slug);
        if (result) {
            return result;
        }
    }

    return null;
}
