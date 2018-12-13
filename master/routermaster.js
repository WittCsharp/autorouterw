'use strict';

var _ = require('lodash');

const transfer = {
  'mysql': 'getMysqlModel',
  'mongo': 'getMongoModel',
}

class RouterMaster {
  constructor(app, schemaName) {
    this.router = require('express').Router();
    this.schema = app.schemas[schemaName].schema;
    this.model = app[transfer[app.schemas[schemaName].db]](schemaName);
    this.schemaName = schemaName;
    this.pk = app.schemas[schemaName].db === 'mongo' ? '_id' : 'id';
    Object.keys(this.schema).map((k) => {
      if (this.schema[k].primarykey) this.pk = k;
    })
    app.schemas[schemaName].router.map((m) => {
      this[m]();
    })
    this.hooks(app);
  }

  all() {
    this.get();
    this.getByKey();
    this.post();
    this.put();
    this.patch();
    this.delete();
  }

  _schemapost(app, schemaName) {
    return (req, res, next) => {
      if (!app.schemas[schemaName]) return next();
      let schema = app.schemas[schemaName].schema;
      let err = null;
      Object.keys(schema).map((k) => {
        if (req.body[k]) {
          if (!Array.isArray(req.body[k]) && schema[k].type === Array) {
            req.body[k] = schema[k].type(req.body[k]);
          }

          if (schema[k].type != Array) {
            req.body[k] = schema[k].type(req.body[k]); 
          }
          
          if (isNaN(req.body[k]) && typeof(req.body[k]) === 'number') {
            err = new Error(`The ${k} type is fail!!!`);
            err.code = 403;
          }
        }
      });
      if (err) {
        return next(err);
      }
      return next();
    };
  }

  _schemaput(app, schemaName) {
    return (req, res, next) => {
      if (!app.schemas[schemaName]) return next();
      let schema = app.schemas[schemaName].schema;
      let err = null;
      Object.keys(schema).map((k) => {
        if (req.body[k]) {
          if (!Array.isArray(req.body[k]) && schema[k].type === Array) {
            req.body[k] = schema[k].type(req.body[k]);
          }

          if (schema[k].type != Array) {
            req.body[k] = schema[k].type(req.body[k]); 
          }
          
          if (isNaN(req.body[k]) && typeof(req.body[k]) === 'number') {
            err = new Error(`The ${k} type is fail!!!`);
            err.code = 403;
          }
        }
        if (schema[k].put === false) {
          if (req.body[k]) {
            delete req.body[k];
          }
        }
      });
      if (err) return next(err);
      else return next();
    }
  }

  _schemapatch(app, schemaName) {
    return (req, res, next) => {
      if (!app.schemas[schemaName]) return next();
      let schema = app.schemas[schemaName].schema;
      let err = null;
      Object.keys(schema).map((k) => {
        if (req.body[k]) {
          if (!schema[k].type) return;
          if (!Array.isArray(req.body[k]) && schema[k].type === Array) {
            req.body[k] = schema[k].type(req.body[k]);
          }

          if (schema[k].type != Array) {
            req.body[k] = schema[k].type(req.body[k]); 
          }
          
          if (isNaN(req.body[k]) && typeof(req.body[k]) === 'number') {
            err = new Error(`The ${k} type is fail!!!`);
            err.code = 403;
          }
        }
        if (schema[k].patch === false) {
          if (req.body[k]) {
            delete req.body[k];
          }
        }
      });
      if (err) return next(err);
      else return next();
    }
  }

  _schemaget(app, schemaName) {
    return (req, res, next) => {
      if (!app.schemas[schemaName]) return next();
      let schema = app.schemas[schemaName].schema;
      let search = app.schemas[schemaName].search || [];
      let filters = {};
      search.map((f) => {
        filters[f] = 1;
      })
      Object.keys(schema).map((k) => {
        if (req.query[k]) {
          if (!schema[k].type) return;
          req.query[k] = schema[k].type(req.query[k]);
          if (isNaN(req.query[k]) && typeof(req.query[k]) === 'number') {
            err = new Error(`The ${k} type is fail!!!`);
            err.code = 403;
          }
        }
      })
      req.projection = Object.assign(req.projection || {}, filters)
      return next();
    }
  }

  get() {
    this.router.get('/', (req, res, next) => {
      this.model.get(req.query, req.limit, req.sort, req.pagesize, req.projection).then((result) => {
        res.result = result;
        next();
      }).catch((err) => next(err))
    })
  }

  getByKey() {
    let pk = this.pk;
    this.router.get(`/:${pk}`, (req, res, next) => {
      this.model.get(Object.assign(req.query||{}, {[pk]:req.params[pk]}), req.limit, req.sort, req.pagesize, req.projection).then((result) => {
        res.result = result;
        next();
      }).catch((err) => next(err))
    })
  }

  post() {
    this.router.post(`/`, (req, res, next) => {
      Object.keys(req.body).map((k) => {
        if (!this.schema.hasOwnProperty(k)) delete req.body[k];
      })
      this.model.add(req.body).then((result) => {
        res.result = result;
        next();
      }).catch((err) => next(err));
    })
  }

  put() {
    let pk = this.pk;
    this.router.put(`/:${pk}`, (req, res, next) => {
      Object.keys(req.body).map((k) => {
        if (!this.schema.hasOwnProperty(k)) delete req.body[k];
      })
      if (!req.body || Object.keys(req.body).length === 0) {
        let err = new Error('Not found attributes to edite!!!');
        err.code = 403;
        return next(err);
      }
      this.model.update({[pk]:req.params[pk]}, req.body).then((result) => {
        res.result = result;
        next();
      }).catch((err) => next(err));
    })
  }

  patch() {
    let pk = this.pk;
    this.router.patch(`/:${pk}`, (req, res, next) => {
      Object.keys(req.body).map((k) => {
        if (!this.schema.hasOwnProperty(k)) delete req.body[k];
      })
      if (!req.body || Object.keys(req.body).length === 0) {
        let err = new Error('Not found attributes to edite!!!');
        err.code = 403;
        return next(err);
      }
      this.model.update({[pk]:req.params[pk]}, req.body).then((result) => {
        res.result = result;
        next();
      }).catch((err) => next(err));
    });

    this.router.patch('/', async (req, res, next) => {
      try {
        res.result = this.model.update(req.query, req.body);
        next();
      } catch (error) {
        next(error);
      }
    })
  }

  delete() {
    let pk = this.pk;
    this.router.delete(`/:${pk}`, (req, res, next) => {
      this.model.delete({[pk]:req.params[pk]}).then((result) => {
        res.result = result;
        next();
      }).catch((err) => next(err));
    })
  }

  hooks(app) {
    this.router.stack.map((layer) => {
      if (!layer.route) return;
      let model = layer.route.stack[0];
      let method = model.method;
      if (typeof this[`_schema${method.toLowerCase()}`] != 'function') return;
      let _layer = _.cloneDeep(model);
      _layer.handle = this[`_schema${method.toLowerCase()}`](app,this.schemaName);
      layer.route.stack.splice(0,0,_layer);
    })
  }
}

module.exports = function(app, schemaName, url) {
  var hook = require('autohookw');
  let master = new RouterMaster(app, schemaName);
  url = url || `/v1/${schemaName.endsWith('s') ? schemaName : schemaName + 's'}`;
  app.use(url, hook(master.router, schemaName, app));
};
