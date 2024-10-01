import mongoose from "mongoose";
import { Video } from "../models/video.model.js";
import { Subscription } from "../models/subscription.model.js";
import { Like } from "../models/like.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/AsyncHandler.js";

const getChannelStats = asyncHandler(async (req, res) => {
  const userId = new mongoose.Types.ObjectId(req.user._id);

  const totalSubscribers = await Subscription.aggregate([
    {
      $match: {
        channel: userId,
      },
    },
    {
      $group: {
        _id: null,
        totalSubs: {
          $sum: 1,
        },
      },
    },
    {
      $project: {
        _id: 0,
        totalSubs: 1,
      },
    },
  ]);

  const likesCount = await Like.aggregate([
    {
      $lookup: {
        from: "videos",
        localField: "video",
        foreignField: "_id",
        as: "videoStat",
      },
    },
    {
      $lookup: {
        from: "comments",
        localField: "comment",
        foreignField: "_id",
        as: "commentStat",
      },
    },
    {
      $lookup: {
        from: "tweets",
        localField: "tweet",
        foreignField: "_id",
        as: "tweetStat",
      },
    },
    {
      $match: {
        $or: [
          { "videoStat.owner": userId },
          { "commentStat.owner": userId },
          { "tweetStat.owner": userId },
        ],
      },
    },
    {
      $group: {
        _id: null,
        totalLikes: {
          $sum: 1,
        },
      },
    },
    {
      $project: {
        _id: 0,
        totalLikes: 1,
      },
    },
  ]);

  const viewsCount = await Video.aggregate([
    {
      $match: {
        owner: userId,
      },
    },
    {
      $group: {
        _id: "$views",
        totalViews: {
          $sum: "$views",
        },
        totalVideos: {
          $sum: 1,
        },
      },
    },
    {
      $project: {
        _id: 0,
        totalViews: 1,
        totalVideos: 1,
      },
    },
  ]);

  const channelInfo = {
    totalSubscribers: totalSubscribers[0]?.totalSubs || 0,
    totalLikes: likesCount[0]?.totalLikes || 0,
    totalViews: viewsCount[0]?.totalViews || 0,
    totalVideos: viewsCount[0]?.totalVideos || 0,
  };
  return res
    .status(200)
    .json(new ApiResponse(200, channelInfo, "Channel stats fetched"));
});

const getChannelVideos = asyncHandler(async (req, res) => {
  const videos = await Video.aggregate([
    {
      $match: {
        owner: new mongoose.Types.ObjectId(req.user._id),
      },
    },
    {
      $project: {
        videoFile: 1,
        thumbnail: 1,
        title: 1,
        duration: 1,
        description: 1,
        views: 1,
        isPublished: 1,
        owner: 1,
        createdAt: 1,
        updatedAt: 1,
      },
    },
  ]);
  return res.status.json(
    new ApiResponse(200, videos, "Videos fetched successfully")
  );
});

export { getChannelStats, getChannelVideos };
