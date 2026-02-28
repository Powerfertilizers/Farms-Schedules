document.addEventListener('DOMContentLoaded', () => {

  // ── DOM Elements ─────────────────────────────────
  const calendarEl       = document.getElementById('calendar');
  const taskForm         = document.getElementById('task-form');
  const taskListEl       = document.getElementById('task-list');
  const modal            = document.getElementById('edit-modal');
  const editDate         = document.getElementById('edit-date');
  const editTitle        = document.getElementById('edit-title');
  const editNotes        = document.getElementById('edit-notes');
  const btnSave          = document.getElementById('save-edit');
  const btnDelete        = document.getElementById('delete-task');
  const btnCancel        = document.getElementById('cancel-edit');

  // ── State ────────────────────────────────────────
  let calendar;
  let currentTaskId = null;
  let tasks = loadTasks();

  // ── Calendar Setup ───────────────────────────────
  calendar = new FullCalendar.Calendar(calendarEl, {
    initialView: 'dayGridMonth',
    editable: false,
    selectable: false,
    height: 'auto',
    headerToolbar: {
      start: 'prev,next today',
      center: 'title',
      end: 'dayGridMonth,timeGridWeek'
    },
    customButtons: {
      prev:  { text: '← Prev',  click: () => calendar.prev()  },
      next:  { text: 'Next →',  click: () => calendar.next()  },
      today: { text: 'Today',   click: () => calendar.today() }
    },
    buttonText: {
      today: 'Today',
      month: 'Month',
      week:  'Week'
    },
    views: {
      dayGridMonth: { buttonText: 'Month' },
      timeGridWeek: { buttonText: 'Week'  }
    },
    eventClick: (info) => openEditModal(info.event)
  });
  calendar.render();

  // ── Helper Functions ─────────────────────────────
  function loadTasks() {
    try {
      return JSON.parse(localStorage.getItem('farmflow_tasks')) || [];
    } catch {
      return [];
    }
  }

  function saveTasks() {
    localStorage.setItem('farmflow_tasks', JSON.stringify(tasks));
    renderTaskList();
    refreshCalendar();
  }

  function refreshCalendar() {
    calendar.removeAllEvents();
    tasks.forEach(t => {
      calendar.addEvent({
        id: t.id,
        title: t.title,
        start: t.date,
        allDay: true,
        extendedProps: { notes: t.notes || '' }
      });
    });
  }

  function formatDate(dateStr) {
    return new Date(dateStr).toLocaleDateString('en-IN', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  }

  function renderTaskList() {
    const today = new Date().toISOString().split('T')[0];
    const sorted = [...tasks].sort((a, b) => new Date(a.date) - new Date(b.date));

    taskListEl.innerHTML = '';

    if (sorted.length === 0) {
      taskListEl.innerHTML = '<p class="text-center text-gray-500 py-10 italic">No tasks yet — add one above!</p>';
      return;
    }

    sorted.forEach(task => {
      const isToday = task.date === today;
      const isPast  = task.date < today;

      const card = document.createElement('div');
      card.className = `p-4 rounded-lg border cursor-pointer hover:shadow transition-all duration-150 ${
        isToday ? 'bg-green-50 border-green-300' :
        isPast  ? 'bg-gray-50 opacity-75 border-gray-200' :
                  'bg-white border-gray-200 hover:border-green-300'
      }`;

      card.innerHTML = `
        <div class="flex justify-between items-start mb-1">
          <div class="font-medium ${isToday ? 'text-green-700' : 'text-gray-800'}">${task.title}</div>
          <span class="text-xs px-2.5 py-1 rounded-full font-medium ${
            isToday ? 'bg-green-100 text-green-700' :
            isPast  ? 'bg-gray-100 text-gray-600' :
                      'bg-blue-100 text-blue-700'
          }">${isToday ? 'Today' : isPast ? 'Past' : 'Upcoming'}</span>
        </div>
        <div class="text-sm text-gray-500 mb-2">${formatDate(task.date)}</div>
        ${task.notes ? `<div class="text-sm text-gray-600 border-t pt-2 mt-1"><strong>Notes:</strong> ${task.notes.replace(/\n/g, '<br>')}</div>` : ''}
      `;

      card.addEventListener('click', () => openEditModal({
        id: task.id,
        title: task.title,
        start: task.date,
        extendedProps: { notes: task.notes || '' }
      }));

      taskListEl.appendChild(card);
    });
  }

  // ── Add Task ─────────────────────────────────────
  taskForm.addEventListener('submit', e => {
    e.preventDefault();
    const date  = document.getElementById('task-date').value;
    const title = document.getElementById('task-title').value.trim();
    const notes = document.getElementById('task-notes').value.trim();

    if (!date || !title) {
      alert('Please fill date and title');
      return;
    }

    tasks.push({ id: Date.now().toString(), date, title, notes });
    saveTasks();
    taskForm.reset();
    taskForm.classList.add('animate-pulse-short');
    setTimeout(() => taskForm.classList.remove('animate-pulse-short'), 500);
  });

  // ── Edit Modal ───────────────────────────────────
  function openEditModal(eventInfo) {
    currentTaskId = eventInfo.id;
    editDate.value  = eventInfo.start ? eventInfo.start.split('T')[0] : '';
    editTitle.value = eventInfo.title || '';
    editNotes.value = eventInfo.extendedProps?.notes || '';
    modal.classList.remove('hidden');
  }

  btnSave.onclick = () => {
    const task = tasks.find(t => t.id === currentTaskId);
    if (task) {
      task.date  = editDate.value;
      task.title = editTitle.value.trim();
      task.notes = editNotes.value.trim();
      saveTasks();
    }
    modal.classList.add('hidden');
  };

  btnDelete.onclick = () => {
    if (!confirm('Delete this task permanently?')) return;
    tasks = tasks.filter(t => t.id !== currentTaskId);
    saveTasks();
    modal.classList.add('hidden');
  };

  btnCancel.onclick = () => modal.classList.add('hidden');

  modal.addEventListener('click', e => {
    if (e.target === modal) modal.classList.add('hidden');
  });

  // ── Weather (Open-Meteo – no key needed) ─────────
  async function loadWeather() {
    const container = document.getElementById('weather-container');
    const locEl = document.getElementById('weather-location');

    const lat = 21.25;          // Raver approx
    const lon = 75.93;
    const place = "Raver, Maharashtra";

    try {
      const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,wind_speed_10m_max&timezone=Asia%2FKolkata&forecast_days=7`;
      const res = await fetch(url);
      if (!res.ok) throw new Error();

      const { daily } = await res.json();
      container.innerHTML = '';

      for (let i = 0; i < 7; i++) {
        const d = new Date(daily.time[i]);
        const day = d.toLocaleDateString('en-IN', { weekday: 'short' });
        const tmax = Math.round(daily.temperature_2m_max[i]);
        const tmin = Math.round(daily.temperature_2m_min[i]);
        const rain = daily.precipitation_sum[i] || 0;
        const wind = Math.round(daily.wind_speed_10m_max[i] || 0);
        const code = daily.weather_code[i];

        let icon = '☀️', cond = 'Clear';
        if (code >= 51 && code <= 67) { icon = '🌧️'; cond = 'Rain'; }
        else if (code >= 80 && code <= 99) { icon = '⛈️'; cond = 'Thunderstorm'; }
        else if (code >= 45 && code <= 48) { icon = '🌫️'; cond = 'Fog'; }
        else if (code >= 1  && code <= 3)  { icon = '⛅'; cond = 'Cloudy'; }

        const card = document.createElement('div');
        card.className = 'bg-gradient-to-b from-green-50 to-white p-4 rounded-xl border border-green-100 text-center shadow-sm hover:shadow';
        card.innerHTML = `
          <div class="text-lg font-bold text-emerald-800 mb-1">${day}</div>
          <div class="text-4xl mb-2">${icon}</div>
          <div class="text-sm text-gray-600">${cond}</div>
          <div class="text-xl font-semibold mt-1">${tmin}° – ${tmax}°C</div>
          <div class="text-xs text-gray-500 mt-1">🌧️ ${rain} mm • 💨 ${wind} km/h</div>
        `;
        container.appendChild(card);
      }

      locEl.textContent = `7-day forecast for ${place} (${new Date().toLocaleTimeString('en-IN')})`;

    } catch {
      container.innerHTML = '<p class="col-span-full text-center text-red-600 py-8">Weather unavailable right now</p>';
      locEl.textContent = `Weather for ${place} (offline)`;
    }
  }

  // ── Init ─────────────────────────────────────────
  renderTaskList();
  refreshCalendar();
  loadWeather();
});
