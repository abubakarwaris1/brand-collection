'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
import { getMediaUrl } from '@/lib/constants';
import type { Collection, Story } from '@/lib/types';
import styles from './StoryPlayer.module.css';

interface StoryPlayerProps {
    collection: Collection;
    brandSlug: string;
    initialStoryIndex?: number;
    onClose: () => void;
}

// Build a unique AMP URL per story so the player can distinguish them
function getStoryAmpUrl(brandSlug: string, collection: Collection, story: Story): string {
    const collectionId = collection._id || collection.collectionId;
    const storyId = story._id || story.storyId || story.slug;
    return `https://staging-brand.oono.ai/amp?brandId=${brandSlug}&collection=${collectionId}&story=${storyId}&player=true`;
}

function getStoryPosterUrl(story: Story): string {
    if (story.coverImage) return getMediaUrl(story.coverImage);
    if (story.thumbnail && !story.thumbnail.startsWith('#')) return getMediaUrl(story.thumbnail);
    if (story.backgroundType === 'IMAGE' && story.background) return getMediaUrl(story.background);
    return '';
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

    // Navigate using the AMP player's programmatic API
    // go(0, ±1) = page navigation (next/prev page within a story)
    // go(±1)    = story navigation (next/prev story in the playlist)
    const navigatePlayer = useCallback((direction: 'prev' | 'next') => {
        const player = playerElementRef.current;
        if (!player || typeof player.go !== 'function') return;

        const pageDelta = direction === 'next' ? 1 : -1;
        // Use page navigation: go(storyDelta=0, pageDelta=±1)
        player.go(0, pageDelta);
    }, []);

    // Handle keyboard events
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

    useEffect(() => {
        const currentUrl = new URL(window.location.href);
        currentUrl.searchParams.set('collection', collection.slug);
        if (initialStoryIndex > 0) {
            currentUrl.searchParams.set('story', String(initialStoryIndex + 1));
        }
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
    }, [collection, handleKeyDown]);

    // Initialize AMP story player
    useEffect(() => {
        if (!playerWrapperRef.current || stories.length === 0) return;

        // Build unique <a> per story so the player can distinguish them
        const storyLinks = stories.map((story) => {
            const href = getStoryAmpUrl(brandSlug, collection, story);
            const posterUrl = getStoryPosterUrl(story);
            return `<a href="${href}"${posterUrl ? ` data-poster-portrait-src="${posterUrl}"` : ''}></a>`;
        }).join('\n');

        const playerHTML = `
            <amp-story-player style="width: 100%; height: 100%;" layout="fill">
                ${storyLinks}
            </amp-story-player>
        `;

        playerWrapperRef.current.innerHTML = playerHTML;

        // Get the amp-story-player element reference
        const playerEl = playerWrapperRef.current.querySelector('amp-story-player');

        // Load AMP CSS (once)
        if (!document.querySelector('link[href*="amp-story-player"]')) {
            const link = document.createElement('link');
            link.rel = 'stylesheet';
            link.href = 'https://cdn.ampproject.org/amp-story-player-v0.css';
            document.head.appendChild(link);
        }

        // Listen for the player's 'ready' event — fires when API methods are available
        if (playerEl) {
            playerEl.addEventListener('ready', () => {
                playerElementRef.current = playerEl;
                setPlayerReady(true);

                // If an initial story index is set, navigate to that story
                if (initialStoryIndex > 0 && typeof (playerEl as any).show === 'function') {
                    const targetStory = stories[initialStoryIndex];
                    if (targetStory) {
                        const targetUrl = getStoryAmpUrl(brandSlug, collection, targetStory);
                        (playerEl as any).show(targetUrl);
                    }
                }

                // Debug listeners — track story and page changes
                playerEl.addEventListener('navigation', (e: any) => {
                    const idx = e.detail?.index ?? 0;
                    console.log('STORY changed -> index:', idx, 'remaining:', e.detail?.remaining);
                    currentStoryIndexRef.current = idx;
                    // Update URL with story param
                    const url = new URL(window.location.href);
                    url.searchParams.set('story', String(idx + 1));
                    window.history.replaceState({}, '', url.toString());
                });

                playerEl.addEventListener('storyNavigation', (e: any) => {
                    console.log('PAGE changed -> pageId:', e.detail?.pageId, 'progress:', e.detail?.progress);
                });
            });
        }

        // Remove old script and re-add so AMP re-initializes the new player element
        const existingScript = document.querySelector('script[src*="amp-story-player"]');
        if (existingScript) {
            existingScript.remove();
        }
        if ((window as any).AmpStoryPlayer) {
            delete (window as any).AmpStoryPlayer;
        }

        const script = document.createElement('script');
        script.async = true;
        script.src = 'https://cdn.ampproject.org/amp-story-player-v0.js';
        script.onload = () => {
            // Fallback: if 'ready' event doesn't fire within 3s
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
            {/* Left nav arrow — outside the player */}
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

                {/* Loading poster — shown until AMP player is ready */}
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

                {/* AMP story player */}
                <div
                    className={styles.ampPlayerWrapper}
                    ref={playerWrapperRef}
                />
            </div>

            {/* Right nav arrow — outside the player */}
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
