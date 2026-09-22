/**
 * MENFESS & SPOTIFY SONG WALL — Backend (Google Apps Script)
 * ------------------------------------------------------------
 * Deploy this as a Web App (Deploy > New deployment > Web app).
 *   - Execute as: Me
 *   - Who has access: Anyone
 * Copy the deployment URL into WEB_APP_URL at the top of app.js.
 *
 * Two sheets are created automatically the first time the script runs:
 *   "Users"    -> Username | PasswordHash | CreatedAt
 *   "Menfess"  -> ID | Timestamp | SenderName | IsAnonim | Recipient | Message | SpotifyLink
 */

const USERS_SHEET = 'Users';
const USERS_HEADERS = ['Username', 'PasswordHash', 'CreatedAt'];

const MENFESS_SHEET = 'Menfess';
const MENFESS_HEADERS = ['ID', 'Timestamp', 'SenderName', 'IsAnonim', 'Recipient', 'Message', 'SpotifyLink'];

/** Gets a sheet by name, creating it with headers if it doesn't exist yet. */
function getOrCreateSheet_(name, headers) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
    sheet.appendRow(headers);
    sheet.setFrozenRows(1);
  }
  return sheet;
}

/** Turns a JSON payload into a CORS-friendly text response. */
function jsonOut_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

function hashPassword_(password) {
  const digest = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, password, Utilities.Charset.UTF_8);
  return digest.map(b => ('0' + (b & 0xFF).toString(16)).slice(-2)).join('');
}

function makeToken_(username) {
  return Utilities.base64EncodeWebSafe(username + '|' + new Date().getTime());
}

// ---------- Auth ----------

function registerUser_(username, password) {
  username = (username || '').trim();
  password = (password || '').trim();
  if (!username || !password) {
    return { success: false, message: 'Nama dan kata sandi wajib diisi.' };
  }
  const sheet = getOrCreateSheet_(USERS_SHEET, USERS_HEADERS);
  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][0]).toLowerCase() === username.toLowerCase()) {
      return { success: false, message: 'Nama itu sudah dipakai. Coba masuk (login) saja.' };
    }
  }
  sheet.appendRow([username, hashPassword_(password), new Date()]);
  return { success: true, message: 'Akun berhasil dibuat!', username: username, token: makeToken_(username) };
}

function loginUser_(username, password) {
  username = (username || '').trim();
  password = (password || '').trim();
  const sheet = getOrCreateSheet_(USERS_SHEET, USERS_HEADERS);
  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][0]).toLowerCase() === username.toLowerCase()) {
      if (String(data[i][1]) === hashPassword_(password)) {
        return { success: true, message: 'Berhasil masuk!', username: data[i][0], token: makeToken_(username) };
      }
      return { success: false, message: 'Kata sandi salah.' };
    }
  }
  return { success: false, message: 'Akun tidak ditemukan. Daftar dulu, yuk.' };
}

// ---------- Menfess ----------

function submitMenfess_(body) {
  const recipient = (body.recipient || '').trim();
  const message = (body.message || '').trim();
  const spotifyLink = (body.spotifyLink || '').trim();
  const isAnonim = !!body.isAnonim;
  const senderName = isAnonim ? '' : (body.senderName || '').trim();

  if (!recipient || !message || !spotifyLink) {
    return { success: false, message: 'Penerima, pesan, dan link lagu wajib diisi.' };
  }
  if (!isAnonim && !senderName) {
    return { success: false, message: 'Isi namamu, atau centang kirim sebagai anonim.' };
  }

  const sheet = getOrCreateSheet_(MENFESS_SHEET, MENFESS_HEADERS);
  const id = Utilities.getUuid();
  sheet.appendRow([id, new Date(), senderName, isAnonim, recipient, message, spotifyLink]);
  return { success: true, message: 'Menfess terkirim!', id: id };
}

function getMenfessList_() {
  const sheet = getOrCreateSheet_(MENFESS_SHEET, MENFESS_HEADERS);
  const data = sheet.getDataRange().getValues();
  const rows = data.slice(1).map(row => ({
    id: row[0],
    timestamp: row[1] instanceof Date ? row[1].toISOString() : row[1],
    senderName: row[2],
    isAnonim: row[3] === true || row[3] === 'TRUE' || row[3] === 'true',
    recipient: row[4],
    message: row[5],
    spotifyLink: row[6]
  }));
  rows.reverse(); // newest first
  return { success: true, data: rows };
}

// ---------- Entry points ----------

function doGet(e) {
  const action = e.parameter.action;
  if (action === 'getMenfess') {
    return jsonOut_(getMenfessList_());
  }
  return jsonOut_({ success: false, message: 'Unknown action.' });
}

function doPost(e) {
  let body;
  try {
    body = JSON.parse(e.postData.contents);
  } catch (err) {
    return jsonOut_({ success: false, message: 'Invalid JSON.' });
  }

  switch (body.action) {
    case 'register':
      return jsonOut_(registerUser_(body.username, body.password));
    case 'login':
      return jsonOut_(loginUser_(body.username, body.password));
    case 'submitMenfess':
      return jsonOut_(submitMenfess_(body));
    default:
      return jsonOut_({ success: false, message: 'Unknown action.' });
  }
}
