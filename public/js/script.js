let selectedFreq = 'MONTHLY';
let selectedAmt = '';
let selectedDonationType = 'monetary';
let selectedInKind = 'School Supplies';
let selectedCommitment = '3 Months';

const teamEmail = 'likha.donations@gmail.com';

function setActive(id, isActive) {
  const element = document.getElementById(id);
  if (element) element.classList.toggle('active', isActive);
}

function setFreq(frequency) {
  selectedFreq = frequency;
  setActive('btnMonthly', frequency === 'MONTHLY');
  setActive('btnOneTime', frequency === 'ONE-TIME');
}

function selectAmt(button, amount) {
  document.querySelectorAll('.amount-btn').forEach(btn => btn.classList.remove('selected'));
  button.classList.add('selected');
  selectedAmt = amount;
  const custom = document.getElementById('customAmt');
  if (custom) custom.value = '';
}

function clearSelected() {
  document.querySelectorAll('.amount-btn').forEach(btn => btn.classList.remove('selected'));
  selectedAmt = '';
}

function setDonationType(type) {
  selectedDonationType = type;
  setActive('btnMonetary', type === 'monetary');
  setActive('btnInKind', type === 'inkind');

  const monetary = document.getElementById('monetaryFields');
  const inkind = document.getElementById('inkindFields');
  if (monetary) monetary.classList.toggle('hidden', type !== 'monetary');
  if (inkind) inkind.classList.toggle('hidden', type !== 'inkind');
  syncDonationModal();
}

function setInKind(type) {
  selectedInKind = type;
  setActive('btnSupplies', type === 'School Supplies');
  setActive('btnHousehold', type === 'Household Essentials');
  setActive('btnOthers', type === 'Others');
}

function setCommitment(commitment) {
  selectedCommitment = commitment;
  setActive('btn3mo', commitment === '3 Months');
  setActive('btn6mo', commitment === '6 Months');
  setActive('btn9mo', commitment === '9 Months');
  setActive('btn1yr', commitment === '1 Year');
}

function showComingSoon() {
  alert('Coming Soon');
}

function syncDonationModal() {
  const inKindFields = document.getElementById('inKindIntentFields');
  const submitButton = document.getElementById('donateSubmitButton');
  const intro = document.getElementById('donateIntro');
  const isInKind = selectedDonationType === 'inkind';

  if (inKindFields) inKindFields.classList.toggle('hidden', !isInKind);
  if (submitButton) {
    submitButton.textContent = isInKind ? 'Submit In-Kind Donation Intent' : 'Submit Monetary Donation Intent';
  }
  if (intro) {
    intro.textContent = isInKind
      ? 'Fill in your details and describe the items you would like to donate. The Project LIKHA team will reach out to coordinate.'
      : 'Fill in your details and the Project LIKHA team will reach out to coordinate your monetary donation intent.';
  }
}

function openDonateModal() {
  syncDonationModal();
  openModal('donateModal', 'donateForm', 'donateSuccess');
}

function openAdoptModal() {
  openModal('adoptModal', 'adoptForm', 'adoptSuccess');
}

function openModal(modalId, formId, successId) {
  const modal = document.getElementById(modalId);
  const form = document.getElementById(formId);
  const success = document.getElementById(successId);
  if (!modal) return;
  modal.classList.add('open');
  modal.setAttribute('aria-hidden', 'false');
  if (form) form.style.display = '';
  if (success) success.style.display = 'none';
}

function closeModal(id) {
  const modal = document.getElementById(id);
  if (!modal) return;
  modal.classList.remove('open');
  modal.setAttribute('aria-hidden', 'true');
}

function getValue(id) {
  const element = document.getElementById(id);
  return element ? element.value.trim() : '';
}

function addItemRow() {
  const rows = document.getElementById('itemRows');
  if (!rows) return;

  const row = document.createElement('tr');
  row.innerHTML = `
    <td><input type="text" class="item-name" placeholder="Notebook" /></td>
    <td><input type="text" class="item-description" placeholder="Size, brand, notes" /></td>
    <td>
      <select class="item-condition">
        <option value="Brand New">Brand New</option>
        <option value="Like New">Like New</option>
        <option value="Gently Used">Gently Used</option>
        <option value="Good Condition">Good Condition</option>
      </select>
    </td>
    <td><input type="number" class="item-quantity" placeholder="0" min="1" /></td>
    <td><button class="row-remove" type="button" onclick="removeItemRow(this)" aria-label="Remove item row">×</button></td>
  `;
  rows.appendChild(row);
}

function removeItemRow(button) {
  const rows = document.querySelectorAll('#itemRows tr');
  if (rows.length <= 1) {
    const row = button.closest('tr');
    if (!row) return;
    row.querySelectorAll('input').forEach(input => { input.value = ''; });
    row.querySelectorAll('select').forEach(select => { select.selectedIndex = 0; });
    return;
  }
  button.closest('tr')?.remove();
}

function getInKindItems() {
  const rows = Array.from(document.querySelectorAll('#itemRows tr'));
  return rows.map(row => {
    const item = row.querySelector('.item-name')?.value.trim() || '';
    const description = row.querySelector('.item-description')?.value.trim() || '';
    const condition = row.querySelector('.item-condition')?.value || '';
    const quantity = row.querySelector('.item-quantity')?.value.trim() || '';
    return { item, description, condition, quantity };
  }).filter(entry => entry.item || entry.description || entry.quantity);
}

function validateRequiredFields(fields) {
  for (const field of fields) {
    if (!getValue(field.id)) {
      alert(field.message);
      const element = document.getElementById(field.id);
      if (element) element.focus();
      return false;
    }
  }
  return true;
}

function submitDonate() {
  const required = [
    { id: 'donateFirstName', message: 'Please enter your first name.' },
    { id: 'donateLastName', message: 'Please enter your last name.' },
    { id: 'donateEmail', message: 'Please enter your email address.' },
    { id: 'donateCity', message: 'Please enter your city and province.' }
  ];

  if (!validateRequiredFields(required)) return;

  const firstName = getValue('donateFirstName');
  const lastName = getValue('donateLastName');
  const email = getValue('donateEmail');
  const city = getValue('donateCity');
  const contactMethod = getValue('donateContactMethod') || 'Email';
  const fullName = `${firstName} ${lastName}`;
  const customAmount = getValue('customAmt');

  let subject = '';
  let body = '';

  if (selectedDonationType === 'monetary') {
    const amount = customAmount ? `₱${customAmount}` : selectedAmt || '(amount not specified)';
    subject = encodeURIComponent(`Project LIKHA Monetary Donation Intent – ${fullName}`);
    body = encodeURIComponent(
      `Hello Project LIKHA Team,\n\nA new monetary donation intent has been submitted.\n\nFirst Name: ${firstName}\nLast Name: ${lastName}\nEmail Address: ${email}\nCity, Province: ${city}\nPreferred Contact Method: ${contactMethod}\nDonation Type: Monetary\nFrequency: ${selectedFreq}\nAmount: ${amount}\n\nPlease reach out to coordinate their donation.\n\nThank you!`
    );
  } else {
    const items = getInKindItems();
    if (!items.length || items.some(item => !item.item || !item.quantity)) {
      alert('Please enter at least one item and quantity for your in-kind donation.');
      return;
    }

    const itemLines = items.map((entry, index) => `${index + 1}. Item: ${entry.item}\n   Description: ${entry.description || 'N/A'}\n   Condition: ${entry.condition}\n   Quantity: ${entry.quantity}`).join('\n');
    const deliveryMethod = getValue('deliveryMethod') || 'N/A';
    const purpose = getValue('donatePurpose') || 'N/A';

    subject = encodeURIComponent(`Project LIKHA In-Kind Donation Intent – ${fullName}`);
    body = encodeURIComponent(
      `Hello Project LIKHA Team,\n\nA new in-kind donation intent has been submitted.\n\nFirst Name: ${firstName}\nLast Name: ${lastName}\nEmail Address: ${email}\nCity, Province: ${city}\nPreferred Contact Method: ${contactMethod}\nDonation Type: In-Kind\nItem Type: ${selectedInKind}\n\nDescription of Items with Quantity:\n${itemLines}\n\nPreferred Delivery Method: ${deliveryMethod}\nPurpose/Designation: ${purpose}\n\nPlease reach out to coordinate their donation.\n\nThank you!`
    );
  }

  window.location.href = `mailto:${teamEmail}?subject=${subject}&body=${body}`;
  showSuccess('donateForm', 'donateSuccess');
}

function submitAdopt() {
  const name = getValue('adoptName');
  const email = getValue('adoptEmail');
  if (!name || !email) {
    alert('Please fill in your name and email.');
    return;
  }

  const phone = getValue('adoptPhone') || 'N/A';
  const city = getValue('adoptCity') || 'N/A';
  const message = getValue('adoptMessage') || 'None';

  const subject = encodeURIComponent(`Adopt-a-Scholar Interest – ${name}`);
  const body = encodeURIComponent(
    `Hello Project LIKHA Team,\n\nSomeone has expressed interest in the Adopt-a-Scholar Program.\n\nName: ${name}\nEmail: ${email}\nPhone: ${phone}\nCity, Province: ${city}\nCommitment: ${selectedCommitment}\nMessage: ${message}\n\nPlease reach out to them.\n\nThank you!`
  );

  window.location.href = `mailto:${teamEmail}?subject=${subject}&body=${body}`;
  showSuccess('adoptForm', 'adoptSuccess');
}

function showSuccess(formId, successId) {
  const form = document.getElementById(formId);
  const success = document.getElementById(successId);
  if (form) form.style.display = 'none';
  if (success) success.style.display = 'block';
}

function submitSubscribe(event) {
  event.preventDefault();
  const name = getValue('subscribeName');
  const email = getValue('subscribeEmail');
  const subject = encodeURIComponent(`Project LIKHA Updates Subscription – ${name}`);
  const body = encodeURIComponent(`Hello Project LIKHA Team,\n\nPlease add me to Project LIKHA updates.\n\nName: ${name}\nEmail: ${email}\n\nThank you!`);
  window.location.href = `mailto:${teamEmail}?subject=${subject}&body=${body}`;
}

document.querySelectorAll('.modal-overlay').forEach(overlay => {
  overlay.addEventListener('click', event => {
    if (event.target === overlay) closeModal(overlay.id);
  });
});

document.addEventListener('keydown', event => {
  if (event.key === 'Escape') {
    document.querySelectorAll('.modal-overlay.open').forEach(modal => closeModal(modal.id));
  }
});

const menuToggle = document.querySelector('.menu-toggle');
const navMenu = document.getElementById('navMenu');

if (menuToggle && navMenu) {
  menuToggle.addEventListener('click', () => {
    const isOpen = navMenu.classList.toggle('open');
    menuToggle.setAttribute('aria-expanded', String(isOpen));
    document.body.classList.toggle('menu-open', isOpen);
  });

  navMenu.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', () => {
      navMenu.classList.remove('open');
      menuToggle.setAttribute('aria-expanded', 'false');
      document.body.classList.remove('menu-open');
    });
  });
}

syncDonationModal();
