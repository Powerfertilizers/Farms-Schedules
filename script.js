document.addEventListener('DOMContentLoaded', function () {
    const calendarEl = document.getElementById('calendar');
    const taskForm = document.getElementById('task-form');
    const taskDate = document.getElementById('task-date');
    const taskTitle = document.getElementById('task-title');
    const taskList = document.getElementById('task-list');
    const editModal = document.getElementById('edit-modal');
    const editDate = document.getElementById('edit-date');
    const editTitle = document.getElementById('edit-title');
    const saveEditBtn = document.getElementById('save-edit');
    const deleteBtn = document.getElementById('delete-task');
    const cancelBtn = document.getElementById('cancel-edit');
    const weatherContainer = document.getElementById('weather-container');
    const weatherLocationEl = document.getElementById('weather-location');
    let currentEditId = null;
    const calendar = new FullCalendar.Calendar(calendarEl, {
        initialView: 'dayGridMonth',
        editable: true,
        headerToolbar: {
            left: 'prev,next today',
            center: 'title',
            right: 'dayGridMonth,timeGridWeek'
        },
        events: loadEvents(),
        eventClick: function(info) {
            currentEditId = info.event.id;
            editDate.value = info.event.start.toISOString().split('T')[0];
            editTitle.value = info.event.title;
            editModal.classList.remove('hidden');
        },
        eventDrop: saveAndRefresh,
        eventResize: saveAndRefresh
    });
    calendar.render();
    // ────────────────────────────────────────────────
    // Weather Integration (Open-Meteo - free, no key) - Now set to Raver, Maharashtra
    // ────────────────────────────────────────────────
    function fetchWeather(lat, lon, locationName = 'Raver, Maharashtra') {
        const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,et0_fao_evapotranspiration&timezone=Asia%2FKolkata&forecast_days=7`;
        fetch(url)
            .then(res => res.json())
            .then(data => {
                weatherContainer.innerHTML = '';
                const days = data.daily.time;
                const codes = data.daily.weather_code;
                const tmax = data.daily.temperature_2m_max;
                const tmin = data.daily.temperature_2m_min;
                const rainProb = data.daily.precipitation_probability_max;
                const et0 = data.daily.et0_fao_evapotranspiration;
                days.forEach((date, i) => {
                    const d = new Date(date);
                    const dayName = d.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });
                    const div = document.createElement('div');
                    div.className = 'weather-day';
                    div.innerHTML = `
                        <div class="font-bold text-emerald-800">${dayName}</div>
                        <div class="weather-icon">${getWeatherIcon(codes[i])}</div>
                        <div class="text-lg font-medium">${Math.round(tmin[i])}° – ${Math.round(tmax[i])}°C</div>
                        <div class="weather-rain text-sm">Rain: ${rainProb[i]}%</div>
                        <div class="weather-et0">ET₀: ${et0[i]?.toFixed(1) || '—'} mm</div>
                    `;
                    weatherContainer.appendChild(div);
                });
                weatherLocationEl.textContent = `Forecast for ${locationName}`;
            })
            .catch(err => {
                weatherContainer.innerHTML = '<p class="text-red-600 text-center">Could not load weather. Please check internet.</p>';
            });
    }
    // Simple WMO weather code → emoji mapping (Open-Meteo uses WMO codes)
    function getWeatherIcon(code) {
        if (code === 0) return '☀️';
        if ([1,2,3].includes(code)) return '⛅';
        if ([45,48].includes(code)) return '🌫️';
        if ([51,53,55,56,57].includes(code)) return '🌧️';
        if ([61,63,65,66,67].includes(code)) return '🌧️';
        if ([71,73,75,77].includes(code)) return '❄️';
        if ([80,81,82].includes(code)) return '🌦️';
        if ([95,96,99].includes(code)) return '⛈️';
        return '🌤️';
    }
    // Directly fetch weather for Raver, Maharashtra (no geolocation prompt needed)
    // Coordinates ≈ 21.24, 76.03 (central Raver, Jalgaon district)
    fetchWeather(21.24, 76.03, 'Raver, Maharashtra');

    // ────────────────────────────────────────────────
    // Existing Task Logic (unchanged except saveAndRefresh calls)
    // ────────────────────────────────────────────────
    function loadEvents() {
        return JSON.parse(localStorage.getItem('farmTasks')) || [];
    }
    function saveEvents(events) {
        localStorage.setItem('farmTasks', JSON.stringify(events));
    }
    function getEvents() {
        return calendar.getEvents().map(ev => ({
            id: ev.id,
            title: ev.title,
            start: ev.start.toISOString()
        }));
    }
    function saveAndRefresh() {
        saveEvents(getEvents());
        renderTaskList();
    }
    function renderTaskList() {
        taskList.innerHTML = '';
        const events = getEvents().sort((a, b) => new Date(a.start) - new Date(b.start));
        if (events.length === 0) {
            taskList.innerHTML = '<p class="text-gray-500 text-center py-8">No tasks scheduled yet. Add your first farming task above!</p>';
            return;
        }
        events.forEach(ev => {
            const date = new Date(ev.start).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });
            const card = document.createElement('div');
            card.className = 'task-card bg-green-50 border border-green-200 rounded-lg p-4 cursor-pointer';
            card.innerHTML = `
                <div class="font-medium text-emerald-800">${date}</div>
                <div class="text-gray-700 mt-1">${ev.title}</div>
                <button class="mt-3 text-sm text-green-700 hover:text-green-900 font-medium" onclick="editTask('${ev.id}')">
                    <i class="fas fa-edit mr-1"></i> Edit
                </button>
            `;
            card.addEventListener('click', () => editTask(ev.id));
            taskList.appendChild(card);
        });
    }
    window.editTask = function(id) {
        const event = calendar.getEventById(id);
        if (event) {
            currentEditId = id;
            editDate.value = event.start.toISOString().split('T')[0];
            editTitle.value = event.title;
            editModal.classList.remove('hidden');
        }
    };
    taskForm.addEventListener('submit', e => {
        e.preventDefault();
        const id = Date.now().toString();
        calendar.addEvent({
            id,
            title: taskTitle.value.trim(),
            start: taskDate.value
        });
        saveAndRefresh();
        taskForm.reset();
    });
    saveEditBtn.addEventListener('click', () => {
        if (currentEditId) {
            const ev = calendar.getEventById(currentEditId);
            if (ev) {
                ev.setProp('title', editTitle.value.trim());
                ev.setStart(editDate.value);
                saveAndRefresh();
            }
        }
        editModal.classList.add('hidden');
    });
    deleteBtn.addEventListener('click', () => {
        if (currentEditId) {
            const ev = calendar.getEventById(currentEditId);
            if (ev) {
                ev.remove();
                saveAndRefresh();
            }
        }
        editModal.classList.add('hidden');
    });
    cancelBtn.addEventListener('click', () => editModal.classList.add('hidden'));
    // Initial load
    renderTaskList();
});