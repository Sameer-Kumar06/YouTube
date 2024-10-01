import mongoose, { isValidObjectId } from "mongoose";
import { Like } from "../models/like.model.js";
import { Video } from "../models/video.model.js";
import { Comment } from "../models/comment.model.js";
import { Tweet } from "../models/tweet.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/AsyncHandler.js";

const toggleVideoLike = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  const userId = req.user?._id;

  if (!isValidObjectId(videoId)) {
    throw new ApiError(400, "Invalid video ID");
  }
  const video = await Video.findById(videoId);
  if (!video) {
    throw new ApiError(404, "Video not found");
  }

  const alreadyLikedVideo = await Like.findOne({
    $and: [{ video: videoId }, { likedBy: userId }],
  });

  if (!alreadyLikedVideo) {
    const liked = await Like.create({
      video: videoId,
      likedBy: userId,
    });
    if (!liked) {
      throw new ApiError(500, "Failed to like video");
    }
    return res.status(200).json(new ApiResponse(200, liked, "Liked the video"));
  }

  const unliked = await Like.findByIdAndDelete(alreadyLikedVideo._id);
  if (!unliked) {
    throw new ApiError(500, "Failed to unlike video");
  }
  return res
    .status(200)
    .json(new ApiResponse(200, unliked, "Unliked the video"));
});

const toggleCommentLike = asyncHandler(async (req, res) => {
  const { commentId } = req.params;
  const userId = req.user?._id;

  if (!isValidObjectId(commentId)) {
    throw new ApiError(400, "Invalid comment ID");
  }
  const comment = await Comment.findById(commentId);
  if (!comment) {
    throw new ApiError(404, "Comment not found");
  }

  const alreadyLiked = await Like.findOne({
    $and: [{ comment: commentId }, { likedBy: userId }],
  });
  if (!alreadyLiked) {
    const liked = await Like.create({
      comment: commentId,
      likedBy: userId,
    });
    if (!liked) {
      throw new ApiError(500, "Failed to like comment");
    }
    return res
      .status(200)
      .json(new ApiResponse(200, liked, "Liked the comment"));
  }

  const unliked = await Like.findByIdAndDelete(alreadyLiked._id);
  if (!unliked) {
    throw new ApiError(500, "Failed to unlike comment");
  }
  return res
    .status(200)
    .json(new ApiResponse(200, unliked, "Unliked the comment"));
});

const toggleTweetLike = asyncHandler(async (req, res) => {
  const { tweetId } = req.params;
  const userId = req.user?._id;

  if (!isValidObjectId(tweetId)) {
    throw new ApiError(400, "Invalid tweet ID");
  }
  const tweet = await Tweet.findById(tweetId);
  if (!tweet) {
    throw new ApiError(404, "Tweet not found");
  }

  const alreadyLiked = await Like.findOne({
    $and: [{ tweet: tweetId }, { likedBy: userId }],
  });
  if (!alreadyLiked) {
    const liked = await Like.create({
      tweet: tweetId,
      likedBy: userId,
    });
    if (!liked) {
      throw new ApiError(500, "Failed to like tweet");
    }
    return res.status(200).json(new ApiResponse(200, liked, "Liked the tweet"));
  }

  const unliked = await Like.findByIdAndDelete(alreadyLiked._id);
  if (!unliked) {
    throw new ApiError(500, "Failed to unlike tweet");
  }
  return res
    .status(200)
    .json(new ApiResponse(200, unliked, "Unliked the tweet"));
});

const getLikedVideos = asyncHandler(async (req, res) => {
  const likedVideos = await Like.aggregate([
    {
      $match: {
        likedBy: new mongoose.Types.ObjectId(req.user._id),
        video: { $exists: true, $ne: null },
      },
    },
    {
      $lookup: {
        from: "videos",
        foreignField: "_id",
        localField: "video",
        as: "video",
        pipeline: [
          {
            $lookup: {
              from: "users",
              localField: "owner",
              foreignField: "_id",
              as: "owner",
              pipeline: [
                {
                  $project: {
                    fullName: 1,
                    username: 1,
                    avatar: 1,
                  },
                },
              ],
            },
          },
          {
            $addFields: {
              owner: {
                $first: "$owner",
              },
            },
          },
          {
            $project: {
              videoFile: 1,
              thumbnail: 1,
              title: 1,
              duration: 1,
              views: 1,
              owner: 1,
            },
          },
        ],
      },
    },
    {
      $unwind: "$video",
    },
    {
      $project: {
        video: 1,
        likedBy: 1,
      },
    },
  ]);

  return res
    .status(200)
    .json(new ApiResponse(200, likedVideos, "Fetched all liked videos"));
});

export { toggleVideoLike, toggleCommentLike, toggleTweetLike, getLikedVideos };
