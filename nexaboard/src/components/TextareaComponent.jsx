import {
  useState,
  useRef,
  forwardRef,
  useImperativeHandle,
  useEffect,
} from "react";

const TextareaComponent = forwardRef(
  ({ fontSize, textColor, onTextChange }, ref) => {
    const [text, setText] = useState("");
    const [error, setError] = useState("");
    const textareaRef = useRef(null);

    // Expose text value to parent component
    useImperativeHandle(ref, () => ({
      getText: () => text,
      setText: (newText) => setText(newText),
      clearText: () => setText(""),
    }));

    // Notify parent when text changes
    useEffect(() => {
      if (onTextChange) {
        onTextChange(text);
      }
    }, [text, onTextChange]);

    const handleChange = (e) => {
      const newValue = e.target.value;
      setText(newValue);
      setError("");

      const textarea = textareaRef.current;
      if (textarea && textarea.scrollHeight > 500) {
        setError("Text exceeds maximum height.");
      }
    };

    const handlePaste = (e) => {
      e.preventDefault();
      const pastedText = e.clipboardData.getData("text");
      const newValue = text + pastedText;
      setText(newValue);

      const textarea = textareaRef.current;
      setTimeout(() => {
        if (textarea && textarea.scrollHeight > 500) {
          setError("Pasted text exceeds maximum height.");
        } else {
          setError("");
        }
      }, 0);
    };

    return (
      <div className="flex flex-col">
        <textarea
          ref={textareaRef}
          value={text}
          onChange={handleChange}
          onPaste={handlePaste}
          placeholder="Enter your text here..."
          className="border-2 border-base-300 p-4 rounded-xl bg-base-100 focus:outline-none focus:border-primary transition-colors text-base-content"
          style={{
            width: "320px",
            height: "500px",
            fontSize: `${fontSize}px`,
            color: textColor,
            resize: "none",
            overflow: "auto",
          }}
        />
        {error && (
          <div className="alert alert-error mt-3 max-w-[320px] rounded-xl">
            <span className="text-sm">{error}</span>
          </div>
        )}
      </div>
    );
  }
);

TextareaComponent.displayName = "TextareaComponent";

export default TextareaComponent;
