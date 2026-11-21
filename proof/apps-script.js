/**
 * Google Apps Script for ReMeet /proof form.
 *
 * Setup:
 * 1. Create a Google Sheet "ReMeet Proof Leads"
 * 2. Extensions → Apps Script → paste this code
 * 3. Deploy → New deployment → Web app
 *    - Execute as: Me
 *    - Who has access: Anyone
 * 4. Copy the URL → paste into proof.js PROOF_ENDPOINT
 *
 * Optional: set TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID in
 * Script Properties (Project Settings → Script properties) to
 * receive Telegram notifications on each lead.
 */

var SHEET_NAME = 'Leads';

function doPost(e) {
  var data;
  try {
    data = JSON.parse(e.postData.contents);
  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ status: 'error', message: 'Bad JSON' }))
      .setMimeType(ContentService.MimeType.JSON);
  }

  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
    sheet.appendRow([
      'Timestamp', 'Name', 'Email', 'Who', 'When', 'Photos Link',
      'Notes', 'Page', 'utm_source', 'utm_medium', 'utm_campaign', 'utm_content'
    ]);
  }

  sheet.appendRow([
    new Date().toISOString(),
    data.first_name || '',
    data.email || '',
    data.who || '',
    data.when || '',
    data.photos_link || '',
    data.notes || '',
    data.page || '',
    data.utm_source || '',
    data.utm_medium || '',
    data.utm_campaign || '',
    data.utm_content || ''
  ]);

  sendTelegram(data);

  return ContentService
    .createTextOutput(JSON.stringify({ status: 'ok' }))
    .setMimeType(ContentService.MimeType.JSON);
}

function sendTelegram(data) {
  var props = PropertiesService.getScriptProperties();
  var token = props.getProperty('TELEGRAM_BOT_TOKEN');
  var chatId = props.getProperty('TELEGRAM_CHAT_ID');
  if (!token || !chatId) return;

  var text = '📖 New proof request!\n\n'
    + 'Name: ' + (data.first_name || '—') + '\n'
    + 'Email: ' + (data.email || '—') + '\n'
    + 'Who: ' + (data.who || '—') + '\n'
    + 'When: ' + (data.when || '—') + '\n'
    + 'Photos: ' + (data.photos_link || '—') + '\n'
    + (data.notes ? 'Notes: ' + data.notes + '\n' : '')
    + (data.utm_source ? '\nutm: ' + data.utm_source + ' / ' + data.utm_medium + ' / ' + data.utm_campaign : '');

  UrlFetchApp.fetch('https://api.telegram.org/bot' + token + '/sendMessage', {
    method: 'post',
    contentType: 'application/json',
    payload: JSON.stringify({ chat_id: chatId, text: text, parse_mode: 'HTML' })
  });
}
