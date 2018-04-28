var express = require('express');
var router = express.Router();


var textract = require('textract');
//const fs = require('fs');

//multer object creation
var multer  = require('multer')
var storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'public/uploads/')
    },
    filename: function (req, file, cb) {
        cb(null, file.originalname)
  }
})

var upload = multer({ storage: storage })

/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('pages/index')
});

router.post('/', upload.single('fileUpload'),function(req, res) {

  if(req.file.filename.indexOf('pdf')>0){
  //  res.send(req.body);
  }
  else{
  //  res.send("Other");
  }
  /*fs.readFile(req.file.path, {encoding: 'utf-8'}, function(err,data){
    if (!err) {
        console.log('received data: ' + data);
        res.writeHead(200, {'Content-Type': 'text/html'});
        res.write(data);
        res.end();
    } else {
        console.log(err);
    }
});*/

textract.fromFileWithPath(req.file.path, function( error, text ) {
  if(!error){
    console.log('received data: ' + text);
    res.write(req.file.filename+" "+text);
    res.end();

  }else {
      console.log(error);
  }

})



});

module.exports = router;
