# Image to G-code Converter for Pen Plotter

A full-stack application that converts uploaded images into G-code commands for pen plotters.

## 🚀 Features

- **Image Processing**: Automatic conversion to black-and-white bitmap
- **Vectorization**: Uses Potrace for high-quality SVG generation
- **Path Conversion**: Converts SVG paths to coordinate arrays with curve sampling
- **G-code Generation**: Pen plotter-specific commands (pen up/down using Z-axis)
- **User-Friendly UI**: React-based interface with live preview
- **Download Support**: Export G-code as `.gcode` files

## 📁 Project Structure

```
Dummy codes/
├── backend/                 # Node.js + Express API
│   ├── server.js           # Main server file
│   ├── routes/
│   │   └── convert.js      # API route for image conversion
│   ├── utils/
│   │   ├── vectorize.js    # Sharp + Potrace processing
│   │   ├── svgToPoints.js  # SVG path parser
│   │   └── pointsToGcode.js # G-code generator
│   ├── uploads/            # Temporary image storage
│   └── package.json
│
└── frontend/               # React + Vite application
    ├── src/
    │   ├── components/
    │   │   ├── ImageUploader.jsx
    │   │   ├── ImageUploader.css
    │   │   ├── GcodeViewer.jsx
    │   │   └── GcodeViewer.css
    │   ├── App.jsx
    │   ├── App.css
    │   ├── main.jsx
    │   └── api.js
    ├── index.html
    ├── vite.config.js
    └── package.json
```

## 🛠️ Installation

### Prerequisites

- Node.js 16+ installed
- npm or yarn package manager

### Backend Setup

```bash
cd backend
npm install
npm start
```

Backend will run on `http://localhost:5000`

### Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

Frontend will run on `http://localhost:5173`

## 📖 Usage

1. **Start the backend server** (must be running first)
2. **Start the frontend application**
3. **Open your browser** to `http://localhost:5173`
4. **Upload an image** (JPG, PNG, BMP, etc.)
5. **Click "Generate G-code"**
6. **Download or copy** the generated G-code
7. **Send to your pen plotter**

## 🎨 G-code Format

The generated G-code follows pen plotter conventions:

- `G21` - Millimeters units
- `G90` - Absolute positioning
- `G1 Z5` - Pen up
- `G1 Z-2` - Pen down
- `G0 X.. Y..` - Rapid move to position
- `G1 X.. Y.. F1500` - Linear move at feed rate

## 🔧 API Endpoints

### POST /api/convert

Upload an image and receive G-code

**Request:**

- Content-Type: `multipart/form-data`
- Field name: `image`

**Response:**

- Content-Type: `text/plain`
- Body: G-code text

### GET /api/health

Check API status

## 📦 Dependencies

### Backend

- `express` - Web framework
- `multer` - File upload handling
- `sharp` - Image processing
- `potrace` - Bitmap vectorization
- `svg-path-parser` - SVG path parsing
- `cors` - Cross-origin support

### Frontend

- `react` - UI framework
- `react-dom` - React rendering
- `axios` - HTTP client
- `vite` - Build tool

## 💡 Tips for Best Results

- Use high-contrast images with clear outlines
- Simple line art works better than photographs
- Black and white images produce cleaner results
- Keep file size under 10MB
- Test with simple shapes first

## 🐛 Troubleshooting

**Backend not starting?**

- Check if port 5000 is available
- Ensure all dependencies are installed

**Frontend can't connect?**

- Verify backend is running on port 5000
- Check CORS settings in backend

**Poor G-code quality?**

- Try preprocessing the image (increase contrast)
- Use simpler images with fewer details
- Adjust threshold settings in vectorize.js

## 📄 License

ISC

## 👥 Author

Created for pen plotter enthusiasts

---

**Note**: This is a pen plotter G-code generator, NOT for laser engraving. It uses Z-axis movements for pen control only.
