export interface Brand {
    _id: string;
    brandId: string;
    slug: string;
    name: string;
    logo: string;
    squareLogo: string;
    description: string;
    followers: number;
    status: string;
}

export interface StoryDimension {
    width: number;
    height: number;
}

export interface Story {
    _id: string;
    storyId: string;
    slug: string;
    background: string;
    backgroundType: 'VIDEO' | 'IMAGE' | 'EMBED' | 'GRADIENT' | 'blank';
    thumbnail: string;
    coverImage?: string;
    isScreenshot?: boolean;
    duration: number;
    storyUuid: string;
    storyDimension?: StoryDimension;
    collectionOrder: Record<string, number>;
    status: string;
    isDraft: boolean;
    widgets: Widget[];
    embedCode?: string;
    embedType?: string;
}

export interface Widget {
    type: string;
    label?: string;
    backgroundColor?: string;
    textColor?: string;
    actionType?: string;
    actionUrl?: string;
    position?: {
        xPos: number;
        yPos: number;
        meta?: {
            style?: Record<string, string>;
        };
    };
}

export interface Collection {
    _id: string;
    collectionId: string;
    name: string;
    slug: string;
    code: string;
    thumbnail: string;
    cover: string;
    type: string;
    status: string;
    isDraft: boolean;
    isArchived: boolean;
    isLockedCollection: boolean;
    visibleType: string;
    order: number;
    stories?: Story[];
    storiesCount?: number;
    totalStories?: number;
    accessibilityLevel?: string;
    isDefault?: boolean;
}

export interface BrandPageData {
    brand: Brand;
    collections: Collection[];
}
