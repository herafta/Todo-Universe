(() => {
  const STORAGE_KEY = 'todo-universe-tasks';
  let tasks = [];
  let scale = 1;
  let orbiting = false;
  const canvas = document.getElementById('canvas');
  const addBtn = document.getElementById('addBtn');
  const exportBtn = document.getElementById('exportBtn');
  const importBtn = document.getElementById('importBtn');
  const themeBtn = document.getElementById('themeBtn');
  const orbitBtn = document.getElementById('orbitBtn');
  const themePref = localStorage.getItem('todo-theme') || 'light';
  document.documentElement.setAttribute('data-theme', themePref);
  function toggleTheme() {
    const next = document.documentElement.getAttribute('data-theme') === 'light' ? 'night' : 'light';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('todo-theme', next);
  }
  themeBtn.addEventListener('click', toggleTheme);

  function loadTasks() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) tasks = JSON.parse(raw);
    } catch {}
  }
  function saveTasks() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
  }

  function generateColor() {
    // Pastel color with random hue, fixed low saturation for readability
    const hue = Math.floor(Math.random() * 360);
    return `hsl(${hue} 70% 85%)`;
  }

  function createTask(data = {}) {
    const id = Date.now() + Math.random().toString(36).slice(2);
    const task = {
      id,
      x: window.innerWidth / 2 + (Math.random() * 200 - 100),
      y: window.innerHeight / 2 + (Math.random() * 200 - 100),
      link: data.link || '',
      brief: data.brief || 'New Task',
      notes: data.notes || '',
      color: generateColor(),
    };
    tasks.push(task);
    saveTasks();
    render();
  }

  function createCardElement(task) {
    const card = document.createElement('div');
    card.className =
      'absolute w-64 p-3 rounded-lg shadow-lg transition-transform duration-150 ease-out';
    card.style.background = task.color;
    card.style.transform = `translate(${task.x}px, ${task.y}px)`;
    card.style.color = 'var(--card-fg)';
    card.setAttribute('role', 'group');
    card.setAttribute('aria-label', `Task: ${task.brief}`);

    // Hover lift
    card.addEventListener('mouseenter', () => {
      card.style.transform += ' scale(1.03)';
    });
    card.addEventListener('mouseleave', () => {
      card.style.transform = `translate(${task.x}px, ${task.y}px)`;
    });

    // Content
    card.innerHTML = `
      <input aria-label="Brief description" maxlength="120" class="w-full bg-transparent font-semibold outline-none" value="${task.brief}" />
      <input aria-label="Link" class="w-full mt-1 text-sm bg-transparent underline outline-none" placeholder="https://" value="${task.link}" />
      <textarea aria-label="Notes" class="w-full mt-2 text-xs bg-transparent outline-none resize-none" rows="4" placeholder="Notes (markdown supported)">${task.notes}</textarea>
      <div class="flex justify-end gap-2 mt-2 text-xs">
        <button class="openLink text-indigo-700" aria-label="Open link">Open</button>
        <button class="delete text-red-600" aria-label="Delete task">Delete</button>
      </div>`;

    // Event delegation for inputs
    const [briefInput, linkInput, notesArea] = card.querySelectorAll('input, textarea');
    briefInput.addEventListener('input', (e) => {
      task.brief = e.target.value;
      saveTasks();
    });
    linkInput.addEventListener('input', (e) => {
      task.link = e.target.value;
      saveTasks();
    });
    notesArea.addEventListener('input', (e) => {
      task.notes = e.target.value;
      saveTasks();
    });

    card.querySelector('.openLink').addEventListener('click', () => {
      if (task.link) {
        window.open(task.link);
      }
    });
    card.querySelector('.delete').addEventListener('click', () => {
      tasks = tasks.filter((t) => t.id !== task.id);
      saveTasks();
      render();
    });

    enableDrag(card, task);
    return card;
  }

  function enableDrag(el, task) {
    let offsetX = 0,
      offsetY = 0,
      dragging = false;
    el.addEventListener('pointerdown', (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.classList.contains('openLink')) return;
      dragging = true;
      el.setPointerCapture(e.pointerId);
      offsetX = e.clientX - task.x;
      offsetY = e.clientY - task.y;
    });
    el.addEventListener('pointermove', (e) => {
      if (!dragging) return;
      task.x = e.clientX - offsetX;
      task.y = e.clientY - offsetY;
      el.style.transform = `translate(${task.x}px, ${task.y}px)`;
    });
    el.addEventListener('pointerup', () => {
      if (dragging) {
        dragging = false;
        saveTasks();
      }
    });
  }

  function render() {
    canvas.innerHTML = '';
    tasks.forEach((t) => {
      const card = createCardElement(t);
      canvas.appendChild(card);
    });
  }

  // Zoom handling
  canvas.addEventListener('wheel', (e) => {
    e.preventDefault();
    const delta = -e.deltaY || e.wheelDelta || -e.detail;
    scale += delta > 0 ? 0.1 : -0.1;
    scale = Math.min(Math.max(scale, 0.4), 2);
    canvas.style.transform = `scale(${scale})`;
  }, { passive: false });

  // Orbit mode
  let angle = 0;
  function tickOrbit() {
    if (!orbiting) return;
    angle += 0.005;
    const centerX = window.innerWidth / 2;
    const centerY = window.innerHeight / 2;
    tasks.forEach((t, i) => {
      const radius = 150 + i * 50;
      t.x = centerX + Math.cos(angle + i) * radius - 100;
      t.y = centerY + Math.sin(angle + i) * radius - 50;
      // Update corresponding element
    });
    const cards = canvas.children;
    tasks.forEach((t, idx) => {
      const el = cards[idx];
      el.style.transform = `translate(${t.x}px, ${t.y}px)`;
    });
    requestAnimationFrame(tickOrbit);
  }

  orbitBtn.addEventListener('click', () => {
    orbiting = !orbiting;
    orbitBtn.classList.toggle('bg-purple-700', orbiting);
    if (orbiting) requestAnimationFrame(tickOrbit);
  });

  // Backup/Restore
  exportBtn.addEventListener('click', () => {
    const blob = new Blob([JSON.stringify(tasks, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'tasks.json';
    a.click();
    URL.revokeObjectURL(a.href);
  });

  importBtn.addEventListener('click', () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json,application/json';
    input.onchange = () => {
      const file = input.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        try {
          tasks = JSON.parse(reader.result);
          saveTasks();
          render();
        } catch (err) {
          alert('Invalid tasks.json');
        }
      };
      reader.readAsText(file);
    };
    input.click();
  });

  // Add Task
  addBtn.addEventListener('click', () => {
    const brief = prompt('Task description (<=120 chars)')?.slice(0, 120);
    if (!brief) return;
    const link = prompt('Link (optional)') || '';
    createTask({ brief, link, notes: '' });
  });

  // Initialize
  loadTasks();
  render();
})();
