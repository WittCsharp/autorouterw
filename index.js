'use strict';

const fs = require('fs');
const path = require('path');
const routerMaster = require('./master/routermaster');

let getAllRouter = function(app) {
  let p = path.join(path.resolve(), './src/router');
  if (!fs.existsSync(p)) return;
  let files = fs.readdirSync(p);
  files.filter(function (item){
    return item !== 'index.js' && item.endsWith('.js');
  }).forEach(function (item){
    require(`${p}/${item}`)(app);
  });
}

let autoRouter = function(app) {
  Object.keys(app.schemas).map((k) => {
    if (!app.schemas[k].router) return;
    routerMaster(app, k, app.schemas[k].url);
  })
}

module.exports = function(app){
  getAllRouter(app);
  autoRouter(app);
}
