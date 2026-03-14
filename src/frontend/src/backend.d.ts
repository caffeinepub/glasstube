import type { Principal } from "@icp-sdk/core/principal";
export interface Some<T> {
    __kind__: "Some";
    value: T;
}
export interface None {
    __kind__: "None";
}
export type Option<T> = Some<T> | None;
export interface http_request_result {
    status: bigint;
    body: Uint8Array;
    headers: Array<http_header>;
}
export interface TransformationOutput {
    status: bigint;
    body: Uint8Array;
    headers: Array<http_header>;
}
export interface TransformationInput {
    context: Uint8Array;
    response: http_request_result;
}
export interface UserProfile {
    name: string;
}
export interface http_header {
    value: string;
    name: string;
}
export enum UserRole {
    admin = "admin",
    user = "user",
    guest = "guest"
}
export enum YoutubeEndpoint {
    trendingVidos = "trendingVidos",
    searchVideos = "searchVideos",
    videoDetails = "videoDetails"
}
export interface backendInterface {
    assignCallerUserRole(user: Principal, role: UserRole): Promise<void>;
    getCallerUserProfile(): Promise<UserProfile | null>;
    getCallerUserRole(): Promise<UserRole>;
    getUserProfile(user: Principal): Promise<UserProfile | null>;
    isCallerAdmin(): Promise<boolean>;
    querySearchVideos(): Promise<string>;
    queryTrendingVidos(): Promise<string>;
    queryVideoDetails(): Promise<string>;
    queryYoutubeApi(endpoint: YoutubeEndpoint): Promise<string>;
    saveCallerUserProfile(profile: UserProfile): Promise<void>;
    setApiKey(apiKey: Uint8Array): Promise<void>;
    transform(input: TransformationInput): Promise<TransformationOutput>;
}
