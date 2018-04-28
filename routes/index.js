var express = require('express');
var router = express.Router();


var textract = require('textract');
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
var keyWords = extractKeys();

router.get('/', function(req, res, next) {
  res.render('pages/index')
});

router.post('/', upload.single('fileUpload'),function(req, res) {
  textract.fromFileWithPath(req.file.path, function( error, text ) {
    if(!error){
      var fileContent = text
      res.json(processor(fileContent));
      res.end();
      fileContent = '';
    }else {
        console.log(error);
    }
})

});

let quesSep = 'Ques.'
let opAsep = '(a)'
let opBsep = '(b)'
let opCsep = '(c)'
let opDsep = '(d)'



function extractKeys(){
textract.fromFileWithPath('public\\uploads\\geoKeys.txt', function( error, text ) {
  if(!error){
    return JSON.parse(text)
  }else {
      console.log(error);
  }
});
}


let seggregatedQuestionList = []

function getIndicesOf(searchStr, str, caseSensitive) {
    var searchStrLen = searchStr.length;
    if (searchStrLen == 0) {
        return [];
    }
    var startIndex = 0, index, indices = [];
    if (!caseSensitive) {
        str = str.toLowerCase();
        searchStr = searchStr.toLowerCase();
    }
    while ((index = str.indexOf(searchStr, startIndex)) > -1) {
        indices.push(index);
        startIndex = index + searchStrLen;
    }
    return indices;
}

function processor(fileContent){
let questionOccurences = getIndicesOf(quesSep,fileContent)
//console.log(questionOccurences)

let unseggregatedQuestionList = []
for(let occurence in questionOccurences){
    let unseggregatedQuestion = ""
    if(occurence == questionOccurences.length-1){
    unseggregatedQuestion = fileContent.substr(questionOccurences[occurence],fileContent.length-1)

    }
    else{
       unseggregatedQuestion = fileContent.substr(questionOccurences[occurence],questionOccurences[parseInt(occurence)+1]-1)
    }

    unseggregatedQuestionList.push(unseggregatedQuestion)

   // console.log(questionStr,"**************************\n\n<br>")


}
console.log(unseggregatedQuestionList.length)
seggregatedQuestionList = []
for(let unseggregatedQuestion of unseggregatedQuestionList){
    let seggregatedQuestion = {}
    seggregatedQuestion.qContent = unseggregatedQuestion.substr(unseggregatedQuestion.indexOf(quesSep)+quesSep.length,unseggregatedQuestion.indexOf(opAsep)-unseggregatedQuestion.indexOf(quesSep)-7).trim()
    seggregatedQuestion.opA = unseggregatedQuestion.substr(unseggregatedQuestion.indexOf(opAsep)+opAsep.length+1,unseggregatedQuestion.indexOf(opBsep)-unseggregatedQuestion.indexOf(opAsep)-4).trim()
    seggregatedQuestion.opB = unseggregatedQuestion.substr(unseggregatedQuestion.indexOf(opBsep)+opBsep.length+1,unseggregatedQuestion.indexOf(opCsep)-unseggregatedQuestion.indexOf(opBsep)-4).trim()
    seggregatedQuestion.opC = unseggregatedQuestion.substr(unseggregatedQuestion.indexOf(opCsep)+opCsep.length+1,unseggregatedQuestion.indexOf(opDsep)-unseggregatedQuestion.indexOf(opCsep)-4).trim()
    seggregatedQuestion.opD = unseggregatedQuestion.substr(unseggregatedQuestion.indexOf(opDsep)+opDsep.length+1,20).trim()
    let noOfKeyWordMatchedVar = ""
    let noOfKeyWordMatched = 0
    seggregatedQuestion.keyWordMatchArray = []
    for(let topic in keyWords){
        noOfKeyWordMatched = 0
        noOfKeyWordMatchedVar = topic+"matched"
        for(let kw of keyWords[topic]){
            if(seggregatedQuestion.qContent.toLowerCase().indexOf(kw.toLowerCase())>=0){
                 ++noOfKeyWordMatched
            }
        }

        let keyWordMatchdata = {}
        keyWordMatchdata[noOfKeyWordMatchedVar] = noOfKeyWordMatched
        seggregatedQuestion.keyWordMatchArray.push(keyWordMatchdata)
    }

    var noOfKeywordsMatched = 0
    var max = 0
    var topicName = ""
    var finalTopicName = ""
    for(let pair of seggregatedQuestion.keyWordMatchArray){
        for(let key in pair){
            noOfKeywordsMatched = pair[key]
            topicName = key.replace("matched","")
        }
        if(noOfKeywordsMatched > max){
            max = noOfKeywordsMatched
            finalTopicName = topicName
        }
        else if(noOfKeywordsMatched == max){
            finalTopicName = finalTopicName + "," +topicName
        }
    }
    if(max == 0){
        finalTopicName = "NA"
    }
    seggregatedQuestion.finalTopic = finalTopicName
    //console.log(seggregatedQuestion)
    //console.log("******************")
    seggregatedQuestionList.push(seggregatedQuestion)
}
fileContent = "";
console.log(seggregatedQuestionList.length)
return seggregatedQuestionList;

}



module.exports = router;
