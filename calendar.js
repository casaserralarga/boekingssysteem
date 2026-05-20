let currentMonth = new Date().getMonth();
let currentYear = new Date().getFullYear();

function renderCalendar() {
    const cal = document.getElementById("calendar");
    if (!cal) return;

    cal.innerHTML = "";

    const first = new Date(currentYear, currentMonth, 1);
    const last = new Date(currentYear, currentMonth + 1, 0);

    for (let i = 0; i < first.getDay(); i++) {
        cal.innerHTML += "<div></div>";
    }

    for (let d = 1; d <= last.getDate(); d++) {
        const date = new Date(currentYear, currentMonth, d);
        const ds = date.toISOString().split('T')[0];

        const list = bookings.filter(b =>
            b.checkin <= ds && b.checkout > ds
        );

        cal.innerHTML += `
            <div class="day" onclick="openDay('${ds}')">
                <strong>${d}</strong>
                ${list.map(b => `<div>${b.name}</div>`).join("")}
            </div>
        `;
    }
}

function prevMonth() {
    currentMonth--;
    if (currentMonth < 0) {
        currentMonth = 11;
        currentYear--;
    }
    renderCalendar();
}

function nextMonth() {
    currentMonth++;
    if (currentMonth > 11) {
        currentMonth = 0;
        currentYear++;
    }
    renderCalendar();
}