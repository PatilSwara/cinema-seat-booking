const form = document.querySelector('#booking-form');
if (form) {
  const buttons = [...form.querySelectorAll('.seat')];
  const selected = new Set();
  const hidden = document.querySelector('#selected-seats');
  const labels = document.querySelector('#selected-labels');
  const list = document.querySelector('#selected-prices');
  const count = document.querySelector('#ticket-count');
  const total = document.querySelector('#booking-total');
  const submit = document.querySelector('#book-button');
  const error = document.querySelector('#seat-error');
  const format = (amount) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount);

  function showError(message) {
    error.textContent = message;
    error.hidden = !message;
  }
  function render() {
    const seats = buttons.filter((button) => selected.has(button.dataset.id));
    hidden.value = seats.map((button) => button.dataset.id).join(',');
    labels.textContent = seats.length ? seats.map((button) => button.dataset.id).join(', ') : 'None yet';
    count.textContent = String(seats.length);
    total.textContent = format(seats.reduce((sum, button) => sum + Number(button.dataset.amount), 0));
    submit.disabled = !seats.length;
    submit.textContent = seats.length ? 'Confirm booking · ' + total.textContent : 'Choose seats to continue';
    list.replaceChildren();
    for (const button of seats) {
      const item = document.createElement('li');
      const name = document.createElement('span');
      const price = document.createElement('strong');
      name.textContent = button.dataset.id + ' · ' + button.dataset.tier;
      price.textContent = button.dataset.price;
      item.append(name, price);
      list.append(item);
    }
    for (const button of buttons) {
      const chosen = selected.has(button.dataset.id);
      button.classList.toggle('seat-selected', chosen);
      button.setAttribute('aria-pressed', String(chosen));
      const base = button.dataset.label || button.getAttribute('aria-label').replace(/, selected$/, '');
      button.dataset.label = base;
      button.setAttribute('aria-label', base + (chosen ? ', selected' : ''));
    }
  }
  for (const button of buttons) {
    button.addEventListener('click', () => {
      showError('');
      const id = button.dataset.id;
      if (selected.has(id)) selected.delete(id);
      else if (selected.size >= 6) { showError('You can book up to six seats at once.'); return; }
      else selected.add(id);
      render();
    });
  }
  document.querySelector('#refresh-seats').addEventListener('click', async (event) => {
    const refresh = event.currentTarget;
    refresh.disabled = true;
    showError('');
    try {
      const response = await fetch('/index.php?page=seats-json&id=' + encodeURIComponent(form.dataset.showtime), { cache: 'no-store' });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Could not refresh seats.');
      const current = new Map(data.seats.map((seat) => [seat.id, seat]));
      for (const button of buttons) {
        const seat = current.get(button.dataset.id);
        const booked = !seat || Boolean(seat.booked);
        button.disabled = booked;
        button.classList.toggle('seat-booked', booked);
        if (booked) selected.delete(button.dataset.id);
        button.dataset.label = 'Row ' + button.dataset.id[0] + ', seat ' + button.dataset.id.slice(1) + ', ' + button.dataset.tier + ', ' + (booked ? 'booked' : button.dataset.price + ', available');
      }
      render();
    } catch (cause) { showError(cause.message); }
    finally { refresh.disabled = false; }
  });
  form.addEventListener('submit', (event) => {
    if (!selected.size) { event.preventDefault(); showError('Select at least one seat.'); }
  });
}

document.querySelector('#print-ticket')?.addEventListener('click', () => window.print());
for (const form of document.querySelectorAll('.cancel-form')) {
  form.addEventListener('submit', (event) => {
    if (!window.confirm('Cancel this booking and release its seats?')) event.preventDefault();
  });
}
