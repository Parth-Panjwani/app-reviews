import { Config, PlayStoreConfig } from './global-types';
import PlayStoreReviews from './playstore-reviews';

export default class Reviews {

    private config: Config;
    private playStoreReviews: PlayStoreReviews;

    constructor(config: Config) {
        this.config = config;
        this.playStoreReviews = new PlayStoreReviews();

        if (config.reviewLimit !== undefined) {
            config.reviewLimit = 100;
        }
    }

    async init() {
        const publishedReviews = await this.config.retrivePublishedReviewsList();

        const requests = this.config.apps.map(app => {
            if (app.id.indexOf(".") > -1) {
                if (this.config.verbose === undefined) {
                    app.verbose = false;
                }
                return this.playStoreReviews.fetch(app as PlayStoreConfig, publishedReviews);
            }
            return Promise.resolve(undefined); // Skip non-Google Play Store apps
        });

        const results = await Promise.all(requests);
        const messagesToSend: string[] = [];
        results.forEach(result => {
            if (result !== undefined) {
                for (const id in result.newReviews) {
                    if (publishedReviews[id] === undefined) {
                        // First time
                        publishedReviews[id] = [];
                    }

                    // Prevent having too many items in the list
                    if (this.config.reviewLimit !== undefined && publishedReviews[id].length > this.config.reviewLimit) {
                        publishedReviews[id] = publishedReviews[id].slice(0, this.config.reviewLimit);
                    }

                    publishedReviews[id].unshift(...result.newReviews[id].reverse());
                }

                if (result.messages.length > 0) {
                    messagesToSend.push(...result.messages);
                }
            }
        });

        await this.config.onNewMessageAvailable.call(this, messagesToSend);
        await this.config.storePublishedReviewsList.call(this, publishedReviews);
    }
}
