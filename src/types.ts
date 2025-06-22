// types.ts
import { API } from "@editorjs/editorjs";

/**
 * GroupImage 블록의 데이터 구조
 */
export interface GroupImageData {
  images: ImageData[];
  caption: string;
}

/**
 * 개별 이미지 데이터 구조
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
 * CSS 클래스명 정의
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
 * 드롭 타입 정의
 */
export type DropType = "top" | "bottom" | "left" | "right";

/**
 * 드래그 데이터 구조
 */
export interface DragData {
  imageData: ImageData;
  sourceIndex: number;
  blockIndex: number;
}

/**
 * 드래그 상태 관리 인터페이스
 */
export interface DragState {
  draggedImage: ImageData | null;
  sourceInstance: any | null;
  sourceIndex: number | null;
  activeImageBlock: any | null;
}

/**
 * 매니저 초기화 옵션
 */
export interface ManagerOptions {
  api: API;
  css: GroupImageCSS;
  element: HTMLDivElement;
  data: GroupImageData;
}
