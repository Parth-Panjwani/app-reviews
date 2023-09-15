import { Data, PlayStoreConfig, PublishedReviews } from "./global-types";
import { google, androidpublisher_v3 } from "googleapis";
import * as googlePlayScraper from "google-play-scraper";
import { get } from "android-versions";
const fs = require('fs');
const util = require('util');

export default class PlayStoreReviews {
    SCOPES = ['https://www.googleapis.com/auth/androidpublisher'];
    STORE_NAME = "Play Store";

    async fetch(config: PlayStoreConfig, publishedReviews: PublishedReviews): Promise<Data> {
        const { publisherKeyPath, appId, clientId, clientSecret } = config;

        // Use googlePlayScraper to fetch app information
        const appInfo: any = await googlePlayScraper.app({ appId: appId });

        const result = await this.fetchPlayStoreReviews(appId, publisherKeyPath, clientId, clientSecret, config.verbose);

        const newReviewsMap: PublishedReviews = {};
        newReviewsMap[appId] = [];

        const newReviews = result.filter((review) => {
            const isAlreadyPublished = publishedReviews[appId] && publishedReviews[appId].includes(review.id);
            if (!isAlreadyPublished) {
                newReviewsMap[appId].push(this.mapReviewId(review));
            }
            return !isAlreadyPublished;
        });

        return {
            messages: newReviews.map((review) => {
                if (config.generateMessageFromReview !== undefined) {
                    return config.generateMessageFromReview.call(this, review, appInfo, config);
                } else {
                    return this.generateSlackMessage(review, appInfo, config);
                }
            }),
            newReviews: newReviewsMap,
        };
    }

    async fetchPlayStoreReviews(appId: string, publisherKeyPath: string, clientId: string, clientSecret: string, verbose?: boolean) {
        // Read publisher JSON key from the provided path
        var publisherJson;
        try {
            publisherJson = JSON.parse(fs.readFileSync(publisherKeyPath, 'utf8'));
        } catch (e) {
            if (verbose) {
                console.warn(e);
            }
            return [];
        }

        try {
            const jwt = new google.auth.JWT(
                clientId,
                undefined,
                clientSecret,
                this.SCOPES,
                undefined
            );
            const res = await google.androidpublisher('v3').reviews.list({
                auth: jwt,
                packageName: appId,
            });

            if (!res.data.reviews) {
                return [];
            }

            return res.data.reviews.map((review) => this.parsePlayStoreReview(review, appId));
        } catch (e) {
            if (verbose) {
                console.warn(e);
            }
            return [];
        }
    }

    mapReviewId(review: Review): string {
        return review.id;
    }

    parsePlayStoreReview = (entry: androidpublisher_v3.Schema$Review, appId: string): Review => {
        const comment = entry.comments!![0].userComment!!;

        return {
            id: entry.reviewId || "NO_REVIEW_ID",
            version: comment.appVersionName || "NO_APP_VERSION",
            versionCode: comment.appVersionCode || 0,
            text: comment.text || "NO TEXT",
            osVersion: comment.androidOsVersion,
            device: comment.deviceMetadata?.productName,
            rating: comment.starRating || 0,
            author: entry.authorName || "NO_AUTHOR_NAME",
            link: 'https://play.google.com/store/apps/details?id=' + appId + '&reviewId=' + entry.reviewId,
        };
    }

    generateSlackMessage = (review: Review, appInformation: any, config: PlayStoreConfig): string => {
        var stars = "";
        for (var i = 0; i < 5; i++) {
            stars += i < review.rating ? "★" : "☆";
        }

        const color = review.rating >= 4 ? "good" : (review.rating >= 2 ? "warning" : "danger");

        var text = "";
        text += review.text + "\n";

        var footer = "";
        if (review.version) {
            footer += " for v" + review.version + ' (' + review.versionCode + ') ';
        }

        if (review.osVersion) {
            footer += ' Android ' + this.getVersionNameForCode(review.osVersion);
        }

        if (review.device) {
            footer += ', ' + review.device;
        }

        if (review.link) {
            footer += " - " + "<" + review.link + "|" + appInformation.title + ", " + this.STORE_NAME + ">";
        } else {
            footer += " - " + appInformation.title + ", " + this.STORE_NAME;
        }

        var title = stars;

        return JSON.stringify({
            "attachments": [
                {
                    "mrkdwn_in": ["text", "pretext", "title", "footer"],

                    "color": color,
                    "author_name": review.author,

                    "thumb_url": config.showAppIcon ? (appInformation.icon) : config.appIcon,

                    "title": title,

                    "text": text,
                    "footer": footer,
                },
            ],
        });
    }

    getVersionNameForCode = function (versionCode: number) {
        const version = get(versionCode);
        if (version != null) {
            return version.semver;
        }

        return "";
    }
}

export type Review = {
    id: string,
    version: string,
    device: string | undefined | null,
    versionCode: number,
    osVersion: number | undefined | null,
    text: string,
    rating: number,
    author: string,
    link: string,
};
