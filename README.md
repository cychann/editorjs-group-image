# EditorJS Group Image Block

Provides a powerful multi-image block with advanced drag-and-drop functionality for [Editor.js](https://editorjs.io/). Upload multiple images at once and organize them with intuitive drag-and-drop interactions.

## Preview

![Group Image Preview](assets/gifs/preview.gif)

## Features

✨ **Multi-Image Upload**: Select and upload multiple images simultaneously  
🎯 **Smart Layout**: Automatically organizes images into columns (max 3 per block)  
🖱️ **Drag & Drop Reordering**: Reorder images within blocks or move between blocks  
📱 **Vertical Block Separation**: Drag images up/down to create new separate blocks  
📝 **Interactive Captions**: Add descriptive captions with auto-hide/show functionality  
📐 **Responsive Layout**: Automatic width calculation based on image aspect ratios  
🔄 **Cross-Block Movement**: Move images between different GroupImage blocks

## Installation

Get the package:

```bash
yarn add @cychann/editorjs-group-image
```

Include module in your application:

```javascript
import GroupImage from "@cychann/editorjs-group-image";
```

## Usage

Add a new Tool to the tools property of the Editor.js initial config.

```javascript
const editor = new EditorJS({
  holder: "editor",
  tools: {
    groupImage: {
      class: GroupImage,
    },
  },
});
```

## How It Works

### 1. Upload Images

- Click the GroupImage tool in the toolbar
- Select multiple images from your device
- Images are automatically organized into blocks (max 3 images per block)

### 2. Drag & Drop Operations

#### Reorder Within Block

- Drag images **left** or **right** to reorder within the same block

#### Move Between Blocks

- Drag images **left** or **right** to move between different GroupImage blocks
- Blocks are limited to 3 images maximum

#### Create New Blocks

- Drag images **up** or **down** to separate them into new individual blocks
- Perfect for breaking up image groups or creating standalone images

### 3. Caption Management

- Click on any image block to reveal the caption input
- Captions auto-hide when empty and auto-show when filled
- Use keyboard navigation (Backspace to delete empty blocks)

## Data Structure

The GroupImage tool returns data in the following format:

```javascript
{
  images: [
    {
      url: "blob:http://localhost:3000/...",  // Currently local blob URLs
      name: "image1.jpg",
      size: 145234,
      type: "image/jpeg",
      width: 1920,
      height: 1080,
      ratio: 1.777
    },
    // ... more images
  ],
  caption: "Your caption text here"
}
```

## Current Limitations & Roadmap

### 🚧 Current State

This library currently processes images as **local blob URLs** for immediate preview and manipulation. Images are stored temporarily in browser memory.

### 🚀 Upcoming Features

- **Backend Integration**: Support for automatic image upload to your server
- **Custom Upload Endpoints**: Configure your own image upload API
- **Progress Indicators**: Upload progress visualization
- **Error Handling**: Comprehensive upload error management
- **Image Optimization**: Automatic resizing and compression options

> **Note**: Backend integration development is currently in progress. The current version is perfect for prototyping and local development. For production use with persistent storage, please wait for the upcoming backend-enabled version or implement your own upload logic using the current blob URLs.
