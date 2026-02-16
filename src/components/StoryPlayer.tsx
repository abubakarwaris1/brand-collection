'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
import { getMediaUrl, BRAND_BASE_URL } from '@/lib/constants';
import type { Collection, Story } from '@/lib/types';
import styles from './StoryPlayer.module.css';

interface StoryPlayerProps {
    collection: Collection;
    brandSlug: string;
    initialStoryIndex?: number;
    onClose: () => void;
}

function getCollectionAmpUrl(brandSlug: string, collection: Collection): string {
    const collectionId = collection._id || collection.collectionId;
    return `${BRAND_BASE_URL}/amp?brandId=${brandSlug}&collection=${collectionId}&player=true`;
}

function getStoryPosterUrl(story: Story): string {
    if (story.coverImage) return getMediaUrl(story.coverImage);
    if (story.thumbnail && !story.thumbnail.startsWith('#')) return getMediaUrl(story.thumbnail);
    if (story.backgroundType === 'IMAGE' && story.background) return getMediaUrl(story.background);
    return '';
}

function syncUrlParams(collectionSlug: string, storyIndex: number) {
    const url = new URL(window.location.href);
    url.searchParams.set('collection', collectionSlug);
    url.searchParams.set('story', String(storyIndex + 1));
    window.history.replaceState({}, '', url.toString());
}

export default function StoryPlayer({ collection, brandSlug, initialStoryIndex = 0, onClose }: StoryPlayerProps) {
    const overlayRef = useRef<HTMLDivElement>(null);
    const playerWrapperRef = useRef<HTMLDivElement>(null);
    const playerElementRef = useRef<any>(null);
    const [playerReady, setPlayerReady] = useState(false);
    const currentStoryIndexRef = useRef(initialStoryIndex);

    const stories: Story[] = (collection.stories || [])
        .filter((s) => !s.isDraft)
        .sort((a, b) => {
            const orderA = a.collectionOrder?.[collection._id] ?? a.collectionOrder?.[collection.collectionId] ?? 999;
            const orderB = b.collectionOrder?.[collection._id] ?? b.collectionOrder?.[collection.collectionId] ?? 999;
            return orderA - orderB;
        });

    const navigatePlayer = useCallback((direction: 'prev' | 'next') => {
        const player = playerElementRef.current;
        if (!player || typeof player.go !== 'function') return;

        const pageDelta = direction === 'next' ? 1 : -1;
        player.go(0, pageDelta);

        const newIndex = currentStoryIndexRef.current + pageDelta;
        const clampedIndex = Math.max(0, Math.min(stories.length - 1, newIndex));
        currentStoryIndexRef.current = clampedIndex;
        syncUrlParams(collection.slug, clampedIndex);
    }, [collection.slug, stories.length]);

    const handleKeyDown = useCallback((e: KeyboardEvent) => {
        if (e.key === 'Escape') {
            e.preventDefault();
            onClose();
        }
        if (e.key === 'ArrowRight') {
            e.preventDefault();
            navigatePlayer('next');
        }
        if (e.key === 'ArrowLeft') {
            e.preventDefault();
            navigatePlayer('prev');
        }
    }, [onClose, navigatePlayer]);

    // URL params + keyboard + scroll lock
    useEffect(() => {
        const currentUrl = new URL(window.location.href);
        currentUrl.searchParams.set('collection', collection.slug);
        currentUrl.searchParams.set('story', String(initialStoryIndex + 1));
        window.history.pushState({}, '', currentUrl.toString());

        document.addEventListener('keydown', handleKeyDown);
        document.body.style.overflow = 'hidden';

        return () => {
            document.removeEventListener('keydown', handleKeyDown);
            document.body.style.overflow = '';

            const url = new URL(window.location.href);
            url.searchParams.delete('collection');
            url.searchParams.delete('story');
            window.history.pushState({}, '', url.toString());
        };
    }, [collection, handleKeyDown, initialStoryIndex]);

    // AMP story player initialization
    useEffect(() => {
        if (!playerWrapperRef.current || stories.length === 0) return;

        const collectionUrl = getCollectionAmpUrl(brandSlug, collection);
        const posterUrl = stories.length > 0 ? getStoryPosterUrl(stories[0]) : '';

        playerWrapperRef.current.innerHTML = `
            <amp-story-player style="width: 100%; height: 100%;" layout="fill">
                <a href="${collectionUrl}"${posterUrl ? ` data-poster-portrait-src="${posterUrl}"` : ''}></a>
            </amp-story-player>
        `;

        const playerEl = playerWrapperRef.current.querySelector('amp-story-player');

        if (!document.querySelector('link[href*="amp-story-player"]')) {
            const link = document.createElement('link');
            link.rel = 'stylesheet';
            link.href = 'https://cdn.ampproject.org/amp-story-player-v0.css';
            document.head.appendChild(link);
        }

        if (playerEl) {
            playerEl.addEventListener('ready', () => {
                playerElementRef.current = playerEl;
                setPlayerReady(true);

                // Deep-link: skip forward to the target story page
                if (initialStoryIndex > 0) {
                    const skipToPage = (i: number) => {
                        if (i < initialStoryIndex) {
                            (playerEl as any).go(0, 1);
                            setTimeout(() => skipToPage(i + 1), 100);
                        }
                    };
                    setTimeout(() => skipToPage(0), 300);
                }

                // Sync URL when pages change (covers direct taps on story)
                playerEl.addEventListener('storyNavigation', (e: any) => {
                    const progress = e.detail?.progress ?? 0;
                    const estimatedIndex = Math.round(progress * (stories.length - 1));
                    currentStoryIndexRef.current = estimatedIndex;
                    syncUrlParams(collection.slug, estimatedIndex);
                });

                playerEl.addEventListener('navigation', (e: any) => {
                    const idx = e.detail?.index ?? 0;
                    currentStoryIndexRef.current = idx;
                    syncUrlParams(collection.slug, idx);
                });
            });
        }

        const existingScript = document.querySelector('script[src*="amp-story-player"]');
        if (existingScript) existingScript.remove();
        if ((window as any).AmpStoryPlayer) delete (window as any).AmpStoryPlayer;

        const script = document.createElement('script');
        script.async = true;
        script.src = 'https://cdn.ampproject.org/amp-story-player-v0.js';
        script.onload = () => {
            setTimeout(() => {
                if (playerEl && typeof (playerEl as any).go === 'function') {
                    playerElementRef.current = playerEl;
                    setPlayerReady(true);
                }
            }, 3000);
        };
        document.head.appendChild(script);

        return () => {
            playerElementRef.current = null;
            if (playerWrapperRef.current) {
                playerWrapperRef.current.innerHTML = '';
            }
        };
    }, [stories, brandSlug, collection]);

    const handleOverlayClick = (e: React.MouseEvent) => {
        if (e.target === overlayRef.current) onClose();
    };

    return (
        <div
            className={styles.overlay}
            ref={overlayRef}
            onClick={handleOverlayClick}
            role="dialog"
            aria-modal="true"
            aria-label={`Story player: ${collection.name}`}
        >
            <button
                className={`${styles.navArrow} ${styles.navArrowLeft}`}
                onClick={() => navigatePlayer('prev')}
                aria-label="Previous page"
            >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="15 18 9 12 15 6" />
                </svg>
            </button>

            <div className={styles.playerContainer}>
                <button className={styles.closeButton} onClick={onClose} aria-label="Close player">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                        <line x1="18" y1="6" x2="6" y2="18" />
                        <line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                </button>

                {!playerReady && stories.length > 0 && (
                    <div className={styles.posterPreview}>
                        {(() => {
                            const posterUrl = getStoryPosterUrl(stories[0]);
                            return posterUrl ? (
                                <img src={posterUrl} alt={collection.name} className={styles.posterImage} />
                            ) : (
                                <div className={styles.posterFallback} />
                            );
                        })()}
                        <div className={styles.posterOverlay}>
                            <div className={styles.spinner} />
                        </div>
                    </div>
                )}

                {stories.length === 0 && (
                    <div className={styles.emptyState}>
                        <p>No stories in this collection</p>
                    </div>
                )}

                <div
                    className={styles.ampPlayerWrapper}
                    ref={playerWrapperRef}
                />
            </div>

            <button
                className={`${styles.navArrow} ${styles.navArrowRight}`}
                onClick={() => navigatePlayer('next')}
                aria-label="Next page"
            >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="9 18 15 12 9 6" />
                </svg>
            </button>
        </div>
    );
}
