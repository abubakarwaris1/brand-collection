import { fetchBrandPage } from '@/lib/api';
import { getMediaUrl } from '@/lib/constants';
import type { Story, Widget, Collection, Brand } from '@/lib/types';
import { NextRequest, NextResponse } from 'next/server';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function escapeHtml(text: string): string {
    return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function isVideoFile(path: string): boolean {
    if (!path) return false;
    const lower = path.toLowerCase();
    return lower.endsWith('.mp4') || lower.endsWith('.webm') || lower.endsWith('.mov');
}

function buildVideoLayer(mediaUrl: string, posterUrl: string, pageIndex: number): string {
    const videoId = `video-${pageIndex}`;
    return `
        <amp-story-grid-layer template="fill">
            <amp-video
                id="${videoId}"
                layout="fill"
                src="${escapeHtml(mediaUrl)}"
                autoplay
                muted
                poster="${escapeHtml(posterUrl)}"
            >
                <source src="${escapeHtml(mediaUrl)}" type="video/mp4" />
            </amp-video>
        </amp-story-grid-layer>`;
}

function buildBackgroundLayer(story: Story, pageIndex: number): string {
    const { backgroundType, background } = story;
    const mediaUrl = background ? getMediaUrl(background) : '';

    // Detect actual video files even if backgroundType says IMAGE
    if (backgroundType === 'VIDEO' || isVideoFile(background || '')) {
        return buildVideoLayer(mediaUrl, getStoryPoster(story), pageIndex);
    }

    switch (backgroundType) {
        case 'IMAGE':
            return `
        <amp-story-grid-layer template="fill">
            <amp-img
                layout="fill"
                src="${escapeHtml(mediaUrl)}"
                alt=""
            ></amp-img>
        </amp-story-grid-layer>`;

        case 'GRADIENT':
            return `
        <amp-story-grid-layer template="fill">
            <div style="width:100%;height:100%;background:${escapeHtml(background || '#000')};"></div>
        </amp-story-grid-layer>`;

        case 'EMBED':
        case 'blank':
        default:
            return `
        <amp-story-grid-layer template="fill">
            <div style="width:100%;height:100%;background:#000;"></div>
        </amp-story-grid-layer>`;
    }
}

function getStoryPoster(story: Story): string {
    if (story.coverImage) return getMediaUrl(story.coverImage);
    if (story.thumbnail && !story.thumbnail.startsWith('#'))
        return getMediaUrl(story.thumbnail);
    if (story.backgroundType === 'IMAGE' && story.background)
        return getMediaUrl(story.background);
    return '';
}

function buildWidgetHtml(widget: Widget): string {
    const { type, label, backgroundColor, textColor, actionType, actionUrl, position } = widget;

    if (!label) return '';

    // Use meta.style properties directly when available (matches staging behavior)
    const metaStyle = position?.meta?.style || {};
    const hasMetaStyle = Object.keys(metaStyle).length > 0;

    const inlineStyles: Record<string, string> = {
        position: 'absolute',
        'max-width': '90%',
        'text-align': 'center',
        'z-index': '2',
    };

    if (hasMetaStyle) {
        // Use the pre-computed style values from the API
        Object.assign(inlineStyles, metaStyle);
    } else {
        // Fallback to xPos/yPos
        const xPos = position?.xPos ?? 50;
        const yPos = position?.yPos ?? 50;
        inlineStyles['left'] = `${xPos}%`;
        inlineStyles['top'] = `${yPos}%`;
        inlineStyles['transform'] = 'translate(-50%, -50%)';
    }

    if (backgroundColor) inlineStyles['background-color'] = backgroundColor;
    if (textColor) inlineStyles['color'] = textColor;

    const styleStr = Object.entries(inlineStyles)
        .map(([k, v]) => `${k}:${v}`)
        .join(';');

    const content = escapeHtml(label);

    // CTA widgets render as links
    if (actionType && actionUrl) {
        return `<a href="${escapeHtml(actionUrl)}" target="_blank" rel="noopener noreferrer"
            style="${styleStr};display:inline-block;padding:10px 20px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px;"
        >${content}</a>`;
    }

    // Plain text widget
    return `<div style="${styleStr};padding:4px 8px;font-size:16px;">${content}</div>`;
}

function buildWidgetLayer(story: Story): string {
    const widgets = story.widgets || [];
    if (widgets.length === 0) return '';

    const widgetHtml = widgets.map(buildWidgetHtml).filter(Boolean).join('\n            ');
    if (!widgetHtml) return '';

    return `
        <amp-story-grid-layer template="fill">
            <div style="position:relative;width:100%;height:100%;">
            ${widgetHtml}
            </div>
        </amp-story-grid-layer>`;
}

function buildStoryPage(story: Story, index: number, collectionId: string): string {
    const duration = story.duration && story.duration > 0 ? story.duration : 5;
    const isVideo = story.backgroundType === 'VIDEO' || isVideoFile(story.background || '');
    const autoAdvance = isVideo
        ? `auto-advance-after="video-${index}"`
        : `auto-advance-after="${duration}s"`;

    return `
    <amp-story-page id="page-${index}" ${autoAdvance}>
        ${buildBackgroundLayer(story, index)}
        ${buildWidgetLayer(story)}
    </amp-story-page>`;
}

// ---------------------------------------------------------------------------
// Route handler
// ---------------------------------------------------------------------------

interface RouteParams {
    params: Promise<{ brandSlug: string; collectionId: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
    const { brandSlug, collectionId } = await params;

    const data = await fetchBrandPage(brandSlug);
    if (!data) {
        return new NextResponse('Brand not found', { status: 404 });
    }

    const { brand, collections } = data;

    // Find the target collection by _id or collectionId
    const collection = collections.find(
        (c: Collection) => c._id === collectionId || c.collectionId === collectionId
    );

    if (!collection) {
        return new NextResponse('Collection not found', { status: 404 });
    }

    // Get sorted, non-draft stories
    const allStories: Story[] = (collection.stories || [])
        .filter((s: Story) => !s.isDraft)
        .sort((a: Story, b: Story) => {
            const orderA = a.collectionOrder?.[collection._id] ?? a.collectionOrder?.[collection.collectionId] ?? 999;
            const orderB = b.collectionOrder?.[collection._id] ?? b.collectionOrder?.[collection.collectionId] ?? 999;
            return orderA - orderB;
        });

    const stories = allStories;

    if (stories.length === 0) {
        return new NextResponse('No stories in collection', { status: 404 });
    }

    const publisherLogo = brand.squareLogo
        ? getMediaUrl(brand.squareLogo)
        : brand.logo
            ? getMediaUrl(brand.logo)
            : '';
    const posterPortrait = getStoryPoster(stories[0]);

    const storyPages = stories
        .map((story, i) => buildStoryPage(story, i, collection._id || collection.collectionId))
        .join('\n');

    const html = `<!doctype html>
<html amp lang="en">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width,minimum-scale=1,initial-scale=1">
    <script async src="https://cdn.ampproject.org/v0.js"></script>
    <script async custom-element="amp-story" src="https://cdn.ampproject.org/v0/amp-story-1.0.js"></script>
    <script async custom-element="amp-video" src="https://cdn.ampproject.org/v0/amp-video-0.1.js"></script>
    <link rel="canonical" href="${escapeHtml(request.url)}">
    <title>${escapeHtml(collection.name)} — ${escapeHtml(brand.name)}</title>
    <style amp-boilerplate>body{-webkit-animation:-amp-start 8s steps(1,end) 0s 1 normal both;-moz-animation:-amp-start 8s steps(1,end) 0s 1 normal both;animation:-amp-start 8s steps(1,end) 0s 1 normal both}@-webkit-keyframes -amp-start{from{visibility:hidden}to{visibility:visible}}@-moz-keyframes -amp-start{from{visibility:hidden}to{visibility:visible}}@keyframes -amp-start{from{visibility:hidden}to{visibility:visible}}</style><noscript><style amp-boilerplate>body{-webkit-animation:none;-moz-animation:none;animation:none}</style></noscript>
    <style amp-custom>
        amp-story-page { background: #000; }
    </style>
</head>
<body>
    <amp-story
        standalone
        title="${escapeHtml(collection.name)}"
        publisher="${escapeHtml(brand.name)}"
        publisher-logo-src="${escapeHtml(publisherLogo)}"
        poster-portrait-src="${escapeHtml(posterPortrait)}"
    >
    ${storyPages}
    </amp-story>
</body>
</html>`;

    return new NextResponse(html, {
        status: 200,
        headers: {
            'Content-Type': 'text/html; charset=utf-8',
            'Access-Control-Allow-Origin': '*',
            'Cache-Control': 'public, max-age=60, s-maxage=300',
        },
    });
}
