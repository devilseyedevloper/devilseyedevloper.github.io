document.addEventListener('DOMContentLoaded', () => {
  const ratingInfo = document.getElementById('ratingInfo');

  function fetchRatings() {
    fetch('/ratings').then(r => r.json()).then(j => {
      if (ratingInfo) ratingInfo.textContent = `Avg: ${j.avg} (${j.count})`;
    }).catch(() => {});
  }

  if (ratingInfo) {
    fetchRatings();
  }

  const form = document.getElementById('contactForm');
  if (form) {
    form.addEventListener('submit', e => {
      e.preventDefault();
      const data = Object.fromEntries(new FormData(form).entries());
      const status = document.getElementById('status');
      if (status) status.textContent = 'Sending...';
      fetch('/contact', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(data)
      }).then(r => r.json()).then(j => {
        if (status) status.textContent = j.ok ? 'Sent — thank you!' : 'Error sending';
        if (j.ok) form.reset();
      }).catch(() => {
        if (status) status.textContent = 'Error sending';
      });
    });
  }

  const adminForm = document.getElementById('adminLoginForm');
  const dashboard = document.getElementById('adminDashboard');
  const adminStatus = document.getElementById('adminStatus');
  const contactRows = document.getElementById('contactRows');
  const logoutBtn = document.getElementById('logoutBtn');
  const dashboardStatus = document.getElementById('dashboardStatus');

  function showDashboard() {
    if (adminForm) adminForm.style.display = 'none';
    if (dashboard) dashboard.style.display = 'block';
    loadContacts();
  }

  function loadContacts() {
    if (!contactRows || !dashboardStatus) return;
    dashboardStatus.textContent = 'Loading contacts...';
    fetch('/admin/contacts').then(r => r.json()).then(list => {
      contactRows.innerHTML = '';
      if (!list.length) {
        contactRows.innerHTML = '<tr><td colspan="7">No contacts yet.</td></tr>';
      } else {
        list.forEach(item => {
          const tr = document.createElement('tr');
          tr.innerHTML = `
            <td>${item.id}</td>
            <td>${item.name}</td>
            <td>${item.phone}</td>
            <td>${item.email || '-'}</td>
            <td>${item.message}</td>
            <td>${new Date(item.time).toLocaleString()}</td>
            <td><button data-id="${item.id}">Delete</button></td>
          `;
          contactRows.appendChild(tr);
        });
      }
      dashboardStatus.textContent = '';
    }).catch(() => {
      dashboardStatus.textContent = 'Could not load contacts.';
    });
  }

  const openRatingPopup = document.getElementById('openRatingPopup');
  const ratingPopup = document.getElementById('ratingPopup');
  const closePopup = document.getElementById('closePopup');
  const popupStars = document.querySelectorAll('#ratingPopup .stars button');
  const submitRating = document.getElementById('submitRating');
  let selectedRating = 0;

  function openPopup() {
    if (ratingPopup) ratingPopup.classList.add('show');
    selectedRating = 0;
    popupStars.forEach(s => s.classList.remove('active'));
    if (ratingStatus) {
      ratingStatus.textContent = 'Select a star rating and submit it.';
      ratingStatus.classList.remove('success');
      ratingStatus.classList.remove('error');
    }
  }

  if (openRatingPopup) {
    openRatingPopup.addEventListener('click', () => {
      openPopup();
    });
  }

  popupStars.forEach(btn => btn.addEventListener('click', () => {
    selectedRating = Number(btn.dataset.value);
    popupStars.forEach(s => s.classList.remove('active'));
    btn.classList.add('active');
    if (ratingStatus) {
      ratingStatus.textContent = `You selected ${selectedRating} star${selectedRating > 1 ? 's' : ''}.`;
      ratingStatus.classList.remove('error');
    }
  }));

  const ratingStatus = document.getElementById('ratingStatus');
  if (submitRating) {
    submitRating.addEventListener('click', () => {
      if (!selectedRating) {
        if (ratingStatus) {
          ratingStatus.textContent = 'Please select a star rating first.';
          ratingStatus.classList.add('error');
        }
        return;
      }
      fetch('/rating', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ rating: selectedRating })
      }).then(r => r.json()).then(j => {
        if (j.ok) {
          if (ratingStatus) {
            ratingStatus.textContent = `Thanks — your ${selectedRating}-star rating is saved.`;
            ratingStatus.classList.add('success');
            ratingStatus.classList.remove('error');
          }
          fetchRatings();
        } else if (ratingStatus) {
          ratingStatus.textContent = 'Unable to save rating, try again.';
          ratingStatus.classList.add('error');
        }
      }).catch(() => {
        if (ratingStatus) {
          ratingStatus.textContent = 'Unable to save rating, try again.';
          ratingStatus.classList.add('error');
        }
      });
    });
  }

  if (closePopup) {
    closePopup.addEventListener('click', () => {
      if (ratingPopup) ratingPopup.classList.remove('show');
    });
  }

  const screenshotOverlay = document.getElementById('screenshotOverlay');
  const screenshotTitle = document.getElementById('screenshotTitle');
  const screenshotText = document.getElementById('screenshotText');
  const closeScreenshot = document.getElementById('closeScreenshot');

  document.querySelectorAll('.frame[data-title]').forEach(frame => {
    frame.addEventListener('click', () => {
      const title = frame.dataset.title;
      if (screenshotTitle) screenshotTitle.textContent = title;
      if (screenshotText) screenshotText.textContent = 'This screenshot placeholder shows where your design preview will appear. Add your real image later to impress visitors.';
      if (screenshotOverlay) screenshotOverlay.classList.add('show');
    });
  });

  if (closeScreenshot) {
    closeScreenshot.addEventListener('click', () => {
      if (screenshotOverlay) screenshotOverlay.classList.remove('show');
    });
  }

  if (screenshotOverlay) {
    screenshotOverlay.addEventListener('click', e => {
      if (e.target === screenshotOverlay) screenshotOverlay.classList.remove('show');
    });
  }

  if (adminForm) {
    adminForm.addEventListener('submit', e => {
      e.preventDefault();
      const data = Object.fromEntries(new FormData(adminForm).entries());
      fetch('/admin/login', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(data)
      }).then(r => r.json()).then(j => {
        if (j.ok) {
          if (adminStatus) adminStatus.textContent = 'Signed in successfully.';
          showDashboard();
        } else {
          if (adminStatus) adminStatus.textContent = 'Invalid credentials.';
        }
      }).catch(() => {
        if (adminStatus) adminStatus.textContent = 'Login failed.';
      });
    });
  }

  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
      if (adminForm) adminForm.style.display = 'block';
      if (dashboard) dashboard.style.display = 'none';
      if (adminStatus) adminStatus.textContent = 'Signed out.';
    });
  }

  if (contactRows) {
    contactRows.addEventListener('click', e => {
      const button = e.target.closest('button[data-id]');
      if (!button) return;
      const id = button.dataset.id;
      fetch(`/admin/contact/${id}`, { method: 'DELETE' }).then(r => r.json()).then(j => {
        if (j.ok) {
          loadContacts();
        }
      }).catch(() => {});
    });
  }
});
