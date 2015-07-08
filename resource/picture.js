'use strict';

var fs = require('fs')
  , gm = require('gm')
  , config  = require('config')
  , restify = require('restify')
  , Picture = require('../model/picture')


var picturesConfig = config.get('pictureTemplates')


exports.get = function get(req, res, next) {

  var pictureFormat  = req.params.formatName
    , pictureId = req.params.pictureId

  var onPictureBufferReady = function onPictureBufferReady (error, buffer) {
    if (error) return next(new restify.InternalServerError(error));

    res.writeHead(200, {'Content-Type': 'image/jpg' });
    res.end(buffer, 'binary');
    return next();
  }

  var onPictureDocumentFound = function onPictureFound (error, picture) {

    if (error) return next(new restify.InternalServerError(error));
    if (!picture) return next(new restify.NotFoundError());

    var cfg = picturesConfig[picture.template].formats[pictureFormat];

    if(!cfg) return next(new restify.BadRequestError('%s is not a valid format', pictureFormat));

    var img = gm(picture.data, pictureId)
          .resize(cfg.width, cfg.height, cfg.options);

    if(cfg.crop)
      img.gravity(cfg.gravity)
          .crop(cfg.width, cfg.height);

    img.quality(cfg.quality)
        .autoOrient()
        .noProfile()
        .toBuffer('JPG', onPictureBufferReady);
  }

  try{
    Picture.findById(pictureId, onPictureDocumentFound);
  } catch(e) {
      return next(new restify.NotFoundError());
  }
}


exports.create = function create(req, res, next) {
  //console.log(req.files.picture);

  var type = req.files.picture.type;

  fs.readFile(req.files.picture.path, function (err, data) {

    var pic = new Picture({template: req.params.template, data: data});
    pic.save();

    var picCreated = {
        id: pic._id
    }

    res.send(picCreated);
    next();
  });
}