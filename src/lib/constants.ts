export const API_BASE_URL = 'https://staging-apis-v2.oono.ai';
export const MEDIA_BASE_URL = 'https://media.oono.ai/uploads';

export function getMediaUrl(path: string): string {
    if (!path) return '';
    if (path.startsWith('http')) return path;
    if (path.startsWith('#')) return ''; // color backgrounds
    return `${MEDIA_BASE_URL}/${path}`;
}

export function getStoryPlayerUrl(brandSlug: string, collectionSlug: string, storySlug: string): string {
    return `/${brandSlug}?collection=${collectionSlug}&story=${storySlug}`;
}
