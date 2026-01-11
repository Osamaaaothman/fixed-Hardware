# Image to G-code Converter - Backend

Backend API for converting images to pen plotter G-code.

## Installation

```bash
npm install
```

## Running the Server

```bash
npm start
```

For development with auto-reload:

```bash
npm run dev
```

The server will run on `http://localhost:5000`

## API Endpoints

### POST /api/convert

Upload an image file and receive G-code for pen plotter.

**Request:**

- Method: POST
- Content-Type: multipart/form-data
- Body: image file (field name: "image")

**Response:**

- Content-Type: text/plain
- Body: G-code text

### GET /api/health

Check if the API is running.

**Response:**

```json
{
  "status": "ok",
  "message": "Image to G-code converter API is running"
}
```

## Dependencies

- **express**: Web framework
- **multer**: File upload handling
- **sharp**: Image processing and manipulation
- **potrace**: Bitmap vectorization
- **svg-path-parser**: SVG path parsing
- **cors**: Cross-origin resource sharing
