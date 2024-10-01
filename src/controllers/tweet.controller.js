import mongoose, { isValidObjectId } from "mongoose";
import { Tweet } from "../models/tweet.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/AsyncHandler.js";

const createTweet = asyncHandler(async (req, res) => {
  const { content } = req.body;
  const userId = req.user?._id;
  if (!content) {
    throw new ApiError(400, "Content is required");
  }
  const tweet = await Tweet.create({
    content,
    owner: new mongoose.Types.ObjectId(userId),
  });

  if (!tweet) {
    throw new ApiError(500, "Failed to create tweet");
  }

  return res
    .status(201)
    .json(new ApiResponse(201, tweet, "Tweet created successfully"));
});

const getUserTweets = asyncHandler(async (req, res) => {
  const userId = req.params?.userId;
  if (!isValidObjectId(userId)) {
    throw new ApiError(400, "Invalid user ID");
  }

  const tweets = await Tweet.find({ owner: userId }).sort({ createdAt: -1 });

  if (!tweets) {
    throw new ApiError(404, "No tweets found for this user");
  }

  return res.json(new ApiResponse(200, tweets, "Tweets fetched successfully"));
});

const updateTweet = asyncHandler(async (req, res) => {
  const { tweetId } = req.params;
  const { content } = req.body;
  if (!isValidObjectId(tweetId)) {
    throw new ApiError(400, "Invalid tweet ID");
  }
  if (!content) {
    throw new ApiError(400, "Content is required");
  }
  const tweet = await Tweet.findById(tweetId);
  if (!tweet) {
    throw new ApiError(404, "Tweet not found");
  }
  if (!(tweet?.owner).equals(req.user?._id)) {
    throw new ApiError(403, "Unauthorized to update this tweet");
  }
  const updatedTweet = await Tweet.findByIdAndUpdate(
    tweetId,
    {
      $set: { content: content },
    },
    {
      new: true,
    }
  );
  return res
    .status(200)
    .json(new ApiResponse(200, updatedTweet, "Tweet updated successfully"));
});

const deleteTweet = asyncHandler(async (req, res) => {
  const { tweetId } = req.params;
  if (!isValidObjectId(tweetId)) {
    throw new ApiError(400, "Invalid tweet ID");
  }
  const tweet = await Tweet.findById(tweetId);
  if (!tweet) {
    throw new ApiError(404, "Tweet not found");
  }
  if (!(tweet?.owner).equals(req.user?._id)) {
    throw new ApiError(403, "Unauthorized to delete this tweet");
  }
  const deletedTweet = await Tweet.findByIdAndDelete(tweetId);
  return res
    .status(200)
    .json(new ApiResponse(200, deletedTweet, "Tweet deleted successfully"));
});

export { createTweet, getUserTweets, updateTweet, deleteTweet };
