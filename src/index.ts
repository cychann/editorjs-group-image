import "./index.css";
import {
  API,
  BlockTool,
  BlockToolConstructorOptions,
  BlockToolData,
  ToolboxConfig,
  PasteConfig,
} from "@editorjs/editorjs";

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
interface GroupImageCSS {
  block: string;
  imageWrapper: string;
  wrapper: string;
  groupImage: string;
  imageItem: string;
  caption: string;
}

/**
 * GroupImage class representing a multi-image block with drag-and-drop functionality for Editor.js.
 *
 * Features:
 * - Multiple image upload with automatic layout
 * - Drag-and-drop reordering within and between blocks
 * - Vertical drag separation into new blocks
 * - Interactive caption system
 * - Responsive layout with aspect ratio calculations
 */
export default class GroupImage implements BlockTool {
  // Static Properties
  /**
   * Currently dragged image data.
   */
  static draggedImage: any = null;

  /**
   * Source instance of the drag operation.
   */
  static sourceInstance: GroupImage | null = null;

  /**
   * Index of the dragged image in source block.
   */
  static sourceIndex: number | null = null;

  /**
   * Currently active image block instance.
   */
  static activeImageBlock: GroupImage | null = null;

  // Static Getters
  /**
   * Indicates if the tool supports read-only mode.
   * @returns True if read-only mode is supported.
   */
  static get isReadOnlySupported(): boolean {
    return true;
  }

  /**
   * Indicates if the tool is contentless.
   * @returns True if the tool is contentless.
   */
  static get contentless(): boolean {
    return true;
  }

  /**
   * Gets the toolbox configuration for the GroupImage tool.
   * @returns The toolbox configuration object.
   */
  static get toolbox(): ToolboxConfig {
    return {
      icon: "🖼️",
      title: "Group Image",
    };
  }

  /**
   * Gets the paste configuration for the GroupImage tool.
   * @returns The paste configuration object.
   */
  static get pasteConfig(): PasteConfig {
    return { tags: [] };
  }

  // Instance Properties
  /**
   * Editor.js API instance.
   */
  private api: API;

  /**
   * CSS class names used in the block.
   */
  private _CSS: GroupImageCSS;

  /**
   * Block data containing images and caption.
   */
  private data: BlockToolData;

  /**
   * Root HTML element of the block.
   */
  private _element: HTMLDivElement;

  /**
   * Flag indicating if caption is currently activated.
   */
  private activateCaption: boolean;

  /**
   * Hidden file input element for image selection.
   */
  private fileInput: HTMLInputElement;

  /**
   * Creates an instance of the GroupImage block.
   * @param params - The constructor parameters containing data, config, and API.
   */
  constructor({ data, api }: BlockToolConstructorOptions) {
    this.api = api;
    this.data = data || { images: [], caption: "" };
    this._CSS = this.initializeCSS();
    this._element = this.drawView();
    this.activateCaption = !!this.data.caption;
    this.fileInput = this.createFileInput();
  }

  /**
   * Initializes CSS class names for the block.
   * @returns Object containing CSS class names.
   */
  private initializeCSS(): GroupImageCSS {
    return {
      block: this.api.styles.block,
      imageWrapper: "ce-group-image-wrapper",
      wrapper: "ce-group-image",
      groupImage: "group-image-wrapper",
      imageItem: "group-image-item",
      caption: "group-image-caption",
    };
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
          const { width, height } = await this.getImageDimensions(imageUrl);

          return {
            url: imageUrl,
            size: file.size,
            name: file.name,
            type: file.type,
            width,
            height,
            ratio: width / height,
          };
        })
      );

      const columnCount = Math.ceil(imagesData.length / 3);
      const columns: Array<typeof imagesData> = Array.from(
        { length: columnCount },
        () => []
      );

      imagesData.forEach((imageData, index) => {
        const colIndex = index % columnCount;
        columns[colIndex].push(imageData);
      });

      columns.forEach((columnImages) => {
        this.api.blocks.insert("groupImage", { images: columnImages });
      });
    } catch (error) {
      console.error("Error processing images:", error);
    }

    input.value = "";
  }

  /**
   * Gets image dimensions by loading the image.
   * @param url - The image URL to measure.
   * @returns Promise resolving to width and height dimensions.
   */
  private getImageDimensions(
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
   * Callback executed when the tool is selected from the toolbox.
   * Triggers the file selection dialog.
   */
  public appendCallback(): void {
    this.fileInput.click();
  }

  /**
   * Creates and returns the HTML structure for the block.
   * @returns The root HTML element of the block.
   */
  drawView(): HTMLDivElement {
    const wrapper = document.createElement("div");
    wrapper.classList.add(this._CSS.wrapper, this._CSS.block);

    wrapper.addEventListener("dragover", this.onDragOverBlock.bind(this));
    wrapper.addEventListener("drop", this.onDropBlock.bind(this));

    const blockWrapper = document.createElement("div");
    blockWrapper.classList.add(this._CSS.imageWrapper);
    this.renderImages(blockWrapper);

    const caption = document.createElement("input");
    caption.classList.add(this._CSS.caption);
    caption.placeholder = "이미지를 설명해보세요";
    caption.value = this.data.caption || "";

    caption.addEventListener("input", (e: Event) => {
      const input = e.target as HTMLInputElement;
      this.data.caption = input.value;
    });

    this.updateCaptionVisibility(caption);

    blockWrapper.addEventListener("click", () => {
      this.showCaption(caption);
      this._element.classList.add("active");
      document.addEventListener("keydown", this.handleKeyDown);
    });

    document.addEventListener(
      "click",
      (e: Event) => {
        if (!this._element.contains(e.target as Node)) {
          this._element.classList.remove("active");

          caption.value === ""
            ? this.hideCaption(caption)
            : this.showCaption(caption);

          document.removeEventListener("keydown", this.handleKeyDown);
        }
      },
      true
    );

    wrapper.appendChild(blockWrapper);
    wrapper.appendChild(caption);

    return wrapper;
  }

  /**
   * Updates caption visibility based on content and activation state.
   * @param caption - The caption input element.
   */
  private updateCaptionVisibility(caption: HTMLInputElement): void {
    const shouldShowCaption =
      this.data.caption ||
      (GroupImage.activeImageBlock === this && this.activateCaption);

    shouldShowCaption ? this.showCaption(caption) : this.hideCaption(caption);
  }

  /**
   * Deactivates the block and removes active state.
   */
  private deactivate(): void {
    this.activateCaption = false;
    this._element.classList.remove("active");
  }

  /**
   * Shows the caption input element.
   * @param caption - The caption element to show.
   */
  private showCaption(caption: HTMLElement): void {
    this.activateCaption = true;
    caption.style.display = "block";
  }

  /**
   * Hides the caption input element.
   * @param caption - The caption element to hide.
   */
  private hideCaption(caption: HTMLElement): void {
    this.activateCaption = false;
    caption.style.display = "none";
  }

  /**
   * Handles keyboard events for the block.
   * @param e - The keyboard event.
   */
  private handleKeyDown = (e: KeyboardEvent): void => {
    const isCaption = e.target instanceof HTMLInputElement;

    if (e.key === "Backspace" && !isCaption) {
      e.preventDefault();
      this.api.blocks.delete();
    }
  };

  /**
   * Renders all images in the block with proper layout calculations.
   * @param wrapper - The container element for images.
   */
  private renderImages(wrapper: HTMLDivElement): void {
    const images = this.data.images || [];
    const totalAspectRatio = images.reduce(
      (sum: number, img: any) => sum + img.ratio,
      0
    );

    images.forEach((imageData: any, index: number) => {
      const imageWrapper = this.createImageWrapper(
        imageData,
        index,
        totalAspectRatio,
        images.length
      );
      wrapper.appendChild(imageWrapper);
    });
  }

  /**
   * Creates a wrapper element for an individual image with calculated dimensions.
   * @param imageData - The image data object.
   * @param index - The image index in the block.
   * @param totalAspectRatio - Sum of all image aspect ratios.
   * @param totalImages - Total number of images in the block.
   * @returns The created image wrapper element.
   */
  private createImageWrapper(
    imageData: any,
    index: number,
    totalAspectRatio: number,
    totalImages: number
  ): HTMLDivElement {
    const imageWrapper = document.createElement("div");
    const image = document.createElement("img");

    imageWrapper.classList.add(this._CSS.groupImage);
    imageWrapper.dataset.index = String(index);

    image.classList.add(this._CSS.imageItem);
    image.src = imageData.url;
    image.alt = imageData.name;
    image.draggable = true;

    this.addImageEventListeners(imageWrapper, imageData, index);

    const widthPercentage =
      totalAspectRatio > 0
        ? `${(imageData.ratio / totalAspectRatio) * 100}%`
        : "100%";

    imageWrapper.style.width =
      totalImages === 1 && imageData.width < 800
        ? `${imageData.width}px`
        : widthPercentage;

    imageWrapper.appendChild(image);

    return imageWrapper;
  }

  /**
   * Adds drag-and-drop event listeners to an image wrapper.
   * @param imageWrapper - The image wrapper element.
   * @param imageData - The image data object.
   * @param index - The image index in the block.
   */
  private addImageEventListeners(
    imageWrapper: HTMLDivElement,
    imageData: any,
    index: number
  ): void {
    imageWrapper.addEventListener("dragstart", (e) =>
      this.onDragStart(e, imageData, index)
    );
    imageWrapper.addEventListener("dragover", (e) => this.onDragOver(e, index));
    imageWrapper.addEventListener("drop", (e) => this.onDrop(e, index));
    imageWrapper.addEventListener("dragleave", this.onDragLeave.bind(this));
  }

  /**
   * Handles the start of a drag operation.
   * @param e - The drag event.
   * @param imageData - The data of the dragged image.
   * @param index - The index of the dragged image.
   */
  onDragStart(e: DragEvent, imageData: any, index: number): void {
    if (!e.dataTransfer) return;
    e.dataTransfer.effectAllowed = "move";

    GroupImage.draggedImage = imageData;
    GroupImage.sourceInstance = this;
    GroupImage.sourceIndex = index;

    e.dataTransfer.setData(
      "application/json",
      JSON.stringify({
        imageData,
        sourceIndex: index,
        blockIndex: this.api.blocks.getCurrentBlockIndex(),
      })
    );

    this.deactivate();
    GroupImage.activeImageBlock = null;
  }

  /**
   * Handles drag over events and shows visual indicators.
   * @param e - The drag event.
   * @param index - The index of the target image.
   */
  onDragOver(e: DragEvent, index: number): void {
    e.preventDefault();
    e.stopPropagation();

    this.clearDragOverEffects();

    const targetItem = e.currentTarget as HTMLElement;
    if (!targetItem) return;

    if (
      GroupImage.sourceInstance &&
      GroupImage.sourceInstance === this &&
      GroupImage.sourceIndex === index
    ) {
      return;
    }

    const dropType = this.getDropType(e, targetItem);
    let targetElement: HTMLElement | null = targetItem;

    if (dropType === "top" || dropType === "bottom") {
      targetElement = targetItem.parentElement || targetItem;
    }

    if (!targetElement) return;

    switch (dropType) {
      case "top":
        targetElement.classList.add("drag-over-top");
        break;
      case "bottom":
        targetElement.classList.add("drag-over-bottom");
        break;
      case "left":
        targetElement.classList.add("drag-over-left");
        break;
      case "right":
        targetElement.classList.add("drag-over-right");
        break;
    }

    targetItem.dataset.dropType = dropType || "";
  }

  /**
   * Determines the drop type based on mouse position relative to target element.
   * @param e - The drag event.
   * @param targetItem - The target HTML element.
   * @returns The drop type direction or null.
   */
  private getDropType(
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

  /**
   * Handles drop events and performs image movement operations.
   * @param e - The drag event.
   * @param targetIndex - The index of the drop target.
   */
  async onDrop(e: DragEvent, targetIndex: number): Promise<void> {
    e.preventDefault();
    e.stopPropagation();
    if (!e.dataTransfer) return;

    const transferData = e.dataTransfer.getData("application/json");
    if (!transferData) return;

    const { sourceIndex, blockIndex } = JSON.parse(transferData);
    const sourceBlock = this.api.blocks.getBlockByIndex(blockIndex);
    const targetItem = e.currentTarget as HTMLElement;

    if (
      GroupImage.sourceInstance &&
      GroupImage.sourceInstance === this &&
      sourceIndex === targetIndex
    ) {
      return;
    }

    const dropType = targetItem.dataset.dropType as
      | "top"
      | "bottom"
      | "left"
      | "right";
    const droppedBlockIndex =
      dropType === "bottom"
        ? this.api.blocks.getCurrentBlockIndex() + 1
        : this.api.blocks.getCurrentBlockIndex();

    if (dropType === "top" || dropType === "bottom") {
      this.onDropNewBlock(dropType, blockIndex, targetIndex, droppedBlockIndex);
    } else {
      const dropPosition = this.getDropPosition(e, targetItem);

      if (GroupImage.sourceInstance === this) {
        this.handleInternalDrop(sourceIndex, dropPosition);
      } else if (GroupImage.sourceInstance && GroupImage.draggedImage) {
        await this.handleExternalDrop(sourceBlock, blockIndex, dropPosition);
      }
    }

    this.clearDragOverEffects();
    this.updateView();

    GroupImage.draggedImage = null;
    GroupImage.sourceInstance = null;
    GroupImage.sourceIndex = null;
  }

  /**
   * Handles dropping an image to create a new block (vertical separation).
   * @param position - The drop position ("top" or "bottom").
   * @param blockIndex - The source block index.
   * @param droppedTargetIndex - The target image index.
   * @param droppedBlockIndex - The new block insertion index.
   */
  private onDropNewBlock(
    position: "top" | "bottom",
    blockIndex: number,
    droppedTargetIndex: number,
    droppedBlockIndex: number
  ): void {
    if (!GroupImage.draggedImage || !GroupImage.sourceInstance) return;

    if (
      blockIndex === droppedBlockIndex &&
      GroupImage.sourceIndex === droppedTargetIndex
    )
      return;

    if (
      GroupImage.sourceInstance.data.images.length === 1 &&
      position === "top" &&
      blockIndex === droppedBlockIndex - 1
    )
      return;

    if (
      GroupImage.sourceInstance.data.images.length === 1 &&
      position === "bottom" &&
      blockIndex === droppedBlockIndex + 1
    )
      return;

    const draggedImageData = {
      url: GroupImage.draggedImage.url,
      name: GroupImage.draggedImage.name,
      ratio: GroupImage.draggedImage.ratio,
      width: GroupImage.draggedImage.width,
    };

    const updatedImages = [...GroupImage.sourceInstance.data.images];
    updatedImages.splice(GroupImage.sourceIndex!, 1);
    GroupImage.sourceInstance.data.images = updatedImages;

    const newBlockData = { images: [draggedImageData] };
    this.api.blocks.insert(
      "groupImage",
      newBlockData,
      {},
      droppedBlockIndex,
      true
    );

    if (updatedImages.length === 0) {
      const blockToDeleteIndex =
        blockIndex > droppedBlockIndex ? blockIndex + 1 : blockIndex;
      this.api.blocks.delete(blockToDeleteIndex);
    } else if (GroupImage.sourceInstance) {
      GroupImage.sourceInstance.updateView();
    }

    GroupImage.draggedImage = null;
    GroupImage.sourceInstance = null;
    GroupImage.sourceIndex = null;

    this.updateView();
  }

  /**
   * Gets the drop position index based on mouse coordinates.
   * @param e - The drag event.
   * @param element - The target element.
   * @returns The calculated drop index.
   */
  private getDropPosition(e: DragEvent, element: HTMLElement): number {
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
   * Handles image reordering within the same block.
   * @param sourceIndex - The source image index.
   * @param dropPosition - The target drop position.
   */
  private handleInternalDrop(sourceIndex: number, dropPosition: number): void {
    const images = [...this.data.images];
    const [movedImage] = images.splice(sourceIndex, 1);
    images.splice(dropPosition, 0, movedImage);
    this.data.images = images;

    this.updateView();
  }

  /**
   * Handles image movement between different blocks.
   * @param sourceBlock - The source block object.
   * @param blockIndex - The source block index.
   * @param dropPosition - The target drop position.
   */
  private async handleExternalDrop(
    sourceBlock: any,
    blockIndex: number,
    dropPosition: number
  ): Promise<void> {
    if (!GroupImage.sourceInstance) return;

    const sourceImages = [...GroupImage.sourceInstance.data.images];
    const targetImages = [...this.data.images];

    if (targetImages.length < 3) {
      sourceImages.splice(GroupImage.sourceIndex!, 1);
      GroupImage.sourceInstance.data.images = sourceImages;

      targetImages.splice(dropPosition, 0, GroupImage.draggedImage);
      this.data.images = targetImages;

      await this.api.blocks.update(sourceBlock.id, {
        ...GroupImage.sourceInstance.data,
      });
      const currentBlock = this.api.blocks.getBlockByIndex(
        this.api.blocks.getCurrentBlockIndex()
      );
      if (currentBlock) {
        await this.api.blocks.update(currentBlock.id, this.data);
      }
      if (sourceImages.length === 0) {
        this.api.blocks.delete(blockIndex);
      }
    }

    this.updateView();
  }

  /**
   * Handles drag leave events.
   * @param e - The drag event.
   */
  onDragLeave(e: DragEvent): void {
    e.preventDefault();
    e.stopPropagation();
    this.clearDragOverEffects();
  }

  /**
   * Removes all drag-over visual effects from elements.
   */
  clearDragOverEffects(): void {
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
   * Handles drag over events on the block level.
   * @param e - The drag event.
   */
  onDragOverBlock(e: DragEvent): void {
    e.preventDefault();
    e.stopPropagation();

    if (GroupImage.sourceInstance && GroupImage.sourceInstance === this) {
      return;
    }

    if (this.data.images && this.data.images.length >= 3) {
      e.dataTransfer!.dropEffect = "none";
      return;
    }

    const items = this._element.querySelectorAll(`.${this._CSS.groupImage}`);
    this.clearDragOverEffects();

    if (items.length === 0) {
      this._element.classList.add("drag-over-empty");
    } else {
      const lastItem = items[items.length - 1];
      const lastItemRect = lastItem.getBoundingClientRect();
      if (e.clientX > lastItemRect.right) {
        lastItem.classList.add("drag-over-right");
      }
    }

    this.updateView();
  }

  /**
   * Handles drop events on the block level.
   * @param e - The drag event.
   */
  onDropBlock(e: DragEvent): void {
    e.preventDefault();
    e.stopPropagation();

    if (GroupImage.sourceInstance && GroupImage.sourceInstance === this) {
      return;
    }

    if (!GroupImage.draggedImage || !GroupImage.sourceInstance) return;

    this.handleBlockDrop(e);

    this._element.classList.remove("drag-over-empty");

    GroupImage.draggedImage = null;
    GroupImage.sourceInstance = null;
    GroupImage.sourceIndex = null;
    this.updateView();
  }

  /**
   * Handles dropping images onto empty or available block space.
   * @param e - The drag event.
   */
  private handleBlockDrop(e: DragEvent): void {
    if (!GroupImage.sourceInstance) return;

    const images = [...(this.data.images || [])];
    if (images.length < 3) {
      let dropIndex = images.length;

      const items = this._element.querySelectorAll(`.${this._CSS.groupImage}`);
      if (items.length > 0) {
        dropIndex = this.determineDropIndex(e, items);
      }

      images.splice(dropIndex, 0, GroupImage.draggedImage);
      this.data.images = images;

      const sourceImages = [...GroupImage.sourceInstance.data.images];
      sourceImages.splice(GroupImage.sourceIndex!, 1);
      GroupImage.sourceInstance.data.images = sourceImages;

      this.updateBlocks();
      GroupImage.sourceInstance.updateView();
      this.updateView();
    }
  }

  /**
   * Determines the drop index based on mouse position relative to existing images.
   * @param e - The drag event.
   * @param items - NodeList of existing image elements.
   * @returns The calculated drop index.
   */
  private determineDropIndex(e: DragEvent, items: NodeListOf<Element>): number {
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
   * Updates block data in the Editor.js blocks collection.
   */
  private updateBlocks(): void {
    if (!GroupImage.sourceInstance) return;

    const sourceBlock = this.api.blocks.getBlockByIndex(
      this.api.blocks.getCurrentBlockIndex() - 1
    );
    if (sourceBlock) {
      this.api.blocks.update(sourceBlock.id, GroupImage.sourceInstance.data);
    }

    const currentBlock = this.api.blocks.getBlockByIndex(
      this.api.blocks.getCurrentBlockIndex()
    );
    if (currentBlock) {
      this.api.blocks.update(currentBlock.id, this.data);
    }
  }

  /**
   * Updates the view by recreating the DOM structure.
   */
  updateView(): void {
    const newElement = this.drawView();
    this._element.replaceWith(newElement);
    this._element = newElement;
  }

  /**
   * Saves and returns the current block data.
   * @returns The current block data.
   */
  save(): BlockToolData {
    return this.data;
  }

  /**
   * Handles paste events (currently resets data).
   */
  onPaste(): void {
    this.data = {};
  }

  /**
   * Renders and returns the block's HTML element.
   * @returns The root HTML element of the block.
   */
  render(): HTMLDivElement {
    return this._element;
  }
}
