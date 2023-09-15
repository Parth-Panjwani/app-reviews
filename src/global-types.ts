import { Review as PlayStoreReview } from "./playstore-reviews";
import * as googlePlayScraper from "google-play-scraper";

const appInfo: any = googlePlayScraper.app({ appId: "com.sarrthi.courses" });

export type Config = {
    apps: (PlayStoreConfig)[]
    storePublishedReviewsList: StorePublishedReviews,
    retrivePublishedReviewsList: RetrivePublishedReviews,
    onNewMessageAvailable: NewMessageAvailble,
    reviewLimit?: number,
    verbose?: boolean
}

type StoreConfig = {
    showAppIcon?: boolean,
    appIcon?: string,
    verbose?: boolean
}
// Define the PlayStoreAppInformation type
export type PlayStoreAppInformation = {
    title: string;
    developer: string;
    description: string;
    // Add more properties as needed
};

export interface PlayStoreConfig extends StoreConfig {
    appId: string;
    id: string;
    generateMessageFromReview?: PlayStoreMessageGenerator;
    publisherKeyPath: string; // This should be updated with the correct path
    clientId: string; // Add this property
    clientSecret: string; // Add this property
}


export type PublishedReviews = {
    [appId: string]: string[]
}

export type Messages = string[]

export type Data = {
    newReviews: PublishedReviews,
    messages: Messages
}

export type StorePublishedReviews = (reviews: PublishedReviews) => Promise<void>

export type NewMessageAvailble = (messages: string[]) => Promise<void>

export type RetrivePublishedReviews = () => Promise<PublishedReviews>

export type PlayStoreMessageGenerator = (review: PlayStoreReview, appInformation: PlayStoreAppInformation, config: PlayStoreConfig) => string