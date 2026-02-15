import { Metadata } from 'next';
import { fetchBrandPage } from '@/lib/api';
import { getMediaUrl } from '@/lib/constants';
import BrandHeader from '@/components/BrandHeader';
import CollectionGrid from '@/components/CollectionGrid';
import styles from './page.module.css';

interface BrandPageProps {
    params: Promise<{ brandSlug: string }>;
}

export async function generateMetadata({ params }: BrandPageProps): Promise<Metadata> {
    const { brandSlug } = await params;
    const data = await fetchBrandPage(brandSlug);

    if (!data) {
        return { title: 'Brand Not Found' };
    }

    const { brand } = data;
    const logoUrl = getMediaUrl(brand.logo);

    return {
        title: brand.name,
        description: brand.description || `Never miss a story from ${brand.name}`,
        keywords: 'stories, brand, collections',
        openGraph: {
            type: 'website',
            title: brand.name,
            description: brand.description || `Never miss a story from ${brand.name}`,
            images: logoUrl ? [{ url: logoUrl }] : [],
            siteName: 'Brand Collection',
        },
        twitter: {
            card: 'summary',
            title: brand.name,
            description: brand.description || `Never miss a story from ${brand.name}`,
            images: logoUrl ? [logoUrl] : [],
        },
        robots: 'index, follow',
    };
}

export default async function BrandPage({ params }: BrandPageProps) {
    const { brandSlug } = await params;
    const data = await fetchBrandPage(brandSlug);

    if (!data) {
        return (
            <div className={styles.errorPage}>
                <h1>Brand not found</h1>
                <p>The brand page you&apos;re looking for doesn&apos;t exist.</p>
            </div>
        );
    }

    const { brand, collections } = data;

    // Filter to visible, active collections only
    const visibleCollections = collections.filter(
        (c) => c.visibleType === 'VISIBLE' && c.status === 'ACTIVE' && !c.isArchived
    );

    return (
        <main className={styles.page}>
            <div className={styles.container}>

                <BrandHeader brand={brand} />
                <CollectionGrid
                    collections={visibleCollections}
                    brandSlug={brandSlug}
                />

                <footer className={styles.footer}>
                    <span className={styles.madeWith}>Made with oono</span>
                </footer>
            </div>

            {/* Blue gradient glow effect on edges */}
            <div className={styles.glowLeft} />
            <div className={styles.glowRight} />
        </main>
    );
}
