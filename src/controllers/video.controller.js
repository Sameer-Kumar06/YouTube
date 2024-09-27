import { Video } from "../models/video.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/AsyncHandler.js";
import { uploadOnCloudinary, deleteInCloudinary } from "../utils/Cloudinary.js";

const getAllVideos = asyncHandler(async (req, res) => {
  const {
    page = 1,
    limit = 10,
    query = "",
    sortBy = "title",
    sortType = "asc",
  } = req.query;
  const videos = await Video.aggregate([
    {
      $match: {
        $or: [
          { title: { $regex: query, $options: "i" } },
          { description: { $regex: query, $options: "i" } },
        ],
      },
    },
    {
      $lookup: {
        from: "users",
        localField: "owner",
        foreignField: "_id",
        as: "createdBy",
      },
    },
    {
      $unwind: "$createdBy",
    },
    {
      $project: {
        thumbnail: 1,
        videoFile: 1,
        title: 1,
        description: 1,
        createdBy: {
          fullName: 1,
          username: 1,
          avatar: 1,
        },
      },
    },
    {
      $sort: {
        [sortBy]: sortType === "asc" ? 1 : -1,
      },
    },
    {
      $skip: (page - 1) * limit,
    },
    {
      $limit: parseInt(limit),
    },
  ]);

  return res
    .status(200)
    .json(200, { videos }, "All videos fetched Successfully");
});

const publishAVideo = asyncHandler(async (req, res) => {
  const { title, description } = req.body;
  if (!title && !description) {
    throw new ApiError(400, "Title and description are required");
  }
  const videoFileLocalPath = req.files?.videoFile[0]?.path;
  if (!videoFileLocalPath) {
    throw new ApiError(400, "Video file is required");
  }

  const videoFile = await uploadOnCloudinary(videoFileLocalPath);
  if (!videoFile?.url) {
    throw new ApiError(500, "Failed to upload video to Cloudinary");
  }

  const thumbnailLocalPath = req.files?.thumbnail[0]?.path;
  if (!thumbnailLocalPath) {
    throw new ApiError(400, "Thumbnail file is required");
  }

  const thumbnailFile = await uploadOnCloudinary(thumbnailLocalPath);
  if (!thumbnailFile?.url) {
    throw new ApiError(500, "Failed to upload thumbnail to Cloudinary");
  }

  const video = Video.create({
    videoFile: videoFile?.url,
    thumbnail: thumbnail?.url,
    title,
    description,
    owner: req.user?._id,
    duration: videoFile?.duration,
  });

  if (!video) {
    throw new ApiError(500, "Error while saving video");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, { video }, "Video Uploaded Successfully"));
});

const getVideoById = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  if (!videoId) {
    throw new ApiError(400, "Video ID is required");
  }

  const video = await Video.findById(videoId);
  if (!video) {
    throw new ApiError(404, "Video not found");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, { video }, "Video Found Successfully"));
});

const updateVideo = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  if (!videoId) {
    throw new ApiError(400, "Video ID is required");
  }
  const { title, description } = req.body;
  if (!title && !description) {
    throw new ApiError(400, "Title and description are required");
  }

  const video = await Video.findById(videoId);
  if (!video) {
    throw new ApiError(404, "Video not found");
  }
  if (!(video?.owner).equals(req.user?._id)) {
    throw new ApiError(403, "Unauthorized to update this video");
  }

  const deleteOldThumbnail = await deleteInCloudinary(video.thumbnail);
  if (deleteOldThumbnail.resule !== "ok") {
    throw new ApiError(500, "Failed to delete old thumbnail from Cloudinary");
  }
  const thumbnailLocalPath = req.files?.thumbnail[0]?.path;
  if (!thumbnailLocalPath) {
    throw new ApiError(400, "Thumbnail file is required");
  }

  const thumbnailFile = await uploadOnCloudinary(thumbnailLocalPath);
  if (!thumbnailFile?.url) {
    throw new ApiError(500, "Failed to upload thumbnail to Cloudinary");
  }

  const videoToUpdate = await Video.findByIdAndUpdate(
    videoId,
    {
      $set: {
        title: title,
        description: description,
        thumbnail: thumbnailFile?.url,
      },
    },
    {
      new: true,
    }
  );

  if (!videoToUpdate) {
    throw new ApiError(500, "Error while updating video");
  }

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        { video: videoToUpdate },
        "Video Updated Successfully"
      )
    );
});

const deleteVideo = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  if (!videoId) {
    throw new ApiError(400, "Video ID is required");
  }
  const video = await Video.findById(videoId);
  if (!video) {
    throw new ApiError(404, "Video not found");
  }
  if (!(video?.owner).equals(req.user?._id)) {
    throw new ApiError(403, "Unauthorized to delete this video");
  }

  const videoToDelete = await deleteInCloudinary(video.videoFile);
  if (videoToDelete.result !== "ok") {
    throw new ApiError(500, "Failed to delete video from Cloudinary");
  }

  const thumbnailToDelete = await deleteInCloudinary(video.thumbnail);
  if (thumbnailToDelete.result !== "ok") {
    throw new ApiError(500, "Failed to delete thumbnail from Cloudinary");
  }

  const deletedVideo = await Video.findByIdAndDelete(videoId);
  if (!deletedVideo) {
    throw new ApiError(500, "Error while deleting video");
  }

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        { video: deletedVideo },
        "Video Deleted Successfully"
      )
    );
});

const togglePublishStatus = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  if (!videoId) {
    throw new ApiError(400, "Video ID is required");
  }
  const video = await Video.findById(videoId);
  if (!video) {
    throw new ApiError(404, "Video not found");
  }
  if (!(video?.owner).equals(req.user?._id)) {
    throw new ApiError(403, "Unauthorized to toggle publish status");
  }

  const toggledVideo = await Video.findByIdAndUpdate(
    videoId,
    {
      $set: {
        isPublished: !video.isPublished,
      },
    },
    {
      new: true,
    }
  );

  if (!toggledVideo) {
    throw new ApiError(500, "Error while toggling publish status");
  }

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        { video: toggledVideo },
        "Publish status toggled successfully"
      )
    );
});

export {
  getAllVideos,
  publishAVideo,
  getVideoById,
  updateVideo,
  deleteVideo,
  togglePublishStatus,
};
