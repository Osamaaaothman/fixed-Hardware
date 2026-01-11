export class Queue {
  constructor() {
    this.items = [];
  }

  enqueue(item) {
    this.items.push(item);
    return this;
  }

  dequeue() {
    return this.items.shift();
  }

  peek() {
    return this.items[0];
  }

  isEmpty() {
    return this.items.length === 0;
  }

  size() {
    return this.items.length;
  }

  clear() {
    this.items = [];
  }

  getAll() {
    return [...this.items];
  }

  // Swap two items by their indices
  swap(index1, index2) {
    if (
      index1 < 0 ||
      index1 >= this.items.length ||
      index2 < 0 ||
      index2 >= this.items.length
    ) {
      throw new Error("Invalid indices");
    }
    [this.items[index1], this.items[index2]] = [
      this.items[index2],
      this.items[index1],
    ];
    return this;
  }

  // Move item from one index to another
  move(fromIndex, toIndex) {
    if (
      fromIndex < 0 ||
      fromIndex >= this.items.length ||
      toIndex < 0 ||
      toIndex >= this.items.length
    ) {
      throw new Error("Invalid indices");
    }
    const item = this.items.splice(fromIndex, 1)[0];
    this.items.splice(toIndex, 0, item);
    return this;
  }

  // Move item to front (highest priority)
  moveToFront(index) {
    if (index < 0 || index >= this.items.length) {
      throw new Error("Invalid index");
    }
    return this.move(index, 0);
  }

  // Move item to back (lowest priority)
  moveToBack(index) {
    if (index < 0 || index >= this.items.length) {
      throw new Error("Invalid index");
    }
    return this.move(index, this.items.length - 1);
  }

  // Remove item at specific index
  removeAt(index) {
    if (index < 0 || index >= this.items.length) {
      throw new Error("Invalid index");
    }
    return this.items.splice(index, 1)[0];
  }

  // Get item at specific index without removing
  getAt(index) {
    if (index < 0 || index >= this.items.length) {
      throw new Error("Invalid index");
    }
    return this.items[index];
  }
}
