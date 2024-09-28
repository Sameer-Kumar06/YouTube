import { v2 as cloudinary } from "cloudinary";
import { extractPublicId } from "cloudinary-build-url";
import fs from "fs";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const uploadOnCloudinary = async (localFilePath) => {
  try {
    if (!localFilePath) {
      return null;
    }
    //upload file on cloudinary
    const response = await cloudinary.uploader.upload(localFilePath, {
      resource_type: "auto",
    });

    // File has been uploaded successfully
    fs.unlinkSync(localFilePath);
    return response;
  } catch (error) {
    fs.unlinkSync(localFilePath);
    return null;
  }
};

const deleteInCloudinary = async (fileUrl) => {
  try {
    if (!fileUrl) {
      return null;
    }

    // Extract the public ID from the URL
    const publicId = extractPublicId(fileUrl);

    // If public ID extraction fails, return null
    if (!publicId) {
      return null;
    }

    // Determine the resource type based on file extension
    let resourceType = "image";
    if (
      fileUrl
        .toLowerCase()
        .match(/\.(mp4|MP4|mkv|mov|avi|wmv|flv|webm|m4v|3gp)$/)
    ) {
      resourceType = "video";
    } else if (fileUrl.toLowerCase().match(/\.(mp3|wav)$/)) {
      resourceType = "raw";
    }

    // Call Cloudinary's destroy function with the public ID and resource type
    const response = await cloudinary.uploader.destroy(publicId, {
      resource_type: resourceType,
    });

    // Return Cloudinary's response
    return response;
  } catch (error) {
    console.error("Error deleting file in Cloudinary:", error);
    return null;
  }
};

export { uploadOnCloudinary, deleteInCloudinary };
