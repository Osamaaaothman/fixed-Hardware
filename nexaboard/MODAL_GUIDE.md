# Modal System Usage Guide

## Available Modals

### 1. ConfirmModal

Reusable confirmation dialog for user actions.

```jsx
import ConfirmModal from "../components/ConfirmModal";

const [showConfirm, setShowConfirm] = useState(false);

<ConfirmModal
  isOpen={showConfirm}
  onClose={() => setShowConfirm(false)}
  onConfirm={() => {
    // Handle confirmation
    console.log("Confirmed!");
  }}
  title="Delete Item?"
  message="This action cannot be undone. Are you sure?"
  type="warning" // 'info' | 'warning' | 'error' | 'success'
  confirmText="Delete"
  cancelText="Cancel"
  confirmButtonClass="btn-error"
/>;
```

**Types:**

- `info`: Blue info icon (default)
- `warning`: Yellow warning icon
- `error`: Red error icon
- `success`: Green success icon

### 2. ImageUploadModal

Enhanced image upload with drag & drop support.

```jsx
import ImageUploadModal from "../components/ImageUploadModal";

const [showUpload, setShowUpload] = useState(false);

const handleImageUpload = (file) => {
  console.log("Uploaded:", file);
  // Process the file
};

<ImageUploadModal
  isOpen={showUpload}
  onClose={() => setShowUpload(false)}
  onUpload={handleImageUpload}
/>;
```

**Features:**

- Drag & drop support
- Image preview
- File validation
- Progress feedback

### 3. G-code Modal (Built into QueueItem)

Automatically shown when viewing G-code from queue items.

**Features:**

- Syntax highlighting with line numbers
- Copy all button
- Download as .gcode file
- Hover highlighting

## DaisyUI Native Modals

### Basic Modal

```jsx
const [showModal, setShowModal] = useState(false);

{
  showModal && (
    <dialog className="modal modal-open">
      <div className="modal-box">
        <h3 className="font-bold text-lg">Title</h3>
        <p className="py-4">Content goes here</p>
        <div className="modal-action">
          <button onClick={() => setShowModal(false)} className="btn">
            Close
          </button>
        </div>
      </div>
      <form method="dialog" className="modal-backdrop">
        <button onClick={() => setShowModal(false)}>close</button>
      </form>
    </dialog>
  );
}
```

### Modal Sizes

- `modal-box` - Default (max-w-lg)
- `modal-box max-w-md` - Small
- `modal-box max-w-2xl` - Medium
- `modal-box max-w-4xl` - Large
- `modal-box max-w-full w-11/12` - Extra large

## Best Practices

### 1. State Management

```jsx
// Good: Single source of truth
const [activeModal, setActiveModal] = useState(null);

const openConfirmDelete = () => setActiveModal("confirmDelete");
const openImageUpload = () => setActiveModal("imageUpload");
const closeModals = () => setActiveModal(null);
```

### 2. Cleanup

```jsx
// Always cleanup on unmount
useEffect(() => {
  return () => {
    setShowModal(false);
  };
}, []);
```

### 3. Accessibility

```jsx
// Use proper ARIA labels
<dialog className="modal modal-open" aria-labelledby="modal-title">
  <div className="modal-box">
    <h3 id="modal-title" className="font-bold text-lg">
      Title
    </h3>
    {/* Content */}
  </div>
</dialog>
```

### 4. Mobile Considerations

```jsx
// Ensure modals are scrollable on mobile
<div className="modal-box max-h-[80vh] overflow-y-auto">
  {/* Long content */}
</div>
```

## Examples

### Delete Confirmation

```jsx
const handleDelete = (id) => {
  setConfirmModal({
    isOpen: true,
    title: "Delete Queue Item?",
    message: "This will permanently remove this item from the queue.",
    type: "warning",
    onConfirm: async () => {
      await removeFromQueue(id);
      toast.success("Item deleted");
    },
  });
};
```

### Form Modal

```jsx
<dialog className="modal modal-open">
  <div className="modal-box">
    <h3 className="font-bold text-lg mb-4">Add Text</h3>
    <form onSubmit={handleSubmit}>
      <div className="form-control mb-3">
        <label className="label">
          <span className="label-text">Text</span>
        </label>
        <input
          type="text"
          className="input input-bordered"
          placeholder="Enter text..."
        />
      </div>
      <div className="modal-action">
        <button type="button" onClick={onClose} className="btn btn-ghost">
          Cancel
        </button>
        <button type="submit" className="btn btn-primary">
          Add
        </button>
      </div>
    </form>
  </div>
</dialog>
```

### Loading Modal

```jsx
{
  isLoading && (
    <dialog className="modal modal-open">
      <div className="modal-box text-center">
        <span className="loading loading-spinner loading-lg text-primary"></span>
        <p className="mt-4">Processing...</p>
      </div>
    </dialog>
  );
}
```

## Styling Tips

### Responsive Modal

```jsx
<div className="modal-box w-11/12 max-w-5xl">
  {/* Full width on mobile, constrained on desktop */}
</div>
```

### Custom Colors

```jsx
<div className="modal-box bg-error text-error-content">
  {/* Error styled modal */}
</div>
```

### No Backdrop Click

```jsx
{
  /* Remove backdrop button to prevent closing */
}
<dialog className="modal modal-open">
  <div className="modal-box">{/* Content */}</div>
</dialog>;
```
