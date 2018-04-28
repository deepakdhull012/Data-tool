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
res.write(req)
/*textract.fromFileWithPath(req.file.path, function( error, text ) {
  if(!error){
    console.log('received data: ' + text);
    res.write(req.file.filename+" "+text);
    res.end();

  }else {
      console.log(error);
  }

})
*/
});

module.exports = router;
