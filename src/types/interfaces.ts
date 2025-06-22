import { API } from "@editorjs/editorjs";

/**
 * Data structure for the GroupImage block.
 */
export interface GroupImageData {
  images: ImageData[];
  caption: string;
}

/**
 * Data structure for individual image items.
 */
export interface ImageData {
  url: string;
  name: string;
  size: number;
  type: string;
  width: number;
  height: number;
  ratio: number;
}

/**
 * CSS class names used in the GroupImage block.
 */
export interface GroupImageCSS {
  block: string;
  imageWrapper: string;
  wrapper: string;
  groupImage: string;
  imageItem: string;
  caption: string;
}

/**
 * Drop type directions for drag-and-drop operations.
 */
export type DropType = "top" | "bottom" | "left" | "right";

/**
 * File upload event data.
 */
export interface FileUploadResult {
  success: boolean;
  columns: ImageData[][];
}
