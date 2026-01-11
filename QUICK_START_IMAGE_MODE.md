# Quick Start Guide - Image to G-code

## 🚀 Getting Started (30 seconds)

### 1. Start Backend

```bash
cd Backend
npm run dev
```

✅ Server running on http://localhost:3000

### 2. Start Frontend

```bash
cd nexaboard
npm run dev
```

✅ App running on http://localhost:5173

### 3. Use the Feature

1. Open nexaboard in browser
2. Click "Image Mode" in sidebar
3. Upload an image
4. Click "Generate G-code"
5. View/download/copy G-code

## 📋 Quick Test

### Test Backend API

```bash
curl http://localhost:3000/api/image/health
```

Expected: `{"status":"ok","message":"Image to G-code converter API is running"}`

### Test Frontend

1. Navigate to http://localhost:5173
2. Click sidebar → "Image Mode"
3. Upload any image (PNG, JPG, etc.)
4. Adjust settings if needed
5. Click "Generate G-code" button
6. Wait for processing (2-10 seconds)
7. View modal with G-code and stats

## 🎛️ Settings Guide

| Setting      | Range        | Default | Description                  |
| ------------ | ------------ | ------- | ---------------------------- |
| Image Size   | 200-500px    | 300     | Higher = more detail, slower |
| Detail Level | Low/Med/High | Medium  | Vectorization quality        |
| Feed Rate    | 500-5000     | 1500    | Speed in mm/min              |
| Pen Up       | Any          | 5       | Z-axis up position           |
| Pen Down     | Any          | -2      | Z-axis down position         |
| Tolerance    | 0.1-2mm      | 0.5     | Point simplification         |
| Min Path     | 0.5-10mm     | 2       | Filter short paths           |
| Remove Noise | On/Off       | On      | Clean small artifacts        |

## 📊 Understanding Results

### Statistics Explained

- **Paths**: Number of separate drawing paths
- **Total Distance**: Complete travel distance (mm)
- **Drawing Distance**: Distance while pen is down (mm)
- **Move Distance**: Distance while pen is up (mm)
- **Estimated Time**: Total time in minutes (at feed rate)
- **G-code Lines**: Number of commands generated

### Good Results

- Paths: 20-200 (simple images)
- Drawing Distance: > 50% of total
- Estimated Time: < 10 minutes

### Needs Adjustment

- Paths > 500: Increase tolerance or min path length
- Drawing Distance < 30%: Image too complex, simplify
- Estimated Time > 30 min: Reduce detail or increase feed rate

## 🔧 Troubleshooting

### "No image file uploaded"

→ Ensure file is < 10MB and correct format (PNG/JPG/GIF/BMP)

### "Failed to convert image"

→ Try:

- Lower detail level
- Increase tolerance
- Smaller image size
- Different image with better contrast

### Backend not responding

→ Check:

- Backend server is running on port 3000
- No firewall blocking
- CORS enabled (already configured)

### Long processing time

→ Normal for:

- Large images (> 500px)
- High detail level
- Complex images with many colors
  → Wait 10-30 seconds max

## 🎨 Best Practices

### For Photos

- Detail Level: Low to Medium
- Tolerance: 1.0-2.0mm
- Image Size: 200-300px

### For Line Art / Logos

- Detail Level: Medium to High
- Tolerance: 0.3-0.5mm
- Image Size: 300-500px

### For Sketches

- Detail Level: Medium
- Tolerance: 0.5-1.0mm
- Image Size: 300-400px

## 📁 File Locations

### Backend

- Controllers: `Backend/src/controllers/`
- Utils: `Backend/src/utils/imageProcessing/`
- Uploads: `Backend/uploads/` (auto-cleaned)

### Frontend

- Page: `nexaboard/src/pages/ImagePage.jsx`
- Components: `nexaboard/src/components/image/`
- API: `nexaboard/src/api/imageApi.js`

## 🔗 API Endpoints

### Convert Image

```
POST http://localhost:3000/api/image/convert
Content-Type: multipart/form-data

Form Data:
- image: (file)
- imageSize: 300
- detailLevel: 2
- feedRate: 1500
- penUp: 5
- penDown: -2
- tolerance: 0.5
- minPathLength: 2
- removeNoise: true
```

### Health Check

```
GET http://localhost:3000/api/image/health
```

### List Serial Ports

```
GET http://localhost:3000/api/serial/ports
```

## ⌨️ Keyboard Shortcuts (in modal)

- `Ctrl+C` or `Cmd+C`: Copy G-code (when textarea focused)
- `Esc`: Close modal

## 💡 Pro Tips

1. **Start Simple**: Use low detail for testing, increase if needed
2. **Contrast Matters**: High contrast images = better results
3. **Clean First**: Edit image in external tool to remove backgrounds
4. **Save Settings**: Note your preferred settings for different image types
5. **Check Stats**: Low path count = faster drawing

## 🎯 Next Steps

After generating G-code:

1. ✅ Copy to clipboard → Paste into G-code sender
2. ✅ Download .gcode file → Load in UGS or similar
3. 🔜 Add to Queue → Process later
4. 🔜 Draw Now → Send directly to plotter

---

Need help? Check `Backend/IMAGE_CONVERSION_README.md` for detailed documentation.
