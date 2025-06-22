import "./index.css";
import {
  API,
  BlockTool,
  BlockToolConstructorOptions,
  BlockToolData,
  ToolboxConfig,
  PasteConfig,
} from "@editorjs/editorjs";

export default class UnifiedImage implements BlockTool {
  static draggedImage: any = null;
  static sourceInstance: UnifiedImage | null = null;
  static sourceIndex: number | null = null;
  static activeImageBlock: UnifiedImage | null = null;

  static get isReadOnlySupported(): boolean {
    return true;
  }

  static get contentless(): boolean {
    return true;
  }

  static get toolbox(): ToolboxConfig {
    return {
      icon: "🖼️",
      title: "Unified Image",
    };
  }

  static get pasteConfig(): PasteConfig {
    return { tags: [] };
  }

  private api: API;
  private _CSS: {
    block: string;
    imageWrapper: string;
    wrapper: string;
    groupImage: string;
    imageItem: string;
    caption: string;
  };
  private data: BlockToolData;
  private _element: HTMLDivElement;
  private activateCaption: boolean;
  private fileInput: HTMLInputElement;

  constructor({ data, api }: BlockToolConstructorOptions) {
    this.api = api;
    this.data = data || { images: [], caption: "" };
    this._CSS = this.initializeCSS();
    this._element = this.drawView();
    this.activateCaption = !!this.data.caption;
    this.fileInput = this.createFileInput();
  }

  private initializeCSS() {
    return {
      block: this.api.styles.block,
      imageWrapper: "ce-unified-image-wrapper",
      wrapper: "ce-unified-image",
      groupImage: "unified-image-wrapper",
      imageItem: "unified-image-item",
      caption: "unified-image-caption",
    };
  }

  private createFileInput(): HTMLInputElement {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.multiple = true;
    input.style.display = "none";

    input.addEventListener("change", this.handleFileChange.bind(this));

    return input;
  }

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

      if (!this.data.images || this.data.images.length === 0) {
        if (columns.length > 0) {
          this.data.images = columns[0];
          this.updateView();

          columns.slice(1).forEach((columnImages) => {
            this.api.blocks.insert("groupImage", { images: columnImages });
          });
        }
      } else {
        columns.forEach((columnImages) => {
          this.api.blocks.insert("groupImage", { images: columnImages });
        });
      }
    } catch (error) {
      console.error("Error processing images:", error);
    }

    input.value = "";
  }

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

  public appendCallback(): void {
    this.fileInput.click();
  }

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

  private updateCaptionVisibility(caption: HTMLInputElement) {
    const shouldShowCaption =
      this.data.caption ||
      (UnifiedImage.activeImageBlock === this && this.activateCaption);

    shouldShowCaption ? this.showCaption(caption) : this.hideCaption(caption);
  }

  private deactivate() {
    this.activateCaption = false;
    this._element.classList.remove("active");
  }

  private showCaption(caption: HTMLElement): void {
    this.activateCaption = true;
    caption.style.display = "block";
  }

  private hideCaption(caption: HTMLElement): void {
    this.activateCaption = false;
    caption.style.display = "none";
  }

  private handleKeyDown = (e: KeyboardEvent) => {
    const isCaption = e.target instanceof HTMLInputElement;

    if (e.key === "Backspace" && !isCaption) {
      e.preventDefault();
      this.api.blocks.delete();
    }
  };

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

  onDragStart(e: DragEvent, imageData: any, index: number): void {
    if (!e.dataTransfer) return;
    e.dataTransfer.effectAllowed = "move";

    UnifiedImage.draggedImage = imageData;
    UnifiedImage.sourceInstance = this;
    UnifiedImage.sourceIndex = index;

    e.dataTransfer.setData(
      "application/json",
      JSON.stringify({
        imageData,
        sourceIndex: index,
        blockIndex: this.api.blocks.getCurrentBlockIndex(),
      })
    );

    this.deactivate();
    UnifiedImage.activeImageBlock = null;
  }

  onDragOver(e: DragEvent, index: number): void {
    e.preventDefault();
    e.stopPropagation();

    this.clearDragOverEffects();

    const targetItem = e.currentTarget as HTMLElement;
    if (!targetItem) return;

    if (
      UnifiedImage.sourceInstance &&
      UnifiedImage.sourceInstance === this &&
      UnifiedImage.sourceIndex === index
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

    if (dropType !== null) {
      targetItem.dataset.dropType = dropType;
    }
  }

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
      UnifiedImage.sourceInstance &&
      UnifiedImage.sourceInstance === this &&
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

      if (UnifiedImage.sourceInstance === this) {
        this.handleInternalDrop(sourceIndex, dropPosition);
      } else if (UnifiedImage.sourceInstance && UnifiedImage.draggedImage) {
        await this.handleExternalDrop(sourceBlock, blockIndex, dropPosition);
      }
    }

    this.clearDragOverEffects();
    this.updateView();

    UnifiedImage.draggedImage = null;
    UnifiedImage.sourceInstance = null;
    UnifiedImage.sourceIndex = null;
  }

  private onDropNewBlock(
    position: "top" | "bottom",
    blockIndex: number,
    droppedTargetIndex: number,
    droppedBlockIndex: number
  ): void {
    if (!UnifiedImage.draggedImage || !UnifiedImage.sourceInstance) return;
    if (
      blockIndex === droppedBlockIndex &&
      UnifiedImage.sourceIndex === droppedTargetIndex
    )
      return;
    if (
      UnifiedImage.sourceInstance.data.images.length === 1 &&
      position === "top" &&
      blockIndex === droppedBlockIndex - 1
    )
      return;
    if (
      UnifiedImage.sourceInstance.data.images.length === 1 &&
      position === "bottom" &&
      blockIndex === droppedBlockIndex + 1
    )
      return;

    const draggedImageData = {
      url: UnifiedImage.draggedImage.url,
      name: UnifiedImage.draggedImage.name,
      ratio: UnifiedImage.draggedImage.ratio,
      width: UnifiedImage.draggedImage.width,
    };

    const updatedImages = [...UnifiedImage.sourceInstance.data.images];
    updatedImages.splice(UnifiedImage.sourceIndex!, 1);
    UnifiedImage.sourceInstance.data.images = updatedImages;

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
    } else if (UnifiedImage.sourceInstance) {
      UnifiedImage.sourceInstance.updateView();
    }

    UnifiedImage.draggedImage = null;
    UnifiedImage.sourceInstance = null;
    UnifiedImage.sourceIndex = null;

    this.updateView();
  }

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

  private handleInternalDrop(sourceIndex: number, dropPosition: number): void {
    const images = [...this.data.images];
    const [movedImage] = images.splice(sourceIndex, 1);
    images.splice(dropPosition, 0, movedImage);
    this.data.images = images;

    this.updateView();
  }

  private async handleExternalDrop(
    sourceBlock: any,
    blockIndex: number,
    dropPosition: number
  ): Promise<void> {
    if (!UnifiedImage.sourceInstance) return;

    const sourceImages = [...UnifiedImage.sourceInstance.data.images];
    const targetImages = [...this.data.images];

    if (targetImages.length < 3) {
      sourceImages.splice(UnifiedImage.sourceIndex!, 1);
      UnifiedImage.sourceInstance.data.images = sourceImages;

      targetImages.splice(dropPosition, 0, UnifiedImage.draggedImage);
      this.data.images = targetImages;

      await this.api.blocks.update(sourceBlock.id, {
        ...UnifiedImage.sourceInstance.data,
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

  onDragLeave(e: DragEvent): void {
    e.preventDefault();
    e.stopPropagation();
    this.clearDragOverEffects();
  }

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

  onDragOverBlock(e: DragEvent): void {
    e.preventDefault();
    e.stopPropagation();

    if (UnifiedImage.sourceInstance && UnifiedImage.sourceInstance === this) {
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

  onDropBlock(e: DragEvent): void {
    e.preventDefault();
    e.stopPropagation();

    if (UnifiedImage.sourceInstance && UnifiedImage.sourceInstance === this) {
      return;
    }

    if (!UnifiedImage.draggedImage || !UnifiedImage.sourceInstance) return;

    this.handleBlockDrop(e);

    this._element.classList.remove("drag-over-empty");

    UnifiedImage.draggedImage = null;
    UnifiedImage.sourceInstance = null;
    UnifiedImage.sourceIndex = null;
    this.updateView();
  }

  private handleBlockDrop(e: DragEvent): void {
    if (!UnifiedImage.sourceInstance) return;

    const images = [...(this.data.images || [])];
    if (images.length < 3) {
      let dropIndex = images.length;

      const items = this._element.querySelectorAll(`.${this._CSS.groupImage}`);
      if (items.length > 0) {
        dropIndex = this.determineDropIndex(e, items);
      }

      images.splice(dropIndex, 0, UnifiedImage.draggedImage);
      this.data.images = images;

      const sourceImages = [...UnifiedImage.sourceInstance.data.images];
      sourceImages.splice(UnifiedImage.sourceIndex!, 1);
      UnifiedImage.sourceInstance.data.images = sourceImages;

      this.updateBlocks();
      UnifiedImage.sourceInstance.updateView();
      this.updateView();
    }
  }

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

  private updateBlocks(): void {
    if (!UnifiedImage.sourceInstance) return;

    const sourceBlock = this.api.blocks.getBlockByIndex(
      this.api.blocks.getCurrentBlockIndex() - 1
    );
    if (sourceBlock) {
      this.api.blocks.update(sourceBlock.id, UnifiedImage.sourceInstance.data);
    }

    const currentBlock = this.api.blocks.getBlockByIndex(
      this.api.blocks.getCurrentBlockIndex()
    );
    if (currentBlock) {
      this.api.blocks.update(currentBlock.id, this.data);
    }
  }

  updateView(): void {
    const newElement = this.drawView();
    this._element.replaceWith(newElement);
    this._element = newElement;
  }

  save(): BlockToolData {
    return this.data;
  }

  onPaste(): void {
    this.data = {};
  }

  render(): HTMLDivElement {
    return this._element;
  }
}
