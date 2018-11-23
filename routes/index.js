const express = require('express');
const router = express.Router();
const textract = require('textract');
const multer = require('multer');

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'public/uploads/')
  },
  filename: function (req, file, cb) {
    cb(null, file.originalname)
  }
})

const upload = multer({ storage: storage });

let keyWords;

extractKeys().then((res) => {
  keyWords = res;
}).catch((err) => {
  console.log('Error in extraction: ', err);
});

function extractKeys() {
  return new Promise((resolve, reject) => {
    textract.fromFileWithPath('public\\uploads\\geoKeys.txt', function (error, keywordsFileContent) {
      if (!error) {
        resolve(JSON.parse(keywordsFileContent))
      } else {
        console.log(error);
        reject(error);
      }
    });
  });
}

router.get('/', function (req, res, next) {
  res.render('pages/index')
});

router.post('/', upload.single('fileUpload'), function (req, res) {
  textract.fromFileWithPath(req.file.path, function (error, text) {
    if (!error) {
      let fileContent = text;
      res.json(processor(fileContent));
      res.end();
      fileContent = '';
    } else {
      console.log(error);
    }
  })

});

let isQuestionAnswerSeperate = true;   // Answers are at the bottom of file 

let quesSep = 'Ques.'
let opAsep = '(a)'
let opBsep = '(b)'
let opCsep = '(c)'
let opDsep = '(d)'

let correctAnsSep = 'CORRECTANSWER)'
let explanationSep = 'Explanation:)'



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

function getUnseggregatedQuestions(fileContent) {
  let questionOccurences = getIndicesOf(quesSep, fileContent, false);
  let correctAnswerOccurence;
  let explanationOccurence;

  if (isQuestionAnswerSeperate) {
    correctAnswerOccurence = getIndicesOf(correctAnsSep, fileContent);
    explanationOccurence = getIndicesOf(explanationSep, fileContent);
  }
  let unseggregatedQuestionList = [];
  let correctAnswerList = [];
  let explnationList = [];
  for (let occurence in questionOccurences) {
    let unseggregatedQuestion = ""
    if (occurence == questionOccurences.length - 1) {
      let endPoint;
      if (isQuestionAnswerSeperate) {
        endPoint = fileContent.indexOf("ANSWERS & EXPLANATION");
      }
      else {
        endPoint = fileContent.length - 1;
      }
      unseggregatedQuestion = fileContent.substr(questionOccurences[occurence], endPoint)
    }
    else {
      unseggregatedQuestion = fileContent.substr(questionOccurences[occurence], questionOccurences[parseInt(occurence) + 1] - 1);
    }
    unseggregatedQuestionList.push(unseggregatedQuestion)
  }

  if (isQuestionAnswerSeperate) {
    for (let occurence of correctAnswerOccurence) {
      let correctAnswer = fileContent.substr(occurence, 20);
      correctAnswerList.push(correctAnswer);
    }
    for (let occurence in explanationOccurence) {
      let explanation = "";
      if (occurence == explanationOccurence.length - 1) {
        explanation = fileContent.substr(explanationOccurence[occurence], fileContent.length - 1);
      }
      else {
        explanation = fileContent.substr(explanationOccurence[occurence], explanationOccurence[parseInt(occurence) + 1] - 10);
      }
      explnationList.push(explanation);
    }
  }

  return {
    "questions": unseggregatedQuestionList,
    "correctAnswers": correctAnswerList,
    "explanations": explnationList
  };
}

function topicAssigner(qContent) {
  let keyWordMatchdata = {
    topicsMatched: {},
    subjectsMatched: {}
  };
  for (let subject in keyWords) {
    let noOfTimesSubjectMatched = 0;
    let subjects = keyWords[subject];
    for (let topic in subjects) {
      let topics = subjects[topic];
      noOfKeyWordMatched = 0;
      for (let keyword of topics) {
        if (qContent.toLowerCase().indexOf(keyword.toLowerCase()) >= 0) {
          keyWordMatchdata.topicsMatched[topic] = ++noOfKeyWordMatched;
          keyWordMatchdata.subjectsMatched[subject] = ++noOfTimesSubjectMatched;
        }
      }
    }
  }
  if (Object.keys(keyWordMatchdata.topicsMatched).length > 0) {
    return assignTopic(keyWordMatchdata);
  } else {
    return null;
  }


}
function assignTopic(keyWordMatchData) {
  console.log('KeyWord Match Data',keyWordMatchData);
  let topicsMatched = [];
  let subjectsMatched = [];
  let maxKeywordsMatched = 0;
  let noOfTimesSubjectMatchedMax = 0;
  let topicMatchObject = keyWordMatchData.topicsMatched;
  let subjectMatchObject = keyWordMatchData.subjectsMatched;
  for (let topic in topicMatchObject) {

    if (topicMatchObject[topic] === maxKeywordsMatched && maxKeywordsMatched > 0) {
      topicsMatched.push(topic);
    }
    if (topicMatchObject[topic] > maxKeywordsMatched) {
      // empty current List and push new
      maxKeywordsMatched = topicMatchObject[topic];
      topicsMatched = [];
      topicsMatched.push(topic);
    }
    
  }
  for (let subject in subjectMatchObject) {

    if (subjectMatchObject[subject] === noOfTimesSubjectMatchedMax && noOfTimesSubjectMatchedMax > 0) {
      subjectsMatched.push(subject);
    }
    if (subjectMatchObject[subject] > noOfTimesSubjectMatchedMax) {
      // empty current List and push new
      noOfTimesSubjectMatchedMax = subjectMatchObject[subject];
      subjectsMatched = [];
      subjectsMatched.push(subject);
    }
    
  }
  return {
    topicList: topicsMatched,
    subjectList: subjectsMatched
  }
}



function processor(fileContent) {
  let unseggregatedQuestionData = getUnseggregatedQuestions(fileContent);
  let unseggregatedQuestions = unseggregatedQuestionData.questions;
  let correctAnswers = unseggregatedQuestionData.correctAnswers;
  let explanations = unseggregatedQuestionData.explanations;
  seggregatedQuestionList = []
  for (let unseggregatedQuestion of unseggregatedQuestions) {
    let seggregatedQuestion = {}
   // console.log((unseggregatedQuestion.indexOf(quesSep) + unseggregatedQuestion.length)-(unseggregatedQuestion.indexOf(opDsep) + opDsep.length));
    seggregatedQuestion.qContent = unseggregatedQuestion.substr(unseggregatedQuestion.indexOf(quesSep) + quesSep.length, unseggregatedQuestion.indexOf(opAsep) - unseggregatedQuestion.indexOf(quesSep) - 6).trim();
    seggregatedQuestion.opA = unseggregatedQuestion.substr(unseggregatedQuestion.indexOf(opAsep) + opAsep.length, unseggregatedQuestion.indexOf(opBsep) - unseggregatedQuestion.indexOf(opAsep) - 4).trim();
    seggregatedQuestion.opB = unseggregatedQuestion.substr(unseggregatedQuestion.indexOf(opBsep) + opBsep.length, unseggregatedQuestion.indexOf(opCsep) - unseggregatedQuestion.indexOf(opBsep) - 4).trim();
    seggregatedQuestion.opC = unseggregatedQuestion.substr(unseggregatedQuestion.indexOf(opCsep) + opCsep.length, unseggregatedQuestion.indexOf(opDsep) - unseggregatedQuestion.indexOf(opCsep) - 4).trim();
    let opdStart = unseggregatedQuestion.indexOf(opDsep) + opDsep.length;
    let strLen = unseggregatedQuestion.length - opdStart > 20 ? 20 : unseggregatedQuestion.length - opdStart;
    seggregatedQuestion.opD = unseggregatedQuestion.substr(opdStart, strLen).trim();
    const topicsAndSubject = topicAssigner(seggregatedQuestion.qContent);
    if (topicsAndSubject) {
      const topics = topicsAndSubject.topicList;
      const subjects = topicsAndSubject.subjectList;
      seggregatedQuestion.finalTopic = topics.length > 1 ? topics : topics[0];
      seggregatedQuestion.subject = subjects.length > 1 ? subjects : subjects[0];
    } else {
      seggregatedQuestion.finalTopic = null;
      seggregatedQuestion.subject = null;
    }
    
    seggregatedQuestionList.push(seggregatedQuestion)
  }
  fileContent = "";
  return seggregatedQuestionList;
}
module.exports = router;
