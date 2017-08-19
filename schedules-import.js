const firebase = require('firebase-admin');
const fs = require('fs');
const parse = require('csv-parse/lib/sync');
const path = require('path');

// Download private key from project settings in Firebase console
const privateKey = require('./privateKey.json');

const filenames = process.argv.slice(2);
if (!filenames.length) {
  process.exit();
}

const credential = firebase.credential.cert(privateKey);
const databaseURL = 'https://' + privateKey.project_id + '.firebaseio.com';
firebase.initializeApp({
  credential,
  databaseURL,
});

for (const filename of filenames) {
  const database = firebase.database();
  const sport = database.ref(`schedules/${path.basename(filename, '.csv')}`);

  const text = fs.readFileSync(filename);
  // Skip record header
  const records = parse(text).slice(1);
  const promises = [];
  for (let i = 0; i < records.length; i++) {
    const record = records[i];
    const date = record[0];
    const time = record[1];
    const event = record[2];
    const gender = record[3];
    const place = record[4];
    const link = record[5];
    const serial = record[6];
    const phase = record[7];
    const promise = sport.child(i).set({
      date,
      time,
      event,
      gender,
      place,
      link,
      serial,
      phase,
    });
    promises.push(promise);
  }
  Promise.all(promises)
    .then(() => {
      database.goOffline();
    })
    .catch(() => {
      database.goOffline();
    })
}
