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
  let promise = Promise.resolve([]);
  for (const record of records) {
    const date = record[0];
    const time = record[1];
    const name = record[2];
    const gym = record[5];
    const promise = sport.push({
      date,
      time,
      name,
      gym,
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
