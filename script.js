document.addEventListener("DOMContentLoaded", () => {
  // Check if device is mobile
  const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

  // DOM Elements
  const form = document.getElementById("shopping-form");
  const input = document.getElementById("item-input");
  const list = document.getElementById("shopping-list");
  const category = document.getElementById("category-select");
  const sortSelect = document.getElementById("sort-select");
  const totalItems = document.getElementById("total-items");
  const completedItems = document.getElementById("completed-items");
  const themeToggle = document.getElementById("theme-toggle");
  const cartIcon = document.getElementById("cart-icon");
  const modal = document.getElementById("cart-modal");
  const closeModal = document.querySelector(".close-modal");
  const shareList = document.getElementById("share-list");
  const copyListBtn = document.getElementById("copy-list");
  const shareListBtn = document.getElementById("share-list-button");

  // Audio Context
  const AudioContext = window.AudioContext || window.webkitAudioContext;
  const audioContext = new AudioContext();

  // State Management
  let items = [];
  let currentSort = sortSelect.value;

  // Create sounds
  const createOscillator = (frequency, duration) => {
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(frequency, audioContext.currentTime);
    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(
      0.01,
      audioContext.currentTime + duration
    );

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    return { oscillator, gainNode };
  };

  // Sound functions
  const playAddSound = () => {
    const { oscillator } = createOscillator(440, 0.2);
    oscillator.start();
    oscillator.stop(audioContext.currentTime + 0.2);
  };

  const playDeleteSound = () => {
    const { oscillator } = createOscillator(220, 0.3);
    oscillator.start();
    oscillator.stop(audioContext.currentTime + 0.3);
  };

  const playCompleteSound = () => {
    const { oscillator } = createOscillator(880, 0.1);
    oscillator.start();
    oscillator.stop(audioContext.currentTime + 0.1);
  };

  // Load items from localStorage
  const loadItems = () => {
    try {
      const savedItems = localStorage.getItem("shoppingItems");
      if (savedItems) {
        items = JSON.parse(savedItems);
        if (!Array.isArray(items)) {
          console.error("Saved items is not an array:", items);
          items = [];
        }
      } else {
        items = [];
      }
      sortAndRenderList();
      updateStats();
    } catch (error) {
      console.error("Error loading items:", error);
      showError("שגיאה בטעינת הפריטים");
      items = [];
      updateStats();
    }
  };

  // Save items to localStorage
  const saveItems = () => {
    try {
      if (!Array.isArray(items)) {
        console.error("Items is not an array:", items);
        return;
      }
      localStorage.setItem("shoppingItems", JSON.stringify(items));
      sortAndRenderList();
    } catch (error) {
      console.error("Error saving items:", error);
      showError("שגיאה בשמירת הפריטים");
    }
  };

  // Sort and render list
  const sortAndRenderList = () => {
    if (!Array.isArray(items)) {
      console.error("Cannot sort: items is not an array:", items);
      return;
    }

    // Create a copy of the items array for sorting
    let sortedItems = [...items];

    // Sort based on current sort type
    switch (currentSort) {
      case "alpha":
        sortedItems.sort((a, b) => a.text.localeCompare(b.text, "he"));
        break;
      case "category":
        sortedItems.sort((a, b) => a.category.localeCompare(b.category, "he"));
        break;
      case "completed":
        // Sort uncompleted items first, then by creation date
        sortedItems.sort((a, b) => {
          if (a.completed === b.completed) {
            return a.id - b.id;
          }
          return a.completed ? 1 : -1;
        });
        break;
      default: // "added"
        sortedItems.sort((a, b) => a.id - b.id);
        break;
    }

    // Clear and rebuild the list
    list.innerHTML = "";
    sortedItems.forEach((item) => {
      const li = document.createElement("li");
      li.className = `list-item${item.completed ? " completed" : ""}`;
      li.dataset.id = item.id;

      const content = document.createElement("div");
      content.className = "item-content";

      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.className = "item-checkbox";
      checkbox.checked = item.completed;
      checkbox.onchange = () => toggleComplete(item.id);

      const span = document.createElement("span");
      span.className = "item-text";
      span.textContent = item.text;

      const actions = document.createElement("div");
      actions.className = "item-actions";

      const badge = document.createElement("span");
      badge.className = "item-category";
      badge.textContent = item.category;

      const deleteBtn = document.createElement("button");
      deleteBtn.className = "delete-button";
      deleteBtn.textContent = "מחק";
      deleteBtn.onclick = () => deleteItem(item.id);

      content.appendChild(checkbox);
      content.appendChild(span);
      actions.appendChild(badge);
      actions.appendChild(deleteBtn);
      li.appendChild(content);
      li.appendChild(actions);

      list.appendChild(li);
    });

    updateStats();
  };

  // Toggle Complete
  const toggleComplete = (id) => {
    const index = items.findIndex((item) => item.id === id);
    if (index !== -1) {
      items[index].completed = !items[index].completed;
      saveItems();

      const item = list.querySelector(`[data-id="${id}"]`);
      if (item) {
        playCompleteSound();
        gsap.to(item, {
          scale: 1.02,
          duration: 0.2,
          yoyo: true,
          repeat: 1,
          ease: "power2.inOut",
          onComplete: () => {
            sortAndRenderList();
          },
        });
      }
    }
  };

  // Delete Item
  const deleteItem = (id) => {
    const index = items.findIndex((item) => item.id === id);
    if (index !== -1) {
      const item = list.querySelector(`[data-id="${id}"]`);
      if (item) {
        playDeleteSound();
        gsap.to(item, {
          height: 0,
          opacity: 0,
          duration: 0.3,
          ease: "power2.in",
          onComplete: () => {
            items.splice(index, 1);
            saveItems();
          },
        });
      }
    }
  };

  // Add Item
  const addItem = (e) => {
    e.preventDefault();
    const text = input.value.trim();

    if (!text) {
      showError("נא להזין טקסט");
      return;
    }

    const newItem = {
      id: Date.now(),
      text,
      category: category.value,
      completed: false,
      createdAt: new Date().toISOString(),
    };

    items.push(newItem);
    saveItems();

    const itemRect = list.getBoundingClientRect();
    const startX = itemRect.left + itemRect.width / 2;
    const startY = itemRect.top + itemRect.height / 2;

    playAddSound();
    throwToCart(text, startX, startY);

    input.value = "";

    if (isMobile) {
      input.blur();
    }
  };

  function throwToCart(text, startX, startY) {
    const throwItem = document.createElement("div");
    throwItem.className = "throw-item";
    throwItem.textContent = text;
    document.body.appendChild(throwItem);

    const cartRect = cartIcon.getBoundingClientRect();
    const cartX = cartRect.left + cartRect.width / 2;
    const cartY = cartRect.top + cartRect.height / 2;

    gsap.set(throwItem, {
      x: startX,
      y: startY,
      opacity: 1,
      scale: 1,
    });

    gsap.to(throwItem, {
      x: cartX,
      y: cartY,
      scale: 0.1,
      opacity: 0,
      duration: 0.8,
      ease: "power2.in",
      onComplete: () => {
        throwItem.remove();
        gsap.to(cartIcon, {
          scale: 1.2,
          duration: 0.2,
          yoyo: true,
          repeat: 1,
          ease: "power2.inOut",
        });
      },
    });
  }

  function showError(message) {
    const error = document.createElement("div");
    error.className = "error-message";
    error.textContent = message;

    document.body.appendChild(error);

    gsap.to(error, {
      opacity: 0,
      y: -10,
      duration: 0.3,
      delay: 2,
      ease: "power2.in",
      onComplete: () => error.remove(),
    });
  }

  function updateStats() {
    if (!Array.isArray(items)) {
      console.error("Cannot update stats: items is not an array:", items);
      return;
    }
    const total = items.length;
    const completed = items.filter((item) => item.completed).length;

    gsap.to([totalItems, completedItems], {
      opacity: 0,
      duration: 0.2,
      onComplete: () => {
        totalItems.textContent = `סה"כ פריטים: ${total}`;
        completedItems.textContent = `הושלמו: ${completed}`;
        gsap.to([totalItems, completedItems], {
          opacity: 1,
          duration: 0.2,
        });
      },
    });
  }

  const openModal = () => {
    modal.classList.add("show");
    updateShareList();
  };

  const closeModalFunc = () => {
    modal.classList.remove("show");
  };

  const updateShareList = () => {
    shareList.innerHTML = "";
    const categories = {};

    items.forEach((item) => {
      if (!categories[item.category]) {
        categories[item.category] = [];
      }
      categories[item.category].push(item);
    });

    Object.entries(categories).forEach(([category, categoryItems]) => {
      const categoryDiv = document.createElement("div");
      categoryDiv.innerHTML = `
        <h3>${category}</h3>
        <ul>
          ${categoryItems
            .map(
              (item) => `
            <li>${item.text}${item.completed ? " ✓" : ""}</li>
          `
            )
            .join("")}
        </ul>
      `;
      shareList.appendChild(categoryDiv);
    });
  };

  const formatListForSharing = () => {
    const categories = {};

    // Group items by category
    items.forEach((item) => {
      if (!categories[item.category]) {
        categories[item.category] = [];
      }
      categories[item.category].push(item);
    });

    // Format text with proper styling
    let text = "";
    Object.entries(categories).forEach(([category, categoryItems], index) => {
      // Add category header
      text += `${category}\n`;

      // Add items with bullet points
      categoryItems.forEach((item) => {
        text += `• ${item.text}${item.completed ? " ✓" : ""}\n`;
      });

      // Add line break between categories (except for the last one)
      if (index < Object.entries(categories).length - 1) {
        text += "\n";
      }
    });

    return text;
  };

  const copyList = () => {
    const text = formatListForSharing();
    navigator.clipboard
      .writeText(text)
      .then(() => showError("הרשימה הועתקה!"))
      .catch(() => showError("שגיאה בהעתקת הרשימה"));
  };

  const shareListFunc = async () => {
    const text = formatListForSharing();

    if (navigator.share) {
      try {
        await navigator.share({
          title: "רשימת קניות",
          text: text,
        });
      } catch (error) {
        if (error.name !== "AbortError") {
          showError("שגיאה בשיתוף הרשימה");
        }
      }
    } else {
      copyList();
    }
  };

  // Event Listeners
  form.onsubmit = addItem;
  sortSelect.onchange = () => {
    currentSort = sortSelect.value;
    sortAndRenderList();
  };
  cartIcon.onclick = openModal;
  closeModal.onclick = closeModalFunc;
  copyListBtn.onclick = copyList;
  shareListBtn.onclick = shareListFunc;
  modal.onclick = (e) => {
    if (e.target === modal) closeModalFunc();
  };

  input.addEventListener("click", () => {
    if (audioContext.state === "suspended") {
      audioContext.resume();
    }
  });

  themeToggle.onclick = function () {
    const isDark = document.body.getAttribute("data-theme") === "dark";
    const newTheme = isDark ? "light" : "dark";

    gsap.to("body", {
      backgroundColor: isDark ? "#ffffff" : "#1a1a1a",
      duration: 0.3,
      ease: "power2.inOut",
    });

    document.body.setAttribute("data-theme", newTheme);
    localStorage.setItem("theme", newTheme);
  };

  const savedTheme = localStorage.getItem("theme") || "light";
  document.body.setAttribute("data-theme", savedTheme);

  loadItems();

  if (isMobile) {
    window.scrollTo(0, 1);
  }
});
