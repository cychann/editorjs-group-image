import { API } from "@editorjs/editorjs";
import { ImageData } from "../types/interfaces";
import { Helpers } from "../utils/helpers";

/**
 * Handles file selection and processing for GroupImage.
 */
export class FileHandler {
  private api: API;
  private fileInput: HTMLInputElement;

  /**
   * Creates an instance of FileHandler.
   * @param api - Editor.js API instance.
   */
  constructor(api: API) {
    this.api = api;
    this.fileInput = this.createFileInput();
  }

  /**
   * Creates a hidden file input element for image selection.
   * @returns The created HTML input element.
   */
  private createFileInput(): HTMLInputElement {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.multiple = true;
    input.style.display = "none";

    input.addEventListener("change", this.handleFileChange.bind(this));

    return input;
  }

  /**
   * Triggers the file selection dialog.
   */
  public selectFiles(): void {
    this.fileInput.click();
  }

  /**
   * Handles file selection and processes selected images.
   * Creates multiple blocks with up to 3 images each following column layout.
   * @param event - The file input change event.
   */
  private async handleFileChange(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const files = input.files;

    if (!files || files.length === 0) return;

    try {
      const imagesData = await Promise.all(
        Array.from(files).map(async (file) => {
          const imageUrl = URL.createObjectURL(file);
          const { width, height } = await Helpers.getImageDimensions(imageUrl);

          return {
            url: imageUrl,
            size: file.size,
            name: file.name,
            type: file.type,
            width,
            height,
            ratio: width / height,
          } as ImageData;
        })
      );

      const columns = Helpers.organizeImagesIntoColumns(imagesData);

      columns.forEach((columnImages) => {
        this.api.blocks.insert("groupImage", { images: columnImages });
      });
    } catch (error) {
      console.error("Error processing images:", error);
    }

    input.value = "";
  }
}
