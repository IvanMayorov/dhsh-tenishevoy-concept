const sections = {
    all: 'Все материалы',
    programs: 'Программы',
    news: 'Новости',
    teachers: 'Педагоги',
    schedule: 'Расписание',
    gallery: 'Галерея и выставки',
    documents: 'Документы',
    pages: 'Страницы',
    information: 'Сведения об организации',
    applications: 'Заявки',
    access: 'Доступы сотрудников',
    review: 'На проверке',
};
const materialTypes = ['programs', 'news', 'teachers', 'gallery', 'documents', 'pages', 'information'];
const statuses = {
    published: 'Опубликовано',
    draft: 'Черновик',
    review: 'На проверке',
    returned: 'На доработке',
};
const days = ['Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота', 'Воскресенье'];
const firstMinute = 14 * 60;
const lastMinute = 20 * 60;
const slots = Array.from({ length: (lastMinute - firstMinute) / 30 }, (_, index) => firstMinute + index * 30);
const storageKey = 'tenisheva-admin-demo-v1';
const initial = {
    lessons: [
        { id: 'l1', title: 'Живопись', days: [0, 3], start: '15:00', end: '17:20', room: '1', status: 'published' },
        { id: 'l2', title: 'Первые шаги в искусстве', days: [1, 4], start: '16:00', end: '17:30', room: '1', status: 'published' },
        { id: 'l3', title: 'Творческая мастерская', days: [2, 5], start: '14:00', end: '15:00', room: '1', status: 'published' },
    ],
    materials: [
        { id: 'm1', kind: 'programs', title: 'Живопись', body: 'Рисунок, живопись и композиция.', status: 'published' },
        { id: 'm2', kind: 'programs', title: 'Первые шаги в искусстве', body: 'Знакомство с основами рисунка и цвета.', status: 'published' },
        { id: 'm3', kind: 'news', title: 'Открытие выставки ученических работ', body: 'Приглашаем познакомиться с работами учеников школы.', status: 'review' },
        { id: 'm4', kind: 'teachers', title: 'Преподаватель рисунка', body: 'Демонстрационная карточка педагога.', status: 'published' },
        { id: 'm5', kind: 'gallery', title: 'Осенний натюрморт', body: 'Работа ученика. Акварель.', status: 'published' },
        { id: 'm6', kind: 'documents', title: 'Правила приёма', body: 'Демонстрационная карточка документа.', status: 'published' },
        { id: 'm7', kind: 'pages', title: 'О школе', body: 'Детская художественная школа имени М. К. Тенишевой.', status: 'published' },
        { id: 'm8', kind: 'information', title: 'Основные сведения', body: 'Наименование, адрес и режим работы школы.', status: 'published' },
    ],
    staff: [
        { id: 'u1', title: 'Администратор школы', email: 'admin@example.test', role: 'admin' },
        { id: 'u2', title: 'Редактор сайта', email: 'editor@example.test', role: 'editor' },
    ],
};
const labels = { admin: 'Администратор', editor: 'Редактор', disabled: 'Доступ закрыт' };
const qs = (selector) => document.querySelector(selector);
const dialog = qs('#dialog');
const form = qs('#edit-form');
const content = qs('#content');
const create = qs('#create');
const role = qs('#role');
const readState = () => {
    try { return JSON.parse(sessionStorage.getItem(storageKey)) ?? structuredClone(initial); }
    catch { return structuredClone(initial); }
};
let state = readState();
let section = 'schedule';
let noticeTimer;
let submitEdit;
let opener;

const escapeHtml = (value = '') => String(value).replace(/[&<>"']/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
})[character]);
const minutes = (time) => {
    const [hours, minute] = time.split(':').map(Number);
    return hours * 60 + minute;
};
const formatTime = (value) => `${String(Math.floor(value / 60)).padStart(2, '0')}:${String(value % 60).padStart(2, '0')}`;
const isAdmin = () => role.value === 'admin';
const canEdit = (item) => isAdmin() || ['draft', 'returned'].includes(item.status);
const stamp = (status) => `<span class="tag ${status}">${statuses[status]}</span>`;
const action = (collection, item, label = 'Редактировать') => `<button type="button" class="row-action" data-edit="${collection}" data-id="${escapeHtml(item.id)}">${label}</button>`;

function save() {
    try { sessionStorage.setItem(storageKey, JSON.stringify(state)); }
    catch { /* Changes remain available until reload. */ }
}

function announce(message) {
    const notice = qs('#notice');
    notice.textContent = message;
    notice.hidden = false;
    clearTimeout(noticeTimer);
    noticeTimer = setTimeout(() => { notice.hidden = true; }, 4000);
}

function table(headers, rows, search = true) {
    const empty = `<tr class="empty" data-empty ${rows.length ? 'hidden' : ''}><td colspan="${headers.length}">Записей нет</td></tr>`;
    return `<div class="panel">
        ${search ? '<div class="table-toolbar"><input type="search" id="search" placeholder="Поиск" aria-label="Поиск по таблице"></div>' : ''}
        <div class="table-scroll" tabindex="0" role="region" aria-label="Таблица записей">
            <table><thead><tr>${headers.map((header) => `<th scope="col">${header}</th>`).join('')}</tr></thead>
            <tbody>${rows.join('')}${empty}</tbody></table>
        </div></div>`;
}

function calendar() {
    const columns = days.map((day, dayIndex) => {
        const lessons = state.lessons.filter((item) => item.days.includes(dayIndex));
        const blocks = slots.map((slot) => {
            const busy = lessons.some((item) => minutes(item.start) < slot + 30 && minutes(item.end) > slot);
            return `<button type="button" class="slot" data-slot="${slot}" data-day="${dayIndex}" aria-label="Добавить занятие — ${day}, ${formatTime(slot)}" ${busy ? 'disabled' : ''}>${busy ? '' : 'Добавить'}</button>`;
        });
        const cards = lessons.map((item) => {
            const start = minutes(item.start);
            const duration = minutes(item.end) - start;
            return `<button type="button" class="lesson" data-edit="lessons" data-id="${escapeHtml(item.id)}" style="--offset: ${start - firstMinute}; --duration: ${duration}" aria-label="${escapeHtml(`${item.title}, ${item.start}–${item.end}`)}">
                <span>${escapeHtml(item.start)}–${escapeHtml(item.end)}</span><strong>${escapeHtml(item.title)}</strong><span>Мастерская ${escapeHtml(item.room)}</span>
            </button>`;
        });
        return `<div class="day" role="group" aria-label="${day}">${blocks.join('')}${cards.join('')}</div>`;
    });
    const rows = state.lessons.map((item) => `<tr><td>${escapeHtml(item.title)}</td>
        <td>${item.days.map((index) => days[index]).join(', ')}</td>
        <td class="nowrap">${escapeHtml(item.start)}–${escapeHtml(item.end)}</td><td>${escapeHtml(item.room)}</td>
        <td>${stamp(item.status)}</td><td>${action('lessons', item, canEdit(item) ? 'Редактировать' : 'Открыть')}</td></tr>`);
    return `<section class="panel" aria-labelledby="week-title">
        <div class="week-header"><div><h2 id="week-title">Недельная сетка</h2>
            <p>Выберите время, чтобы добавить занятие, или откройте карточку.</p></div>
            <a href="#lesson-list" data-list-link>К списку занятий</a></div>
        <div class="week-scroll" tabindex="0" role="region" aria-label="Недельная сетка расписания">
            <div class="week"><div class="week-label">Начало</div>
                ${days.map((day) => `<div class="week-label">${day}</div>`).join('')}
                <div aria-hidden="true">${slots.map((slot) => `<div class="time-label">${formatTime(slot)}</div>`).join('')}</div>
                ${columns.join('')}
            </div>
        </div><div class="week-foot">${formatTime(lastMinute)}</div></section>
        <h2 class="list-title" id="lesson-list" tabindex="-1">Все занятия</h2>
        ${table(['Программа', 'Дни занятий', 'Время', 'Мастерская', 'Статус', 'Действие'], rows)}`;
}

function materials() {
    const visible = state.materials.filter((item) => section === 'all' || item.kind === section || (section === 'review' && item.status === 'review'));
    const rows = visible.map((item) => `<tr><td>${escapeHtml(item.title)}</td><td>${sections[item.kind]}</td>
        <td>${stamp(item.status)}</td><td>${action('materials', item, canEdit(item) ? 'Редактировать' : 'Открыть')}</td></tr>`);
    if (section === 'review') {
        rows.push(...state.lessons.filter((item) => item.status === 'review').map((item) =>
            `<tr><td>${escapeHtml(item.title)}</td><td>Расписание</td><td>${stamp(item.status)}</td><td>${action('lessons', item)}</td></tr>`
        ));
    }
    return table(['Название', 'Раздел', 'Статус', 'Действие'], rows);
}

function render() {
    qs('#page-title').textContent = sections[section];
    create.hidden = section === 'review' || section === 'applications';
    create.textContent = section === 'schedule' ? 'Добавить занятие' : section === 'access' ? 'Добавить сотрудника' : 'Создать';
    qs('#management').hidden = !isAdmin();
    qs('.menu a[href="#applications"]').closest('li').hidden = !isAdmin();
    document.querySelectorAll('.menu a').forEach((link) => {
        if (link.hash === `#${section}`) link.setAttribute('aria-current', 'page');
        else link.removeAttribute('aria-current');
    });
    if (section === 'schedule') {
        content.innerHTML = calendar();
    } else if (section === 'access') {
        const rows = state.staff.map((item) => `<tr><td>${escapeHtml(item.title)}</td><td>${escapeHtml(item.email)}</td>
            <td><span class="tag">${labels[item.role]}</span></td><td>${action('staff', item)}</td></tr>`);
        content.innerHTML = table(['Имя', 'Электронная почта', 'Уровень доступа', 'Действие'], rows);
    } else if (section === 'applications') {
        content.innerHTML = table(['Название', 'Программа', 'Статус'], [
            '<tr><td>Демонстрационная заявка</td><td>Первые шаги в искусстве</td><td><span class="tag review">Новая</span></td></tr>',
        ], false);
    } else {
        content.innerHTML = materials();
    }
}

function changeSection(focus = false) {
    const requested = location.hash.slice(1);
    const privateSections = ['access', 'review', 'applications'];
    section = Object.hasOwn(sections, requested) && (isAdmin() || !privateSections.includes(requested)) ? requested : 'schedule';
    render();
    if (focus) qs('#page-title').focus();
}

function field(label, markup, wide = false) {
    return `<label class="field${wide ? ' field-wide' : ''}"><span>${label}</span>${markup}</label>`;
}

function choices(options, selected) {
    return Object.entries(options).map(([value, label]) =>
        `<option value="${value}" ${String(selected) === value ? 'selected' : ''}>${label}</option>`
    ).join('');
}

function openEditor(collection, record, slot = {}) {
    const isLesson = collection === 'lessons';
    const isStaff = collection === 'staff';
    const locked = Boolean(record && !isStaff && !canEdit(record));
    const item = record ?? { title: '', status: isAdmin() && isLesson ? 'published' : 'draft' };
    const heading = isLesson ? 'Занятие' : isStaff ? 'Сотрудник' : 'Материал';
    opener = document.activeElement;
    qs('#dialog-title').textContent = record ? heading : isLesson ? 'Добавить занятие' : isStaff ? 'Добавить сотрудника' : 'Новый материал';
    let markup = field(isStaff ? 'Имя' : 'Название', `<input name="title" value="${escapeHtml(item.title)}" maxlength="120" required>`, true);
    if (isLesson) {
        const selectedDays = item.days ?? [slot.day ?? 0];
        markup += field('Дни занятий', `<select name="days" multiple size="4" required>${days.map((day, index) =>
            `<option value="${index}" ${selectedDays.includes(index) ? 'selected' : ''}>${day}</option>`).join('')}</select>`, true);
        markup += field('Начало', `<input type="time" name="start" value="${escapeHtml(item.start ?? formatTime(slot.minute ?? firstMinute))}" min="14:00" max="19:59" required>`);
        markup += field('Окончание', `<input type="time" name="end" value="${escapeHtml(item.end ?? formatTime((slot.minute ?? firstMinute) + 30))}" min="14:01" max="20:00" required>`);
        markup += field('Мастерская', `<input name="room" value="${escapeHtml(item.room ?? '1')}" maxlength="30" required>`, true);
    } else if (isStaff) {
        markup += field('Электронная почта', `<input type="email" name="email" value="${escapeHtml(item.email)}" required>`, true);
        const roles = item.role === 'admin' ? labels : { editor: labels.editor, disabled: labels.disabled };
        markup += field('Уровень доступа', `<select name="role">${choices(roles, item.role ?? 'editor')}</select>`, true);
    } else {
        if (!record) {
            const options = Object.fromEntries(materialTypes.map((kind) => [kind, sections[kind]]));
            markup += field('Раздел', `<select name="kind">${choices(options, materialTypes.includes(section) ? section : 'news')}</select>`, true);
        }
        markup += field('Текст', `<textarea name="body" maxlength="5000">${escapeHtml(item.body)}</textarea>`, true);
    }
    if (item.note) markup += field('Комментарий к проверке', `<p>${escapeHtml(item.note)}</p>`, true);
    qs('#fields').innerHTML = markup;
    qs('#fields').querySelectorAll('input, select, textarea').forEach((element) => { element.disabled = locked; });
    let reviewButtons = '';
    if (!isStaff && !isAdmin()) {
        reviewButtons = '<button class="primary" type="submit" value="review">На проверку</button>';
    } else if (!isStaff && item.status === 'review') {
        reviewButtons = '<button type="submit" value="return">Вернуть на доработку</button><button class="primary" type="submit" value="publish">Одобрить и опубликовать</button>';
    } else if (!isStaff && item.status !== 'published') {
        reviewButtons = '<button class="primary" type="submit" value="publish">Опубликовать</button>';
    }
    qs('#dialog-actions').innerHTML = locked ? '' :
        `<button class="${reviewButtons ? '' : 'primary'}" type="submit" value="save">Сохранить</button>${reviewButtons}`;

    submitEdit = (intent) => {
        const values = new FormData(form);
        const title = values.get('title').trim();
        if (!title) {
            form.elements.title.setCustomValidity('Введите название.');
            form.elements.title.reportValidity();
            return;
        }
        const next = { ...item, id: item.id ?? crypto.randomUUID(), title };
        if (isLesson) {
            const start = values.get('start');
            const end = values.get('end');
            const chosenDays = values.getAll('days').map(Number);
            let error = '';
            if (end <= start) error = 'Окончание должно быть позже начала.';
            else if (state.lessons.some((other) =>
                other.id !== next.id && chosenDays.some((day) => other.days.includes(day))
                && start < other.end && end > other.start
            )) error = 'В это время уже есть занятие. Выберите другой день или время.';
            if (error) {
                form.elements.end.setCustomValidity(error);
                form.elements.end.reportValidity();
                return;
            }
            Object.assign(next, { start, end, days: chosenDays, room: values.get('room').trim() });
        } else if (isStaff) {
            Object.assign(next, { role: values.get('role'), email: values.get('email').trim() });
        } else {
            Object.assign(next, { kind: item.kind ?? values.get('kind'), body: values.get('body') });
        }
        if (!isStaff) {
            next.status = { review: 'review', return: 'returned', publish: 'published' }[intent] ?? item.status;
            if (intent === 'return') next.note = 'Уточните детали перед публикацией.';
        }
        const index = state[collection].findIndex(({ id }) => id === next.id);
        if (index === -1) state[collection].push(next);
        else state[collection][index] = next;
        save();
        dialog.close();
        render();
        announce({ review: 'Отправлено на проверку.', return: 'Возвращено на доработку.', publish: 'Материал опубликован в демо.' }[intent] ?? 'Изменения сохранены.');
    };
    dialog.showModal();
}

window.addEventListener('hashchange', () => {
    if (location.hash === '#main') return;
    qs('#sidebar').classList.remove('is-open');
    qs('#menu-toggle').setAttribute('aria-expanded', 'false');
    changeSection(true);
});
qs('#menu-toggle').addEventListener('click', (event) => {
    const expanded = qs('#sidebar').classList.toggle('is-open');
    event.currentTarget.setAttribute('aria-expanded', String(expanded));
});
role.addEventListener('change', () => changeSection());
create.addEventListener('click', () => openEditor(section === 'schedule' ? 'lessons' : section === 'access' ? 'staff' : 'materials'));
content.addEventListener('click', (event) => {
    const listLink = event.target.closest('[data-list-link]');
    if (listLink) {
        event.preventDefault();
        qs('#lesson-list').focus();
        return;
    }
    const button = event.target.closest('button');
    if (!button) return;
    if (button.dataset.slot) {
        openEditor('lessons', null, { day: Number(button.dataset.day), minute: Number(button.dataset.slot) });
    }
    if (button.dataset.edit) {
        const collection = button.dataset.edit;
        const record = state[collection].find(({ id }) => id === button.dataset.id);
        if (record) openEditor(collection, record);
    }
});
content.addEventListener('input', (event) => {
    if (event.target.id !== 'search') return;
    const query = event.target.value.trim().toLocaleLowerCase('ru');
    const rows = [...content.querySelectorAll('tbody tr:not([data-empty])')];
    rows.forEach((row) => { row.hidden = !row.textContent.toLocaleLowerCase('ru').includes(query); });
    content.querySelector('[data-empty]').hidden = rows.some((row) => !row.hidden);
});
form.addEventListener('input', (event) => {
    event.target.setCustomValidity?.('');
    form.elements.end?.setCustomValidity('');
});
form.addEventListener('submit', (event) => {
    event.preventDefault();
    submitEdit(event.submitter?.value ?? 'save');
});
qs('#close-dialog').addEventListener('click', () => dialog.close());
dialog.addEventListener('close', () => {
    if (opener?.isConnected) opener.focus();
    else qs('#page-title').focus();
});
changeSection();
