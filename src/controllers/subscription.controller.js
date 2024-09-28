import mongoose, { isValidObjectId } from "mongoose";
import { Subscription } from "../models/subscription.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/AsyncHandler.js";

const toggleSubscription = asyncHandler(async (req, res) => {
  const { channelId } = req.params;
  const userId = req.user?._id;

  const existingSub = await Subscription.findOne({
    subscriber: userId,
    channel: channelId,
  });

  if (!existingSub) {
    const newSub = await Subscription.create({
      subscriber: userId,
      channel: channelId,
    });

    if (!newSub) {
      throw new ApiError(400, "Failed to subscribe to channel");
    }

    return res
      .status(200)
      .json(new ApiResponse(200, newSub, "Subscribed to channel"));
  }

  const deletedSub = await Subscription.findByIdAndDelete(existingSub._id);

  if (!deletedSub) {
    throw new ApiError(400, "Failed to unsubscribe from channel");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, deletedSub, "Unsubscribed from channel"));
});

const getUserChannelSubscribers = asyncHandler(async (req, res) => {
  const { subscriberId } = req.params;

  if (!isValidObjectId(subscriberId)) {
    throw new ApiError(400, "Invalid channel ID");
  }

  const channelList = await Subscription.aggregate([
    {
      $match: { channel: new mongoose.Types.ObjectId(subscriberId) },
    },
    {
      $lookup: {
        from: "users",
        localField: "subscriber",
        foreignField: "_id",
        as: "subscriber",
        pipeline: [{ $project: { fullName: 1, username: 1, avatar: 1 } }],
      },
    },
    {
      $project: {
        subscriber: { $arrayElemAt: ["$subscriber", 0] },
        createdAt: 1,
        totalViews: 1,
      },
    },
  ]);
  return res
    .status(200)
    .json(
      new ApiResponse(200, channelList, "Subscribers fetched successfully")
    );
});

const getSubscribedChannels = asyncHandler(async (req, res) => {
  const { channelId } = req.params;

  const channelList = await Subscription.aggregate([
    {
      $match: {
        subscriber: new mongoose.Types.ObjectId(channelId),
      },
    },
    {
      $lookup: {
        from: "users",
        foreignField: "_id",
        localField: "channel",
        as: "channel",
        pipeline: [{ $project: { fullName: 1, username: 1, avatar: 1 } }],
      },
    },
  ]);

  if (!channelList) {
    throw new ApiError(400, "Error while getting My subscribed List");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, channelList, "Fetched Subscribed list"));
});

export { toggleSubscription, getUserChannelSubscribers, getSubscribedChannels };
