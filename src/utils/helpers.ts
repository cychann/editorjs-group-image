import { ImageData } from "../types/interfaces";

/**
 * Utility functions for GroupImage operations.
 */
export class Helpers {
  /**
   * Gets image dimensions by loading the image.
   * @param url - The image URL to measure.
   * @returns Promise resolving to width and height dimensions.
   */
  static getImageDimensions(
    url: string
  ): Promise<{ width: number; height: number }> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve({ width: img.width, height: img.height });
      img.onerror = () => reject(new Error("Failed to load image"));
      img.src = url;
    });
  }

  /**
   * Organizes images into columns with maximum 3 images per column.
   * @param images - Array of image data.
   * @returns Array of image columns.
   */
  static organizeImagesIntoColumns(images: ImageData[]): ImageData[][] {
    const columnCount = Math.ceil(images.length / 3);
    const columns: ImageData[][] = Array.from(
      { length: columnCount },
      () => []
    );

    images.forEach((imageData, index) => {
      const colIndex = index % columnCount;
      columns[colIndex].push(imageData);
    });

    return columns;
  }

  /**
   * Removes all drag-over visual effects from the document.
   */
  static clearDragOverEffects(): void {
    const allItems = document.querySelectorAll(
      ".drag-over-left, .drag-over-right, .drag-over-top, .drag-over-bottom"
    );

    allItems.forEach((el) => {
      el.classList.remove(
        "drag-over-left",
        "drag-over-right",
        "drag-over-top",
        "drag-over-bottom"
      );
    });
  }

  /**
   * Determines drop position index based on mouse coordinates.
   * @param e - The drag event.
   * @param element - The target element.
   * @returns The calculated drop index.
   */
  static getDropPosition(e: DragEvent, element: HTMLElement): number {
    const rect = element.getBoundingClientRect();
    const mouseX = e.clientX;
    const elementX = rect.left;
    const elementWidth = rect.width;

    if (mouseX < elementX + elementWidth / 2) {
      const index = parseInt(element.dataset.index || "0");
      return index;
    }
    return parseInt(element.dataset.index || "0") + 1;
  }

  /**
   * Determines drop index based on mouse position relative to existing images.
   * @param e - The drag event.
   * @param items - NodeList of existing image elements.
   * @returns The calculated drop index.
   */
  static determineDropIndex(e: DragEvent, items: NodeListOf<Element>): number {
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const rect = item.getBoundingClientRect();
      if (e.clientX < rect.left + rect.width / 2) {
        return i;
      }
    }
    return items.length;
  }

  /**
   * Determines the drop type based on mouse position relative to target element.
   * @param e - The drag event.
   * @param targetItem - The target HTML element.
   * @returns The drop type direction or null.
   */
  static getDropType(
    e: DragEvent,
    targetItem: HTMLElement
  ): "top" | "bottom" | "left" | "right" | null {
    const rect = targetItem.getBoundingClientRect();
    const mouseX = e.clientX;
    const mouseY = e.clientY;

    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    const deltaX = mouseX - centerX;
    const deltaY = mouseY - centerY;

    if (Math.abs(deltaY) > Math.abs(deltaX)) {
      return deltaY < 0 ? "top" : "bottom";
    } else {
      return deltaX < 0 ? "left" : "right";
    }
  }
}
