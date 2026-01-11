# Image to G-code Converter - Frontend

React frontend application for converting images to pen plotter G-code.

## Installation

```bash
npm install
```

## Running the App

Development mode:

```bash
npm run dev
```

The app will run on `http://localhost:5173`

Build for production:

```bash
npm run build
```

Preview production build:

```bash
npm run preview
```

## Features

- **Image Upload**: Drag and drop or click to upload images
- **Live Preview**: See your uploaded image before conversion
- **G-code Display**: View generated G-code in a formatted viewer
- **Download**: Save G-code as a `.gcode` file
- **Copy to Clipboard**: Quick copy for manual input
- **Stats**: View command count, path count, and file size

## Usage

1. Make sure the backend server is running on `http://localhost:5000`
2. Upload an image file
3. Click "Generate G-code"
4. Download or copy the generated G-code
5. Send to your pen plotter

## Technologies

- **React 18**: UI framework
- **Vite**: Build tool and dev server
- **Axios**: HTTP client for API calls
