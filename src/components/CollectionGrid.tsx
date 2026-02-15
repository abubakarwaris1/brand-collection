'use client';

import { useState, useMemo, useEffect } from 'react';
import type { Collection } from '@/lib/types';
import CollectionCard from './CollectionCard';
import FilterChips from './FilterChips';
import StoryPlayer from './StoryPlayer';
import styles from './CollectionGrid.module.css';

interface CollectionGridProps {
    collections: Collection[];
    brandSlug: string;
}

export default function CollectionGrid({ collections, brandSlug }: CollectionGridProps) {
    const [activeFilter, setActiveFilter] = useState('All');
    const [openCollection, setOpenCollection] = useState<Collection | null>(null);

    // Get unique collection names for filter chips
    const filterLabels = useMemo(
        () => collections.map((c) => c.name),
        [collections]
    );

    // Filter collections
    const filteredCollections = useMemo(() => {
        if (activeFilter === 'All') return collections;
        return collections.filter((c) => c.name === activeFilter);
    }, [collections, activeFilter]);

    // Check URL for collection param on mount
    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const collectionSlug = params.get('collection');
        if (collectionSlug) {
            const found = collections.find((c) => c.slug === collectionSlug);
            if (found) {
                setOpenCollection(found);
            }
        }

        // Listen for back button
        const handlePopState = () => {
            const params = new URLSearchParams(window.location.search);
            if (!params.has('collection')) {
                setOpenCollection(null);
            }
        };

        window.addEventListener('popstate', handlePopState);
        return () => window.removeEventListener('popstate', handlePopState);
    }, [collections]);

    const handleCollectionClick = (collection: Collection) => {
        setOpenCollection(collection);
    };

    const handleClosePlayer = () => {
        setOpenCollection(null);
    };

    return (
        <>
            <section className={styles.section}>
                <div className={styles.sectionHeader}>
                    <h2 className={styles.sectionTitle}>Stories</h2>
                    <div className={styles.titleUnderline} />
                </div>

                <FilterChips
                    labels={filterLabels}
                    activeFilter={activeFilter}
                    onFilterChange={setActiveFilter}
                />

                <div className={styles.grid}>
                    {filteredCollections.map((collection) => (
                        <CollectionCard
                            key={collection._id}
                            collection={collection}
                            onClick={handleCollectionClick}
                        />
                    ))}
                </div>

                {filteredCollections.length === 0 && (
                    <div className={styles.empty}>
                        <p>No collections found.</p>
                    </div>
                )}
            </section>

            {openCollection && (
                <StoryPlayer
                    collection={openCollection}
                    brandSlug={brandSlug}
                    onClose={handleClosePlayer}
                />
            )}
        </>
    );
}
