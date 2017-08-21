const firebase = require('firebase-admin');
const fs = require('fs');
const parse = require('csv-parse/lib/sync');
const path = require('path');
const request = require('sync-request');

// Download private key from project settings in Firebase console
const privateKey = require('./privateKey.json');

const mappingResource = 'https://raw.githubusercontent.com/WendellLiu/universiade_crawler/master/output/schedule.csv';

const filenames = process.argv.slice(2);
if (!filenames.length) {
  process.exit();
}

const response = request('GET', mappingResource).getBody().toString('utf8');
const mapping = parse(response).reduce((accumulator, value) => {
  accumulator[`${value[1]}|${value[0]}|${value[2]}`] = value[3];
  return accumulator;
}, {})

const credential = firebase.credential.cert(privateKey);
const databaseURL = 'https://' + privateKey.project_id + '.firebaseio.com';
firebase.initializeApp({
  credential,
  databaseURL,
});

for (const filename of filenames) {
  const sport = path.basename(filename, '.csv');
  const database = firebase.database();
  const reference = database.ref(`schedules/${sport}`);

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
    const link = record[5]
      ? `https://tickets.2017.taipei${record[5]}`
      : mapping[`${sport}|${date}T00:00:00+08:00|${place}`]
        ? `https://tickets.2017.taipei${mapping[`${sport}|${date}T00:00:00+08:00|${place}`]}`
        : '';
    const serial = record[6];
    const phase = record[7];
    const promise = reference.child(i).set({
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
