# Image to G-code Conversion System

Complete implementation of image-to-G-code conversion functionality for the nexaboard CNC plotter.

## 🎯 Overview

This system converts raster images (PNG, JPG, GIF, BMP) into vector-based G-code for CNC plotting through:

1. **Vectorization** - Convert bitmap to SVG using Sharp and Potrace
2. **Path Extraction** - Parse SVG paths into coordinate arrays
3. **G-code Generation** - Convert coordinates to CNC machine commands
4. **Serial Communication** - Send G-code to Arduino with real-time progress

## 📁 Backend Structure

### Controllers

- **`src/controllers/imageController.js`**

  - `POST /api/image/convert` - Convert image to G-code
  - `GET /api/image/health` - Health check

- **`src/controllers/serialController.js`**
  - `POST /api/serial/send` - Send G-code via serial (SSE)
  - `GET /api/serial/ports` - List available serial ports
  - `GET /api/serial/status` - Check connection status

### Utilities

- **`src/utils/imageProcessing/vectorize.js`**

  - Image preprocessing with Sharp
  - Vectorization with Potrace
  - Configurable detail levels

- **`src/utils/imageProcessing/svgToPoints.js`**

  - SVG path parsing
  - Bezier curve sampling
  - CNC bounds scaling (95mm × 130mm)
  - Path simplification

- **`src/utils/imageProcessing/pointsToGcode.js`**

  - G-code generation
  - Path optimization
  - Statistics calculation
  - Pen up/down control

- **`src/utils/imageProcessing/colorSeparation.js`**
  - Color analysis (future enhancement)
  - Multi-layer support (future enhancement)

## 🎨 Frontend Structure

### Pages

- **`src/pages/ImagePage.jsx`**
  - Main image conversion interface
  - Settings panel
  - Results display
  - G-code preview modal

### Components

- **`src/components/image/ImageUploader.jsx`**

  - File selection with drag & drop
  - Image preview
  - File validation (type, size)

- **`src/components/image/ImageSettings.jsx`**

  - Image size slider (200-500px)
  - Detail level selector (Low/Medium/High)
  - Feed rate control (500-5000 mm/min)
  - Pen up/down Z-axis positions
  - Tolerance and path filtering

- **`src/components/image/StatsDisplay.jsx`**

  - Path count
  - Total/drawing/move distances
  - Estimated time
  - G-code line count

- **`src/components/image/GcodePreviewModal.jsx`**
  - Full G-code viewer
  - Copy to clipboard
  - Download .gcode file
  - Processed image preview
  - Add to queue / Draw now buttons

### API Integration

- **`src/api/imageApi.js`**
  - `convertImageToGcode()` - Upload and convert
  - `sendGcodeToSerial()` - Serial communication with SSE
  - `getSerialPorts()` - List available ports
  - `getSerialStatus()` - Connection status
  - `checkImageApiHealth()` - API health check

## ⚙️ Configuration

### Default Settings

```javascript
{
  imageSize: 300,        // Pixels (200-500)
  detailLevel: 2,        // 1=Low, 2=Medium, 3=High
  feedRate: 1500,        // mm/min (500-5000)
  penUp: 5,              // Z-axis up position
  penDown: -2,           // Z-axis down position
  tolerance: 0.5,        // Point simplification (mm)
  removeNoise: true,     // Filter noise
  minPathLength: 2       // Minimum path length (mm)
}
```

### CNC Machine Limits

- Width: 95mm
- Height: 130mm
- Auto-scaling maintains aspect ratio

### Serial Port Settings

- Default Port: COM4 (Windows)
- Baud Rate: 115200
- Data Bits: 8
- Parity: None
- Stop Bits: 1

## 🚀 Usage

### Backend

```bash
cd Backend
npm install
npm run dev
```

Server runs on `http://localhost:3000`

### Frontend

```bash
cd nexaboard
npm install
npm run dev
```

Frontend runs on `http://localhost:5173`

### API Examples

**Convert Image:**

```javascript
const formData = new FormData();
formData.append("image", imageFile);
formData.append("imageSize", "300");
formData.append("detailLevel", "2");
formData.append("feedRate", "1500");

const response = await fetch("http://localhost:3000/api/image/convert", {
  method: "POST",
  body: formData,
});

const { gcode, stats, processedImage } = await response.json();
```

**Send to Serial:**

```javascript
import { sendGcodeToSerial } from "./api/imageApi";

await sendGcodeToSerial(gcode, "COM4", 115200, {
  onStatus: (data) => console.log("Status:", data.message),
  onProgress: (data) => console.log(`Progress: ${data.current}/${data.total}`),
  onComplete: (data) => console.log("Complete!", data),
  onError: (error) => console.error("Error:", error),
});
```

## 📦 Dependencies

### Backend

- `multer` - File upload handling
- `sharp` - Image processing
- `potrace` - Bitmap vectorization
- `svg-path-parser` - SVG parsing
- `serialport` - Serial communication
- `@serialport/parser-readline` - Serial line parsing

### Frontend

- React components already use existing dependencies
- No additional packages needed

## 🔄 Processing Pipeline

```
1. Upload Image (Frontend)
   ↓
2. Multer saves to /uploads (Backend)
   ↓
3. Sharp: Resize → Grayscale → Threshold (Vectorize)
   ↓
4. Potrace: Bitmap → SVG (Vectorize)
   ↓
5. Parse SVG paths (svgToPoints)
   ↓
6. Scale to CNC bounds (svgToPoints)
   ↓
7. Generate G-code (pointsToGcode)
   ↓
8. Return { gcode, stats, processedImage }
   ↓
9. Display in modal (Frontend)
   ↓
10. [Optional] Send to Arduino via Serial (SSE)
```

## 🎨 G-code Format

```gcode
; Generated G-code for CNC plotter
; Machine bounds: 95mm x 130mm
G21                      ; Millimeters
G90                      ; Absolute positioning
G1 Z5 F1500             ; Pen up

; Path 1
G1 Z5 F1500             ; Pen up
G0 X10.500 Y20.300      ; Move to start
G1 Z-2 F1500            ; Pen down
G1 X11.200 Y21.500 F1500 ; Draw
...

G1 Z5                   ; Pen up
G0 X0 Y0                ; Return home
M2                      ; End program
```

## 🔧 Troubleshooting

### Image Upload Issues

- Check file size < 10MB
- Supported formats: PNG, JPG, GIF, BMP
- Ensure backend is running on port 3000

### Serial Communication

- Verify Arduino is connected
- Check correct COM port (Windows Device Manager)
- Ensure Arduino firmware accepts G-code (GRBL)
- Baud rate must match Arduino (115200)

### Conversion Errors

- Try lower detail level for complex images
- Increase tolerance to reduce path count
- Check image has sufficient contrast

## 🚀 Future Enhancements

1. **Multi-color Support**

   - Color layer separation
   - Automatic tool change commands (M0)
   - Layer preview UI

2. **Advanced Settings**

   - Custom path optimization algorithms
   - Variable feed rates
   - Acceleration control

3. **Queue Integration**

   - Save jobs to backend queue
   - Batch processing
   - Job history

4. **Preview Visualization**
   - 3D G-code path preview
   - Estimated drawing visualization
   - Time-lapse simulation

## 📄 License

Part of the nexaboard CNC plotter project.
