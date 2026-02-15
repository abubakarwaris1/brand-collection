'use client';

import { getMediaUrl } from '@/lib/constants';
import type { Collection } from '@/lib/types';
import styles from './CollectionCard.module.css';

interface CollectionCardProps {
    collection: Collection;
    onClick: (collection: Collection) => void;
}

function findBestThumbnail(collection: Collection): string {
    // Try collection thumbnail first
    const collThumb = getMediaUrl(collection.thumbnail);
    if (collThumb && !collThumb.startsWith('#')) return collThumb;

    // Try collection cover
    const collCover = getMediaUrl(collection.cover);
    if (collCover && !collCover.startsWith('#')) return collCover;

    // Try stories in order - look for any valid image
    if (collection.stories?.length) {
        for (const story of collection.stories) {
            // Try coverImage first (highest quality)
            if (story.coverImage) {
                const url = getMediaUrl(story.coverImage);
                if (url && !url.startsWith('#')) return url;
            }
            // Try thumbnail
            if (story.thumbnail) {
                const url = getMediaUrl(story.thumbnail);
                if (url && !url.startsWith('#')) return url;
            }
            // Try background (for IMAGE type stories)
            if (story.backgroundType === 'IMAGE' && story.background) {
                const url = getMediaUrl(story.background);
                if (url && !url.startsWith('#')) return url;
            }
        }
    }

    return '';
}

export default function CollectionCard({ collection, onClick }: CollectionCardProps) {
    const displayThumb = findBestThumbnail(collection);

    return (
        <button
            className={styles.card}
            onClick={() => onClick(collection)}
            aria-label={`Open collection: ${collection.name}`}
        >
            <div className={styles.thumbnailWrapper}>
                {displayThumb ? (
                    <img
                        src={displayThumb}
                        alt={collection.name}
                        className={styles.thumbnail}
                        loading="lazy"
                        decoding="async"
                    />
                ) : (
                    <div className={styles.placeholderThumb}>
                        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#aaa" strokeWidth="1.5">
                            <rect x="3" y="3" width="18" height="18" rx="2" />
                            <circle cx="8.5" cy="8.5" r="1.5" />
                            <path d="M21 15l-5-5L5 21" />
                        </svg>
                    </div>
                )}
                <div className={styles.overlay}>
                    <span className={styles.storyCount}>{collection.totalStories || collection.stories?.length || 0} stories</span>
                </div>
            </div>
            <div className={styles.info}>
                <h3 className={styles.name}>{collection.name}</h3>
            </div>
        </button>
    );
}
