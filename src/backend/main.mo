import Blob "mo:core/Blob";
import Map "mo:core/Map";
import Text "mo:core/Text";
import Array "mo:core/Array";
import Iter "mo:core/Iter";
import Order "mo:core/Order";
import Runtime "mo:core/Runtime";
import Principal "mo:core/Principal";
import OutCall "http-outcalls/outcall";
import MixinAuthorization "authorization/MixinAuthorization";
import AccessControl "authorization/access-control";

actor {
  module ApiKey {
    public type T = Blob;
    public func compare(a : T, b : T) : Order.Order { Blob.compare(a, b) };
  };

  // (1) Store the API key as a blob (accessible only by admins)
  let apiKeys = Map.empty<Principal, ApiKey.T>();

  let accessControlState = AccessControl.initState();
  include MixinAuthorization(accessControlState);

  // User profile system as required by instructions
  public type UserProfile = {
    name : Text;
    // Other user metadata if needed
  };

  let userProfiles = Map.empty<Principal, UserProfile>();

  public query ({ caller }) func getCallerUserProfile() : async ?UserProfile {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can access profiles");
    };
    userProfiles.get(caller);
  };

  public query ({ caller }) func getUserProfile(user: Principal) : async ?UserProfile {
    if (caller != user and not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: Can only view your own profile");
    };
    userProfiles.get(user);
  };

  public shared ({ caller }) func saveCallerUserProfile(profile : UserProfile) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can save profiles");
    };
    userProfiles.add(caller, profile);
  };

  public type YoutubeEndpoint = {
    #trendingVidos;
    #searchVideos;
    #videoDetails;
  };

  public query func transform(input : OutCall.TransformationInput) : async OutCall.TransformationOutput {
    OutCall.transform(input);
  };

  // Find the first stored API key, or trap if none found
  func getApiKey() : ApiKey.T {
    if (apiKeys.isEmpty()) {
      Runtime.trap("No API key configured. Contact admin for setting YouTube API key.");
    };
    switch (apiKeys.values().next()) {
      case (null) { Runtime.trap("No API key configured. Contact admin for setting YouTube API key.") };
      case (?key) { key };
    };
  };

  // Helper to build the full Youtube API URL with the endpoint and API key
  func buildYoutubeApiUrl(endpoint : YoutubeEndpoint) : Text {
    let baseUrl = "https://www.googleapis.com/youtube/v3/";
    let endpointPath = switch (endpoint) {
      case (#trendingVidos) { "videos?chart=mostPopular" };
      case (#searchVideos) { "search" };
      case (#videoDetails) { "videoDetails" };
    };
    let apiKey = getApiKey().toArray();
    let encodedApiKey = apiKey.toText();
    baseUrl # endpointPath # "&key=" # encodedApiKey;
  };

  // (2) Make an actual Youtube API call with HTTP outcall
  func performYoutubeApiCall(endpoint : YoutubeEndpoint) : async Text {
    let url = buildYoutubeApiUrl(endpoint);
    await OutCall.httpGetRequest(url, [], transform);
  };

  // (1) Admin can set the API key - ADMIN ONLY
  public shared ({ caller }) func setApiKey(apiKey : Blob) : async () {
    if (not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: Only admins can set API key");
    };
    apiKeys.add(caller, apiKey);
  };

  // (2) Public function to proxy Youtube API calls - PUBLIC (no auth required)
  // Changed from query to shared because HTTP outcalls require update calls
  public shared ({ caller }) func queryYoutubeApi(endpoint : YoutubeEndpoint) : async Text {
    await performYoutubeApiCall(endpoint);
  };

  // Backwards compatible API functions - PUBLIC (no auth required)
  public shared ({ caller }) func queryTrendingVidos() : async Text {
    await queryYoutubeApi(#trendingVidos);
  };

  public shared ({ caller }) func querySearchVideos() : async Text {
    await queryYoutubeApi(#searchVideos);
  };

  public shared ({ caller }) func queryVideoDetails() : async Text {
    await queryYoutubeApi(#videoDetails);
  };
};
